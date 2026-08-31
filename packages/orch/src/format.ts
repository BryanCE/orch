/** Format an epoch-millisecond timestamp for deterministic human-readable output. */
export function formatTimestamp(timestamp: number, precision: "minute" | "second" = "second"): string {
  const when = new Date(timestamp);
  if (!Number.isFinite(when.getTime())) return "?";
  const formatted = when.toISOString().replace("T", " ");
  return precision === "minute" ? formatted.slice(0, 16) : formatted.slice(0, 19);
}
