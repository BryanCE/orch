import { agentView } from "../store/agent-view.ts";
import { holdsLease } from "../store/lease-rows.ts";
import { isDescendantOf } from "./provenance.ts";
import type { OrchDir, SelfIdentity } from "../types/core.ts";
import type { CloseAuthority } from "../types/policy.ts";

/** Who may END an agent: the human, anything; an agent, what it owns: itself, what it spawned, what it adopted. */
export type { CloseAuthority };

export function callerAuthority(self: SelfIdentity | null): CloseAuthority {
  return self === null ? { kind: "human" } : { kind: "agent", agentId: self.id };
}

/**
 * `null` when the caller may end this agent; otherwise the refusal to print.
 * A refusal names the owner so the caller knows who to ask.
 */
export function refuseClose(orchDir: OrchDir, authority: CloseAuthority, agentId: string): string | null {
  if (authority.kind === "human") return null;
  // Acting on yourself is not driving anyone else's fleet.
  if (authority.agentId === agentId) return null;
  // Spawning an agent is owning it, at any depth.
  if (isDescendantOf((id) => agentView(orchDir, id), agentId, authority.agentId)) return null;
  // Adopting an agent is owning it.
  if (holdsLease(orchDir, agentId, authority.agentId)) return null;
  const view = agentView(orchDir, agentId);
  const name = view?.name ?? agentId;
  const owner = view?.spawnedByName ?? view?.spawnedBy;
  return owner === null || owner === undefined
    ? `cannot close ${name}: it is not yours to close. Ask the user.`
    : `cannot close ${name}: it belongs to ${owner}. Ask ${owner}, or ask the user.`;
}
