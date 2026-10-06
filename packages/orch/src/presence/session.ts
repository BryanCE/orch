import { launchCredential } from "../identity/launch.ts";
import { envOrchDir } from "../orch-dir.ts";
import { readSettingsFile, settingsValues } from "../settings/read.ts";
import { settingsPath } from "../settings/schema.ts";
import type { OrchDir } from "../types/core.ts";

export type PresenceSession =
  | { readonly kind: "not-orch" }
  | { readonly kind: "ok"; readonly key: string; readonly orchDir: OrchDir; readonly settings: ReturnType<typeof settingsValues> };

/** Resolve the hook shim's identity, orch root and settings. Only an agent orch
 *  spawned carries a launch credential; any other session has nothing to report. */
export function presenceSession(): PresenceSession {
  const key = launchCredential();
  if (key === null) return { kind: "not-orch" };
  const orchDir = envOrchDir();
  const file = readSettingsFile(settingsPath(orchDir));
  if (file === null) return { kind: "not-orch" };
  return { kind: "ok", key, orchDir, settings: settingsValues(file) };
}
