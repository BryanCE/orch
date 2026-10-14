// Compaction points are keyed by the concrete model a harness runs, never by an alias:
// an alias moves to a new model when the harness updates, and a point set for one model
// must not follow it. A launch names a spec, so its table is re-keyed through the catalogue.
import { resolveAdapter } from "../adapters/registry.ts";
import type { HarnessModel, ModelCatalogue } from "../types/adapter.ts";
import type { WorkerPolicy } from "../types/policy.ts";

/** The model a catalogue row runs now: the harness's resolved model, or the spec itself. */
export function concreteModel(model: HarnessModel): string {
  return model.resolved ?? model.spec;
}

/** One harness's points keyed by every spec a launch may name. A key that is itself an
 *  alias is dropped; each alias takes the point of the model it runs now. */
function launchKeyed(points: Readonly<Record<string, number>>, offered: readonly HarnessModel[]): Record<string, number> {
  const aliases = new Set(offered.filter((model) => concreteModel(model) !== model.spec).map((model) => model.spec));
  const concrete = Object.entries(points).filter(([model]) => !aliases.has(model));
  const aliased = offered.flatMap((model): [string, number][] => {
    const tokens = points[concreteModel(model)];
    return tokens === undefined || !aliases.has(model.spec) ? [] : [[model.spec, tokens]];
  });
  return Object.fromEntries([...concrete, ...aliased]);
}

/** The worker policy with each harness's points keyed for launch. */
export function withLaunchPoints(workers: WorkerPolicy, catalogue: ModelCatalogue): WorkerPolicy {
  const table = Object.entries(workers.compactAtTokens).map(([harness, points]): [string, Record<string, number>] =>
    [harness, launchKeyed(points ?? {}, resolveAdapter(harness).models?.listModels(catalogue) ?? [])]);
  return { ...workers, compactAtTokens: Object.fromEntries(table) };
}
