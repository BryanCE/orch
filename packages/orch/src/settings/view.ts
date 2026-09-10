import { dim } from "../tui/screen.ts";
import { displaySetting, displayValue } from "./display.ts";
import { repairChoicesFor } from "./repair.ts";
import type { EditorSetting, RepairChoice, SettingsDefect } from "../types/settings.ts";

/**
 * Pure frame builders for the full-screen settings editor.
 *
 * Everything here maps state to strings — no terminal I/O, no key handling, no
 * settings logic. The shell owns the screen and the reducer owns the edits; this
 * module only draws, which is what makes the whole screen testable as text.
 */

const ESC = `${String.fromCharCode(27)}[`;
const bold = (text: string): string => `${ESC}1m${text}${ESC}22m`;
const inverse = (text: string): string => `${ESC}7m${text}${ESC}27m`;
const yellow = (text: string): string => `${ESC}33m${text}${ESC}39m`;
const cyan = (text: string): string => `${ESC}36m${text}${ESC}39m`;
const red = (text: string): string => `${ESC}31m${text}${ESC}39m`;

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

// ASCII only, here and in every glyph below: a terminal that is not decoding UTF-8 renders
// arrows and boxes as mojibake, and a settings editor nobody can read is not a fallback.
export const BROWSE_KEYBAR = "up/down move | enter edit | ctrl+d use default | type to filter | esc quit";
export const SELECT_KEYBAR = "up/down choose | enter save | esc cancel";
export const MULTI_KEYBAR = "up/down move | space toggle | enter save | esc cancel";
export const SINKS_KEYBAR = "up/down move | space toggle | e edit value | w when it fires | enter save | esc cancel";
export const INPUT_KEYBAR = "enter save | ctrl+u clear | esc cancel";

function matchesFilter(entry: EditorSetting, filter: string): boolean {
  const needle = filter.toLowerCase();
  // Help too: nobody looking for a notification sound guesses the key is called `notify`.
  return entry.spec.key.toLowerCase().includes(needle)
    || entry.spec.group.toLowerCase().includes(needle)
    || entry.spec.help.toLowerCase().includes(needle);
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
  return text.length <= width ? text : `${text.slice(0, Math.max(0, width - 3))}...`;
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
    const value = fit(displaySetting(entry.value, entry.spec.type), valueWidth);
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
    index === cursor ? inverse(` > (*) ${choice}`) : `   ( ) ${choice}`);
}

/** Overlay for a multi edit: checkboxes, the cursor row highlighted. `notes` is what a
 *  choice carries beyond being on or off - the command a sink runs, the URL it posts to. */
export function multiOverlay(
  choices: readonly string[],
  cursor: number,
  selected: readonly string[],
  notes?: Readonly<Record<string, string>>,
): string[] {
  const width = Math.max(0, ...choices.map((choice) => choice.length));
  return choices.map((choice, index) => {
    const box = selected.includes(choice) ? "[x]" : "[ ]";
    const note = notes?.[choice] ?? "";
    const text = note === "" ? choice : `${choice.padEnd(width)}  ${note}`;
    return index === cursor ? inverse(` > ${box} ${text}`) : `   ${box} ${text}`;
  });
}

/** The input line with its cursor drawn in inverse video. @clack's own
 *  `userInputWithCursor` draws U+2588, which is mojibake on a terminal not decoding UTF-8. */
export function inputCursor(text: string, cursor: number): string {
  const at = Math.max(0, Math.min(text.length, cursor));
  const under = text.slice(at, at + 1);
  return `${text.slice(0, at)}${inverse(under === "" ? " " : under)}${text.slice(at + 1)}`;
}

/** Overlay for a text/integer/list edit: the input line, an example of what goes on it,
 *  and any validation error. The example is shown, never typed into the line. */
export function inputOverlay(
  key: string,
  inputWithCursor: string,
  error: string | undefined,
  example?: string,
): string[] {
  const lines = [` ${key} = ${inputWithCursor}`];
  if (example !== undefined && example !== "") lines.push(dim(` for example: ${example}`));
  if (error !== undefined && error !== "") lines.push(yellow(` ${error}`));
  return lines;
}

/** One repair screen: every defect in the file, the choice standing against each, and
 *  anything transient the frame shows. */
export interface RepairScreen {
  /** settings.json path, shown in the header. */
  readonly file: string;
  readonly defects: readonly SettingsDefect[];
  /** Index-aligned with `defects`. */
  readonly choices: readonly RepairChoice[];
  readonly focusedIndex: number;
  readonly status: string | undefined;
}

export const REPAIR_KEYBAR = "up/down move | r rename | s set | d drop | l leave | enter save | esc quit without saving";

