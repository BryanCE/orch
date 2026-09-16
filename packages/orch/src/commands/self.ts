// The caller, as orchd sees it. A command asks once and reads fields; it never opens the store to learn who it is.
import { readRpc } from "./daemon.ts";
import { rpcRegisterSession } from "../daemon/client/reach.ts";
import { callerCredential } from "../identity/credential.ts";
import { die } from "../refusal.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { DaemonClient, Services } from "../types/services.ts";

export type CallerSelf = ResultOf<"self">;

export function whoAmI(services: DaemonClient): Promise<CallerSelf> {
  return readRpc(services, "self", { caller: callerCredential() });
}

/** Register a driving session when orchd has no identity row for it.
 * Operators and spawned agents never register themselves. */
export async function registerCallerSession(services: Pick<Services, "orchDir" | "logger"> & DaemonClient): Promise<void> {
  const self = await whoAmI(services);
  if (self.kind === "session" && self.id === null) await rpcRegisterSession(services.orchDir, services.logger);
}

/** Owner-gate overrides are operator-only. A spawned agent or a driving session may touch exactly what it holds. */
export function refuseNonOperatorOverride(self: Pick<CallerSelf, "kind">, flag: string): void {
  if (self.kind !== "operator") die(`${flag} is operator-only: a driving session may only touch agents it holds.`);
}
