import { mkdirSync, watch, type FSWatcher } from "node:fs";
import { loadConfig, type OrchConfig } from "../config.ts";
import { errorMessage } from "../util.ts";

const CONFIG_FILE = "settings.json";
const RELOAD_SIGNAL_FILE = "reload.signal";
const DEFAULT_DEBOUNCE_MS = 250;

export interface ConfigWatchOptions {
  onChange: (config: OrchConfig) => void;
  onWarn?: (message: string) => void;
  debounceMs?: number;
};

export interface ConfigWatch {
  stop: () => void;
};

function warningMessage(error: unknown): string {
  return errorMessage(error);
}

function isReloadFile(filename: string | Buffer | null): boolean {
  const name = filename?.toString();
  return name === CONFIG_FILE || name === RELOAD_SIGNAL_FILE;
}

function scheduleReload(
  timer: ReturnType<typeof setTimeout> | undefined,
  reload: () => void,
  debounceMs: number,
): ReturnType<typeof setTimeout> {
  if (timer !== undefined) clearTimeout(timer);
  return setTimeout(reload, debounceMs);
}

/** Watch settings.json and publish only successfully loaded configurations. */
export function startConfigWatch(orchDir: string, opts: ConfigWatchOptions): ConfigWatch {
  mkdirSync(orchDir, { recursive: true });
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watcher: FSWatcher | undefined;
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const reload = (): void => {
    timer = undefined;
    if (stopped) return;
    try {
      const config = loadConfig(orchDir);
      opts.onChange(config);
    } catch (error: unknown) {
      opts.onWarn?.(warningMessage(error));
    }
  };

  const onFileChange = (_event: string, filename: string | Buffer | null): void => {
    if (stopped || !isReloadFile(filename)) return;
    timer = scheduleReload(timer, reload, debounceMs);
  };

  try {
    watcher = watch(orchDir, { persistent: false }, onFileChange);
    watcher.on("error", (error: Error) => {
      if (!stopped) opts.onWarn?.(warningMessage(error));
    });
    const currentConfig = loadConfig(orchDir);
    opts.onChange(currentConfig);
  } catch (error: unknown) {
    watcher?.close();
    throw error;
  }

  return {
    stop: (): void => {
      if (stopped) return;
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      watcher?.close();
    },
  };
}
