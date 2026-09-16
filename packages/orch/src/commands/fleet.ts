// The fleet as orchd holds it: one RPC answers views, presence and entities.
// A command reads it once and passes the snapshot down; nothing memoizes it.
import { readRpc } from "./daemon.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { DaemonClient } from "../types/services.ts";
export type FleetSnapshot = ResultOf<"fleet">;

export function readFleet(services: DaemonClient, skipBackends = false): Promise<FleetSnapshot> {
  return readRpc(services, "fleet", skipBackends ? { skipBackends: true } : undefined);
}

