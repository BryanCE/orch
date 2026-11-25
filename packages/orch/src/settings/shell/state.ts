import * as files from "node:fs";
import type { SettingsManager } from "../../types/services.ts";
import { errorMessage, isRecord, valueAtPath } from "../../util.ts";
import { createEditorState, editorReducer } from "../editor.ts";
import { clearRegisteredSetting, SETTINGS_REGISTRY, writeRegisteredSetting } from "../registry.ts";
import { AGENT_SETTINGS_GRANT, agentMayWriteSetting, grantAgentSetting, revokeAgentSetting } from "../../policy/agent-settings.ts";
import { visibleEntryIndices } from "../view.ts";
import { projectSettings } from "../project.ts";
import { oneLine } from "../../notify/format.ts";
import { layerLabel } from "../display.ts";
import type { SettingsScreen } from "../view.ts";
import type { BrowsingState, EditingState, EditorSetting, EditorState, RowSource, SettingSpec } from "../../types/settings.ts";

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

/** Whether a settings file's raw root holds `key`. */
function holds(root: Record<string, unknown>, key: string): boolean {
  return valueAtPath(root, key.split(".")) !== undefined;
}

/** The two files the editor reads and writes: the install file every project inherits, and
 *  this directory's project file over it. `project` is null in the install's own directory. */
export interface SettingsLayers { readonly install: SettingsManager; readonly project: SettingsManager | null }

/** The manager whose reads give the settings in force here: the project's merge, or the install's. */
function shownManager(layers: SettingsLayers): SettingsManager {
  return layers.project ?? layers.install;
}

/** Which file every edit writes: the global file (`orch settings`), or the local file (`orch settings --local`). */
export type SaveMode = { readonly kind: "global" } | { readonly kind: "local"; readonly local: SettingsManager };

/** Rebuild every row from disk: the value in force, the file it comes from, and the install
 *  value a project value replaces. Both editors show the same rows. */
export function loadEntries(layers: SettingsLayers): EditorSetting[] {
  const project = layers.project === null ? {} : rawRoot(layers.project.file, true);
  const install = rawRoot(layers.install.file, false);
  const settings = shownManager(layers).current();
  const installSettings = layers.install.current();
  const sourceOf = (spec: SettingSpec): RowSource => {
    if (holds(project, spec.key)) return { kind: "project", overrides: spec.read(installSettings) };
    return holds(install, spec.key) ? { kind: "install" } : { kind: "default" };
  };
  return SETTINGS_REGISTRY.map((spec) => ({ spec, value: spec.read(settings), source: sourceOf(spec), agentWritable: agentMayWriteSetting(settings, spec.key) }));
}

/** The project file's error when it is there but invalid. Its rows show the install's values,
 *  and a save to it is refused until it is fixed. */
function fileProblem(layers: SettingsLayers): string | undefined {
  const scope = layers.project?.scope;
  if (scope?.kind !== "project") return undefined;
  const state = projectSettings(scope.directory, scope.install).state;
  return state.kind === "invalid" ? `${oneLine(state.message)} - fix the file to save to it` : undefined;
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
  readonly layers: SettingsLayers;
  readonly save: SaveMode;
}

/** The file every edit, clear and grant writes, and whose values an edit starts from. */
export function editTarget(session: Session): SettingsManager {
  return session.save.kind === "local" ? session.save.local : session.layers.install;
}

/** Why the local editor refuses to write `spec`: a global-only key has no place in a local file. */
export function localRefusal(session: Session, spec: SettingSpec): string | undefined {
  return session.save.kind === "local" && spec.scope === "install" ? `${spec.key} is global only. Edit it with orch settings, without --local` : undefined;
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

export function screenOf(session: Session): SettingsScreen {
  const { install, project } = session.layers;
  return {
    files: { local: project?.file ?? null, global: install.file },
    editing: session.save.kind,
    entries: session.state.settings,
    focusedIndex: session.state.focusedIndex,
    filter: session.filter,
    searching: session.searching,
    status: session.status ?? fileProblem(session.layers),
  };
}

/** Rebuild rows from disk and restore focus to `focusKey`. */
export function reloadRows(session: Session, focusKey: string): void {
  const state = createEditorState(loadEntries(session.layers));
  const index = state.settings.findIndex((entry) => entry.spec.key === focusKey);
  session.state = index < 0 ? state : moveTo(state, index);
}

/** The focused row when this editor may write it. Otherwise the status says why, and it gives undefined. */
function writableFocus(session: Session, readOnly: string): EditorSetting | undefined {
  const entry = session.state.settings[session.state.focusedIndex];
  if (entry === undefined) return undefined;
  const refusal = entry.spec.write === undefined ? `${entry.spec.key} ${readOnly}` : localRefusal(session, entry.spec);
  if (refusal === undefined) return entry;
  session.status = refusal;
  return undefined;
}

/** Clear the focused setting from this editor's file: a local value gives way to the global one,
 *  a global value to the default. */
export function resetFocused(session: Session): void {
  const entry = writableFocus(session, "is read-only");
  if (entry === undefined) return;
  const target = editTarget(session);
  const cleared = target.scope.kind === "project" ? "local value cleared, the global value applies" : "global value cleared, the default applies";
  applyWrite(session, entry.spec.key, () => clearRegisteredSetting(target, entry.spec.key), `${entry.spec.key}: ${cleared}${shadowNote(session)}`);
}

/** What a global write to the focused row leaves in force: a local value still wins in this project. */
function shadowNote(session: Session): string {
  const row = session.state.settings[session.state.focusedIndex];
  return session.save.kind === "global" && row?.source.kind === "project" ? ". The local value still applies here: orch settings --local, then ctrl+d, clears it" : "";
}

/** Run one write, show `status` or the write's error, and re-read the files with focus on `key`. */
function applyWrite(session: Session, key: string, write: () => void, status: string): void {
  try {
    write();
    session.status = status;
  } catch (error: unknown) {
    session.status = errorMessage(error);
  }
  reloadRows(session, key);
}

/** Flip whether an agent may write the focused setting, in the file the grant list comes from,
 *  or say why that is refused. */
export function toggleAgentGrant(session: Session): void {
  const entry = writableFocus(session, "is read-only; nobody writes it");
  if (entry === undefined) return;
  const key = entry.spec.key;
  if (key === AGENT_SETTINGS_GRANT) {
    session.status = `${key} never grants itself`;
    return;
  }
  const holder = editTarget(session);
  const keys = entry.agentWritable ? revokeAgentSetting(holder.current(), key) : grantAgentSetting(holder.current(), key);
  const where = `(${layerLabel(holder)} ${holder.file})`;
  applyWrite(session, key, () => writeRegisteredSetting(holder, AGENT_SETTINGS_GRANT, keys), entry.agentWritable ? `${key}: the human alone writes it ${where}` : `${key}: an agent may write it ${where}`);
}

/** Close the edit with the value unchanged; `status` says why, when there is a reason to show. */
export function cancelEdit(session: Session, editing: EditingState, status?: string): void {
  if (status !== undefined) session.status = status;
  session.state = asBrowsing(editorReducer(editing, { type: "cancel" }));
}

/** Write a committed edit's values to this editor's file, say which file took them, and re-read the files. */
export function writeCommitted(session: Session, committed: BrowsingState, key: string): void {
  const target = editTarget(session);
  const write = (): void => { for (const pending of committed.pendingWrites) writeRegisteredSetting(target, pending.key, pending.value); };
  applyWrite(session, key, write, `${key} saved to ${layerLabel(target)} ${target.file}${shadowNote(session)}`);
}
