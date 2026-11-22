// A launch's policy for a test that builds a spawn spec by hand: the default settings' worker policy.
import { policyTools, workerPolicyFrom } from "../../src/policy/workers.ts";
import { settingsFromFile } from "../../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../../src/settings/schema.ts";
import type { LaunchPolicy } from "../../src/types/policy.ts";

/** The default settings' launch policy, with `preferredModels` as the harness's quicklist and no env. */
export function testLaunch(preferredModels: readonly string[] = []): LaunchPolicy {
  const settings = settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({ schemaVersion: SETTINGS_SCHEMA, runtime: "node" }));
  const workers = workerPolicyFrom(settings);
  return { workers, tools: policyTools(workers), env: {}, preferredModels };
}
