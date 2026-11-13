import { randomUUID } from "node:crypto";
import { attachLink, detachLink, type AgentLink } from "../../control/agent-links.ts";
import { appendSessionEntries, openSessionLog, setAsideSessionLog, type SetAsideLog } from "../../agent/session-log.ts";
import { heldAgentEnv, heldCwd, heldKeyOf, logPathOf, recordHeld, startHeldAgent, type HeldRecording } from "../../backends/registry.ts";
import type { LaunchedAgent } from "../../backends/registration.ts";
import { dropQuestion, recordQuestion } from "../../store/question-rows.ts";
import { placeHere } from "../../process-place.ts";
import { renderViewEntry } from "../../shared/render-view-entry.ts";
import { errorMessage, shellLine, sleep } from "../../util.ts";
import { FORM_SESSION_OWNER, FORM_STDIO, type FormId } from "../../types/form.ts";
import { acpDriver } from "./acp-driver.ts";
import { acceptResultReport, acceptStatusReport } from "./status-report.ts";
import { ackOutboxRow } from "./outbox.ts";
import { publishFromOrchd } from "./events.ts";
import { recordControlOutcome } from "./control-outcomes.ts";
import { relaunchTerminal } from "./terminal-relaunch.ts";
import type { DaemonState } from "./state.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { BackendSpawnOpts } from "../../types/backend.ts";
import type { HeldSession, HeldSessionDriver, PreparedTerminal, SessionLinkEvents, SessionOpen, SessionOpenContext, TerminalAttachRole, TerminalControl, TerminalPreparer, TerminalSession } from "../../types/held-session.ts";
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

/** The role that attaches a harness's terminal program to a session orchd holds, or null when the
 *  harness's terminal program keeps its own session. */
export function terminalAttach(adapter: AgentAdapter): TerminalAttachRole | null {
  return adapter.server?.terminal ?? null;
}

/** One session orchd holds for an agent, and how it ends. */
interface HeldEntry {
  /** True when the agent's recorded process runs other agents' sessions too, so a close ends the
   *  session and never signals the process. */
  readonly shared: boolean;
  /** Close the link, let the process or the server go, close the screen. Resolves once an agent's
   *  own process has exited. */
  end(): Promise<void>;
}

/** Daemon-only registry: the session orchd holds for each agent. */
const held = new Map<string, HeldEntry>();

/** Whether the agent's recorded process is shared with other agents' sessions. */
export function sharesProcess(key: string): boolean {
  return held.get(key)?.shared === true;
}

/** End the session orchd holds for an agent, when it holds one. */
export async function endSessionAgent(key: string): Promise<void> {
  await held.get(key)?.end();
}

/** Whether orchd holds a session for the agent. */
export function holdsSession(key: string): boolean {
  return held.has(key);
}

/** End every session orchd holds: orchd is going. */
export async function endSessionAgents(): Promise<void> {
  await Promise.all([...held.keys()].map((key) => endSessionAgent(key)));
}

/** Where an agent's session events go: its status and results, its questions, its log, and the
 *  screen orchd paints for it when the agent has no terminal of its own. */
function sessionEvents(state: DaemonState, key: string, screen: { write(text: string): void } | null, setAside: { current: SetAsideLog | null }): SessionLinkEvents {
  const directory = state.directory;
  const logger = state.services.logger.forAgent(key);
  const logPath = logPathOf(directory, key);
  const publish = (event: NotifyEvent): void => { publishFromOrchd(state, event); };
  // A session can still speak after its agent's rows are gone, while it closes: what it says
  // then is logged and dropped, never thrown into the session's own work.
  const guarded = (what: string, run: () => void): void => {
    try {
      run();
    } catch (error: unknown) {
      logger.warn("held-session.report-dropped", { what, message: errorMessage(error) });
    }
  };
  const report = (patch: Parameters<typeof acceptStatusReport>[2]): void => {
    guarded("status", () => { acceptStatusReport(directory, key, patch, publish); });
  };
  let dispatchId: string | null = null;
  return {
    onTurnStarted(deliveryId) {
      dispatchId = deliveryId.length > 0 ? deliveryId : null;
      report({ state: "working", ...(dispatchId === null ? {} : { dispatchId }) });
    },
    onEntries(entries) {
      appendSessionEntries(logPath, entries);
      if (screen === null) return;
      for (const entry of entries) {
        const row = renderViewEntry(entry);
        if (row !== undefined) screen.write(`${row}\r\n`);
      }
    },
    onTurnEnded(outcome, text) {
      const finishedAt = Date.now();
      report({ state: outcome.state, lastError: outcome.error, lastText: text, finishedAt });
      if (outcome.state === "done") guarded("result", () => { acceptResultReport(directory, key, { text, dispatchId, finishedAt }); });
    },
    onAsk(ask) {
      const id = randomUUID();
      guarded("question", () => { recordQuestion(directory, { id, agentId: key, question: ask.title, askedAt: Date.now(), options: ask.options, supersede: false }); });
      report({ state: "asking", blockedMessage: ask.title });
      return id;
    },
    onAsksSettled() {
      report({ state: "working", blockedMessage: null });
    },
    onAskDropped(questionId) {
      guarded("question", () => { dropQuestion(directory, questionId, Date.now()); });
    },
    onApplied(deliveryId) {
      guarded("ack", () => { ackOutboxRow(state, deliveryId); });
    },
    onOutcome(outcome) {
      guarded("outcome", () => { recordControlOutcome(directory, { ...outcome, key }); });
    },
    onError(error) {
      logger.error("held-session.error", { message: error.message });
      report({ lastError: error.message });
    },
    onLoad() {
      setAside.current = setAsideSessionLog(logPath);
    },
    onReset(newSessionId) {
      report({ state: "idle", sessionId: newSessionId, lastText: null, lastError: null, finishedAt: null, blockedMessage: null });
    },
  };
}

