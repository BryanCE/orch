import * as files from "node:fs";
import type { SettingsManager } from "../../types/services.ts";
import { errorMessage, isRecord } from "../../util.ts";
import { createEditorState, editorReducer } from "../editor.ts";
import { clearRegisteredSetting, SETTINGS_REGISTRY, writeRegisteredSetting } from "../registry.ts";
import { visibleEntryIndices } from "../view.ts";
import type { SettingsScreen } from "../view.ts";
import type { BrowsingState, EditingState, EditorSetting, EditorState, SettingSource, SettingSpec } from "../../types/settings.ts";

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

/** Rebuild every row from disk so value and provenance always show what settings.json holds.
 *  The manager re-parses after each write, so its current value is the file's, never a snapshot. */
export function loadEntries(manager: SettingsManager): EditorSetting[] {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(manager.file, "utf8"));
    if (isRecord(parsed)) raw = parsed;
  } catch (error: unknown) {
    throw new Error(`Could not read ${manager.file}: ${errorMessage(error)}`);
  }
  const settings = manager.current();
  return SETTINGS_REGISTRY.map((spec) => ({ spec, value: spec.read(settings), ...sourceFor(spec, raw) }));
}

/** Everything one editor run carries between prompts. Mutated by key handlers mid-render. */
export interface Session {
  state: BrowsingState;
  filter: string;
  /** `/` opened search: typed characters narrow the list until Enter keeps it or Escape clears it. */
  searching: boolean;
  status: string | undefined;
  quit: boolean;
  /** Enter or Escape was spent on the filter, so the submit or cancel it triggered opens nothing and quits nothing. */
  filterKeySpent: boolean;
}

export function asBrowsing(state: EditorState): BrowsingState {
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
export function stepFocus(state: BrowsingState, filter: string, direction: "up" | "down"): BrowsingState {
  const visible = visibleEntryIndices(state.settings, filter);
  const first = visible[0];
  if (first === undefined) return state;
  const position = visible.indexOf(state.focusedIndex);
  if (position < 0) return moveTo(state, first);
  const target = visible[Math.max(0, Math.min(visible.length - 1, position + (direction === "down" ? 1 : -1)))];
  return target === undefined ? state : moveTo(state, target);
}

/** After the filter changes, snap focus onto a visible row if it fell off. */
export function refocusVisible(session: Session): void {
  const visible = visibleEntryIndices(session.state.settings, session.filter);
  const first = visible[0];
  if (first === undefined || visible.includes(session.state.focusedIndex)) return;
  session.state = moveTo(session.state, first);
}

export function screenOf(session: Session, manager: SettingsManager): SettingsScreen {
  return {
    file: manager.file,
    entries: session.state.settings,
    focusedIndex: session.state.focusedIndex,
    filter: session.filter,
    searching: session.searching,
    status: session.status,
  };
}

/** Rebuild rows from disk and restore focus to `focusKey`. */
function reload(session: Session, manager: SettingsManager, focusKey: string): void {
  const state = createEditorState(loadEntries(manager));
  const index = state.settings.findIndex((entry) => entry.spec.key === focusKey);
  session.state = index < 0 ? state : moveTo(state, index);
}

/** Clear the focused setting back to its default, or say why that is refused. */
export function resetFocused(session: Session, manager: SettingsManager): void {
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
    clearRegisteredSetting(manager, key);
    reload(session, manager, key);
    session.status = `${key} reset to default`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
}

/** Commit an edited value through the reducer, persist it, and re-read the file. */
export function commitAndFlush(session: Session, manager: SettingsManager, editing: EditingState, value: unknown): void {
  const key = editing.focused.spec.key;
  const committed = editorReducer(editing, { type: "commit", value });
  if (committed.mode === "editing") {
    session.status = committed.reason ?? `${key}: invalid value`;
    session.state = asBrowsing(editorReducer(committed, { type: "cancel" }));
    return;
  }
  try {
    for (const pending of committed.pendingWrites) writeRegisteredSetting(manager, pending.key, pending.value);
    session.status = `${key} saved`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
  reload(session, manager, key);
}
