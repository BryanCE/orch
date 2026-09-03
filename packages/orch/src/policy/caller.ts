import { launchCredential } from "../identity/launch.ts";
import { callerSession } from "../adapters/session-env.ts";
import { orchDir } from "../presence/writer.ts";
import { agentById } from "../store/agent-rows.ts";
import type { CallerKind } from "../types/policy.ts";

export type { CallerKind };

/** Whether this process is the claimed session for its launch credential. */
export function callerKind(): CallerKind {
  const id = launchCredential();
  if (id === null) return "human";
  const row = agentById(orchDir(), id);
  if (row === null) return "human";
  if (row.claimedAt === null || row.sessionToken === null) return "human";
  const sessionToken = callerSession()?.sessionId;
  return sessionToken !== undefined && sessionToken !== null && row.sessionToken === sessionToken ? "agent" : "human";
}
