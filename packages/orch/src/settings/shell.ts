import { getColumns, getRows, isCancel, MultiSelectPrompt, Prompt, SelectPrompt, TextPrompt } from "@clack/core";
import * as files from "node:fs";
import { loadSettings } from "./read.ts";
import { settingsPath } from "./schema.ts";
import { errorMessage, isRecord } from "../util.ts";
import { createEditorState, editorReducer } from "./editor.ts";
import { parseSettingValue } from "./parse.ts";
import { clearRegisteredSetting, SETTINGS_REGISTRY, writeRegisteredSetting } from "./registry.ts";
import {
  BROWSE_KEYBAR,
  inputCursor,
  INPUT_KEYBAR,
  inputOverlay,
  MULTI_KEYBAR,
  multiOverlay,
  repairFrame,
  SELECT_KEYBAR,
  selectOverlay,
  settingsFrame,
  SINKS_KEYBAR,
  visibleEntryIndices,
} from "./view.ts";
import { displayValue } from "./display.ts";
import { settingsDefects } from "./defects.ts";
import { createRepairState, plannedRepairs, repairReducer } from "./repair.ts";
import { applySettingsRepairs } from "./write.ts";
import type { RepairScreen, SettingsScreen } from "./view.ts";
import type { BrowsingState, EditingState, EditorSetting, EditorState, RepairChoice, RepairState, SettingKind, SettingSource, SettingSpec } from "../types/settings.ts";
import { CLEAR_SCREEN, CTRL_C, ENTER_ALT_SCREEN, EXIT_ALT_SCREEN } from "../tui/screen.ts";

/**
 * The full-screen settings editor: an alternate-screen TUI over the editor reducer.
 *
 * Layering: the reducer (editor.ts) owns every edit decision, view.ts owns every drawn
 * character, and this shell owns only the terminal session — @clack/core `Prompt`
 * instances for raw-mode key delivery and frame repainting, one per interaction mode.
 * Escape cancels the live prompt (core hard-wires that), so the shell runs a loop of
 * short-lived prompts over one persistent session: cancel from an edit falls back to
 * browsing, cancel from browsing quits.
 */

