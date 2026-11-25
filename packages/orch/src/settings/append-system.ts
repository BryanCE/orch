// The user's prompt entries: text orch puts in the header of every task it gives an agent, on
// every harness. Each settings level keeps its entries in one file, which
// `orchs.append_system_prompt` names. The project level wins over the install level.
import * as filesystem from "node:fs";
import * as path from "node:path";
import { errnoCode } from "../util.ts";
import { expandHome } from "../shared/home.ts";
import { SETTINGS_DEFAULTS } from "./schema.ts";
import { installOnlySettings, projectSettings, type ProjectSettings } from "./project.ts";
import { installManagerOf } from "./manager.ts";
import { clearSettingsValue, writeSettingsValue } from "./write.ts";
import type { SettingsManager } from "../types/services.ts";

export const APPEND_SYSTEM_KEY = "orchs.append_system_prompt";

/** One entry: trimmed, not empty, and with no blank line inside, because a blank line is what
 *  separates entries in the file. `promptEntry` is its only mint. */
export type PromptEntry = string & { readonly __brand: "PromptEntry" };

/** Text as one entry, its blank lines dropped. Null when nothing is left. */
export function promptEntry(text: string): PromptEntry | null {
  const lines = text.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim() !== "");
  return lines.length === 0 ? null : (lines.join("\n").trim() as PromptEntry);
}

/** The file a level reads. `default` is orch's own file beside the level's settings file, which
 *  clear deletes. `named` is a file the user named in the setting, which clear never deletes. */
export type PromptFile =
  | { readonly kind: "default"; readonly path: string }
  | { readonly kind: "named"; readonly path: string };

/** One level's file and the entries in it, in order. */
export interface PromptEntries {
  readonly file: PromptFile;
  readonly entries: readonly PromptEntry[];
}

/** A settings level: the directory its settings file sits in, and the file it reads. */
interface PromptLevel {
  readonly directory: string;
  readonly file: PromptFile;
}

function defaultFile(directory: string): PromptFile {
  return { kind: "default", path: path.resolve(directory, SETTINGS_DEFAULTS.orchs.append_system_prompt) };
}

/** The level whose settings file is `settingsFile` and whose setting holds `named`. */
function promptLevel(settingsFile: string, named: string | undefined): PromptLevel {
  const directory = path.dirname(settingsFile);
  const file: PromptFile = named === undefined || named === SETTINGS_DEFAULTS.orchs.append_system_prompt
    ? defaultFile(directory)
    : { kind: "named", path: path.resolve(directory, expandHome(named)) };
  return { directory, file };
}

/** The project's own level, or null when the project has no settings file of its own. */
function projectLevel(project: ProjectSettings): PromptLevel | null {
  return project.file === null ? null : promptLevel(project.file, project.values?.orchs?.append_system_prompt);
}

/** The install's level. The merged value is the install's whenever the project names no file. */
function installLevel(project: ProjectSettings, installFile: string): PromptLevel {
  return promptLevel(installFile, project.settings.orchs.append_system_prompt);
}

function parseEntries(text: string): PromptEntry[] {
  return text.split(/\n\s*\n/).map(promptEntry).filter((entry): entry is PromptEntry => entry !== null);
}

function readEntries(file: PromptFile): PromptEntry[] {
  try {
    return parseEntries(filesystem.readFileSync(file.path, "utf8"));
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return [];
    throw new Error(`${APPEND_SYSTEM_KEY}: cannot read ${file.path}: ${errnoCode(error) ?? String(error)}`);
  }
}

/** Write the entries back. A default file left with no entries is deleted. */
function writeEntries(file: PromptFile, entries: readonly PromptEntry[]): PromptEntries {
  if (entries.length === 0 && file.kind === "default") {
    filesystem.rmSync(file.path, { force: true });
  } else {
    filesystem.mkdirSync(path.dirname(file.path), { recursive: true });
    filesystem.writeFileSync(file.path, entries.length === 0 ? "" : `${entries.join("\n\n")}\n`);
  }
  return { file, entries };
}

/**
 * The entries for this project's agents. A project that names a file, or has entries in its
 * default file, decides. Otherwise the install level does. Empty when neither has any.
 */
export function appendedEntries(project: ProjectSettings, installFile: string): readonly PromptEntry[] {
  const own = projectLevel(project);
  const entries = own === null ? [] : readEntries(own.file);
  if (own !== null && (entries.length > 0 || own.file.kind === "named")) return entries;
  return readEntries(installLevel(project, installFile).file);
}

/** The level this manager writes. A view writes the install file. */
function managedLevel(settings: SettingsManager): PromptLevel {
  const scope = settings.scope;
  switch (scope.kind) {
    case "install":
    case "view": {
      const install = installManagerOf(settings);
      return installLevel(installOnlySettings(install), install.file);
    }
    case "project": {
      const project = projectSettings(scope.directory, scope.install);
      return projectLevel(project) ?? installLevel(project, scope.install.file);
    }
    default: {
      const exhaustive: never = scope;
      return exhaustive;
    }
  }
}

/** This level's file and its entries. */
export function promptEntries(settings: SettingsManager): PromptEntries {
  const { file } = managedLevel(settings);
  return { file, entries: readEntries(file) };
}

/** Add one entry at the end. An entry the level already holds is not added again. */
export function addPromptEntry(settings: SettingsManager, text: string): PromptEntries {
  const entry = promptEntry(text);
  if (entry === null) throw new Error("A prompt entry needs text.");
  const { file, entries } = promptEntries(settings);
  return entries.includes(entry) ? { file, entries } : writeEntries(file, [...entries, entry]);
}

/** Remove the entry at `position`, counted from 1 as `orch settings prompt` lists them. */
export function removePromptEntry(settings: SettingsManager, position: number): PromptEntries {
  const { file, entries } = promptEntries(settings);
  if (position < 1 || position > entries.length) throw new Error(`No prompt entry ${position} in ${file.path}: it holds ${entries.length}.`);
  return writeEntries(file, entries.filter((_, index) => index !== position - 1));
}

/** Drop every entry this level adds: delete its default file, and stop reading a file the user
 *  named, which stays on disk. A project level then falls back to the install level. */
export function clearPromptEntries(settings: SettingsManager): PromptEntries {
  const { directory, file } = managedLevel(settings);
  if (file.kind === "named") clearSettingsValue(settings, APPEND_SYSTEM_KEY);
  return writeEntries(defaultFile(directory), []);
}

/** The registry's writer. A file that exists becomes the setting, as an absolute path. Any other
 *  text is one entry. One word that names no file is refused: it is a mistyped path. */
export function writeAppendSystemPrompt(settings: SettingsManager, value: unknown): void {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${APPEND_SYSTEM_KEY} takes a file path or the text of one entry`);
  const text = value.trim();
  const named = path.resolve(expandHome(text));
  if (filesystem.statSync(named, { throwIfNoEntry: false })?.isFile() === true) return writeSettingsValue(settings, APPEND_SYSTEM_KEY, named);
  if (!/\s/.test(text)) throw new Error(`${APPEND_SYSTEM_KEY}: ${text} names no file. Give a file that exists, or the text of one entry.`);
  addPromptEntry(settings, text);
}
