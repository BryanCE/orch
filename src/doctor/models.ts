import { loadConfigOrNull } from "../config.ts";
import { resolveAdapter } from "../adapters/registry.ts";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import type { AdapterId } from "../adapters/adapter.ts";
import { repickCommand, signedOutFix } from "../adapters/prerequisites.ts";
import type { CheckResult } from "../check-result.ts";

/** Confirm a harness still enumerates models and still offers the one orch records as its default.
 *  A harness signed out of its provider enumerates nothing, which is what silently strips every
 *  model choice out of setup. */
export function checkHarnessModels(orchDir: string, harness: AdapterId): CheckResult {
  const id = `models-${harness}`;
  const label = `${harness} models`;
  const adapter = resolveAdapter(harness);
  if (!adapter.listModels) return { id, label, status: "skip", detail: `${harness} enumerates no catalogue of its own` };

  const offered = adapter.listModels();
  if (!offered.length) {
    return { id, label, status: "warn", detail: `${harness} lists no models - ${signedOutFix(harness)}` };
  }
  const recorded = loadConfigOrNull(orchDir)?.defaults.models[harness];
  if (!recorded) return { id, label, status: "warn", detail: `${harness} offers ${offered.length} models but orch records no default - run: ${repickCommand(harness)}` };

  const { bare } = splitThinkingSuffix(recorded);
  if (!offered.some((model) => model.spec === bare)) {
    return { id, label, status: "fail", detail: `recorded default ${bare} is not among the ${offered.length} models ${harness} now offers - run: ${repickCommand(harness)}` };
  }
  return { id, label, status: "ok", detail: `default ${recorded}, ${offered.length} offered` };
}
