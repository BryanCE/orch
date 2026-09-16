// Ownership scope, and ownership scope only: which agents belong to the caller.
//
// Rule 11 keeps identity and environment apart, and makes ownership a lease. The
// question "is this agent mine" therefore has exactly two inputs — the open lease
// and the immutable spawner — and exactly one answer, which lives here. `orch
// events` asks it per streamed transition, `orch status` asks it per row; a second
// copy of the rule in either command would be a second truth about who owns what.
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { AgentScopeInput, CallerScopeChoice, ResolvedCallerScope } from "../types/policy.ts";

export function agentInMineScope(input: Omit<AgentScopeInput, "spaceWide">): boolean {
  if (input.mineAddress === undefined || input.mineAddress.length === 0) return false;
  // A live foreign lease excludes the agent even when this session originally spawned it.
  if (input.leaseOwner !== null && input.leaseOwner !== input.mineAddress) return false;
  return input.leaseOwner === input.mineAddress || input.recordSpawnedBy === input.mineAddress;
}

export function agentInScope(input: AgentScopeInput): boolean {
  return input.spaceWide || agentInMineScope(input);
}

/**
 * Turn the caller's flag (or its absence) into the filter the listing applies.
 *
 * `auto` is identity, not environment (Rule 11): what decides is whether orch
 * has an id for this process, never which plexer, cwd or terminal it sits in.
 * A bare shell is the human at the wheel: orchd answers it with no id, it owns
 * nothing, and the default stays unscoped for it and scoped for an orch.
 */
export function resolveCallerScopeOf(choice: CallerScopeChoice, self: Pick<ResultOf<"self">, "id">): ResolvedCallerScope {
  if (choice === "any") return { mine: false, address: undefined };
  const address = self.id ?? undefined;
  if (choice === "mine") return { mine: true, address };
  return { mine: address !== undefined, address };
}

