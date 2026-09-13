import { join } from "node:path";
import { createServices } from "../../src/services.ts";
import { inMemorySettingsManager } from "../../src/settings/manager.ts";
import type { Services } from "../../src/types/services.ts";
import { settingsFixtureText } from "./settings.ts";

export interface TestServicesOptions {
  orchDir: string;
  /** Fixture body as `writeSettingsFixture` takes it; `null` means no settings file. */
  settings?: Record<string, unknown> | null;
}

/** A Services whose settings never touch disk. `orchDir` still points at a real temp dir for
 * everything else (presence, store, logs). */
export function testServices(options: TestServicesOptions): Services {
  const file = join(options.orchDir, "settings.json");
  const text = options.settings === null ? null : settingsFixtureText(options.settings);
  return createServices({ orchDir: options.orchDir, settings: inMemorySettingsManager(text, file) });
}
