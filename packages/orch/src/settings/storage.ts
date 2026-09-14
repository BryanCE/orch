import * as filesystem from "node:fs";
import * as path from "node:path";
import { settingsPath, settingsTemporaryPath, type SettingsFilePath } from "./schema.ts";
import { ensurePrivateDir, errnoCode } from "../util.ts";
import type { OrchDir } from "../types/core.ts";

/** Where settings text comes from. One method: the raw text, or null when there is none. */
export interface SettingsLockPolicy {
  readonly retries: number;
  readonly interval_ms: number;
  readonly stale_ms: number;
}

export interface SettingsStorage {
  /** The settings file path, for messages and for watching its directory. */
  readonly file: SettingsFilePath;
  read(): string | null;
  /** Run `fn` holding the write lock. `fn` gets the current text (null when absent) and returns the text to land. */
  withLock(policy: SettingsLockPolicy, fn: (current: string | null) => string): void;
}

/** `$orchDir/settings.json`. Absent file is null. A legacy `config.toml` next to
 *  an absent settings.json is an error, never read, never migrated (Rule 8). */
export function fileSettingsStorage(orchDir: OrchDir): SettingsStorage {
  const file = settingsPath(orchDir);
  const read = (): string | null => {
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
  };
  return {
    file,
    read,
    withLock: (policy, fn) => {
      ensurePrivateDir(orchDir);
      const lock = `${file}.lock`;
      let fd: number | undefined;
      let failures = 0;
      for (;;) {
        try {
          fd = filesystem.openSync(lock, "wx");
          filesystem.writeSync(fd, String(process.pid));
          break;
        } catch (error: unknown) {
          if (fd !== undefined) {
            filesystem.closeSync(fd);
            fd = undefined;
          }
          if (errnoCode(error) !== "EEXIST") throw error;
          let stale = false;
          try {
            stale = filesystem.statSync(lock).mtimeMs < Date.now() - policy.stale_ms;
          } catch (statError: unknown) {
            if (errnoCode(statError) !== "ENOENT") throw statError;
          }
          if (stale) {
            try {
              filesystem.unlinkSync(lock);
            } catch (unlinkError: unknown) {
              if (errnoCode(unlinkError) !== "ENOENT") throw unlinkError;
            }
            continue;
          }
          failures += 1;
          if (failures >= policy.retries) {
            throw new Error(`${file}: locked by another orch process (${lock}); retry, or delete the lock file if no orch is running`);
          }
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, policy.interval_ms);
        }
      }
      try {
        ensurePrivateDir(orchDir);
        const next = fn(read());
        const temporary = settingsTemporaryPath(file);
        filesystem.writeFileSync(temporary, next);
        filesystem.renameSync(temporary, file);
      } finally {
        if (fd !== undefined) filesystem.closeSync(fd);
        try {
          filesystem.unlinkSync(lock);
        } catch (error: unknown) {
          if (errnoCode(error) !== "ENOENT") throw error;
        }
      }
    },
  };
}

/** Text held in memory. `file` labels it in messages so a test failure names its fixture. */
export function inMemorySettingsStorage(text: string | null, file: SettingsFilePath): SettingsStorage {
  let held = text;
  return {
    file,
    read: () => held,
    withLock: (policy, fn) => {
      void policy;
      held = fn(held);
    },
  };
}
