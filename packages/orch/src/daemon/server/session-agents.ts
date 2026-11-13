import { randomUUID } from "node:crypto";
import { attachLink, detachLink, type AgentLink } from "../../control/agent-links.ts";
import { appendSessionEntries, openSessionLog, setAsideSessionLog, type SetAsideLog } from "../../agent/session-log.ts";
import { heldCwd, heldKeyOf, heldLaunchEnv, logPathOf, recordHeld, type HeldRecording } from "../../backends/registry.ts";
import type { LaunchedAgent } from "../../backends/registration.ts";
import { dropQuestion, recordQuestion } from "../../store/question-rows.ts";
import { renderViewEntry } from "../../shared/render-view-entry.ts";
import { errorMessage } from "../../util.ts";
import { FORM_SESSION_OWNER, type FormId } from "../../types/form.ts";
import { acpDriver } from "./acp-driver.ts";
import { holdPipes, releasePipes } from "./held-pipes.ts";
import { acceptResultReport, acceptStatusReport } from "./status-report.ts";
import { ackOutboxRow } from "./outbox.ts";
import { publishFromOrchd } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { BackendSpawnOpts } from "../../types/backend.ts";
import type { HeldSession, HeldSessionDriver, SessionLinkEvents } from "../../types/held-session.ts";
import type { NotifyEvent } from "../../types/notify.ts";

/** The driver each form whose session orchd holds runs on, from the role the harness declares. */
const DRIVERS: Readonly<Record<FormId, (adapter: AgentAdapter) => HeldSessionDriver | null>> = {
  tui: () => null,
  oneshot: () => null,
  acp: (adapter) => adapter.acp === null ? null : acpDriver(adapter.acp),
  server: (adapter) => adapter.server,
};

/** The driver a harness runs on in `form`, or null when the form's session is not orchd's or the
 *  harness declares no role for it. */
export function sessionDriver(adapter: AgentAdapter, form: FormId): HeldSessionDriver | null {
  return FORM_SESSION_OWNER[form] === "orchd" ? DRIVERS[form](adapter) : null;
}

/** The driver a harness runs on in `form`; throws when it has none. */
export function requireSessionDriver(adapter: AgentAdapter, form: FormId): HeldSessionDriver {
  const driver = sessionDriver(adapter, form);
  if (driver === null) throw new Error(`harness ${String(adapter.id)} has no ${form} form`);
  return driver;
}

/** Start one agent in a form whose session orchd holds, on pipes orchd keeps, and return where it
 *  runs. `sessionId` null opens a new session; otherwise it opens that one. A load that replays the
 *  whole conversation sets the session log aside and writes it anew; a load that fails puts it
 *  back. `recording` says whether the agent is new or exists. */
export async function startSessionAgent(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts, sessionId: string | null, recording: HeldRecording): Promise<LaunchedAgent> {
  const launch = requireSessionDriver(adapter, opts.form).launch(opts);
  const key = heldKeyOf(adapter, opts);
  const directory = state.directory;
  const logger = state.services.logger.forAgent(key);
  const cwd = heldCwd(opts);
  const child = state.pipes.spawn({ argv: launch.argv, cwd, env: heldLaunchEnv(opts, launch.env) });
  holdPipes(key, child);
  const { cols, rows } = state.services.settings.current().pty;
  let launched: LaunchedAgent;
  let screen: ReturnType<DaemonState["held"]["openScreen"]>;
  try {
    launched = recordHeld(recording, adapter, opts, key, child.pid);
    screen = state.held.openScreen(key, { cols, rows });
  } catch (error: unknown) {
    releasePipes(key);
    throw error;
  }
  const logPath = logPathOf(directory, key);
  const publish = (event: NotifyEvent): void => { publishFromOrchd(state, event); };
  let dispatchId: string | null = null;
  let link: AgentLink | null = null;
  let ended = false;
  const setAside: { current: SetAsideLog | null } = { current: null };
  child.onStderr((text) => { logger.warn("held-session.stderr", { text }); });
  // One exit step that throws is logged, and the steps after it still run.
  const exitStep = (step: string, run: () => void): void => {
    try {
      run();
    } catch (error: unknown) {
      logger.warn("held-session.exit", { step, message: errorMessage(error) });
    }
  };
  void child.exited.then(() => {
    ended = true;
    exitStep("detach", () => { if (link !== null) detachLink(directory, key, link); });
    exitStep("screen", () => { screen.close(); });
    exitStep("pipes", () => { releasePipes(key); });
  });
  const events: SessionLinkEvents = {
    onTurnStarted(deliveryId) {
      dispatchId = deliveryId;
      acceptStatusReport(directory, key, { state: "working", dispatchId: deliveryId }, publish);
    },
    onEntries(entries) {
      appendSessionEntries(logPath, entries);
      for (const entry of entries) {
        const row = renderViewEntry(entry);
        if (row !== undefined) screen.write(`${row}\r\n`);
      }
    },
    onTurnEnded(outcome, text) {
      const finishedAt = Date.now();
      acceptStatusReport(directory, key, { state: outcome.state, lastError: outcome.error, lastText: text, finishedAt }, publish);
      if (outcome.state === "done") acceptResultReport(directory, key, { text, dispatchId, finishedAt });
    },
    onAsk(ask) {
      const id = randomUUID();
      recordQuestion(directory, { id, agentId: key, question: ask.title, askedAt: Date.now(), options: ask.options, supersede: false });
      acceptStatusReport(directory, key, { state: "asking", blockedMessage: ask.title }, publish);
      return id;
    },
    onAsksSettled() {
      acceptStatusReport(directory, key, { state: "working", blockedMessage: null }, publish);
    },
    onAskDropped(questionId) {
      dropQuestion(directory, questionId, Date.now());
    },
    onApplied(deliveryId) {
      ackOutboxRow(state, deliveryId);
    },
    onError(error) {
      logger.error("held-session.error", { message: error.message });
      acceptStatusReport(directory, key, { lastError: error.message }, publish);
    },
    onLoad() {
      setAside.current = setAsideSessionLog(logPath);
    },
    onReset(newSessionId) {
      acceptStatusReport(directory, key, { state: "idle", sessionId: newSessionId, lastText: null, lastError: null, finishedAt: null, blockedMessage: null }, publish);
    },
  };
  let opened: HeldSession;
  try {
    opened = await launch.open(child, sessionId === null ? { kind: "new", cwd } : { kind: "existing", cwd, sessionId }, events, { logger, settings: state.services.settings.current() });
  } catch (error: unknown) {
    releasePipes(key);
    screen.close();
    setAside.current?.restore();
    throw error;
  }
  setAside.current?.keep();
  link = opened.link;
  attachLink(directory, key, link);
  // The process may have ended while its session opened: then nothing stays attached to it.
  if (ended) detachLink(directory, key, link);
  openSessionLog(logPath);
  acceptStatusReport(directory, key, { state: "idle", sessionId: opened.sessionId, sessionPath: logPath }, publish);
  return launched;
}
