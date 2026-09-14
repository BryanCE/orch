import type { OrchDir } from "../../types/core.ts";
import { createLogger } from "../../log.ts";
import { logLevelFor } from "../../settings/read.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import type { LogContext, Logger } from "../../types/core.ts";
import type { OrchSettings } from "../../types/settings.ts";

/** Logger for daemon decisions. Debug records stay filtered unless the daemon
 * settings or ORCH_LOG_LEVEL explicitly enables them. */
export function decisionLogger(directory: OrchDir, settings: OrchSettings | null, context: LogContext = {}): Logger {
  return createLogger({ file: daemonRuntimeFiles(directory).log, level: logLevelFor(settings) }, context);
}
