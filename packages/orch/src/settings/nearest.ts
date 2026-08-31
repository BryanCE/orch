/**
 * Which valid key a person most likely meant when they typed one that does not exist.
 *
 * Pure string work with no settings knowledge: the caller supplies the candidate set, so
 * the same matcher serves `orch settings <key>` (registry keys) and the repair screen
 * (every path the schema declares).
 */

/** Levenshtein distance, one row at a time. */
export function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j]!;
      row[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(diagonal + 1, above + 1, row[j - 1]! + 1);
      diagonal = above;
    }
  }
  return row[right.length]!;
}

/** The `limit` closest candidates, nearest first. */
export function nearestKeys(needle: string, candidates: readonly string[], limit: number): string[] {
  return candidates
    .map((key) => ({ key, distance: editDistance(needle, key) }))
    .sort((left, right) => left.distance - right.distance || left.key.localeCompare(right.key))
    .slice(0, limit)
    .map((entry) => entry.key);
}

/**
 * How far a key may sit from a real one and still read as that key misspelled: four
 * characters in ten. Past it they are two different settings, and offering one for the
 * other invents an intent nobody had — `fleet.max_dpeth` is a typo for `fleet.max_depth`,
 * while a retired key is not a typo for whatever replaced it. It is a key that no longer
 * exists, and only the person who wrote it knows what should become of its value.
 */
const MISSPELLING_RATIO = 0.4;

/** The key `needle` is a misspelling of, or undefined when it is too far from all of them. */
export function misspelledKey(needle: string, candidates: readonly string[]): string | undefined {
  const nearest = nearestKeys(needle, candidates, 1)[0];
  if (nearest === undefined) return undefined;
  const span = Math.max(needle.length, nearest.length);
  return editDistance(needle, nearest) <= span * MISSPELLING_RATIO ? nearest : undefined;
}
