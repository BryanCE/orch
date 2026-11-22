// A launch's policy for a test that builds a spawn spec by hand: the default settings' worker policy.
import { policyTools, workerPolicyFrom } from "../../src/policy/workers.ts";
import { SETTINGS_DEFAULTS } from "../../src/settings/schema.ts";
import type { LaunchPolicy } from "../../src/types/policy.ts";

/** The default settings' launch policy, with `preferredModels` as the harness's quicklist and no env. */
export function testLaunch(preferredModels: readonly string[] = []): LaunchPolicy {
  const workers = workerPolicyFrom(SETTINGS_DEFAULTS);
  return { workers, tools: policyTools(workers), env: {}, preferredModels };
}
