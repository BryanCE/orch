// The one reader of an agent, run by the orchd whose store holds the agent: for a caller on
// this host, or for the linked host's orchd that asked for the agent. It reads this store, the
// agent's session file, screen and log records here; it never asks another orchd.
import { isAgentId } from "../shared/agent-id.ts";
import { resolveTargetRoute } from "../control/dispatch.ts";
import { paneBoundary } from "../control/pane-boundary.ts";
import { describeHandle } from "../shared/plexer.ts";
import { readLogRecords } from "../log.ts";
import { sessionViewValue } from "../session-view.ts";
import { getAdapter } from "../adapters/registry.ts";
import { isRunEndState } from "../agent-state.ts";
import { presenceEntry } from "../presence/store.ts";
import { agentView } from "../store/agent-view.ts";
import { selectRun, selectRuns } from "../store/run-rows.ts";
import type { AgentAdapter, SessionView } from "../types/adapter.ts";
import type { AgentRead, AgentReading, ResultLookup, ScreenLookup, SessionLookup, TailLookup } from "../types/agent-read.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { HeldTerminal, PtyHolder } from "../types/pty.ts";
import type { HereAgent } from "../types/agent-place.ts";

/** What the reader reads with: this orch dir, its logger, and the PTYs this orchd holds. */
export interface AgentReader {
  readonly orchDir: OrchDir;
  readonly logger: Logger;
  readonly held: () => Pick<PtyHolder, "has" | "text">;
}

/** The logger for lines about one agent: its own when the key is an agent id. */
export function agentLogger(logger: Logger, key: string): Logger {
  return isAgentId(key) ? logger.forAgent(key) : logger;
}

/** What the reader knows about one agent before it reads anything. */
interface ReadSubject {
  readonly orchDir: OrchDir;
  readonly key: string;
  /** The name a person reads in a refusal: the agent's, else its id. */
  readonly label: string;
  readonly presence: PresenceEntry | null;
  readonly adapter: AgentAdapter | undefined;
  readonly sessionPath: string | null;
  readonly logger: Logger;
}

function subjectOf(orchDir: OrchDir, agent: HereAgent, logger: Logger): ReadSubject {
  const key = agent.id;
  const view = agentView(orchDir, key);
  const presence = presenceEntry(orchDir, key) ?? null;
  return {
    orchDir,
    key,
    label: view?.name ?? key,
    presence,
    adapter: view === null ? undefined : getAdapter(view.harnessId),
    sessionPath: presence?.status?.sessionPath ?? null,
    logger: agentLogger(logger, key),
  };
}

function readSession(subject: ReadSubject, adapter: AgentAdapter): SessionView | undefined {
  return adapter.sessionView?.readSessionView({ sessionPath: subject.sessionPath ?? undefined });
}

/** What the agent's own session says it last wrote, when its harness can read one. */
function sessionResult(subject: ReadSubject): ResultLookup | undefined {
  const adapter = subject.adapter;
  const text = adapter?.extractResult({ sessionPath: subject.sessionPath ?? undefined }, subject.orchDir);
  if (!adapter || !text) return undefined;
  subject.logger.info("result.adapter-fallback");
  const view = readSession(subject, adapter);
  return {
    kind: "found",
    source: "session",
    payload: {
      text, task: sessionViewValue(view, "task"), model: sessionViewValue(view, "model"),
      thinking: sessionViewValue(view, "thinking"), tokens: sessionViewValue(view, "tokens"),
      cost: sessionViewValue(view, "cost"), turns: sessionViewValue(view, "turns"),
      sessionPath: subject.sessionPath,
    },
  };
}

/** A run status says ended, whose result report lags the status report or never
 *  comes. It answers from the session, then from the final text the status carried,
 *  so `orch result` agrees with `orch status` the moment status says done. */
function endedRunResult(subject: ReadSubject, dispatchId: string, state: string): ResultLookup {
  const session = sessionResult(subject);
  if (session !== undefined) return session;
  const status = subject.presence?.status;
  if (status?.lastText) {
    subject.logger.info("result.status-fallback", { dispatchId });
    return { kind: "found", source: "presence", payload: { text: status.lastText, dispatchId, task: status.task ?? null } };
  }
  return { kind: "missing", reason: `Dispatch ${dispatchId} ended (${state}) and reported no text.` };
}

/** The result of the dispatch the agent's status names. */
function dispatchResult(subject: ReadSubject, dispatchId: string): ResultLookup {
  const run = selectRun(subject.orchDir, dispatchId);
  if (run && run.result === undefined && isRunEndState(run.state)) return endedRunResult(subject, dispatchId, run.state);
  if (run?.result === undefined) {
    return {
      kind: "missing",
      reason: `Dispatch ${dispatchId} has not settled (${run?.state ?? "unrecorded"}). Watch it with \`orch events\`, or read the task history with \`orch runs ${subject.label}\`.`,
    };
  }
  subject.logger.info("result.current-dispatch", { dispatchId });
  return { kind: "found", source: "dispatch", payload: run.result };
}

