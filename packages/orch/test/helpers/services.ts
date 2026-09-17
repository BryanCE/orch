import type { LogProc, OrchDir } from "../../src/types/core.ts";
import { createServices } from "../../src/services.ts";
import { inMemorySettingsManager } from "../../src/settings/manager.ts";
import { settingsPath } from "../../src/settings/schema.ts";
import type { Services } from "../../src/types/services.ts";
import { settingsFixtureText } from "./settings.ts";

export interface TestServicesOptions {
  orchDir: OrchDir;
  /** Fixture body as `writeSettingsFixture` takes it; `null` means no settings file. */
  settings?: Record<string, unknown> | null;
  proc?: LogProc;
}

/** A Services whose settings never touch disk. `orchDir` still points at a real temp dir for
 * everything else (presence, store, logs). */
export function testServices(options: TestServicesOptions): Services {
  const file = settingsPath(options.orchDir);
  const text = options.settings === null ? null : settingsFixtureText(options.settings);
  return createServices({ orchDir: options.orchDir, settings: inMemorySettingsManager(text, file), proc: options.proc });
}
