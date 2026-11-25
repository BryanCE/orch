// When a council stops taking rounds. The `council.stop` setting picks the rule: a count of
// rounds, or a mean score a round reaches or stops raising.
import type { CouncilStop } from "../types/council.ts";
import type { OrchSettings } from "../types/settings.ts";

/** The stop rule the council settings name. */
export function councilStop(council: OrchSettings["council"]): CouncilStop {
  return council.stop === "rounds"
    ? { stop: "rounds", rounds: council.rounds }
    : { stop: "score", targetScore: council.target_score, patience: council.patience };
}

/** The mean of a round's scores, counting only the members that scored it; null when none did. */
export function roundMean(reviews: readonly { readonly score: number | null }[]): number | null {
  const scored = reviews.flatMap((review) => review.score === null ? [] : [review.score]);
  return scored.length === 0 ? null : scored.reduce((sum, score) => sum + score, 0) / scored.length;
}

/** A round and its mean. */
export interface RoundMean {
  readonly round: number;
  readonly mean: number;
}

/** Each round's mean, in round order. A round no member scored has no mean and is left out. */
export function roundMeans(reviews: readonly { readonly round: number; readonly score: number | null }[]): RoundMean[] {
  const rounds = [...new Set(reviews.map((review) => review.round))].sort((a, b) => a - b);
  return rounds.flatMap((round) => {
    const mean = roundMean(reviews.filter((review) => review.round === round));
    return mean === null ? [] : [{ round, mean }];
  });
}

/** The rounds at the end of `means` whose mean did not rise, with the round before them. */
function flatStreak(means: readonly RoundMean[]): readonly RoundMean[] {
  let start = means.length - 1;
  for (; start > 0; start -= 1) {
    const here = means[start];
    const before = means[start - 1];
    if (here === undefined || before === undefined || here.mean > before.mean) break;
  }
  return means.slice(start);
}

/** Why a council that ran `run` rounds, with these round means, takes no next round; null
 *  while it goes on. A round no member scored has no mean, and is left out of `means`. */
export function stopReason(stop: CouncilStop, run: number, means: readonly RoundMean[]): string | null {
  if (stop.stop === "rounds") return run >= stop.rounds ? `has run its ${stop.rounds} rounds. Close it, or raise council.rounds to go on` : null;
  const last = means.at(-1);
  if (last === undefined) return null;
  if (last.mean >= stop.targetScore) return `reached ${last.mean.toFixed(1)}, at or above council.target_score ${stop.targetScore}. Close it, or raise council.target_score to go on`;
  const [since, ...flat] = flatStreak(means);
  if (since === undefined || flat.length <= stop.patience) return null;
  const streak = [since, ...flat];
  return `stalled: its mean has not risen since round ${since.round} (${streak.map((entry) => entry.mean.toFixed(1)).join(", ")}); raise council.patience or change the subject`;
}

/** How a council stops, as words: "after 3 rounds", or "at a mean of 9, or after 2 rounds in a
 *  row without a rise". */
export function stopRule(stop: CouncilStop): string {
  if (stop.stop === "rounds") return `after ${stop.rounds} rounds`;
  return `at a mean of ${stop.targetScore}, or after ${stop.patience + 1} rounds in a row without a rise`;
}
