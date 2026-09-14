import type { DaemonStatusRow } from "@orch/types/daemon.ts";
import { isDaemonStatusRow } from "@orch/daemon/rpc/protocol.ts";

/** Keep only complete daemon status rows; malformed rows are not repaired. */
export function daemonStatusRows(value: unknown): DaemonStatusRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isDaemonStatusRow);
}
