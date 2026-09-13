import { launchCredential } from "../identity/launch.ts";
import { callerSession } from "../adapters/session-env.ts";
import { agentById } from "../store/agent-rows.ts";
import type { CallerKind } from "../types/policy.ts";

export type { CallerKind };

/** Classify the caller from its harness marker and, for workers, its claim. */
export function callerKind(orchDir: string): CallerKind {
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