function rawValue(root: unknown, key: string): unknown {
  let current = root;
  for (const segment of key.split(".")) {
    if (!isRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

function sourceFor(spec: SettingSpec, raw: Record<string, unknown>): { source: SettingSource; override?: string } {
  if (spec.env !== undefined && process.env[spec.env] !== undefined) {
    return { source: "env", override: spec.env };
  }
  return rawValue(raw, spec.key) === undefined
    ? { source: "default" }
    : { source: "settings.json" };
}

/** Rebuild every row from disk so value and provenance always show what settings.json holds. */
function loadEntries(orchDir: string): EditorSetting[] {
  const settings = loadSettings(orchDir);
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(settingsPath(orchDir), "utf8"));
    if (isRecord(parsed)) raw = parsed;
  } catch (error: unknown) {
    throw new Error(`Could not read ${settingsPath(orchDir)}: ${errorMessage(error)}`);
  }
  return SETTINGS_REGISTRY.map((spec) => ({ spec, value: spec.read(settings), ...sourceFor(spec, raw) }));
}

/** Everything one editor run carries between prompts. Mutated by key handlers mid-render. */
interface Session {
  state: BrowsingState;
  filter: string;
  status: string | undefined;
  quit: boolean;
  /** Escape was spent clearing the filter, so the cancel it triggered must not quit. */
  escapeClearedFilter: boolean;
}

function asBrowsing(state: EditorState): BrowsingState {
  if (state.mode === "browsing") return state;
  return {
    mode: "browsing",
    settings: state.settings,
    focusedIndex: state.focusedIndex,
    pendingWrites: state.pendingWrites,
  };
}

/** Walk the reducer to an absolute index; movement stays a reducer decision. */
function moveTo(state: BrowsingState, index: number): BrowsingState {
  let current: EditorState = state;
  while (current.mode === "browsing" && current.focusedIndex < index) {
    current = editorReducer(current, { type: "move", direction: "down" });
  }
  while (current.mode === "browsing" && current.focusedIndex > index) {
    current = editorReducer(current, { type: "move", direction: "up" });
  }
  return asBrowsing(current);
}

/** Step focus to the next/previous row that survives the filter. */
function stepFocus(state: BrowsingState, filter: string, direction: "up" | "down"): BrowsingState {
  const visible = visibleEntryIndices(state.settings, filter);
  const first = visible[0];
  if (first === undefined) return state;
  const position = visible.indexOf(state.focusedIndex);
  if (position < 0) return moveTo(state, first);
  const target = visible[Math.max(0, Math.min(visible.length - 1, position + (direction === "down" ? 1 : -1)))];
  return target === undefined ? state : moveTo(state, target);
}

/** After the filter changes, snap focus onto a visible row if it fell off. */
function refocusVisible(session: Session): void {
  const visible = visibleEntryIndices(session.state.settings, session.filter);
  const first = visible[0];
  if (first === undefined || visible.includes(session.state.focusedIndex)) return;
  session.state = moveTo(session.state, first);
}

function screenOf(session: Session, orchDir: string): SettingsScreen {
  return {
    file: settingsPath(orchDir),
    entries: session.state.settings,
    focusedIndex: session.state.focusedIndex,
    filter: session.filter,
    status: session.status,
  };
}

/** Rebuild rows from disk and restore focus to `focusKey`. */
function reload(session: Session, orchDir: string, focusKey: string): void {
  const state = createEditorState(loadEntries(orchDir));
  const index = state.settings.findIndex((entry) => entry.spec.key === focusKey);
  session.state = index < 0 ? state : moveTo(state, index);
}

/** Clear the focused setting back to its default, or say why that is refused. */
function resetFocused(session: Session, orchDir: string): void {
  const entry = session.state.settings[session.state.focusedIndex];
  if (entry === undefined) return;
  const key = entry.spec.key;
  if (entry.override !== undefined) {
    session.status = `${key} is overridden by ${entry.override}`;
    return;
  }
  if (entry.spec.write === undefined) {
    session.status = `${key} is read-only`;
    return;
  }
  try {
    clearRegisteredSetting(orchDir, key);
    reload(session, orchDir, key);
    session.status = `${key} reset to default`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
}

/** Commit an edited value through the reducer, persist it, and re-read the file. */
function commitAndFlush(session: Session, orchDir: string, editing: EditingState, value: unknown): void {
  const key = editing.focused.spec.key;
  const committed = editorReducer(editing, { type: "commit", value });
  if (committed.mode === "editing") {
    session.status = committed.reason ?? `${key}: invalid value`;
    session.state = asBrowsing(editorReducer(committed, { type: "cancel" }));
    return;
  }
  try {
    for (const pending of committed.pendingWrites) writeRegisteredSetting(orchDir, pending.key, pending.value);
    session.status = `${key} saved`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
  reload(session, orchDir, key);
}

type BrowseOutcome = "open" | "again" | "quit";

/** One browsing prompt: navigate, filter, reset — until Enter opens or Escape/ctrl+c leaves. */
async function browseOnce(session: Session, orchDir: string): Promise<BrowseOutcome> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new Prompt<undefined>({
    render: () => settingsFrame(
      screenOf(session, orchDir),
      getColumns(process.stdout),
      getRows(process.stdout),
      undefined,
      BROWSE_KEYBAR,
    ),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name === "return") return;
    session.status = undefined;
    if (char === CTRL_C) {
      session.quit = true;
      return;
    }
    if (info.name === "escape") {
      if (session.filter === "") session.quit = true;
      else {
        session.filter = "";
        session.escapeClearedFilter = true;
        refocusVisible(session);
      }
      return;
    }
    if (info.name === "up" || info.name === "down") {
      session.state = stepFocus(session.state, session.filter, info.name);
      return;
    }
    if (info.name === "backspace") {
      session.filter = session.filter.slice(0, -1);
      refocusVisible(session);
      return;
    }
    if (info.ctrl === true && info.name === "d") {
      resetFocused(session, orchDir);
      return;
    }
    if (typeof char === "string" && char.length === 1 && char >= " " && info.ctrl !== true && info.meta !== true) {
      session.filter += char;
      refocusVisible(session);
    }
  });
  const answer = await prompt.prompt();
  if (!isCancel(answer)) {
    if (visibleEntryIndices(session.state.settings, session.filter).includes(session.state.focusedIndex)) return "open";
    session.status = `no settings match ${JSON.stringify(session.filter)}`;
    return "again";
  }
  if (session.escapeClearedFilter && !session.quit) {
    session.escapeClearedFilter = false;
    return "again";
  }
  return "quit";
}

async function editChoice(session: Session, orchDir: string, editing: EditingState, choices: readonly string[]): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new SelectPrompt<{ value: string }>({
    options: choices.map((value) => ({ value })),
    ...(typeof editing.draft === "string" && choices.includes(editing.draft) ? { initialValue: editing.draft } : {}),
    render() {
      return settingsFrame(
        screenOf(session, orchDir),
        getColumns(process.stdout),
        getRows(process.stdout),
        selectOverlay(choices, this.cursor),
        SELECT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer) || typeof answer !== "string") {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, orchDir, editing, answer);
}

/** Check any number of choices off a list. Null on cancel. */
async function askMulti(
  session: Session,
  orchDir: string,
  choices: readonly string[],
  initial: readonly string[],
): Promise<string[] | null> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new MultiSelectPrompt<{ value: string }>({
    options: choices.map((value) => ({ value })),
    initialValues: [...initial],
    required: false,
    render() {
      const selected = Array.isArray(this.value)
        ? this.value.filter((value): value is string => typeof value === "string")
        : [];
      return settingsFrame(
        screenOf(session, orchDir),
        getColumns(process.stdout),
        getRows(process.stdout),
        multiOverlay(choices, this.cursor, selected),
        MULTI_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer) || !Array.isArray(answer)) return null;
  return answer.filter((value): value is string => typeof value === "string");
}

async function editMulti(session: Session, orchDir: string, editing: EditingState, choices: readonly string[]): Promise<void> {
  const current = Array.isArray(editing.draft)
    ? editing.draft.filter((value): value is string => typeof value === "string")
    : [];
  const answer = await askMulti(session, orchDir, choices, current);
  if (answer === null) {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, orchDir, editing, answer);
}

/** What a text prompt was actually submitted with. @clack seeds `initialUserInput` into the
 *  LINE but not into `value`, so Enter on a prefilled prompt nobody typed into submits
 *  undefined - which is how a pre-filled answer used to vanish on Enter. */
function submittedText(prompt: TextPrompt, answer: unknown): string {
  return typeof answer === "string" && answer.length > 0 ? answer : prompt.userInput;
}

/** Ask for one value a chosen sink carries. Null on cancel. `initial` is only ever what is
 *  already recorded: a seeded line commits a value nobody typed. */
async function askValue(
  session: Session,
  orchDir: string,
  label: string,
  initial: string,
  example: string | undefined,
): Promise<string | null> {
  process.stdout.write(CLEAR_SCREEN);
  const prompt = new TextPrompt({
    initialUserInput: initial,
    validate: (value) => (value ?? "").trim() ? undefined : `${label} needs a value`,
    render() {
      return settingsFrame(
        screenOf(session, orchDir),
        getColumns(process.stdout),
        getRows(process.stdout),
        inputOverlay(label, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined, example),
        INPUT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) return null;
  return submittedText(prompt, answer);
}

type SinksKind = Extract<SettingKind, { kind: "sinks" }>;

/** Which sinks are on, what each carrying sink holds, which states each fires on, and
 *  where the cursor is. Checked order is the order the sinks are recorded in. A sink
 *  absent from `states` fires on the kind's default states. */
interface SinkPick {
  checked: string[];
  readonly values: Map<string, string>;
  readonly states: Map<string, readonly string[]>;
  cursor: number;
}

function initialPick(kind: SinksKind, draft: unknown): SinkPick {
  const pick: SinkPick = { checked: [], values: new Map(), states: new Map(), cursor: 0 };
  for (const entry of Array.isArray(draft) ? draft : []) {
    if (!isRecord(entry)) continue;
    const id: unknown = entry.id;
    if (typeof id !== "string" || !kind.choices.includes(id)) continue;
    pick.checked.push(id);
    const field = kind.fields[id];
    const carried: unknown = field === undefined ? undefined : entry[field.name];
    if (carried !== undefined) pick.values.set(id, displayValue(carried));
    const on: unknown = entry.on;
    if (Array.isArray(on)) pick.states.set(id, on.filter((state): state is string => typeof state === "string"));
  }
  return pick;
}

function firesOn(kind: SinksKind, pick: SinkPick, id: string): readonly string[] {
  return pick.states.get(id) ?? kind.defaultStates;
}

function carriedValue(pick: SinkPick, id: string): string {
  return (pick.values.get(id) ?? "").trim();
}

function checkSink(pick: SinkPick, id: string): void {
  if (!pick.checked.includes(id)) pick.checked.push(id);
}

function uncheckSink(pick: SinkPick, id: string): void {
  pick.checked = pick.checked.filter((checked) => checked !== id);
}

/** Toggling keeps the value, so turning a sink off and on does not retype its command. */
function toggleSink(pick: SinkPick, id: string): void {
  if (pick.checked.includes(id)) uncheckSink(pick, id);
  else checkSink(pick, id);
}

/** The picked sinks as the entries settings.json holds. */
function pickedSinks(kind: SinksKind, pick: SinkPick): Record<string, unknown>[] {
  return pick.checked.map((id) => {
    const field = kind.fields[id];
    return {
      id,
      ...(field === undefined ? {} : { [field.name]: carriedValue(pick, id) }),
      ...(pick.states.has(id) ? { on: [...firesOn(kind, pick, id)] } : {}),
    };
  });
}

/** What each sink carries and when it fires, shown beside its checkbox. */
function sinkNotes(kind: SinksKind, pick: SinkPick): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const id of kind.choices) {
    const field = kind.fields[id];
    const carried = field === undefined ? "" : carriedValue(pick, id) || `(no ${field.name} yet - press e)`;
    notes[id] = `${carried}${carried === "" ? "" : "  "}on ${firesOn(kind, pick, id).join(",")}`;
  }
  return notes;
}

type PickOutcome =
  | { readonly done: "save" | "cancel" }
  | { readonly done: "edit" | "when"; readonly id: string };

/** One pass of the sink picker: move, toggle, or hand back the sink whose value to edit.
 *  A value edit ends the prompt because a nested prompt cannot share raw-mode input. */
async function pickSinks(session: Session, orchDir: string, kind: SinksKind, pick: SinkPick): Promise<PickOutcome> {
  process.stdout.write(CLEAR_SCREEN);
  let outcome: PickOutcome = { done: "save" };
  const prompt = new Prompt<undefined>({
    render: () => settingsFrame(
      screenOf(session, orchDir),
      getColumns(process.stdout),
      getRows(process.stdout),
      multiOverlay(kind.choices, pick.cursor, pick.checked, sinkNotes(kind, pick)),
      SINKS_KEYBAR,
    ),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name === "return") return;
    session.status = undefined;
    if (info.name === "up" || info.name === "down") {
      const step = info.name === "down" ? 1 : -1;
      pick.cursor = Math.max(0, Math.min(kind.choices.length - 1, pick.cursor + step));
      return;
    }
    const id = kind.choices[pick.cursor];
    if (id === undefined) return;
    if (char === " " || info.name === "space") {
      toggleSink(pick, id);
      return;
    }
    const key = typeof char === "string" ? char.toLowerCase() : "";
    if (key === "e" || key === "w") {
      outcome = { done: key === "e" ? "edit" : "when", id };
      prompt.state = "submit";
    }
  });
  const answer = await prompt.prompt();
  return isCancel(answer) ? { done: "cancel" } : outcome;
}

/** Ask for one sink's value and record it, checking the sink. False when the ask was cancelled. */
async function editSinkValue(session: Session, orchDir: string, kind: SinksKind, pick: SinkPick, id: string): Promise<boolean> {
  const field = kind.fields[id];
  if (field === undefined) {
    session.status = `${id} carries no value - space turns it on`;
    return true;
  }
  const label = field.name === id ? id : `${id} ${field.name}`;
  const value = await askValue(session, orchDir, label, pick.values.get(id) ?? "", field.suggestion);
  if (value === null) return false;
  pick.values.set(id, value);
  checkSink(pick, id);
  return true;
}

/** Choose which states one sink fires on, checking the sink. A sink that fires on nothing
 *  delivers nothing, so an empty answer is refused rather than recorded. */
async function editSinkStates(session: Session, orchDir: string, kind: SinksKind, pick: SinkPick, id: string): Promise<void> {
  const chosen = await askMulti(session, orchDir, kind.states, firesOn(kind, pick, id));
  if (chosen === null) return;
  if (chosen.length === 0) {
    session.status = `${id} must fire on at least one state`;
    return;
  }
  pick.states.set(id, chosen);
  checkSink(pick, id);
}

/** Ask for every checked sink still missing its value. One left unanswered is unchecked:
 *  a sink with nothing to deliver through is not a sink. False when any was skipped. */
async function fillCheckedSinks(session: Session, orchDir: string, kind: SinksKind, pick: SinkPick): Promise<boolean> {
  const missing = pick.checked.filter((id) => kind.fields[id] !== undefined && carriedValue(pick, id) === "");
  let complete = true;
  for (const id of missing) {
    if (await editSinkValue(session, orchDir, kind, pick, id)) continue;
    uncheckSink(pick, id);
    session.status = `${id} left off - it needs a ${kind.fields[id]?.name ?? "value"}`;
    complete = false;
  }
  return complete;
}

/** Check the sinks to deliver through, set what each one carries, and choose when each
 *  fires. `e` edits the focused sink's value, `w` its states; nothing is written until enter. */
async function editSinks(session: Session, orchDir: string, editing: EditingState, kind: SinksKind): Promise<void> {
  const pick = initialPick(kind, editing.draft);
  for (;;) {
    const outcome = await pickSinks(session, orchDir, kind, pick);
    if (outcome.done === "cancel") {
      session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
      return;
    }
    if (outcome.done === "edit") {
      await editSinkValue(session, orchDir, kind, pick, outcome.id);
      continue;
    }
    if (outcome.done === "when") {
      await editSinkStates(session, orchDir, kind, pick, outcome.id);
      continue;
    }
    if (!await fillCheckedSinks(session, orchDir, kind, pick)) continue;
    commitAndFlush(session, orchDir, editing, pickedSinks(kind, pick));
    return;
  }
}

async function editText(session: Session, orchDir: string, editing: EditingState): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const spec = editing.focused.spec;
  const prompt = new TextPrompt({
    initialUserInput: editing.draft === undefined ? "" : displayValue(editing.draft),
    validate: (value) => {
      const parsed = parseSettingValue(spec, value ?? "");
      return parsed.ok ? undefined : parsed.reason;
    },
    render() {
      return settingsFrame(
        screenOf(session, orchDir),
        getColumns(process.stdout),
        getRows(process.stdout),
        inputOverlay(spec.key, inputCursor(this.userInput, this.cursor), this.state === "error" ? this.error : undefined),
        INPUT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer)) {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  const parsed = parseSettingValue(spec, submittedText(prompt, answer));
  if (!parsed.ok) {
    session.status = `${spec.key}: ${parsed.reason}`;
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, orchDir, editing, parsed.value);
}

/** Open the focused setting and run the edit interaction its declared kind calls for. */
async function editFocused(session: Session, orchDir: string): Promise<void> {
  const opened = editorReducer(session.state, { type: "open" });
  if (opened.mode === "browsing") {
    session.status = opened.reason;
    session.state = asBrowsing(opened);
    return;
  }
  const kind = opened.focused.spec.type;
  switch (kind.kind) {
    case "boolean":
      commitAndFlush(session, orchDir, opened, opened.focused.value !== true);
      return;
    case "choice":
      return editChoice(session, orchDir, opened, kind.choices);
    case "multi":
      return editMulti(session, orchDir, opened, kind.choices);
    case "sinks":
      return editSinks(session, orchDir, opened, kind);
    case "integer":
    case "text":
    case "list":
      return editText(session, orchDir, opened);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** The keys the repair screen answers to, and what each one chooses. */
const REPAIR_KEYS: Record<string, RepairChoice> = { r: "rename", s: "set", d: "drop", l: "leave" };

/** One repair pass: choose an action per defect until Enter saves or Escape leaves. */
async function repairOnce(state: RepairState, file: string, status: string | undefined): Promise<RepairState | null> {
  const session = { state, status };
  process.stdout.write(CLEAR_SCREEN);
  const screen = (): RepairScreen => ({
    file,
    defects: session.state.defects,
    choices: session.state.choices,
    focusedIndex: session.state.focusedIndex,
    status: session.state.reason ?? session.status,
  });
  const prompt = new Prompt<undefined>({
    render: () => repairFrame(screen(), getColumns(process.stdout), getRows(process.stdout)),
  }, false);
  prompt.on("key", (char, info) => {
    if (info.name === "return" || info.name === "escape") return;
    session.status = undefined;
    if (info.name === "up" || info.name === "down") {
      session.state = repairReducer(session.state, { type: "move", direction: info.name });
      return;
    }
    const choice = typeof char === "string" ? REPAIR_KEYS[char.toLowerCase()] : undefined;
    if (choice !== undefined) session.state = repairReducer(session.state, { type: "choose", choice });
  });
  const answer = await prompt.prompt();
  return isCancel(answer) ? null : session.state;
}

/**
 * Bring settings.json to a state the schema accepts, or report that the person chose to
 * leave it as it is.
 *
 * This runs BEFORE the editor because the editor cannot exist without a file it can load —
 * and refusing to open is what left a person with a diagnosis and no tool. Nothing is
 * written until they save, and a defect they leave alone survives untouched: a key one
 * letter off a real one holds a value they typed, and orch is not entitled to decide it
 * was junk.
 */
async function repairSettingsFile(orchDir: string): Promise<boolean> {
  const file = settingsPath(orchDir);
  let status: string | undefined;
  for (;;) {
    const defects = settingsDefects(file);
    if (defects.length === 0) return true;
    const chosen = await repairOnce(createRepairState(defects), file, status);
    if (chosen === null) return false;
    const repairs = plannedRepairs(chosen);
    if (repairs.length === 0) {
      status = "nothing chosen yet - r/s/d picks a fix for the focused key, esc leaves the file untouched";
      continue;
    }
    try {
      applySettingsRepairs(orchDir, repairs);
      status = `applied ${repairs.length} ${repairs.length === 1 ? "repair" : "repairs"}`;
    } catch (error: unknown) {
      status = errorMessage(error);
    }
  }
}

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(orchDir: string): Promise<void> {
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
    if (!await repairSettingsFile(orchDir)) return;
    const session: Session = {
      state: createEditorState(loadEntries(orchDir)),
      filter: "",
      status: undefined,
      quit: false,
      escapeClearedFilter: false,
    };
    while (!session.quit) {
      const outcome = await browseOnce(session, orchDir);
      if (outcome === "quit") return;
      if (outcome === "again") continue;
      await editFocused(session, orchDir);
    }
  } finally {
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
