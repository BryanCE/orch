import { getColumns, getRows, isCancel, MultiSelectPrompt, Prompt, SelectPrompt, TextPrompt } from "@clack/core";
import * as files from "node:fs";
import { loadConfig, settingsPath } from "../config.ts";
import { errorMessage, isRecord } from "../util.ts";
import { createEditorState, editorReducer } from "./editor.ts";
import { parseSettingValue } from "./parse.ts";
import { clearRegisteredSetting, SETTINGS_REGISTRY, writeRegisteredSetting } from "./registry.ts";
import {
  BROWSE_KEYBAR,
  displayValue,
  INPUT_KEYBAR,
  inputOverlay,
  MULTI_KEYBAR,
  multiOverlay,
  SELECT_KEYBAR,
  selectOverlay,
  settingsFrame,
  visibleEntryIndices,
} from "./view.ts";
import type { SettingsScreen } from "./view.ts";
import type { BrowsingState, EditingState, EditorSetting, EditorState, SettingSource, SettingSpec } from "../types/config.ts";

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

const CSI = `${String.fromCharCode(27)}[`;
const ENTER_ALT_SCREEN = `${CSI}?1049h${CSI}?25l`;
const EXIT_ALT_SCREEN = `${CSI}?1049l${CSI}?25h`;
const CLEAR_SCREEN = `${CSI}?25l${CSI}H${CSI}2J`;
const CTRL_C = String.fromCharCode(3);

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
  const config = loadConfig(orchDir);
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(settingsPath(orchDir), "utf8"));
    if (isRecord(parsed)) raw = parsed;
  } catch (error: unknown) {
    throw new Error(`Could not read ${settingsPath(orchDir)}: ${errorMessage(error)}`);
  }
  return SETTINGS_REGISTRY.map((spec) => ({ spec, value: spec.read(config), ...sourceFor(spec, raw) }));
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

async function editMulti(session: Session, orchDir: string, editing: EditingState, choices: readonly string[]): Promise<void> {
  process.stdout.write(CLEAR_SCREEN);
  const current = Array.isArray(editing.draft)
    ? editing.draft.filter((value): value is string => typeof value === "string")
    : [];
  const prompt = new MultiSelectPrompt<{ value: string }>({
    options: choices.map((value) => ({ value })),
    initialValues: [...current],
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
  if (isCancel(answer) || !Array.isArray(answer)) {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  commitAndFlush(session, orchDir, editing, answer.filter((value): value is string => typeof value === "string"));
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
        inputOverlay(spec.key, this.userInputWithCursor, this.state === "error" ? this.error : undefined),
        INPUT_KEYBAR,
      );
    },
  });
  const answer = await prompt.prompt();
  if (isCancel(answer) || typeof answer !== "string") {
    session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
    return;
  }
  const parsed = parseSettingValue(spec, answer);
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

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(orchDir: string): Promise<void> {
  const session: Session = {
    state: createEditorState(loadEntries(orchDir)),
    filter: "",
    status: undefined,
    quit: false,
    escapeClearedFilter: false,
  };
  process.stdout.write(ENTER_ALT_SCREEN);
  try {
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
