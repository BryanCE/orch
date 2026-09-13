import { homedir } from "node:os";
import { join } from "node:path";
import { createLogger } from "./log.ts";
import { fileSettingsManager } from "./settings/manager.ts";
import { logLevelFor } from "./settings/read.ts";
import type { Logger } from "./types/core.ts";
import type { OrchSettings } from "./types/settings.ts";
import type { Services, SettingsManager } from "./types/services.ts";

/** The ONE read of ORCH_DIR. Every other module receives the directory as a value. */
export function envOrchDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

export interface ServicesOptions {
  orchDir?: string;
  settings?: SettingsManager;
  logger?: Logger;
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

/** Build a process's services once, at a root. Nothing below a root calls this. */
export function createServices(options: ServicesOptions = {}): Services {
  const orchDir = options.orchDir ?? envOrchDir();
  const settings = options.settings ?? fileSettingsManager(orchDir);
  const logger = options.logger ?? createLogger({ file: join(orchDir, "orch.log"), level: logLevelFor(settingsForLogLevel(settings)) });
  return { orchDir, settings, logger };
}
