import { agentById } from "../store/agent-rows.ts";
import { callerCredential } from "../identity/credential.ts";
import type { CallerCredential, OrchDir } from "../types/core.ts";
import type { CallerKind } from "../types/policy.ts";

export type { CallerKind };

/** The harness id an operator registers under: a bare shell driving orch, with no
 *  adapter, no bridge and no shim. Doctor never asks it for one. */
export const OPERATOR_HARNESS_ID = "cli";

/** Classify the caller from its harness marker and, for workers, its claim. */
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
  return session === null ? "operator" : "session";
}

export function callerKind(orchDir: OrchDir): CallerKind {
  return callerKindOf(orchDir, callerCredential());
}
