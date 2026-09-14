import { launchCredential } from "../identity/launch.ts";
import { callerSession } from "../adapters/session-env.ts";
import { agentById } from "../store/agent-rows.ts";
import type { CallerKind } from "../types/policy.ts";
import type { OrchDir } from "../types/core.ts";

export type { CallerKind };

/** The harness id an operator registers under: a bare shell driving orch, with no
 *  adapter, no bridge and no shim. Doctor never asks it for one. */
export const OPERATOR_HARNESS_ID = "cli";

/** Classify the caller from its harness marker and, for workers, its claim. */
export function callerKind(orchDir: OrchDir): CallerKind {
  const session = callerSession();
  const id = launchCredential();
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
