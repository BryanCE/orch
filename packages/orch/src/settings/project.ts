import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { errnoCode, errorMessage, isRecord } from "../util.ts";
import { INSTALL_ONLY_KEYS, isInstallOnlyKey, PROJECT_SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA, type ProjectSettingsFile } from "./schema.ts";
import { requireEnabledComposition } from "./read.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { SettingsManager } from "../types/services.ts";

/** What was found at a project's settings file. `invalid` carries the message every refusal shows. */
export type ProjectSettingsState =
  | { readonly kind: "none" }
  | { readonly kind: "ok" }
  | { readonly kind: "invalid"; readonly message: string };

/** One project directory's settings, read now. */
export interface ProjectSettings {
  /** The project file's path. Null in the install's own directory, where the install file is the only file. */
  readonly file: string | null;
  readonly state: ProjectSettingsState;
  /** The project file's keys over the install's. The install's alone when the file is absent or invalid. */
  readonly settings: OrchSettings;
  /** The project file's own values. Null when it is absent or invalid. */
  readonly values: ProjectSettingsFile | null;
}

/** The project file of `directory`, or null when that path is the install file itself. */
export function projectFilePath(directory: string, install: SettingsManager): string | null {
  const file = path.resolve(directory, install.current().project.file);
  return file === path.resolve(install.file) ? null : file;
}

/** The install-only keys a raw project root holds, as dotted paths. */
function installOnlyKeysIn(root: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const [key, value] of Object.entries(root)) {
    if (isInstallOnlyKey(key)) found.push(key);
    else if (isRecord(value)) for (const inner of Object.keys(value)) if (isInstallOnlyKey(`${key}.${inner}`)) found.push(`${key}.${inner}`);
  }
  return found;
}

/** Validate a project file's root: the one check every read and every write of a project file
 *  passes. Throws a message naming the file and the key. */
export function parseProjectSettingsRoot(raw: unknown, file: string, installFile: string): ProjectSettingsFile {
  if (isRecord(raw)) {
    const installOnly = installOnlyKeysIn(raw);
    if (installOnly.length > 0) {
      throw new Error(`${file}: ${installOnly.join(", ")} ${installOnly.length === 1 ? "is" : "are"} install-only, so a project file cannot set ${installOnly.length === 1 ? "it" : "them"}. ${installOnly.length === 1 ? "It belongs" : "They belong"} in ${installFile}. The install-only keys: ${INSTALL_ONLY_KEYS.join(", ")}.`);
    }
  }
  const result = PROJECT_SETTINGS_FILE_SCHEMA.safeParse(raw);
  if (!result.success) throw new Error(`${file}: this project settings file has invalid values:\n${z.prettifyError(result.error)}`);
  return result.data;
}

/** Parse and validate a project file's text. Throws a message naming the file and the key. */
export function parseProjectSettingsText(text: string, file: string, installFile: string): ProjectSettingsFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${file}: expected valid JSON, found ${errorMessage(error)}`);
  }
  return parseProjectSettingsRoot(raw, file, installFile);
}

/** The project's keys over the install's, at the registry key: a project value replaces the
 *  install value of that key, a list replaces the whole list, and a key the project omits keeps
 *  the install's. `defaults.adapter` and `defaults.backend` must still name an enabled one. */
export function mergeProjectSettings(file: string, install: OrchSettings, project: ProjectSettingsFile): OrchSettings {
  requireEnabledComposition(file, { schemaVersion: SETTINGS_SCHEMA, runtime: install.runtime, enabled: install.enabled, defaults: project.defaults });
  return {
    ...install,
    defaults: { ...install.defaults, ...project.defaults },
    fleet: { ...install.fleet, ...project.fleet },
    models: { ...install.models, ...project.models },
    workers: { ...install.workers, ...project.workers },
    orchs: { ...install.orchs, ...project.orchs },
    agents: { ...install.agents, ...project.agents },
    locked_commands: { ...install.locked_commands, ...project.locked_commands },
    gated_commands: project.gated_commands ?? install.gated_commands,
    denied_commands: { ...install.denied_commands, ...project.denied_commands },
    worktrees: { ...install.worktrees, ...project.worktrees },
    council: { ...install.council, ...project.council },
  };
}

/** The install file alone, as a project with no file: for a read with no project in view. */
export function installOnlySettings(install: SettingsManager): ProjectSettings {
  return { file: null, state: { kind: "none" }, settings: install.current(), values: null };
}

/** Read `directory`'s project file now, with no cache, and merge it over the install's settings. */
export function projectSettings(directory: string, install: SettingsManager): ProjectSettings {
  const base = install.current();
  const file = projectFilePath(directory, install);
  if (file === null) return installOnlySettings(install);
  let text: string;
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return { file, state: { kind: "none" }, settings: base, values: null };
    return { file, state: { kind: "invalid", message: `${file}: ${errorMessage(error)}` }, settings: base, values: null };
  }
  try {
    const values = parseProjectSettingsText(text, file, install.file);
    return { file, state: { kind: "ok" }, settings: mergeProjectSettings(file, base, values), values };
  } catch (error: unknown) {
    return { file, state: { kind: "invalid", message: errorMessage(error) }, settings: base, values: null };
  }
}

/** orchd's `settingsFor`: a project directory's file over `install`, or with null the install file alone. */
export function settingsForProjects(install: SettingsManager): (directory: string | null) => ProjectSettings {
  return (directory) => directory === null ? installOnlySettings(install) : projectSettings(directory, install);
}

/** The merged settings, or the invalid file's message thrown: for a path that refuses on an invalid file. */
export function validProjectSettings(project: ProjectSettings): OrchSettings {
  if (project.state.kind === "invalid") throw new Error(project.state.message);
  return project.settings;
}
