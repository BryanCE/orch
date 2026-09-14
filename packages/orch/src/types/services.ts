import type { OrchSettings } from "./settings.ts";
import type { Logger, OrchDir } from "./core.ts";
import type { Host } from "./host.ts";
import type { SettingsFilePath } from "../settings/schema.ts";
import type { ModelCatalogue } from "./adapter.ts";

/** Parsed settings for one process. `current()` is cheap after the first call:
 * the parsed value is held until `reload()`. The daemon's file watcher calls
 * `reload()`; the CLI never needs to. */
export interface SettingsManager {
  /** The settings file path, for messages and for watching its directory. */
  readonly file: SettingsFilePath;
  /** Throws the "does not exist ... Run: orch setup" error when the file is absent. */
  current(): OrchSettings;
  /** Null when the file is absent. A malformed file still throws. */
  currentOrNull(): OrchSettings | null;
  /** Drop the held value and re-read storage. Returns what `currentOrNull()` now returns. */
  reload(): OrchSettings | null;
  /** Apply one text-level mutation under the storage lock, then drop the held value so the next
   * current() re-reads. Lock timings come from the lock group of the settings as they are before
   * the write; malformed files use the built-in lock policy. */
  update(mutate: (current: string | null) => string): void;
}

/** Everything a process is composed from. Built once per root (CLI, daemon,
 * extension registration), passed down, never rebuilt below a root. */
export interface Services {
  readonly orchDir: OrchDir;
  readonly settings: SettingsManager;
  readonly logger: Logger;
  readonly models: ModelCatalogue;
  readonly host: Host;
}

export type OrchDirService = Pick<Services, "orchDir">;
export type SettingsService = Pick<Services, "settings">;
export type LoggerService = Pick<Services, "logger">;
