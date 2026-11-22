import type { InstallSettings, OrchSettings } from "./settings.ts";
import type { ProjectSettings } from "../settings/project.ts";
import type { Logger, OrchDir } from "./core.ts";
import type { Host } from "./host.ts";
import type { SettingsFilePath } from "../settings/schema.ts";
import type { ModelCatalogue } from "./adapter.ts";

/** Which file a manager writes: the install file; one project directory's file over its install's; or, for a view, the install file under a project's merged reads. */
export type SettingsScope =
  | { readonly kind: "install" }
  | { readonly kind: "project"; readonly directory: string; readonly install: SettingsManager }
  | { readonly kind: "view"; readonly directory: string; readonly install: SettingsManager };

/** Parsed settings for one process. `current()` is cheap after the first call:
 * the parsed value is held until `reload()`. The daemon's file watcher calls
 * `reload()`; the CLI never needs to. */
export interface SettingsManager {
  /** The settings file path, for messages and for watching its directory. */
  readonly file: SettingsFilePath;
  /** Which file `update` writes, and so which schema a write is validated with. */
  readonly scope: SettingsScope;
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
  readonly host: Host;
}

/** orchd's view of the install file: its install-only keys alone. orchd serves every project at
 *  once, so it holds no one merged value, and a read of a project key through it does not compile. */
export interface InstallSettingsManager extends Pick<SettingsManager, "file" | "scope" | "update"> {
  current(): InstallSettings;
  currentOrNull(): InstallSettings | null;
  reload(): InstallSettings | null;
}

/** orchd's services: a client's, with the install settings alone, the merged settings of any
 *  project directory, and the model catalogue only orchd builds, because it runs the harnesses
 *  to ask what they can run. */
export interface DaemonServices extends Omit<Services, "settings"> {
  readonly settings: InstallSettingsManager;
  /** The project file of `directory` over the install file, read now. Null: the install file
   *  alone, every key, for a read that serves no one project. */
  readonly settingsFor: (directory: string | null) => ProjectSettings;
  readonly models: ModelCatalogue;
}

/** What server code needs to reach orchd or a plexer: the root, the install settings, a logger. */
export type DaemonContext = Pick<DaemonServices, "orchDir" | "settings" | "logger">;

export type SettingsService = Pick<Services, "settings">;
/** What a command needs to reach orchd: the root, the settings, and a logger. */
export type DaemonClient = Pick<Services, "orchDir" | "settings" | "logger">;
