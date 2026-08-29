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
export class CommandRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandRefusal";
  }
}
