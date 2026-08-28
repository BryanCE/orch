/**
 * Transcript rendering for the takeover view: an orch agent's session file,
 * parsed by orch's own reader, turned into plain wrapped lines.
 *
 * Adapted from Ben Davis's transcript renderer (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/ui/transcript.ts): same sanitize → wrap → prefix
 * treatment, but the items come from `parseSession` on the agent's session
 * file instead of an in-process event stream — the agent lives in its own
 * pane; this is a window, not a host.
 */
import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import { blockText, isToolCallContentBlock, parseSession, type SessionEntry } from "../../session.ts";

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

/**
 * Strip raw ANSI codes, expand tabs, and drop control chars. Terminal-expanded
 * tabs (and stray escapes) make lines wider than the width declared to the
 * TUI, which desyncs the renderer and smears the overlay.
 */
function sanitizeText(text: string): string {
  return text
    .replace(ANSI_PATTERN, "")
    .replaceAll("\t", "  ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
}

function pushWrapped(out: string[], text: string, width: number, firstPrefix: string, restPrefix: string, style: (line: string) => string): void {
  const wrapped = wrapTextWithAnsi(text, Math.max(10, width - 2));
  for (let i = 0; i < wrapped.length; i++) {
    const line = wrapped[i];
    if (line === undefined) continue;
    out.push(truncateToWidth((i === 0 ? firstPrefix : restPrefix) + style(line), width));
  }
}

function renderEntry(theme: Theme, entry: SessionEntry, width: number, out: string[]): void {
  const message = entry.message;
  if (entry.type !== "message" || !message) return;

  if (message.role === "user") {
    const clean = sanitizeText(blockText(message.content)).trim();
    if (!clean) return;
    pushWrapped(out, clean, width, theme.fg("accent", "> "), "  ", (line) => theme.fg("userMessageText", line));
    return;
  }

  if (message.role === "assistant") {
    const blocks = Array.isArray(message.content) ? message.content : undefined;
    if (blocks) {
      for (const block of blocks) {
        if (isToolCallContentBlock(block)) {
          const preview = block.arguments ? sanitizeText(JSON.stringify(block.arguments)).slice(0, 200) : "";
          const line = theme.fg("muted", "→ ")
            + theme.fg("toolTitle", block.name ?? "tool")
            + (preview && preview !== "{}" ? theme.fg("dim", ` ${preview}`) : "");
          out.push(truncateToWidth(line, width));
        } else if (block.type === "thinking") {
          const thinking = (block as { thinking?: unknown }).thinking;
          if (typeof thinking === "string") {
            pushWrapped(out, sanitizeText(thinking).trim(), width, theme.fg("dim", "~ "), "  ", (line) => theme.fg("muted", theme.italic(line)));
          }
        }
      }
    }
    const text = sanitizeText(blockText(message.content)).trim();
    if (text) {
      for (const line of wrapTextWithAnsi(text, width)) out.push(line);
    }
    return;
  }

  if (message.role === "toolResult") {
    const firstLine = sanitizeText(blockText(message.content))
      .split("\n")
      .find((line) => line.trim()) ?? "";
    const label = message.isError ? theme.fg("error", "  error: ") : theme.fg("dim", "  output: ");
    out.push(truncateToWidth(label + theme.fg("dim", firstLine || "(no output)"), width));
  }
}

export interface TranscriptCache {
  path?: string;
  lines: string[];
  readAt: number;
  width: number;
}

const READ_TTL_MS = 1_000;

/** Render an agent's session file as wrapped lines, re-reading at most 1Hz. */
export function transcriptLines(cache: TranscriptCache, sessionPath: string | undefined, width: number, theme: Theme): string[] {
  const now = Date.now();
  if (cache.path === sessionPath && cache.width === width && now - cache.readAt < READ_TTL_MS) {
    return cache.lines;
  }
  cache.path = sessionPath;
  cache.width = width;
  cache.readAt = now;
  if (!sessionPath) {
    cache.lines = [theme.fg("dim", "no session recorded for this agent yet")];
    return cache.lines;
  }
  const session = parseSession(sessionPath);
  if (!session.exists) {
    cache.lines = [theme.fg("dim", "session file not readable from this seat")];
    return cache.lines;
  }
  const out: string[] = [];
  for (const entry of session.entries) {
    const before = out.length;
    renderEntry(theme, entry, width, out);
    if (out.length > before) out.push("");
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  cache.lines = out;
  return out;
}
