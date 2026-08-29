import { createLogger, type Logger, type LogContext } from "../log.ts";
import { configuredLogLevel } from "../config.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";

/** Logger for daemon decisions. Debug records stay filtered unless the daemon
 * configuration or ORCH_LOG_LEVEL explicitly enables them. */
export function decisionLogger(directory: string, context: LogContext = {}): Logger {
  return createLogger({ file: daemonRuntimeFiles(directory).log, level: configuredLogLevel(directory) }, context);
}
