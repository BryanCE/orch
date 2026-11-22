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

/** The tabs a council's members sit in: the council's own tab, and numbered ones after it when
 *  the members outnumber what one tab holds. The members spread evenly, in their order. */
export function memberTabs<Member>(tab: string, members: readonly Member[], perTab: number): { readonly tab: string; readonly members: readonly Member[] }[] {
  const tabs = Math.ceil(members.length / perTab);
  const size = Math.ceil(members.length / tabs);
  return Array.from({ length: tabs }, (_, index) => ({ tab: index === 0 ? tab : `${tab}-${index + 1}`, members: members.slice(index * size, (index + 1) * size) }));
}
