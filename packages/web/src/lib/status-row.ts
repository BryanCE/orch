import type { DaemonStatusRow } from "@orch/types/daemon.ts";
import { isDaemonStatusRow } from "@orch/daemon/rpc/protocol.ts";

/** The web view never carries orch's filesystem-only status fields. */
export type WebStatusRow = Omit<DaemonStatusRow, "presenceDir" | "presenceOnly">;

/** Keep only complete daemon status rows; malformed rows are not repaired. */
export function daemonStatusRows(value: unknown): WebStatusRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isDaemonStatusRow);
}