/** What one standing choice will do to the file, in the words of the thing it does. */
export function repairActionLabel(defect: SettingsDefect, choice: RepairChoice): string {
  if (choice === "rename") return `rename -> ${defect.suggestion ?? ""}`;
  if (choice === "set") return `set ${displayValue(defect.expected)}`;
  if (choice === "drop") return "drop";
  return "leave";
}

/** The keys this defect answers to, so the person is never guessing which ones apply. */
function offeredKeys(defect: SettingsDefect): string {
  const keys = repairChoicesFor(defect).map((choice) => choice.slice(0, 1));
  return `offers: ${keys.join(" ")}`;
}

/** One defect row, plain: cursor, key, the value the person wrote, and what is wrong. */
function repairRowText(defect: SettingsDefect, focused: boolean, pathWidth: number): string {
  const path = (defect.path === "" ? "(whole file)" : defect.path).padEnd(pathWidth);
  const value = defect.value === undefined ? "" : `= ${displayValue(defect.value)}`;
  return `${focused ? " > " : "   "}${path}  ${value}  ${defect.problem}`;
}

function repairLines(screen: RepairScreen, columns: number): ListLines {
  const pathWidth = Math.max(0, ...screen.defects.map((defect) => defect.path.length));
  const lines: string[] = [];
  let focusLine = 0;
  for (const [index, defect] of screen.defects.entries()) {
    const choice = screen.choices[index] ?? "leave";
    const focused = index === screen.focusedIndex;
    // Width is measured on the plain text and the tag is appended after fitting, so an
    // escape sequence can never be counted as a column the way it once was.
    const tag = `[${repairActionLabel(defect, choice)}]`;
    const text = fit(repairRowText(defect, focused, pathWidth), columns - 1 - tag.length - 2);
    if (focused) {
      focusLine = lines.length;
      lines.push(inverse(`${text}  ${tag}`));
      continue;
    }
    // A standing choice is the only thing on this screen that differs from the file on
    // disk, so it is the only thing that carries colour off the cursor.
    lines.push(`${text}  ${choice === "leave" ? dim(tag) : cyan(tag)}`);
  }
  return { lines, focusLine };
}

/**
 * The repair screen: every key in settings.json the schema will not accept, and the one
 * choice standing against each. Nothing here has touched the file — the frame is a
 * proposal until the person saves, which is why a value they typed can sit under a
 * "leave" forever without orch deciding it was junk.
 */
export function repairFrame(screen: RepairScreen, columns: number, rows: number): string {
  const { lines, focusLine } = repairLines(screen, columns);
  const focused = screen.defects[screen.focusedIndex];
  const count = screen.defects.length;
  const headline = `${count} ${count === 1 ? "key" : "keys"} in this file cannot be read. Nothing changes until you save.`;

  const chrome = 1 + 1 + 1 + 1 + 1 + 1 + 1;
  const budget = Math.max(3, rows - chrome);
  const { start, end } = windowBounds(lines.length, focusLine, budget);
  const windowed = lines.slice(start, end);
  if (start > 0 && windowed.length > 0) windowed[0] = dim(` ^ ${start} more`);
  if (end < lines.length && windowed.length > 0) windowed[windowed.length - 1] = dim(` v ${lines.length - end} more`);

  // Every chrome line is fitted too: a headline or keybar longer than the terminal
  // wraps, and a wrapped line pushes the whole frame down a row on every render.
  return [
    `${bold(" orch settings")} ${red("repair")}  ${dim(fit(screen.file, Math.max(0, columns - 24)))}`,
    dim(fit(` ${headline}`, columns - 1)),
    "",
    ...windowed,
    "",
    dim(fit(` ${focused === undefined ? "" : offeredKeys(focused)}`, columns - 1)),
    dim(fit(` ${REPAIR_KEYBAR}`, columns - 1)),
    screen.status === undefined ? "" : yellow(fit(` ${screen.status}`, columns - 1)),
  ].join("\n");
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

  const filterLine = screen.filter === "" ? [] : [cyan(` filter: ${screen.filter}_`)];
  const overlayLines = overlay ?? [];
  const chrome = 1 + filterLine.length + 1 + 1 + 1 + overlayLines.length + 1 + 1;
  const budget = Math.max(3, rows - chrome);

  const { start, end } = windowBounds(lines.length, focusLine, budget);
  const windowed = lines.slice(start, end);
  if (start > 0 && windowed.length > 0) windowed[0] = dim(` ^ ${start} more`);
  if (end < lines.length && windowed.length > 0) windowed[windowed.length - 1] = dim(` v ${lines.length - end} more`);
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
