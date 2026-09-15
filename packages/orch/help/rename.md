Set the agent name (the NAME column) and the pane border with it. Pane, context, and model
are untouched, and the watch keeps following the agent, since scope filters on `spawnedBy`.

Rename on every refill, in the same message as the dispatch, so the status column and the
monitor line name the work the agent holds now. A stale name is worse than an ordinal
because it lies about which worker holds which slice.

`--pane` sets only the border label and leaves the agent name alone, for a border that
must read differently from the name.

Two live agents with one name make every target ambiguous. Address the one you mean by
its identity key (`orch status --json` has `.key`), then rename one of them.
