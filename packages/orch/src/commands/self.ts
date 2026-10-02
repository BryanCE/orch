// The caller, as orchd sees it. A command asks once and reads fields; it never opens the store to learn who it is.
import { readRpc } from "./daemon.ts";
import { rpcRegisterSession } from "../daemon/client/reach.ts";
import { announceUnleasedAgents } from "../daemon/client/registration.ts";
import { callerCredential } from "../identity/credential.ts";
import { die } from "../refusal.ts";
import type { CallerCredential } from "../types/core.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { DaemonClient, Services } from "../types/services.ts";

export type CallerSelf = ResultOf<"self">;

export function whoAmI(services: DaemonClient, caller: CallerCredential = callerCredential()): Promise<CallerSelf> {
  return readRpc(services, "self", { caller });
}

/** Register the caller when orchd has no row for it, and print its unleased list.
 * A raw terminal registers like a harness session; a spawned agent already has its row. */
export async function registerCaller(services: Pick<Services, "orchDir" | "logger"> & DaemonClient): Promise<void> {
  const self = await whoAmI(services);
  if (self.id === null) announceUnleasedAgents(await rpcRegisterSession(services.orchDir, services.logger));
}

/** The caller's orch id, which {@link registerCaller} recorded before the command ran. */
export function registeredId(self: Pick<CallerSelf, "id">): string {
  if (self.id === null) die("orch has no row for this caller; run orch whoami to register it.");
  return self.id;
}

export async function callerId(services: DaemonClient): Promise<string> {
  return registeredId(await whoAmI(services));
}

/** Owner-gate overrides are operator-only. A spawned agent or a driving session may touch exactly what it holds. */
export function refuseNonOperatorOverride(self: Pick<CallerSelf, "kind">, flag: string): void {
  if (self.kind !== "operator") die(`${flag} is operator-only: a driving session may only touch agents it holds.`);
}
