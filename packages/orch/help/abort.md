Escape twice, 500ms apart, to dismiss and cancel the target's current turn. Never gated by
a lease.

With text, the abort is followed by a steer with that text, through orchd like `orch steer`.
The turn a stuck agent was in is gone; the text is what it does instead. One command, so a
worker stuck in one slow tool call is freed and redirected without a gap it could fill on
its own.

    orch abort orca-cli "Stop the repo-wide grep. Write cli.ts from what you have read."
