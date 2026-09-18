import type { FleetStatus } from "@orch/types/daemon.ts";
import { isFleetStatus } from "@orch/daemon/client/protocol.ts";

const EMPTY_FLEET: FleetStatus = { names: { agents: {}, spaces: {} }, rows: [] };

/** orchd's `status` reply as the web reads it; a malformed reply is an empty fleet, never repaired. */
export function fleetStatusOf(value: unknown): FleetStatus {
  return isFleetStatus(value) ? value : EMPTY_FLEET;
}
