/**
 * A command refusing to proceed, with the reason a human needs.
 *
 * It is thrown, never exited. `process.exit()` from the middle of a command is
 * unanswerable: a caller cannot recover, a test cannot assert it, and inside
 * `bun test` it kills the RUNNER — every remaining test file is silently never
 * run and the suite prints no summary at all, so a mostly-unexecuted suite is
 * indistinguishable from a passing one. The CLI boundary is the one place that
 * turns a refusal into an exit code.
 *
 * This module is a leaf on purpose: `src/entities.ts` and `src/commands/` both
 * raise refusals, and neither may import the other.
 */
import type { AmbiguousCandidate } from "./types/core.ts";
export type { AmbiguousCandidate };

export class CommandRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandRefusal";
  }
}

/**
 * The ONE wording for "that target matched more than one agent".
 *
 * This refusal used to have three. `entities.ts`
 * printed a bare candidate list with no advice, so a caller read it as a
 * listing command's output and lost the turn; `resolveAgentView` said "address
 * by id" and `resolveLifecycleTarget` said "address by key" — two names for a
 * fact settles, since the key IS the id.
 *
 * A refusal has to say three things or it costs the caller their turn: WHAT
 * failed, WHICH target string it was about, and what to send INSTEAD.
 */
export function ambiguousTargetRefusal(target: string, candidates: readonly AmbiguousCandidate[]): CommandRefusal {
  const listed = candidates
    .map((candidate) => `  ${candidate.key}${candidate.detail ? `  (${candidate.detail})` : ""}`)
    .join("\n");
  return new CommandRefusal(
    `Ambiguous target ${JSON.stringify(target)}: it matches ${candidates.length} agents, so nothing was done.\n`
    + `${listed}\n`
    + "Pick one and address it by its key - a key never matches two agents.",
  );
}

/** A spawn refused before it placed anything. Distinct from {@link CommandRefusal}
 *  because a caller catches it to report WHICH spawn was refused and why, and it
 *  lives here so the leaf both `spawn.ts` and the selection helpers import is the
 *  same one — that is what keeps them from importing each other. */
export class SpawnRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpawnRefusalError";
  }
}
