import { SpawnRefusalError } from "../../refusal.ts";
import type { Backend } from "../../types/backend.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { AgentView } from "../../types/store.ts";

export const TAB_FIRST_WORDS: readonly string[] = [
  "elk", "snake", "otter", "fox", "wolf", "bear", "hawk", "owl", "lynx", "crow",
  "heron", "moose", "bison", "badger", "beaver", "raven", "falcon", "eagle", "gecko", "newt",
  "toad", "frog", "hare", "mole", "vole", "wren", "finch", "lark", "swan", "crane",
  "stork", "orca", "seal", "whale", "shark", "squid", "crab", "eel", "pike", "trout",
  "yak", "ibis", "puma", "tiger", "lion", "panda", "koala", "llama", "camel", "zebra",
];

export const TAB_SECOND_WORDS: readonly string[] = [
  "glacier", "tailwind", "ember", "canyon", "meadow", "river", "harbor", "summit", "tundra", "delta",
  "breeze", "thunder", "frost", "cinder", "drift", "dune", "fjord", "grove", "marsh", "mesa",
  "moss", "pebble", "prairie", "quartz", "rain", "reef", "ridge", "sleet", "spark", "spring",
  "storm", "stream", "sunrise", "tide", "timber", "valley", "vapor", "willow", "blizzard", "boulder",
  "cedar", "comet", "coral", "dawn", "dusk", "flint", "gale", "haze", "lagoon", "monsoon",
];

/** The label's number runs 01 to this. */
export const TAB_NUMBER_MAX = 99;

/** Rolls before a spawn with no free label gives up. */
export const TAB_LABEL_ATTEMPTS = 100;

/** A number in [0, 1), as `Math.random` returns. Tests pass a fixed sequence. */
export type RandomSource = () => number;

function pick(words: readonly string[], random: RandomSource): string {
  return words[Math.floor(random() * words.length)] ?? "";
}

/** One `<first>-<second>-<NN>` label, as `elk-glacier-01`. */
export function rollTabLabel(random: RandomSource): string {
  const first = pick(TAB_FIRST_WORDS, random);
  const second = pick(TAB_SECOND_WORDS, random);
  const number = Math.floor(random() * TAB_NUMBER_MAX) + 1;
  return `${first}-${second}-${String(number).padStart(2, "0")}`;
}

/** A rolled label no live tab carries, rerolled on a collision. */
export function freeTabLabel(taken: ReadonlySet<string>, random: RandomSource = Math.random): string {
  for (let attempt = 0; attempt < TAB_LABEL_ATTEMPTS; attempt++) {
    const label = rollTabLabel(random);
    if (!taken.has(label)) return label;
  }
  throw new SpawnRefusalError(`no free tab label after ${TAB_LABEL_ATTEMPTS} rolls; name one with --tab <tab>`);
}

/** Labels of the tabs on this plexer that hold an agent presence reports alive. */
export function liveTabLabels(backend: Pick<Backend, "id" | "placementInventory">, views: ReadonlyMap<string, AgentView>, presence: ReadonlyMap<string, PresenceEntry>): Set<string> {
  const handles = new Set([...views.values()]
    .filter((view) => view.environment.plexer === backend.id && presence.get(view.id)?.alive === true)
    .map((view) => view.environment.handle));
  return new Set((backend.placementInventory?.list() ?? [])
    .filter((target) => handles.has(String(target.handle)))
    .flatMap((target) => target.groupLabel === null ? [] : [target.groupLabel]));
}
