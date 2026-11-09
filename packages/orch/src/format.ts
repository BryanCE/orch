/** Format an epoch-millisecond timestamp for deterministic human-readable output. */
export function formatTimestamp(timestamp: number, precision: "minute" | "second" = "second"): string {
  const when = new Date(timestamp);
  if (!Number.isFinite(when.getTime())) return "?";
  const formatted = when.toISOString().replace("T", " ");
  return precision === "minute" ? formatted.slice(0, 16) : formatted.slice(0, 19);
}

/** A host whose link is down, said for a person: `bryan-swe offline, last seen 4m ago`, or
 *  `bryan-swe never reached`. */
export function formatHostOffline(host: string, lastSeen: number | null): string {
  return lastSeen === null ? `${host} never reached` : `${host} offline, last seen ${formatAge(lastSeen)} ago`;
}

/** How long ago an instant was, coarsest unit first: 42s, 5m, 3h, 2d. `?` for a value that names no instant. */
export function formatAge(ts: unknown): string {
  const when = typeof ts === "number"
    ? ts
    : new Date(typeof ts === "string" ? ts : JSON.stringify(ts) ?? "").getTime();
  if (!Number.isFinite(when)) return "?";
  const seconds = Math.max(0, Math.floor((Date.now() - when) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