/** The link is attached and the session log open: the agent reports idle on its session. */
function reportAttached(state: DaemonState, key: string, link: AgentLink, sessionId: string): void {
  const directory = state.directory;
  const logPath = logPathOf(directory, key);
  attachLink(directory, key, link);
  openSessionLog(logPath);
  acceptStatusReport(directory, key, { state: "idle", sessionId, sessionPath: logPath }, (event) => { publishFromOrchd(state, event); });
}

function openContext(state: DaemonState, key: string): SessionOpenContext {
  return { logger: state.services.logger.forAgent(key), settings: state.services.settings.current(), pipes: state.pipes };
}

function sessionOpen(cwd: string, sessionId: string | null): SessionOpen {
  return sessionId === null ? { kind: "new", cwd } : { kind: "existing", cwd, sessionId };
}

/** Start one agent in a form whose session orchd holds, and return where it runs. The driver
 *  starts the agent's own process or lends a shared one. `sessionId` null opens a new session;
 *  otherwise it opens that one. A load that replays the whole conversation sets the session log
 *  aside and writes it anew; a load that fails puts it back. `recording` says whether the agent
 *  is new or exists. */
export async function startSessionAgent(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts, sessionId: string | null, recording: HeldRecording): Promise<LaunchedAgent> {
  const driver = requireSessionDriver(adapter, opts.form);
  const key = heldKeyOf(adapter, opts);
  if (held.has(key)) throw new Error(`a session is already held for ${key}`);
  const directory = state.directory;
  const context = openContext(state, key);
  const logger = context.logger;
  const connection = await driver.connect(opts, heldAgentEnv(opts), context);
  const { process } = connection;
  const { cols, rows } = context.settings.pty;
  let launched: LaunchedAgent;
  let screen: ReturnType<DaemonState["held"]["openScreen"]>;
  try {
    launched = recordHeld(recording, adapter, opts, key, process.pid);
    screen = state.held.openScreen(key, { cols, rows });
  } catch (error: unknown) {
    process.release();
    throw error;
  }
  let link: AgentLink | null = null;
  let session: HeldSession | null = null;
  let finished = false;
  const setAside: { current: SetAsideLog | null } = { current: null };
  process.onStderr((text) => { logger.warn("held-session.stderr", { text }); });
  // One step of the ending that throws is logged, and the steps after it still run.
  const step = (name: string, run: () => void): void => {
    try {
      run();
    } catch (error: unknown) {
      logger.warn("held-session.exit", { step: name, message: errorMessage(error) });
    }
  };
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (held.get(key) === entry) held.delete(key);
    step("detach", () => { if (link !== null) detachLink(directory, key, link); });
    step("screen", () => { screen.close(); });
  };
  const entry: HeldEntry = {
    shared: process.shared,
    async end() {
      // The session closes before its process goes, so the harness sees a clean close; a harness
      // that does not finish closing within the wait is ended anyway.
      if (session !== null) {
        const closing = session.close().catch((error: unknown) => { logger.warn("held-session.close-failed", { message: errorMessage(error) }); });
        await Promise.race([closing, process.exited, sleep(context.settings.timeouts.session_close_ms)]);
      }
      process.release();
      if (!process.shared) await process.exited;
      finish();
    },
  };
  held.set(key, entry);
  void process.exited.then(finish);
  let opened: HeldSession;
  try {
    opened = await connection.open(sessionOpen(heldCwd(opts), sessionId), sessionEvents(state, key, screen, setAside));
  } catch (error: unknown) {
    process.release();
    finish();
    setAside.current?.restore();
    throw error;
  }
  setAside.current?.keep();
  session = opened;
  link = opened.link;
  // The process may have ended while its session opened: then nothing stays attached to it.
  if (finished) {
    link.close();
    return launched;
  }
  reportAttached(state, key, link, opened.sessionId);
  return launched;
}

