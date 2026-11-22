import type { SettingsManager } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { SettingsFilePath } from "./schema.ts";
import { fileSettingsStorage, inMemorySettingsStorage, projectSettingsStorage, type SettingsLockPolicy, type SettingsStorage } from "./storage.ts";
import { absentSettingsMessage, parseSettingsText, settingsFromFile } from "./read.ts";
import { SETTINGS_DEFAULTS, projectSettingsPath } from "./schema.ts";
import { projectFilePath, projectSettings } from "./project.ts";

/** One parse per process until `reload()`. A malformed file throws from `currentOrNull`
 * every time it is asked, never caches the failure, so the next call after a fix succeeds. */
function createSettingsManager(storage: SettingsStorage): SettingsManager {
  let held: { value: OrchSettings | null } | undefined;
  const currentOrNull = (): OrchSettings | null => {
    if (held === undefined) {
      const text = storage.read();
      held = { value: text === null ? null : settingsFromFile(storage.file, parseSettingsText(text, storage.file).settings) };
    }
    return held.value;
  };
  return {
    file: storage.file,
    scope: { kind: "install" },
    currentOrNull,
    current: () => {
      const value = currentOrNull();
      if (value === null) throw new Error(absentSettingsMessage(storage.file));
      return value;
    },
    reload: () => { held = undefined; return currentOrNull(); },
    update: (mutate) => {
      const text = storage.read();
      let policy: SettingsLockPolicy = SETTINGS_DEFAULTS.lock;
      if (text !== null) {
        try {
          policy = settingsFromFile(storage.file, parseSettingsText(text, storage.file).settings).lock;
        } catch {
          // The repair path writes a malformed file whose policy is unknowable.
        }
      }
      storage.withLock(policy, mutate);
      held = undefined;
    },
  };
}

export function fileSettingsManager(orchDir: OrchDir): SettingsManager {
  return createSettingsManager(fileSettingsStorage(orchDir));
}

export function inMemorySettingsManager(text: string | null, file: SettingsFilePath): SettingsManager {
  return createSettingsManager(inMemorySettingsStorage(text, file));
}

/** One project directory's file over its install's. A read gives the merged settings, read now
 *  with no cache. A write lands in the project file, validated as a project file, under the
 *  install's lock policy; the first write creates the file and its directory. */
export function projectSettingsManager(directory: string, install: SettingsManager): SettingsManager {
  const resolved = projectFilePath(directory, install);
  if (resolved === null) throw new Error(`${directory} is the directory that holds ${install.file}, so it has no project file. Write the install file.`);
  const storage = projectSettingsStorage(projectSettingsPath(resolved));
  const merged = (): OrchSettings | null => install.currentOrNull() === null ? null : projectSettings(directory, install).settings;
  return {
    file: storage.file,
    scope: { kind: "project", directory, install },
    currentOrNull: merged,
    current: () => {
      install.current();
      return projectSettings(directory, install).settings;
    },
    reload: () => {
      install.reload();
      return merged();
    },
    update: (mutate) => storage.withLock(install.current().lock, mutate),
  };
}

/** The settings of a process that acts for one project, the CLI or an agent's own process: a
 *  read gives the merged settings of `directory`, read now; a write goes to the install file. */
export function projectViewSettingsManager(directory: string, install: SettingsManager): SettingsManager {
  const merged = (): OrchSettings | null => install.currentOrNull() === null ? null : projectSettings(directory, install).settings;
  return {
    file: install.file,
    scope: { kind: "view", directory, install },
    currentOrNull: merged,
    current: () => {
      install.current();
      return projectSettings(directory, install).settings;
    },
    reload: () => {
      install.reload();
      return merged();
    },
    update: (mutate) => install.update(mutate),
  };
}

/** The install file's own manager behind `settings`: itself, or the install a project manager or a view reads under. */
export function installManagerOf(settings: SettingsManager): SettingsManager {
  return settings.scope.kind === "install" ? settings : settings.scope.install;
}
