// Ownership scope, and ownership scope only: which agents belong to the caller.
//
// Rule 11 keeps identity and environment apart, and makes ownership a lease. The
// question "is this agent mine" therefore has exactly two inputs — the open lease
// and the immutable spawner — and exactly one answer, which lives here. `orch
// events` asks it per streamed transition, `orch status` asks it per row; a second
// copy of the rule in either command would be a second truth about who owns what.
import { launchCredential } from "../identity/launch.ts";
import { callerSession, selfId } from "../identity/self.ts";
import { rpcRegisterSession } from "../daemon/reach.ts";
import type { AgentScopeInput, CallerScopeChoice, ResolvedCallerScope } from "../types/policy.ts";

export function agentInMineScope(input: Omit<AgentScopeInput, "anyAgent">): boolean {
  if (input.mineAddress === undefined || input.mineAddress.length === 0) return false;
  // A live foreign lease excludes the agent even when this session originally spawned it.
  if (input.leaseOwner !== null && input.leaseOwner !== input.mineAddress) return false;
  return input.leaseOwner === input.mineAddress || input.recordSpawnedBy === input.mineAddress;
}

export function agentInScope(input: AgentScopeInput): boolean {
  return input.anyAgent || agentInMineScope(input);
}

/**
 * The address this process owns agents under, or null when it owns none.
 *
 * A spawned agent carries its minted id at launch. A DRIVING session carries a
 * harness session token instead, which resolves to the id `register-session`
 * minted for it — and registering is worth doing, because an orchestrator that
 * has not spawned yet still wants its own scope.
 *
 * A bare shell is the human at the wheel: no launch credential, no harness
 * session. It owns nothing, so scoping it to "its" agents would answer the
 * fleet question with an empty table. Null here is what makes the default
 * unscoped for a human and scoped for an orch, with no flag on either side.
 */
export async function callerScopeAddress(directory: string, options: { register?: boolean } = {}): Promise<string | undefined> {
  const launched = launchCredential();
  if (launched !== null) return launched;
  if (callerSession() === null) return undefined;
  const known = selfId();
  if (known !== undefined) return known;
  // Registration needs the daemon; an offline read takes the unregistered answer.
  if (options.register === false) return undefined;
  return (await rpcRegisterSession(directory)).id;
}

/**
 * Turn the caller's flag (or its absence) into the filter the listing applies.
 *
 * `auto` is identity, not environment (Rule 11): what decides is whether orch
 * has an id for this process, never which plexer, cwd or terminal it sits in.
 */
export async function resolveCallerScope(
  choice: CallerScopeChoice,
  directory: string,
  options: { register?: boolean } = {},
): Promise<ResolvedCallerScope> {
  if (choice === "any") return { mine: false, address: undefined };
  const address = await callerScopeAddress(directory, options);
  if (choice === "mine") return { mine: true, address };
  return { mine: address !== undefined, address };
}
