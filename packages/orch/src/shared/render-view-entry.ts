import { ARROW, collapse, truncate } from "../util.ts";
import type { SessionViewEntry } from "../types/adapter.ts";

function hms(timestamp: string | undefined): string {
  const when = timestamp ? new Date(timestamp) : null;
  if (!when || isNaN(when.getTime())) return "        ";
  return when.toTimeString().slice(0, 8);
}

/** Lay out one normalized session-view turn as a tail row, or undefined to skip a pure-thinking turn. */
export function renderViewEntry(entry: SessionViewEntry): string | undefined {
  const time = hms(entry.timestamp);
  if (entry.role === "user") {
    const text = collapse(entry.text ?? "");
    return text ? `${time} user      | ${truncate(text, 200)}` : undefined;
  }
  if (entry.role === "assistant") {
    const text = collapse(entry.text ?? "");
    if (text) return `${time} assistant | ${truncate(text, 200)}`;
    if (entry.toolCalls?.length) {
      const calls = entry.toolCalls.map((call) => `${call.name}(${collapse(truncate(call.arg, 60))})`).join(", ");
      return `${time} assistant | [tools] ${calls}`;
    }
    return undefined;
  }
  const mark = entry.isError ? " [err]" : "";
  return `${time} tool      | ${entry.tool ?? "tool"}${mark} ${ARROW} ${truncate(collapse(entry.text ?? ""), 120)}`;
}
