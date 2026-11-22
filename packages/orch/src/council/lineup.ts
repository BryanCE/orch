// A council's standing lineup: the members the `council.models` setting names, one per model.
import { modelShort, splitThinkingSuffix } from "../policy/thinking.ts";
import { ADAPTER_IDS, type AdapterId } from "../types/adapter.ts";
import type { OrchSettings } from "../types/settings.ts";

/** One member of the lineup: the name it sits under, and what it launches on. */
export interface LineupMember {
  readonly name: string;
  readonly harness: AdapterId;
  readonly model: string;
}

/** A model as part of an agent name: its id without the provider, in the letters a name takes. */
function modelSlug(model: string): string {
  return modelShort(splitThinkingSuffix(model).bare).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The members a council convenes when its convener names none: one per model of
 *  `council.models`, harness by harness. A member is named for its council and its model, so
 *  two councils on the same lineup never share a name; a model listed twice is numbered. */
export function councilLineup(council: string, models: OrchSettings["council"]["models"]): LineupMember[] {
  const taken = new Map<string, number>();
  return ADAPTER_IDS.flatMap((harness) => (models[harness] ?? []).map((model) => {
    const base = `${council.toLowerCase()}-${modelSlug(model)}`;
    const count = (taken.get(base) ?? 0) + 1;
    taken.set(base, count);
    return { name: count === 1 ? base : `${base}-${count}`, harness, model };
  }));
}
