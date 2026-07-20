// Shared transcript text extraction for claude-format JSONL, used by both the
// claude adapter and the in-process claude shim. Node built-ins + util.ts only,
// so a standalone shim bundle can pull it without dragging store/config in.
import { isRecord, textValue, type JsonRecord } from "../util.ts";

/**
 * Flatten a transcript content value to text. Strings pass through
 * {@link textValue} (blank → undefined); array parts are kept with the filter
 * `part !== undefined`, never truthiness — a defined-but-falsy part must not be
 * silently dropped. Records are searched for the known text-bearing keys.
 */
export function contentText(value: unknown): string | undefined {
  if (typeof value === "string") return textValue(value);
  if (Array.isArray(value)) {
    const parts = value.map(contentText).filter((part): part is string => part !== undefined);
    return parts.length ? parts.join("\n") : undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const key of ["text", "output_text", "output-text", "content"]) {
    const text = contentText(value[key]);
    if (text !== undefined) return text;
  }
  return undefined;
}

/**
 * Assistant text from a single transcript record. Handles both a role field and
 * Claude's `{type:"assistant"}` / `{type:"assistant_message"}` wrappers, and
 * recurses through the common nesting keys (`data`/`payload`/`item`).
 */
export function assistantText(record: JsonRecord): string | undefined {
  const message = isRecord(record.message) ? record.message : undefined;
  const role = record.role ?? message?.role;
  if (role === "assistant" || record.type === "assistant" || record.type === "assistant_message") {
    return contentText(record.content ?? message?.content ?? record.text ?? message?.text);
  }
  for (const key of ["data", "payload", "item"]) {
    if (isRecord(record[key])) {
      const text = assistantText(record[key]);
      if (text !== undefined) return text;
    }
  }
  return undefined;
}

/** The last assistant text in a claude-format JSONL transcript, or undefined when none. */
export function lastAssistantFromJsonl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let last: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of records) {
        if (!isRecord(item)) continue;
        const text = assistantText(item);
        if (text !== undefined) last = text;
      }
    } catch {
      // Transcript files are JSONL; skip malformed/log lines.
    }
  }
  return last;
}
