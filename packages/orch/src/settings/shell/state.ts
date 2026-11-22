import * as files from "node:fs";
import type { SettingsManager } from "../../types/services.ts";
import { errorMessage, isRecord } from "../../util.ts";
import { createEditorState, editorReducer } from "../editor.ts";
import { clearRegisteredSetting, SETTINGS_REGISTRY, writeRegisteredSetting } from "../registry.ts";
import { AGENT_SETTINGS_GRANT, agentMayWriteSetting, grantAgentSetting, revokeAgentSetting } from "../../policy/agent-settings.ts";
import { visibleEntryIndices } from "../view.ts";
import { projectSettings } from "../project.ts";
import { oneLine } from "../../notify/format.ts";
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

/** A settings file's raw root. A project file that is absent or unreadable is empty: `fileProblem`
 *  shows its error, and a write to it is refused. An unreadable install file is an error. */
function rawRoot(file: string, absentIsEmpty: boolean): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(file, "utf8"));
    return isRecord(parsed) ? parsed : {};
  } catch (error: unknown) {
    if (absentIsEmpty) return {};
    throw new Error(`Could not read ${file}: ${errorMessage(error)}`);
  }
}

/** Where a row's value comes from: the project file, the install file, or the default. */
function sourceFor(spec: SettingSpec, project: Record<string, unknown>, install: Record<string, unknown>): SettingSource {
  if (rawValue(project, spec.key) !== undefined) return "project";
  return rawValue(install, spec.key) === undefined ? "default" : "install";
}

/** Rebuild every row from disk so value and provenance show what the files hold. A project
 *  manager's rows are the keys a project may set, each with the value it has or inherits. */
export function loadEntries(manager: SettingsManager): EditorSetting[] {
  const scope = manager.scope;
  const project = scope.kind === "project" ? rawRoot(manager.file, true) : {};
  const install = rawRoot(scope.kind === "install" ? manager.file : scope.install.file, false);
  const settings = manager.current();
  const specs = scope.kind === "project" ? SETTINGS_REGISTRY.filter((spec) => spec.scope === "project") : SETTINGS_REGISTRY;
  return specs.map((spec) => ({
    spec, value: spec.read(settings), source: sourceFor(spec, project, install), agentWritable: agentMayWriteSetting(settings, spec.key),
  }));
}

/** The shown file's error: a project file that is there but invalid. Its rows show the install's
 *  values, and a save to it is refused until it is fixed. */
export function fileProblem(manager: SettingsManager): string | undefined {
  const scope = manager.scope;
  if (scope.kind !== "project") return undefined;
  const state = projectSettings(scope.directory, scope.install).state;
  return state.kind === "invalid" ? `${oneLine(state.message)} - fix the file to save here` : undefined;
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
  /** The files the editor can show. `project` is null in the install's own directory. */
  readonly views: { readonly install: SettingsManager; readonly project: SettingsManager | null };
  /** Which file the rows show and a save writes. */
  view: "project" | "install";
}

/** The manager the shown view reads and writes. */
export function activeManager(session: Session): SettingsManager {
  return session.view === "project" && session.views.project !== null ? session.views.project : session.views.install;
}

/** `Tab`: show the other file's settings, keeping the focused key when it is in both. */
export function switchView(session: Session): void {
  if (session.views.project === null) {
    session.status = "this directory holds the install file, so it has only the Install view";
    return;
  }
  const focusKey = session.state.settings[session.state.focusedIndex]?.spec.key ?? "";
  session.view = session.view === "project" ? "install" : "project";
  reloadRows(session, activeManager(session), focusKey);
  session.status = session.view === "project" ? `Project: ${session.views.project.file}` : `Install: ${session.views.install.file}`;
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
    status: session.status ?? fileProblem(manager),
  };
}

/** Rebuild rows from disk and restore focus to `focusKey`. */
export function reloadRows(session: Session, manager: SettingsManager, focusKey: string): void {
  const state = createEditorState(loadEntries(manager));
  const index = state.settings.findIndex((entry) => entry.spec.key === focusKey);
  session.state = index < 0 ? state : moveTo(state, index);
}

function focusedEntry(session: Session): EditorSetting | undefined {
  return session.state.settings[session.state.focusedIndex];
}

/** Clear the focused setting back to its default, or say why that is refused. */
export function resetFocused(session: Session, manager: SettingsManager): void {
  const entry = focusedEntry(session);
  if (entry === undefined) return;
  const key = entry.spec.key;
  if (entry.spec.write === undefined) {
    session.status = `${key} is read-only`;
    return;
  }
  try {
    clearRegisteredSetting(manager, key);
    reloadRows(session, manager, key);
    session.status = `${key} reset to default`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
}

/** Flip whether an agent may write the focused setting, or say why that is refused. */
export function toggleAgentGrant(session: Session, manager: SettingsManager): void {
  const entry = focusedEntry(session);
  if (entry === undefined) return;
  const key = entry.spec.key;
  if (entry.spec.write === undefined) {
    session.status = `${key} is read-only; nobody writes it`;
    return;
  }
  if (key === AGENT_SETTINGS_GRANT) {
    session.status = `${key} never grants itself`;
    return;
  }
  const keys = entry.agentWritable ? revokeAgentSetting(manager.current(), key) : grantAgentSetting(manager.current(), key);
  try {
    writeRegisteredSetting(manager, AGENT_SETTINGS_GRANT, keys);
    reloadRows(session, manager, key);
    session.status = entry.agentWritable ? `${key}: the human alone writes it` : `${key}: an agent may write it`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
}

/** Close the edit with the value unchanged; `status` says why, when there is a reason to show. */
export function cancelEdit(session: Session, editing: EditingState, status?: string): void {
  if (status !== undefined) session.status = status;
  session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
}

/** Commit a picked value, or close the edit when the pick was cancelled. */
export function commitPick(session: Session, manager: SettingsManager, editing: EditingState, picked: unknown): void {
  if (picked === null) cancelEdit(session, editing);
  else commitAndFlush(session, manager, editing, picked);
}

/** Commit an edited value through the reducer, persist it, and re-read the file. */
export function commitAndFlush(session: Session, manager: SettingsManager, editing: EditingState, value: unknown): void {
  const key = editing.focused.spec.key;
  const committed = editorReducer(editing, { type: "commit", value });
  if (committed.mode === "editing") return cancelEdit(session, committed, committed.reason ?? `${key}: invalid value`);
  try {
    for (const pending of committed.pendingWrites) writeRegisteredSetting(manager, pending.key, pending.value);
    session.status = `${key} saved`;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
  reloadRows(session, manager, key);
}
