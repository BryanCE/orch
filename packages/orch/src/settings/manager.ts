import type { SettingsManager } from "../types/services.ts";
import type { OrchSettings } from "../types/settings.ts";
import { fileSettingsStorage, inMemorySettingsStorage, type SettingsStorage } from "./storage.ts";
import { absentSettingsMessage, parseSettingsText, settingsFromFile } from "./read.ts";

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
  };
}

export function fileSettingsManager(orchDir: string): SettingsManager {
  return createSettingsManager(fileSettingsStorage(orchDir));
}

export function inMemorySettingsManager(text: string | null, file: string): SettingsManager {
  return createSettingsManager(inMemorySettingsStorage(text, file));
}
