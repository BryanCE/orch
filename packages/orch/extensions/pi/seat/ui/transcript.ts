/**
 * Transcript rendering for the takeover view: an orch agent's session, read by
 * orchd through the agent's harness wherever the agent runs, turned into plain
 * wrapped lines.
 *
 * Adapted from Ben Davis's transcript renderer (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/ui/transcript.ts): same sanitize → wrap → prefix
 * treatment, but the items come from orchd's session view of the agent instead
 * of an in-process event stream — the agent lives in its own pane; this is a
 * window, not a host.
 */
import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type { SessionRead, TranscriptCache } from "../types.ts";
import type { SessionViewEntry } from "orch/core/types/adapter.ts";

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

function renderEntry(theme: Theme, entry: SessionViewEntry, width: number, out: string[]): void {
  if (entry.role === "user") {
    const clean = sanitizeText(entry.text ?? "").trim();
    if (!clean) return;
    pushWrapped(out, clean, width, theme.fg("accent", "> "), "  ", (line) => theme.fg("userMessageText", line));
    return;
  }

  if (entry.role === "assistant") {
    for (const call of entry.toolCalls ?? []) {
      const preview = sanitizeText(call.arg).slice(0, 200);
      const line = theme.fg("muted", "→ ")
        + theme.fg("toolTitle", call.name)
        + (preview ? theme.fg("dim", ` ${preview}`) : "");
      out.push(truncateToWidth(line, width));
    }
    const text = sanitizeText(entry.text ?? "").trim();
    if (text) {
      for (const line of wrapTextWithAnsi(text, width)) out.push(line);
    }
    return;
  }

  const firstLine = sanitizeText(entry.text ?? "")
    .split("\n")
    .find((line) => line.trim()) ?? "";
  const label = entry.isError ? theme.fg("error", "  error: ") : theme.fg("dim", "  output: ");
  out.push(truncateToWidth(label + theme.fg("dim", firstLine || "(no output)"), width));
}

const READ_TTL_MS = 1_000;

function renderRead(read: SessionRead | null, width: number, theme: Theme): string[] {
  if (read === null) return [theme.fg("dim", "orchd did not answer the session read")];
  const origin = read.host === null ? [] : [theme.fg("dim", `read on host ${read.host}`)];
  const lookup = read.lookup;
  if (lookup.kind === "missing") return [...origin, theme.fg("dim", lookup.reason)];
  if (lookup.view === null) return [...origin, theme.fg("dim", `session ${lookup.sessionPath} is not readable by its harness`)];
  const out: string[] = [];
  for (const entry of lookup.view.entries ?? []) {
    const before = out.length;
    renderEntry(theme, entry, width, out);
    if (out.length > before) out.push("");
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return [...origin, ...out];
}

/** Render an agent's session as wrapped lines. Asks orchd at most once a second and
 *  calls `onRead` when an answer lands, so the view repaints with it. */
export function transcriptLines(
  cache: TranscriptCache,
  read: () => Promise<SessionRead | undefined>,
  onRead: () => void,
  width: number,
  theme: Theme,
): string[] {
  const now = Date.now();
  if (!cache.reading && now - cache.readAt >= READ_TTL_MS) {
    cache.reading = true;
    cache.readAt = now;
    void read()
      .then((answer) => { cache.read = answer ?? null; }, () => { cache.read = null; })
      .finally(() => {
        cache.reading = false;
        onRead();
      });
  }
  if (cache.read === undefined) return [theme.fg("dim", "reading the session through orch")];
  if (cache.rendered === cache.read && cache.width === width) return cache.lines;
  cache.rendered = cache.read;
  cache.width = width;
  cache.lines = renderRead(cache.read, width, theme);
  return cache.lines;
}
