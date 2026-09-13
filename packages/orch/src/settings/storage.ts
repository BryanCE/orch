import * as filesystem from "node:fs";
import * as path from "node:path";
import { settingsPath, type SettingsFilePath } from "./schema.ts";
import { errnoCode } from "../util.ts";
import type { OrchDir } from "../types/core.ts";

/** Where settings text comes from. One method: the raw text, or null when there is none. */
export interface SettingsStorage {
  /** The settings file path, for messages and for watching its directory. */
  readonly file: SettingsFilePath;
  read(): string | null;
}

/** `$orchDir/settings.json`. Absent file is null. A legacy `config.toml` next to
 *  an absent settings.json is an error, never read, never migrated (Rule 8). */
export function fileSettingsStorage(orchDir: OrchDir): SettingsStorage {
  const file = settingsPath(orchDir);
  return {
    file,
    read: () => {
      try {
        return filesystem.readFileSync(file, "utf8");
      } catch (error: unknown) {
        if (errnoCode(error) !== "ENOENT") throw error;
      }
      const legacy = path.join(orchDir, "config.toml");
      if (filesystem.existsSync(legacy)) {
        throw new Error(`${legacy}: legacy config.toml detected - settings now live in ${file}; re-run orch setup (the old values are not read)`);
      }
      return null;
    },
  };
}

/** Text held in memory. `file` labels it in messages so a test failure names its fixture. */
export function inMemorySettingsStorage(text: string | null, file: SettingsFilePath): SettingsStorage {
  return { file, read: () => text };
}