/** The agent's result: its current dispatch's, else its reported one, else its newest run's,
 *  else what its session last said. */
export function readAgentResult(orchDir: OrchDir, agent: HereAgent, logger: Logger): ResultLookup {
  const subject = subjectOf(orchDir, agent, logger);
  const dispatchId = subject.presence?.status?.dispatchId;
  if (dispatchId) return dispatchResult(subject, dispatchId);
  if (subject.presence?.result) return { kind: "found", source: "presence", payload: subject.presence.result };
  const historical = selectRuns(orchDir, { agentKey: agent.id, limit: 1 })[0];
  if (historical?.result !== undefined) {
    subject.logger.info("result.history-fallback");
    return { kind: "found", source: "history", payload: historical.result };
  }
  return sessionResult(subject) ?? {
    kind: "missing",
    reason: `No result available for "${subject.label}" (no settled dispatch, no reported result, and no adapter-extractable session text).`,
  };
}

/** The agent's session read through its harness, with only its last `lines` entries. */
export function readAgentTail(orchDir: OrchDir, agent: HereAgent, lines: number, logger: Logger): TailLookup {
  const subject = subjectOf(orchDir, agent, logger);
  const adapter = subject.adapter;
  if (!adapter?.sessionView) {
    return { kind: "missing", reason: `Target "${subject.label}" (${adapter?.id ?? "unknown adapter"}) exposes no session tail; a session is read only through an adapter that declares one.` };
  }
  const view = readSession(subject, adapter);
  if (!view) return { kind: "missing", reason: `No session data for "${subject.label}" (${subject.sessionPath ?? "unknown path"}).` };
  return { kind: "found", sessionPath: subject.sessionPath, view: view.entries ? { ...view, entries: view.entries.slice(-lines) } : view };
}

/** Where the agent's session is, and what its harness reads of it. */
function readAgentSession(orchDir: OrchDir, agent: HereAgent, logger: Logger): SessionLookup {
  const subject = subjectOf(orchDir, agent, logger);
  if (subject.sessionPath === null) return { kind: "missing", reason: `No session path known for "${subject.label}".` };
  const adapter = subject.adapter;
  if (!adapter?.sessionView) {
    return { kind: "missing", reason: `Target "${subject.label}" (${adapter?.id ?? "unknown adapter"}) exposes no session tail; a session is read only through an adapter that declares one.` };
  }
  return { kind: "found", sessionPath: subject.sessionPath, view: readSession(subject, adapter) ?? null };
}

/** The last `lines` lines of the agent's screen: from the PTY this orchd holds for it, else
 *  through its plexer's screen role. An agent with neither answers why. */
function readAgentScreen(reader: AgentReader, agent: HereAgent, lines: number): ScreenLookup {
  const held = reader.held();
  const terminal = { kind: "agent", agent } satisfies HeldTerminal;
  if (held.has(terminal)) return { kind: "found", handle: agent.id, text: held.text(terminal, lines) };
  const route = resolveTargetRoute(reader.orchDir, agent);
  const label = agentView(reader.orchDir, agent.id)?.name ?? agent.id;
  const screen = route?.backend.screen;
  const pane = route === undefined || !screen ? null : { screen, handle: route.handle };
  const plan = paneBoundary(label, "peek", pane, route !== undefined);
  if (plan.outcome === "answer") return { kind: "answer", reason: plan.reason, text: plan.text };
  return { kind: "found", handle: describeHandle(plan.role.handle), text: plan.role.screen.read(plan.role.handle, lines) };
}

/** Answer one read of an agent this orchd runs. */
export function readAgent(reader: AgentReader, agent: HereAgent, read: AgentRead): AgentReading {
  const { orchDir, logger } = reader;
  switch (read.kind) {
    case "result":
      return { kind: "result", lookup: readAgentResult(orchDir, agent, logger) };
    case "tail":
      return { kind: "tail", lookup: readAgentTail(orchDir, agent, read.lines, logger) };
    case "session":
      return { kind: "session", lookup: readAgentSession(orchDir, agent, logger) };
    case "screen":
      return { kind: "screen", lookup: readAgentScreen(reader, agent, read.lines) };
    case "log": {
      const { kind: _kind, ...filter } = read;
      return { kind: "log", records: readLogRecords(orchDir, { ...filter, agent: agent.id }) };
    }
    default: {
      const exhaustive: never = read;
      throw new Error(`unknown agent read ${String(exhaustive)}`);
    }
  }
}
