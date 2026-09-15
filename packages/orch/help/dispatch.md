Durably accept a prompt through orchd. The write lands in the outbox and survives restarts.

The target starts the work on a clean session: dispatch clears the context, re-pins the
model the agent holds, then sends. Never pair it with `orch reset`. `--keep-context` opts
out, only to add to work already in flight.

Prints `Delivered to <recipient> (dispatch <id>)` when the agent applied the prompt, or
`Queued to <recipient> (dispatch <id>): no bridge ack within <timeouts.dispatch_ack_ms>ms`
when the daemon accepted a durable write with no bridge ack yet. A queued dispatch retries
every `daemon.outbox_drain_ms`, up to `daemon.outbox_max_attempts`, and is re-pushed the
moment the bridge attaches. `orch status --json` echoes the id as `.dispatchId` once the
agent runs that prompt. That is how you prove a pane runs what you sent.

Single-quote the prompt. The shell splits argv before orch runs. Inside single quotes bash,
zsh, and PowerShell keep every character literal. Only a literal apostrophe differs: `'\''`
in bash and zsh, doubled `''` in PowerShell. A mangled prompt is a quoting error, never an
orch bug. `--file` is for a prompt too long for one line, never a way around quoting.

    orch dispatch api-types 'keep $ORCH_DIR and `backticks` literal; say "done" when finished'

`--with <path>` points the agent at context it opens on demand. Nothing is inlined, and orch
only checks the path exists. Put what the agent must know in the prompt, and what it may
need to look at behind `--with`.

orch prepends the worker contract to every dispatch. Send the task and only the task. A
hand-written copy of the contract delivers the rule twice in two wordings, and the two
drift. A missing rule gets added to the header. `--raw` opts out.

`--steal` and `--cross-space` are operator-only. A spawned agent's are refused.
