import type { CheckResult } from "../doctor-types.ts";
import { onPath } from "./shared.ts";

export type BinaryStatus = Record<string, boolean>;

export function binaryStatus(ids: readonly string[]): BinaryStatus {
  return Object.fromEntries(ids.map((id) => [id, onPath(id)]));
}

export function checkBins(bins: BinaryStatus, ids: readonly string[]): CheckResult {
  const missing = ids.filter((id) => !bins[id]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: ids.length ? `${ids.join(" and ")} ${ids.length === 1 ? "is" : "are"} on PATH` : "no adapters installed" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "fail",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH`,
  };
}
