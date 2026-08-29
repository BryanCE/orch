import { createLogger, isLogLevel, type Logger, type LogContext } from "../log.ts";
import { loadConfigOrNull } from "../config.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";

/** Logger for daemon decisions. Debug records stay filtered unless the daemon
 * configuration or ORCH_LOG_LEVEL explicitly enables them. */
export function decisionLogger(directory: string, context: LogContext = {}): Logger {
  let configured: ReturnType<typeof loadConfigOrNull>;
  try {
    configured = loadConfigOrNull(directory);
  } catch {
    configured = null;
  }
  const env = process.env.ORCH_LOG_LEVEL;
  const level = env !== undefined && isLogLevel(env) ? env : configured?.logging?.level ?? "info";
  return createLogger({ file: daemonRuntimeFiles(directory).log, level }, context);
}