/** Drive a terminal agent's session once the agent is recorded: a reset relaunches its terminal
 *  program on a fresh session, through the text its harness quits on. */
async function adoptTerminal(state: DaemonState, adapter: AgentAdapter, key: string, session: TerminalSession): Promise<void> {
  const directory = state.directory;
  if (held.has(key)) throw new Error(`a session is already held for ${key}`);
  const quit = adapter.lifecycleControl?.lifecycleCmd("restart")?.text;
  const terminal: TerminalControl = {
    relaunch: async (argv) => {
      if (quit === undefined) throw new Error(`harness ${adapter.id} declares no text that quits its terminal program`);
      await relaunchTerminal(state, placeHere(directory, key), quit, shellLine(argv));
    },
  };
  let opened: HeldSession;
  try {
    opened = await session.open(sessionEvents(state, key, null, { current: null }), terminal);
  } catch (error: unknown) {
    session.release();
    throw error;
  }
  const link = opened.link;
  let ended = false;
  held.set(key, {
    // The agent's process is its terminal; the server it borrows is only handed back.
    shared: false,
    async end() {
      if (ended) return;
      ended = true;
      detachLink(directory, key, link);
      held.delete(key);
      await opened.close();
      session.release();
    },
  });
  reportAttached(state, key, link, opened.sessionId);
}

/** Open a terminal agent's session on its harness's server: a fresh one, or the one `sessionId`
 *  names. What the terminal runs and needs comes back with it. */
export async function prepareTerminal(state: DaemonState, adapter: AgentAdapter, role: TerminalAttachRole, opts: BackendSpawnOpts, sessionId: string | null): Promise<PreparedTerminal> {
  const key = heldKeyOf(adapter, opts);
  // The terminal's own environment holds the server's credential; the agent's tools never get it.
  const env = Object.fromEntries(Object.entries(heldAgentEnv(opts)).filter(([name]) => !Object.hasOwn(role.clientEnv, name)));
  const session = await role.attach(opts, env, sessionOpen(heldCwd(opts), sessionId), openContext(state, key));
  return {
    program: session.argv,
    env: session.env,
    adopt: () => adoptTerminal(state, adapter, key, session),
    abandon: () => { session.release(); },
  };
}

/** Start a terminal agent in a PTY orchd holds, its terminal program attached to its session on
 *  the harness's server: the one `sessionId` names, or a fresh one. */
export async function startAttachedTerminal(state: DaemonState, adapter: AgentAdapter, role: TerminalAttachRole, opts: BackendSpawnOpts, sessionId: string | null, recording: HeldRecording): Promise<LaunchedAgent> {
  const prepared = await prepareTerminal(state, adapter, role, opts, sessionId);
  const [file, ...args] = prepared.program;
  let launched: LaunchedAgent;
  try {
    if (file === undefined) throw new Error(`harness ${adapter.id} gave an empty terminal program`);
    launched = await startHeldAgent(state.held, adapter, { ...opts, env: { ...opts.env, ...prepared.env } }, recording, { file, args });
  } catch (error: unknown) {
    prepared.abandon();
    throw error;
  }
  await prepared.adopt();
  return launched;
}

/** The spawn path's preparer: a terminal agent whose harness attaches its terminal program to a
 *  server orchd holds gets its session first. */
export function terminalPreparer(state: DaemonState): TerminalPreparer {
  return async (adapter, opts) => {
    const role = terminalAttach(adapter);
    if (role === null || FORM_STDIO[opts.form] !== "terminal") return null;
    return prepareTerminal(state, adapter, role, opts, null);
  };
}

/** The credential a terminal agent's environment needs for its harness's server, in a form whose
 *  terminal program attaches to one. */
export function terminalClientEnv(adapter: AgentAdapter, form: FormId | null): Readonly<Record<string, string>> {
  const role = terminalAttach(adapter);
  return role === null || form === null || FORM_STDIO[form] !== "terminal" ? {} : role.clientEnv;
}
