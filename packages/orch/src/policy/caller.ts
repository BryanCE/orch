import { agentById } from "../store/agent-rows.ts";
import { callerCredential } from "../identity/credential.ts";
import { selfIdentityOf } from "../identity/self.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";
import type { CallerKind } from "../types/policy.ts";

export type { CallerKind };

/** Classify the caller from its harness marker and, for workers, its claim.
 *  The operator is a raw terminal: no harness marker and no launch credential, and no
 *  live agent above it. A process started inside an agent's tree is that agent and has
 *  its kind, never the human's. */
export function callerKindOf(orchDir: OrchDir, credential: CallerCredential): CallerKind {
  const session = credential.session;
  const id = credential.launch;
  if (id !== null) {
    const row = agentById(orchDir, id);
    const sessionToken = session?.sessionId;
    if (row?.claimedAt !== null && row?.claimedAt !== undefined
      && row.sessionToken !== null && row.sessionToken !== undefined
      && sessionToken !== null && sessionToken !== undefined
      && row.sessionToken === sessionToken) return "agent";
  }
  if (session !== null || id !== null) return "session";
  const self = selfIdentityOf(orchDir, credential);
  return (self === null ? null : agentById(orchDir, self.id)?.kind) ?? "operator";
}

export function callerKind(orchDir: OrchDir): CallerKind {
  return callerKindOf(orchDir, callerCredential());
}
