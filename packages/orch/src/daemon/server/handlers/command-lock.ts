// orchd's answer to `orch lock`: refuse a gated command no human approved, make a
// locked one wait while a live process holds its pattern, else take every pattern
// at once so two wrappers can never each hold half of what the other needs.
import { recordedInstanceIsLive } from "../../../process-identity.ts";
import { matchedPatterns } from "../../../policy/command-gate.ts";
import { agentView } from "../../../store/agent-view.ts";
import { releaseCommandLocks, selectCommandLocks, takeCommandLocks, type CommandLockRow } from "../../../store/command-lock-rows.ts";
import { grantIsApproved, requestGrant, spendGrant } from "../../../store/grant-rows.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { GrantAction } from "../../../types/store.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

type LockParams = ParamsOf<"command-lock">;

function heldBy(params: LockParams): (row: CommandLockRow) => boolean {
  return (row) => row.pid === params.pid && row.startToken === params.startToken;
}

function holderName(directory: OrchDir, row: CommandLockRow): string {
  if (row.agentId === null) return `pid ${row.pid}`;
  return agentView(directory, row.agentId)?.name ?? row.agentId;
}

export function lockCommand(directory: OrchDir, settings: Pick<OrchSettings, "locked_commands" | "gated_commands">, params: LockParams): ResultOf<"command-lock"> {
  const agent = params.agent !== null && agentView(directory, params.agent) !== null ? params.agent : null;
  const action: GrantAction = { kind: "command.run", params: { command: params.command, cwd: params.cwd } };
  const gated = matchedPatterns(params.command, settings.gated_commands).length > 0;
  if (gated && !grantIsApproved(directory, action)) return { verdict: "refused", requestId: requestGrant(directory, action, agent).id };

  const wanted = matchedPatterns(params.command, settings.locked_commands).filter((pattern) => !params.held.includes(pattern));
  const rows = selectCommandLocks(directory, wanted);
  const own = heldBy(params);
  const blocking = rows.find((row) => !own(row) && recordedInstanceIsLive(row.pid, row.startToken));
  if (blocking) return { verdict: "wait", pattern: blocking.pattern, holder: holderName(directory, blocking), since: blocking.acquiredAt };

  const acquiredAt = Date.now();
  const fresh = wanted.filter((pattern) => !rows.some((row) => row.pattern === pattern && own(row)));
  const taken = fresh.map((pattern) => ({ pattern, pid: params.pid, startToken: params.startToken, agentId: agent, command: params.command, acquiredAt }));
  takeCommandLocks(directory, taken, rows.filter((row) => !own(row)).map((row) => row.pattern));
  if (gated) spendGrant(directory, action, agent);
  return { verdict: "run", patterns: wanted };
}

export function unlockCommand(directory: OrchDir, params: ParamsOf<"command-unlock">): ResultOf<"command-unlock"> {
  releaseCommandLocks(directory, params.pid, params.startToken);
  return { ok: true };
}
