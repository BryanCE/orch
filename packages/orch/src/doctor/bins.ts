import { binaryOnPath } from "../util.ts";
import type { BinaryStatus, CheckResult } from "../types/doctor.ts";

export function binaryStatus(ids: readonly string[]): BinaryStatus {
  return Object.fromEntries(ids.map((id) => [id, binaryOnPath(id)]));
}

export function checkBins(bins: BinaryStatus, ids: readonly string[]): CheckResult {
  const missing = ids.filter((id) => !bins[id]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: ids.length ? `${ids.join(" and ")} ${ids.length === 1 ? "is" : "are"} on PATH` : "no adapters enabled" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "fail",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH`,
  };
}
