import { agentView } from "../store/agent-view.ts";
import { holdsLease } from "../store/lease-rows.ts";
import { isDescendantOf } from "./provenance.ts";
import type { OrchDir, SelfIdentity } from "../types/core.ts";
import type { CallerKind, CloseAuthority } from "../types/policy.ts";

/** Who may END an agent: the human, anything; an agent, what it owns: itself, what it spawned, what it adopted. */
export type { CloseAuthority };

/** The operator is the human, registered or not. Any other caller without a row has no authority: null. */
export function callerAuthority(kind: CallerKind, self: SelfIdentity | null): CloseAuthority | null {
  if (kind === "operator") return { kind: "human" };
  return self === null ? null : { kind: "agent", agentId: self.id };
}

/** Whether ownerId owns agentId: itself, a provenance descendant at any depth, or an agent it holds an open lease on. */
export function ownsAgent(orchDir: OrchDir, ownerId: string, agentId: string): boolean {
  return ownerId === agentId
    || isDescendantOf((id) => agentView(orchDir, id), agentId, ownerId)
    || holdsLease(orchDir, agentId, ownerId);
}

/**
 * `null` when the caller may end this agent; otherwise the refusal to print.
 * A refusal names the owner so the caller knows who to ask.
 */
export function refuseClose(orchDir: OrchDir, authority: CloseAuthority, agentId: string): string | null {
  if (authority.kind === "human") return null;
  if (ownsAgent(orchDir, authority.agentId, agentId)) return null;
  const view = agentView(orchDir, agentId);
  const name = view?.name ?? agentId;
  const owner = view?.spawnedByName ?? view?.spawnedBy;
  return owner === null || owner === undefined
    ? `cannot close ${name}: it is not yours to close. Ask the user.`
    : `cannot close ${name}: it belongs to ${owner}. Ask ${owner}, or ask the user.`;
}
