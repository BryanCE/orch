// The one reader of an agent's result and session, run by the orchd whose store holds the
// agent: for a caller on this host, or for the linked host's orchd that asked for the agent.
// It reads this store and the agent's session file here; it never asks another orchd.
import { isAgentId } from "../backends/identity.ts";
import { getAdapter } from "../adapters/registry.ts";
import { isRunEndState } from "../agent-state.ts";
import { presenceEntry } from "../presence/store.ts";
import { agentView } from "../store/agent-view.ts";
import { selectRun, selectRuns } from "../store/run-rows.ts";
import type { AgentAdapter, SessionView } from "../types/adapter.ts";
import type { AgentRead, AgentReading, ResultLookup, TailLookup } from "../types/agent-read.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { PresenceEntry } from "../types/presence.ts";

/** One field of a session view, or null when the view or the field is absent. */
export function sessionViewValue(view: SessionView | undefined, key: keyof SessionView): unknown {
  return view?.[key] ?? null;
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

function subjectOf(orchDir: OrchDir, key: string, logger: Logger): ReadSubject {
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
export function readAgentResult(orchDir: OrchDir, key: string, logger: Logger): ResultLookup {
  const subject = subjectOf(orchDir, key, logger);
  const dispatchId = subject.presence?.status?.dispatchId;
  if (dispatchId) return dispatchResult(subject, dispatchId);
  if (subject.presence?.result) return { kind: "found", source: "presence", payload: subject.presence.result };
  const historical = selectRuns(orchDir, { agentKey: key, limit: 1 })[0];
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
export function readAgentTail(orchDir: OrchDir, key: string, lines: number, logger: Logger): TailLookup {
  const subject = subjectOf(orchDir, key, logger);
  const adapter = subject.adapter;
  if (!adapter?.sessionView) {
    return { kind: "missing", reason: `Target "${subject.label}" (${adapter?.id ?? "unknown adapter"}) exposes no session tail; a session is read only through an adapter that declares one.` };
  }
  const view = readSession(subject, adapter);
  if (!view) return { kind: "missing", reason: `No session data for "${subject.label}" (${subject.sessionPath ?? "unknown path"}).` };
  return { kind: "found", sessionPath: subject.sessionPath, view: view.entries ? { ...view, entries: view.entries.slice(-lines) } : view };
}

/** Answer one read of an agent this store holds. */
export function readAgent(orchDir: OrchDir, key: string, read: AgentRead, logger: Logger): AgentReading {
  switch (read.kind) {
    case "result":
      return { kind: "result", lookup: readAgentResult(orchDir, key, logger) };
    case "tail":
      return { kind: "tail", lookup: readAgentTail(orchDir, key, read.lines, logger) };
    default: {
      const exhaustive: never = read;
      throw new Error(`unknown agent read ${String(exhaustive)}`);
    }
  }
}
