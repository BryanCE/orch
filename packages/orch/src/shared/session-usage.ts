// The usage a harness session records for one assistant turn: token counts and cost.
// Pure, so the bridge reading its own turns and orchd reading a session file share it.
import { isRecord } from "../util.ts";
import type { SessionUsage } from "../types/core.ts";

export function isSessionUsage(value: unknown): value is SessionUsage {
  if (!isRecord(value)) return false;
  const numeric = ["input", "output", "cacheRead", "cacheWrite"];
  if (numeric.some((key) => value[key] !== undefined && typeof value[key] !== "number")) return false;
  if (value.cost !== undefined && typeof value.cost !== "number") {
    if (!isRecord(value.cost) || (value.cost.total !== undefined && typeof value.cost.total !== "number")) return false;
  }
  return true;
}

export function sessionUsageCost(usage: SessionUsage): number {
  return typeof usage.cost === "number" ? usage.cost : usage.cost?.total ?? 0;
}
