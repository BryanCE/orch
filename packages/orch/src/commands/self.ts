// The caller, as orchd sees it. A command asks once and reads fields; it never opens the store to learn who it is.
import { readRpc } from "./daemon.ts";
import { callerCredential } from "../identity/credential.ts";
import { die } from "../refusal.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { DaemonClient } from "../types/services.ts";

export type CallerSelf = ResultOf<"self">;

export function whoAmI(services: DaemonClient): Promise<CallerSelf> {
  return readRpc(services, "self", { caller: callerCredential() });
}

/** Owner-gate overrides are operator-only. A spawned agent or a driving session may touch exactly what it holds. */
export function refuseNonOperatorOverride(self: CallerSelf, flag: string): void {
  if (self.kind !== "operator") die(`${flag} is operator-only: a driving session may only touch agents it holds.`);
}
