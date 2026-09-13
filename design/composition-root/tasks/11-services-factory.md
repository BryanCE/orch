# 11-services-factory

Owns: `src/services.ts` (new)

Requires task 10 landed (it has).

Goal: the one function that turns options into a `Services` record. Every field is `options.x ?? default`, pi-style, so tests inject doubles and production gets files.

Do: create `src/services.ts`:

```ts
import { join } from "node:path";
import { createLogger } from "./log.ts";
import { orchDir as envOrchDir } from "./presence/writer.ts";
import { fileSettingsManager } from "./settings/manager.ts";
import { logLevelFor } from "./settings/read.ts";
import type { Logger } from "./types/core.ts";
import type { OrchSettings } from "./types/settings.ts";
import type { Services, SettingsManager } from "./types/services.ts";

export interface ServicesOptions {
  orchDir?: string;
  settings?: SettingsManager;
  logger?: Logger;
}

/** The logger must exist even when settings are malformed, so the malformed file can be
 *  reported; a parse failure here reads as "no settings" for the log level only. */
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
```

`createLogger(options: LoggerOptions, base?)` is `src/log.ts:51`; confirm `LoggerOptions` has `file` and `level` by reading the interface near that line, and match its field names. The `envOrchDir` import is temporary; task 6-02 moves the env read into this file.

Check: lint, tc. Tests: none named.
