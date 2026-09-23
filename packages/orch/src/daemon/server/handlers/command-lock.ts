// orchd's answer to `orch lock`: refuse a gated command no human approved, make a
// locked one wait while a live process holds its pattern, else take every pattern
// at once so two wrappers can never each hold half of what the other needs.
import { recordedInstanceIsLive } from "../../../process-identity.ts";
import { matchedPatterns, wholeCommandMatch } from "../../../policy/command-gate.ts";
import { agentById } from "../../../store/agent-rows.ts";
import { isAgentState } from "../../../agent-state.ts";
import { agentView } from "../../../store/agent-view.ts";
import { presenceEntry, recordAgentStatus } from "../../../presence/store.ts";
import { releaseCommandLocks, selectCommandLocks, takeCommandLocks, type CommandLockRow } from "../../../store/command-lock-rows.ts";
import { grantIsApproved, requestGrant, spendGrant } from "../../../store/grant-rows.ts";
import { transitionEventFromRow } from "../status-events.ts";
import type { AgentState } from "../../../agent-state.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { Role } from "../../../types/policy.ts";
import { roleOf } from "../../../policy/vocabulary.ts";
import type { GrantAction } from "../../../types/store.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

type LockParams = ParamsOf<"command-lock">;
type LockSettings = Pick<OrchSettings, "locked_commands" | "gated_commands" | "denied_commands"> &{ timeouts: Pick<OrchSettings["timeouts"], "lock_wait_ms"> };
type Publish = (event: NotifyEvent) => void;

function heldBy(params: LockParams): (row: CommandLockRow) => boolean {
  return (row) => row.pid === params.pid && row.startToken === params.startToken;
}

function holderName(directory: OrchDir, row: CommandLockRow): string {
  if (row.agentId === null) return `pid ${row.pid}`;
  return agentView(directory, row.agentId)?.name ?? row.agentId;
}

function seconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

function stateOf(directory: OrchDir, agent: string): AgentState | undefined {
  const state = presenceEntry(directory, agent)?.status?.state;
  return isAgentState(state) ? state : undefined;
}

/** Record the agent's lock state and publish the move, with why in `reason`. */
function moveAgent(directory: OrchDir, agent: string, from: AgentState, to: "waiting" | "working", reason: string, publish: Publish): void {
  const now = Date.now();
  const { current } = recordAgentStatus(directory, agent, { state: to }, now);
  publish({ ...transitionEventFromRow(directory, current, from, to, new Date(now)), reason });
}

/** A live holder blocks: wait, or give up once `timeouts.lock_wait_ms` has passed. */
function blockedVerdict(directory: OrchDir, limitMs: number, waitedMs: number, blocking: CommandLockRow, agent: string | null, publish: Publish): ResultOf<"command-lock"> {
  const holder = holderName(directory, blocking);
  if (waitedMs >= limitMs) {
    if (agent !== null) moveAgent(directory, agent, "waiting", "working", `gave up on "${blocking.pattern}" after ${seconds(waitedMs)}, held by ${holder}`, publish);
    return { verdict: "gave-up", pattern: blocking.pattern, holder, waitedMs };
  }
  const state = agent === null ? undefined : stateOf(directory, agent);
  if (agent !== null && state !== undefined && state !== "waiting") moveAgent(directory, agent, state, "waiting", `waiting for "${blocking.pattern}", held by ${holder}`, publish);
  return { verdict: "wait", pattern: blocking.pattern, holder, since: blocking.acquiredAt };
}

/** Whether a rule's `applies_to` names this agent's role. */
function covers(directory: OrchDir, appliesTo: readonly Role[], agent: string): boolean {
  const row = agentById(directory, agent);
  return row !== null && appliesTo.includes(roleOf(row));
}

/** The locked patterns this command must hold and does not yet. An agent outside
 *  `locked_commands.applies_to` holds none; the human's own `orch lock` always waits. */
function wantedPatterns(directory: OrchDir, locked: LockSettings["locked_commands"], params: LockParams, agent: string | null): string[] {
  if (agent !== null && !covers(directory, locked.applies_to, agent)) return [];
  return matchedPatterns(params.command, locked.commands).filter((pattern) => !params.held.includes(pattern));
}

/** The denied pattern this agent runs, when `denied_commands.applies_to` covers it. The human is never denied. */
function deniedPattern(directory: OrchDir, denied: LockSettings["denied_commands"], command: string, agent: string | null): string | undefined {
  if (agent === null || !covers(directory, denied.applies_to, agent)) return undefined;
  return wholeCommandMatch(command, denied.commands);
}

export function lockCommand(directory: OrchDir, settings: LockSettings, params: LockParams, publish: Publish): ResultOf<"command-lock"> {
  const agent = params.agent !== null && agentView(directory, params.agent) !== null ? params.agent : null;
  const denied = deniedPattern(directory, settings.denied_commands, params.command, agent);
  if (denied !== undefined) return { verdict: "denied", pattern: denied };
  const action: GrantAction = { kind: "command.run", params: { command: params.command, cwd: params.cwd } };
  const gated = matchedPatterns(params.command, settings.gated_commands).length > 0;
  if (gated && !grantIsApproved(directory, action)) return { verdict: "refused", requestId: requestGrant(directory, action, agent).id };

  const wanted = wantedPatterns(directory, settings.locked_commands, params, agent);
  const rows = selectCommandLocks(directory, wanted);
  const own = heldBy(params);
  const blocking = rows.find((row) => !own(row) && recordedInstanceIsLive(row.pid, row.startToken));
  const waitedMs = Date.now() - params.waitingSince;
  if (blocking) return blockedVerdict(directory, settings.timeouts.lock_wait_ms, waitedMs, blocking, agent, publish);

  const acquiredAt = Date.now();
  const fresh = wanted.filter((pattern) => !rows.some((row) => row.pattern === pattern && own(row)));
  const taken = fresh.map((pattern) => ({ pattern, pid: params.pid, startToken: params.startToken, agentId: agent, command: params.command, acquiredAt }));
  takeCommandLocks(directory, taken, rows.filter((row) => !own(row)).map((row) => row.pattern));
  if (gated) spendGrant(directory, action, agent);
  if (agent !== null && stateOf(directory, agent) === "waiting") moveAgent(directory, agent, "waiting", "working", `got "${wanted.join('", "')}" after ${seconds(waitedMs)}`, publish);
  return { verdict: "run", patterns: wanted };
}

export function unlockCommand(directory: OrchDir, params: ParamsOf<"command-unlock">): ResultOf<"command-unlock"> {
  releaseCommandLocks(directory, params.pid, params.startToken);
  return { ok: true };
}
