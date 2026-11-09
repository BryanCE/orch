import type { LogProc, OrchDir } from "../../src/types/core.ts";
import { createServices } from "../../src/services.ts";
import { inMemorySettingsManager } from "../../src/settings/manager.ts";
import { settingsPath } from "../../src/settings/schema.ts";
import type { DaemonServices, Services } from "../../src/types/services.ts";
import { createModelCatalogue } from "../../src/adapters/model-catalogue.ts";
import type { ModelCatalogue } from "../../src/types/adapter.ts";
import { settingsFixtureText } from "./settings.ts";

export interface TestServicesOptions {
  orchDir: OrchDir;
  /** Fixture body as `writeSettingsFixture` takes it; `null` means no settings file. */
  settings?: Record<string, unknown> | null;
  proc?: LogProc;
  /** The model listing every harness answers; the real catalogue runs the harness to ask. */
  models?: ModelCatalogue;
}

/** A Services whose settings never touch disk. `orchDir` still points at a real temp dir for
 * everything else (presence, store, logs). */
export function testServices(options: TestServicesOptions): Services {
  const file = settingsPath(options.orchDir);
  const text = options.settings === null ? null : settingsFixtureText(options.settings);
  return createServices({ orchDir: options.orchDir, settings: inMemorySettingsManager(text, file), proc: options.proc });
}

/** orchd's services over {@link testServices}: the given model listing, or the real catalogue. */
export function testDaemonServices(options: TestServicesOptions): DaemonServices {
  const services = testServices(options);
  return { ...services, models: options.models ?? createModelCatalogue(services.orchDir, services.logger) };
}
