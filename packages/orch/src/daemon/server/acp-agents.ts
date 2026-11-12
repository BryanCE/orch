import { randomUUID } from "node:crypto";
import { openAcpLink, type AcpLink, type AcpLinkEvents } from "../../acp/link.ts";
import { attachLink, detachLink, type AgentLink } from "../../control/agent-links.ts";
import { appendSessionEntries } from "../../agent/session-log.ts";
import { heldKeyOf, heldLaunchEnv, logPathOf, recordHeldAgent } from "../../backends/registry.ts";
import type { LaunchedAgent } from "../../backends/registration.ts";
import { dropQuestion, recordQuestion } from "../../store/question-rows.ts";
import { renderViewEntry } from "../../shared/render-view-entry.ts";
import { errorMessage, packageManifest } from "../../util.ts";
import { holdPipes, releasePipes } from "./held-pipes.ts";
import { acceptResultReport, acceptStatusReport } from "./status-report.ts";
import { ackOutboxRow } from "./outbox.ts";
import { publishFromOrchd } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { BackendSpawnOpts } from "../../types/backend.ts";
import type { NotifyEvent } from "../../types/notify.ts";

/** Start one agent in the `acp` form on pipes orchd holds, and return where it runs. */
export async function startAcpAgent(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts): Promise<LaunchedAgent> {
  const acp = adapter.acp;
  if (acp === null) throw new Error(`harness ${String(adapter.id)} has no acp form`);
  const key = heldKeyOf(adapter, opts);
  const directory = state.directory;
  const logger = state.services.logger.forAgent(key);
  const cwd = opts.cwd ?? process.cwd();
  const child = state.pipes.spawn({ argv: acp.argv(opts), cwd, env: heldLaunchEnv(opts, acp.env(opts)) });
  holdPipes(key, child);
  let launched: LaunchedAgent;
  try {
    launched = recordHeldAgent(adapter, opts, key, child.pid);
  } catch (error: unknown) {
    releasePipes(key);
    throw error;
  }
  const { cols, rows } = state.services.settings.current().pty;
  const screen = state.held.openScreen(key, { cols, rows });
  const logPath = logPathOf(directory, key);
  const publish = (event: NotifyEvent): void => { publishFromOrchd(state, event); };
  let dispatchId: string | null = null;
  let link: AgentLink | null = null;
  let ended = false;
  child.onStderr((text) => { logger.warn("acp.stderr", { text }); });
  // One exit step that throws is logged, and the steps after it still run.
  const exitStep = (step: string, run: () => void): void => {
    try {
      run();
    } catch (error: unknown) {
      logger.warn("acp.exit", { step, message: errorMessage(error) });
    }
  };
  void child.exited.then(() => {
    ended = true;
    exitStep("detach", () => { if (link !== null) detachLink(directory, key, link); });
    exitStep("screen", () => { screen.close(); });
    exitStep("pipes", () => { releasePipes(key); });
  });
  const events: AcpLinkEvents = {
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
      logger.error("acp.error", { message: error.message });
      acceptStatusReport(directory, key, { lastError: error.message }, publish);
    },
  };
  let opened: AcpLink;
  try {
    opened = await openAcpLink({ input: child.input, output: child.output }, { kind: "new", cwd }, packageManifest(), events);
  } catch (error: unknown) {
    releasePipes(key);
    screen.close();
    throw error;
  }
  link = opened.link;
  attachLink(directory, key, link);
  // The process may have ended while its session opened: then nothing stays attached to it.
  if (ended) detachLink(directory, key, link);
  acceptStatusReport(directory, key, { state: "idle", sessionId: opened.session.sessionId, sessionPath: logPath }, publish);
  return launched;
}
