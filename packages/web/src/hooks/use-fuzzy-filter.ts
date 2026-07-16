import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js'
import { useMemo } from 'react'

/**
 * A single fuse hit, slimmed to the fields we actually consume in the UI.
 * `matches` is only populated when the caller's `options.includeMatches` is
 * true — needed for highlight + "matched on X" labels in autocomplete.
 */
interface FuzzyMatch<T> {
  item: T
  score: number | undefined
  matches: readonly FuseResultMatch[] | undefined
}

/**
 * Low-level fuzzy search hook — returns rich fuse results (item + score +
 * matches). The Fuse instance is memoized on (items, options) so a stable
 * options reference at the call site is important; passing an inline object
 * every render will rebuild the index.
 *
 * Empty query → original items wrapped as zero-score matches in original
 * order (no filter, no re-sort). Non-empty query → fuse-ranked results.
 */
function useFuzzySearch<T>(
  items: T[],
  query: string,
  options: IFuseOptions<T>,
): FuzzyMatch<T>[] {
  const fuse = useMemo(() => new Fuse(items, options), [items, options])
  return useMemo(() => {
    const q = query.trim()
    if (q.length === 0) {
      return items.map((item) => ({ item, score: undefined, matches: undefined }))
    }
    return fuse.search(q).map((r) => ({ item: r.item, score: r.score, matches: r.matches }))
  }, [fuse, items, query])
}

/**
 * Convenience wrapper for the common case of filtering a table to a plain
 * `T[]` (no need for scores or match highlights). Built on `useFuzzySearch`
 * — one fuse call, two derived views.
 */
export function useFuzzyTableFilter<T>(
  items: T[],
  query: string,
  options: IFuseOptions<T>,
): T[] {
  const matches = useFuzzySearch(items, query, options)
  return useMemo(() => matches.map((m) => m.item), [matches])
}
