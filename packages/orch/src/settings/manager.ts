import type { SettingsManager } from "../types/services.ts";
import type { OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { SettingsFilePath } from "./schema.ts";
import { fileSettingsStorage, inMemorySettingsStorage, type SettingsLockPolicy, type SettingsStorage } from "./storage.ts";
import { absentSettingsMessage, parseSettingsText, settingsFromFile } from "./read.ts";
import { SETTINGS_DEFAULTS } from "./schema.ts";

/** One parse per process until `reload()`. A malformed file throws from `currentOrNull`
 * every time it is asked, never caches the failure, so the next call after a fix succeeds. */
export function createSettingsManager(storage: SettingsStorage): SettingsManager {
  let held: { value: OrchSettings | null } | undefined;
  const currentOrNull = (): OrchSettings | null => {
    if (held === undefined) {
      const text = storage.read();
      held = { value: text === null ? null : settingsFromFile(storage.file, parseSettingsText(text, storage.file)) };
    }
    return held.value;
  };
  return {
    file: storage.file,
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
          policy = settingsFromFile(storage.file, parseSettingsText(text, storage.file)).lock;
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
