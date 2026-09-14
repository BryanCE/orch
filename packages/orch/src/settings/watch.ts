import * as filesystem from "node:fs";
import { dirname } from "node:path";
import { ensurePrivateDir, errorMessage } from "../util.ts";
import { namesSettingsFile } from "./schema.ts";
import type { SettingsWatch, SettingsWatchOptions } from "../types/settings.ts";
import type { SettingsManager } from "../types/services.ts";

/** Manual reload trigger: touching this file reloads settings without editing it. */
export const RELOAD_SIGNAL_FILE = "reload.signal";

function triggersReload(filename: string | Buffer | null | undefined): boolean {
  return namesSettingsFile(filename) || filename?.toString() === RELOAD_SIGNAL_FILE;
}

/**
 * The ONE settings watcher: watch settings.json and publish only settings
 * that loaded cleanly. Every caller — the daemon and the CLI alike — uses this;
 * a second implementation drifts on exactly the properties that matter here
 * (whether it polls, whether it keeps a last-good, whether it repeats warnings).
 *
 * Watches the DIRECTORY, not the file: settings.json is written tmp+rename, so a
 * file watcher follows the old inode and goes deaf after the first write. The
 * stat poll is the backstop for platforms that drop directory events entirely.
 *
 * An invalid edit keeps the last-good settings and warns once per distinct failure
 * — a settings file saved broken mid-edit must not spam the log on every keystroke.
 */
/** Watches the file the manager reads. Taking the manager, not a path, is what keeps an
 *  orch dir from being handed in as the file: the watch then guards the dir's parent. */
export function watchSettings(settings: Pick<SettingsManager, "file">, opts: SettingsWatchOptions): SettingsWatch {
  const { onChange, onWarn } = opts;
  const file = settings.file;
  const directory = dirname(file);
  const debounceMs = opts.debounceMs ?? 250;
  const pollMs = opts.pollMs ?? 5_000;
  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let watcher: filesystem.FSWatcher | undefined;
  let lastStat = statSignature(file);
  let badState: string | undefined;

  // Keeping the last-good settings is the absence of a call, not a cached copy:
  // a failed reload simply never reaches onChange, so the caller still holds
  // the last settings that loaded cleanly.
  const reload = (): void => {
    debounceTimer = undefined;
    if (stopped) return;
    try {
      const settings = opts.load();
      badState = undefined;
      onChange(settings);
    } catch (error: unknown) {
      const message = errorMessage(error);
      const state = `${statSignature(file)}:${message}`;
      if (state !== badState) {
        badState = state;
        onWarn?.(message);
      }
    }
  };

  const scheduleReload = (): void => {
    if (stopped) return;
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(reload, debounceMs);
  };

  const poll = (): void => {
    const currentStat = statSignature(file);
    if (currentStat !== lastStat) {
      lastStat = currentStat;
      scheduleReload();
    }
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    if (pollTimer !== undefined) clearInterval(pollTimer);
    watcher?.close();
  };

  try {
    ensurePrivateDir(directory);
    // The first load is deliberately unguarded: settings that cannot be read at
    // startup is fatal to the caller, not something to warn about and continue on.
    const initial = opts.load();
    watcher = filesystem.watch(directory, { persistent: false }, (_event, filename) => {
      if (triggersReload(filename)) scheduleReload();
    });
    watcher.on("error", (error: Error) => {
      if (!stopped) onWarn?.(errorMessage(error));
    });
    pollTimer = setInterval(poll, pollMs);
    pollTimer.unref();
    onChange(initial);
  } catch (error: unknown) {
    stop();
    throw error;
  }

  return { stop };
}

function statSignature(file: string): string {
  try {
    const stat = filesystem.statSync(file);
    return `${stat.mtimeMs}:${stat.size}:${stat.ino}`;
  } catch {
    return "missing";
  }
}
