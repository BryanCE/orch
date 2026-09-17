import { homedir } from "node:os";
import { join } from "node:path";
import { createLogger, logFile } from "./log.ts";
import { fileSettingsManager } from "./settings/manager.ts";
import { logLevelFor } from "./settings/read.ts";
import { detectHost } from "./host.ts";
import type { Logger, LogProc, OrchDir } from "./types/core.ts";
import type { Host } from "./types/host.ts";
import type { OrchSettings } from "./types/settings.ts";
import type { ModelCatalogue } from "./types/adapter.ts";
import { createModelCatalogue } from "./adapters/model-catalogue.ts";
import type { Services, SettingsManager } from "./types/services.ts";

/** The one place a path becomes an orch dir. Called where a path crosses in from outside
 *  the type system: the ORCH_DIR env read below, a test's temp dir, a CLI flag. The cast
 *  is the brand's mint, and it exists nowhere else. */
export function orchDirAt(path: string): OrchDir {
  return path as OrchDir;
}

/** The ONE read of ORCH_DIR. Every other module receives the directory as a value. */
export function envOrchDir(): OrchDir {
  return orchDirAt(process.env.ORCH_DIR ?? join(homedir(), ".orch"));
}

export interface ServicesOptions {
  orchDir?: OrchDir;
  settings?: SettingsManager;
  logger?: Logger;
  proc?: LogProc;
  models?: ModelCatalogue;
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

/** Build a process's services once, at a root. Nothing below a root calls this. */
export function createServices(options: ServicesOptions = {}): Services {
  const orchDir = options.orchDir ?? envOrchDir();
  const settings = options.settings ?? fileSettingsManager(orchDir);
  const logger = options.logger ?? createLogger({ file: logFile(orchDir), level: logLevelFor(settingsForLogLevel(settings)), proc: options.proc ?? "cli" });
  const models = options.models ?? createModelCatalogue(orchDir, logger);
  const host = options.host ?? detectHost();
  return { orchDir, settings, logger, models, host };
}
