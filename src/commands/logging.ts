import { createLogger, type Logger } from "../log.ts";
import { orchDir } from "../presence/store.ts";

/** Logger for CLI diagnosis records. User-facing output remains on stdout/stderr. */
export function commandLogger(): Logger {
  return createLogger({ file: `${orchDir()}/orch.log`, level: "info" });
}
