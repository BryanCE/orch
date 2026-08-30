import { loadConfig, settingsPath } from "../config.ts";
import { promptMultiselect, promptSelect, promptText } from "../setup/io.ts";
import { createEditorState, editorReducer } from "./editor.ts";
import { SETTINGS_REGISTRY } from "./registry.ts";
import * as files from "node:fs";
import { errorMessage, isRecord } from "../util.ts";
import type { EditorSetting, EditorState, SettingKind, SettingSource, SettingSpec } from "../types/config.ts";

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

function display(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? "(none)";
}

function render(state: EditorState): void {
  if (state.mode !== "browsing") return;
  let group = "";
  for (const [index, entry] of state.settings.entries()) {
    if (entry.spec.group !== group) {
      group = entry.spec.group;
      process.stdout.write(`\n${group}\n`);
    }
    const marker = index === state.focusedIndex ? ">" : " ";
    const source = entry.override !== undefined
      ? ` [overridden by ${entry.override}]`
      : entry.source !== undefined && entry.source !== "settings.json" ? ` [${entry.source}]` : "";
    process.stdout.write(`${marker} ${entry.spec.key} = ${display(entry.value)}${source}\n`);
  }
  if (state.reason !== undefined) process.stdout.write(`\n${state.reason}\n`);
  process.stdout.write("\nSelect a setting (Escape to cancel)\n");
}

function parseTextValue(kind: SettingKind, input: string): unknown {
  if (kind.kind === "integer") {
    if (!/^-?\d+$/.test(input)) return input;
    return Number(input);
  }
  if (kind.kind === "list") {
    try { return JSON.parse(input); } catch { return input; }
  }
  return input;
}

async function editSetting(state: EditorState): Promise<EditorState> {
  if (state.mode !== "editing") return state;
  const kind = state.focused.spec.type;
  switch (kind.kind) {
    case "boolean":
      return editorReducer(state, { type: "commit", value: state.focused.value === true ? false : true });
    case "choice": {
      const answer = await promptSelect("Choose a value", kind.choices, typeof state.draft === "string" ? state.draft : undefined);
      return answer === null ? editorReducer(state, { type: "cancel" }) : editorReducer(state, { type: "commit", value: answer });
    }
    case "multi": {
      const current = Array.isArray(state.draft) ? state.draft.filter((value): value is string => typeof value === "string") : [];
      const answer = await promptMultiselect("Choose values (space toggles)", kind.choices.map((value) => ({ value, label: value, hint: value, checked: current.includes(value) })));
      return answer === null ? editorReducer(state, { type: "cancel" }) : editorReducer(state, { type: "commit", value: answer });
    }
    case "integer":
    case "text":
    case "list": {
      const answer = await promptText("Value (Escape to cancel)", display(state.draft));
      if (answer === null) return editorReducer(state, { type: "cancel" });
      return editorReducer(state, { type: "commit", value: parseTextValue(kind, answer) });
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function moveTo(state: EditorState, index: number): EditorState {
  let current = state;
  while (current.mode === "browsing" && current.focusedIndex < index) current = editorReducer(current, { type: "move", direction: "down" });
  while (current.mode === "browsing" && current.focusedIndex > index) current = editorReducer(current, { type: "move", direction: "up" });
  return current;
}

/** Run the interactive settings editor. It owns no settings logic: all edits go through the reducer. */
export async function runSettingsEditor(orchDir: string): Promise<void> {
  const config = loadConfig(orchDir);
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(files.readFileSync(settingsPath(orchDir), "utf8"));
    if (isRecord(parsed)) raw = parsed;
  } catch (error: unknown) {
    throw new Error(`Could not read ${settingsPath(orchDir)}: ${errorMessage(error)}`);
  }
  const settings: EditorSetting[] = SETTINGS_REGISTRY.map((spec) => ({ spec, value: spec.read(config), ...sourceFor(spec, raw) }));
  let state: EditorState = createEditorState(settings);
  while (true) {
    render(state);
    if (state.mode !== "browsing") {
      state = await editSetting(state);
      if (state.mode === "editing" && state.reason !== undefined) process.stdout.write(`\n${state.reason}\n`);
      continue;
    }
    const selected = await promptSelect("Setting", state.settings.map((entry) => entry.spec.key), state.settings[state.focusedIndex]?.spec.key);
    if (selected === null) return;
    const selectedIndex = state.settings.findIndex((entry) => entry.spec.key === selected);
    if (selectedIndex < 0) continue;
    state = editorReducer(moveTo(state, selectedIndex), { type: "open" });
    if (state.mode === "browsing" && state.reason !== undefined) {
      process.stdout.write(`\n${state.reason}\n`);
      continue;
    }
    const edited = await editSetting(state);
    if (edited.mode === "editing" && edited.reason !== undefined) process.stdout.write(`\n${edited.reason}\n`);
    if (edited.mode === "browsing") {
      for (const pending of edited.pendingWrites) {
        const entry = SETTINGS_REGISTRY.find((spec) => spec.key === pending.key);
        if (entry?.write !== undefined) entry.write(orchDir, pending.value);
      }
    }
    state = edited;
  }
}
