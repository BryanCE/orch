/**
 * Which valid key a person most likely meant when they typed one that does not exist.
 *
 * Pure string work with no settings knowledge: the caller supplies the candidate set, so
 * the same matcher serves `orch settings <key>` (registry keys) and the repair screen
 * (every path the schema declares).
 */

function swapped(left: string, right: string, i: number, j: number): boolean {
  return i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1];
}

/** Edit distance where two swapped neighbours count as one edit, like one added or dropped letter. */
function editDistance(left: string, right: string): number {
  let before: number[] = [];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      const edit = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      current[j] = swapped(left, right, i, j) ? Math.min(edit, before[j - 2]! + 1) : edit;
    }
    before = previous;
    previous = current;
  }
  return previous[right.length]!;
}

/** The `limit` closest candidates, nearest first. */
export function nearestKeys(needle: string, candidates: readonly string[], limit: number): string[] {
  return candidates
    .map((key) => ({ key, distance: editDistance(needle, key) }))
    .sort((left, right) => left.distance - right.distance || left.key.localeCompare(right.key))
    .slice(0, limit)
    .map((entry) => entry.key);
}

/** The key `needle` misspells within `maxEdits` edits, or undefined when every key is further. */
export function misspelledKey(needle: string, candidates: readonly string[], maxEdits: number): string | undefined {
  const nearest = nearestKeys(needle, candidates, 1)[0];
  return nearest !== undefined && editDistance(needle, nearest) <= maxEdits ? nearest : undefined;
}
