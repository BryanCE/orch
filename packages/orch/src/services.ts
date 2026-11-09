import { createLogger, logFile } from "./log.ts";
import { envOrchDir } from "./orch-dir.ts";
import { fileSettingsManager } from "./settings/manager.ts";
import { logLevelFor } from "./settings/read.ts";
import { detectHost } from "./host.ts";
import type { Logger, LogProc, OrchDir } from "./types/core.ts";
import type { Host } from "./types/host.ts";
import type { OrchSettings } from "./types/settings.ts";
import type { Services, SettingsManager } from "./types/services.ts";

export interface ServicesOptions {
  orchDir?: OrchDir;
  settings?: SettingsManager;
  logger?: Logger;
  proc?: LogProc;
  host?: Host;
}

/** The logger must exist even when settings are malformed, so the malformed file can be
 * reported; a parse failure here reads as "no settings" for the log level only. */
function settingsForLogLevel(settings: SettingsManager): OrchSettings | null {
  try {
    return settings.currentOrNull();
  } catch {
    return null;
  }
}

/** Build a process's services once, at a root. Nothing below a root calls this. A client (the CLI,
 *  the web UI) runs on these; orchd adds what only it holds, its model catalogue, at its own root. */
export function createServices(options: ServicesOptions = {}): Services {
  const orchDir = options.orchDir ?? envOrchDir();
  const settings = options.settings ?? fileSettingsManager(orchDir);
  const logger = options.logger ?? createLogger({ file: logFile(orchDir), level: logLevelFor(settingsForLogLevel(settings)), proc: options.proc ?? "cli" });
  const host = options.host ?? detectHost();
  return { orchDir, settings, logger, host };
}
