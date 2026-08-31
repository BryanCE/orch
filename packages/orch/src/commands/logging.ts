import { createLogger } from "../log.ts";
import { settingsLogLevel } from "../settings/read.ts";
import { orchDir } from "../presence/store.ts";
import type { Logger } from "../types/core.ts";

/** Logger for CLI diagnosis records. User-facing output remains on stdout/stderr. */
export function commandLogger(): Logger {
  const directory = orchDir();
  return createLogger({ file: `${directory}/orch.log`, level: settingsLogLevel(directory) });
}
