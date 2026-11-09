// What the CLI asks orchd about this machine: what each harness offers, which plexers are here,
// and how long to wait for an answer while settings.json may be absent or unreadable.
import { askDaemon } from "./daemon.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import type { DaemonClient } from "../types/services.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { SetupProbes } from "../setup/composition.ts";

/** A timeout from settings.json, or its default while setup has not written the file or doctor
 *  is reading a broken one: those two commands exist for exactly that state. */
export function timeoutMs(services: Pick<DaemonClient, "settings">, key: keyof OrchSettings["timeouts"]): number {
  try {
    return (services.settings.currentOrNull() ?? SETTINGS_DEFAULTS).timeouts[key];
  } catch {
    return SETTINGS_DEFAULTS.timeouts[key];
  }
}

/** The wizard's questions, answered by orchd, which runs the adapters and the plexers. */
export function setupProbes(services: DaemonClient): SetupProbes {
  return {
    offers: async (harnesses) => (await askDaemon(services, "harness-catalogues", { harnesses: [...harnesses] }, timeoutMs(services, "adapter_command_ms"))).catalogues,
    availablePlexers: async () => new Set((await askDaemon(services, "plexers-available", undefined)).plexers),
  };
}
