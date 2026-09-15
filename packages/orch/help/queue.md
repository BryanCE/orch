Durable task queue, stored in the orch store and assigned by `orch work`. For fan-out where
you do not care which agent takes which task: `orch queue add` per task, then `orch work`.

`add` enqueues through orchd, so it needs the daemon like every other write. The enqueue
wakes the work loop at once, and so does every status report, result, answer, and bridge
attach: an idle agent takes a queued task the moment either exists, never on a poll.
Claimed tasks dispatch in parallel, `queue.dispatch_concurrency` at a time. With nothing to
wake it the loop ticks every `daemon.work_tick_ms` for retention and question re-asks only.

A task has one scope, chosen at enqueue: `--agent`, `--pack`, or `--space`. No flag means
the enqueuer's own pack. `--pack` accepts any member and resolves to the root.

Failed tasks retry up to `queue.max_retries`. Check `orch queue list` before you reuse
fleet names: a stale claimed task retries into a new agent of the same name.

Subcommands: `add`, `list`, `history`, `cancel`, `edit`, `take-on`, `reap`, `intake`.
