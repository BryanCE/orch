import type { EditorSetting } from "../types/config.ts";

/**
 * Pure frame builders for the full-screen settings editor.
 *
 * Everything here maps state to strings — no terminal I/O, no key handling, no
 * settings logic. The shell owns the screen and the reducer owns the edits; this
 * module only draws, which is what makes the whole screen testable as text.
 */

const ESC = `${String.fromCharCode(27)}[`;
const dim = (text: string): string => `${ESC}2m${text}${ESC}22m`;
const bold = (text: string): string => `${ESC}1m${text}${ESC}22m`;
const inverse = (text: string): string => `${ESC}7m${text}${ESC}27m`;
const yellow = (text: string): string => `${ESC}33m${text}${ESC}39m`;
const cyan = (text: string): string => `${ESC}36m${text}${ESC}39m`;

const SGR_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Drop SGR styling so tests and width math can reason about the plain text. */
export function stripAnsi(text: string): string {
  return text.replace(SGR_PATTERN, "");
}

/** One editor screen: the full entry list plus everything transient the frame shows. */
export interface SettingsScreen {
  /** settings.json path, shown in the header. */
  readonly file: string;
  readonly entries: readonly EditorSetting[];
  readonly focusedIndex: number;
  readonly filter: string;
  readonly status: string | undefined;
}

export const BROWSE_KEYBAR = "↑/↓ move · enter edit · ctrl+d use default · type to filter · esc quit";
export const SELECT_KEYBAR = "↑/↓ choose · enter save · esc cancel";
export const MULTI_KEYBAR = "↑/↓ move · space toggle · enter save · esc cancel";
export const INPUT_KEYBAR = "enter save · esc cancel";

export function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? "(none)";
}

function matchesFilter(entry: EditorSetting, filter: string): boolean {
  const needle = filter.toLowerCase();
  return entry.spec.key.toLowerCase().includes(needle) || entry.spec.group.toLowerCase().includes(needle);
}

/** Indices into `entries` that survive the filter, in display order. */
export function visibleEntryIndices(entries: readonly EditorSetting[], filter: string): number[] {
  const indices: number[] = [];
  for (const [index, entry] of entries.entries()) {
    if (filter === "" || matchesFilter(entry, filter)) indices.push(index);
  }
  return indices;
}

/** The window of `total` lines that keeps `focus` visible inside `budget` rows. */
export function windowBounds(total: number, focus: number, budget: number): { start: number; end: number } {
  if (total <= budget) return { start: 0, end: total };
  const half = Math.floor(budget / 2);
  const start = Math.min(Math.max(0, focus - half), total - budget);
  return { start, end: start + budget };
}

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`;
}

function sourceTag(entry: EditorSetting): string {
  if (entry.override !== undefined) return `[env: ${entry.override}]`;
  if (entry.spec.write === undefined) return "[read-only]";
  if (entry.source !== undefined && entry.source !== "settings.json") return `[${entry.source}]`;
  return "";
}

interface ListLines {
  readonly lines: readonly string[];
  /** Index into `lines` of the focused row, or 0 when nothing is visible. */
  readonly focusLine: number;
}

function listLines(screen: SettingsScreen, visible: readonly number[], columns: number): ListLines {
  const keyWidth = Math.max(0, ...visible.map((index) => screen.entries[index]?.spec.key.length ?? 0));
  const lines: string[] = [];
  let focusLine = 0;
  let group = "";
  for (const index of visible) {
    const entry = screen.entries[index];
    if (entry === undefined) continue;
    if (entry.spec.group !== group) {
      group = entry.spec.group;
      lines.push(cyan(bold(` ${group}`)));
    }
    const focused = index === screen.focusedIndex;
    const tag = sourceTag(entry);
    const valueWidth = columns - 3 - keyWidth - 2 - (tag === "" ? 0 : tag.length + 2);
    const value = fit(displayValue(entry.value), valueWidth);
    const plain = `${focused ? " > " : "   "}${entry.spec.key.padEnd(keyWidth)}  ${value}${tag === "" ? "" : `  ${tag}`}`;
    if (focused) {
      focusLine = lines.length;
      lines.push(inverse(fit(plain, columns - 1)));
    } else {
      lines.push(`${fit(plain.slice(0, plain.length - tag.length), columns - 1 - tag.length)}${tag === "" ? "" : dim(tag)}`);
    }
  }
  return { lines, focusLine };
}

/** Overlay for a choice edit: the option list with the cursor row highlighted. */
export function selectOverlay(choices: readonly string[], cursor: number): string[] {
  return choices.map((choice, index) =>
    index === cursor ? inverse(` > ● ${choice}`) : `   ○ ${choice}`);
}

/** Overlay for a multi edit: checkboxes, the cursor row highlighted. */
export function multiOverlay(choices: readonly string[], cursor: number, selected: readonly string[]): string[] {
  return choices.map((choice, index) => {
    const box = selected.includes(choice) ? "◼" : "◻";
    return index === cursor ? inverse(` > ${box} ${choice}`) : `   ${box} ${choice}`;
  });
}

/** Overlay for a text/integer/list edit: the input line and any validation error. */
export function inputOverlay(key: string, inputWithCursor: string, error: string | undefined): string[] {
  const lines = [` ${key} = ${inputWithCursor}`];
  if (error !== undefined && error !== "") lines.push(yellow(` ${error}`));
  return lines;
}

/**
 * Assemble the complete frame: header, filter line, windowed list, focused help,
 * optional edit overlay, keybar, status. Always the same line structure so the
 * screen never jumps between renders.
 */
export function settingsFrame(
  screen: SettingsScreen,
  columns: number,
  rows: number,
  overlay: readonly string[] | undefined,
  keybar: string,
): string {
  const visible = visibleEntryIndices(screen.entries, screen.filter);
  const { lines, focusLine } = listLines(screen, visible, columns);
  const focused = screen.entries[screen.focusedIndex];

  const filterLine = screen.filter === "" ? [] : [cyan(` filter: ${screen.filter}▌`)];
  const overlayLines = overlay ?? [];
  const chrome = 1 + filterLine.length + 1 + 1 + 1 + overlayLines.length + 1 + 1;
  const budget = Math.max(3, rows - chrome);

  const { start, end } = windowBounds(lines.length, focusLine, budget);
  const windowed = lines.slice(start, end);
  if (start > 0 && windowed.length > 0) windowed[0] = dim(` ↑ ${start} more`);
  if (end < lines.length && windowed.length > 0) windowed[windowed.length - 1] = dim(` ↓ ${lines.length - end} more`);
  if (windowed.length === 0) windowed.push(dim(` no settings match ${JSON.stringify(screen.filter)}`));

  const frame = [
    `${bold(" orch settings")}  ${dim(screen.file)}`,
    ...filterLine,
    "",
    ...windowed,
    "",
    dim(` ${focused?.spec.help ?? ""}`),
    ...overlayLines,
    dim(` ${keybar}`),
    screen.status === undefined ? "" : yellow(` ${screen.status}`),
  ];
  return frame.join("\n");
}
