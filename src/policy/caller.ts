import { launchCredential } from "../identity/launch.ts";
import type { CallerKind } from "../types/policy.ts";

export type { CallerKind };

/** Whether orch launched this process as a spawned agent. */
export function callerKind(): CallerKind {
  return launchCredential() === null ? "human" : "agent";
}
