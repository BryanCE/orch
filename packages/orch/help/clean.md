Remove agent dirs that name no agent and close queued writes to dead agents. Ended agents
stay as history; the daemon reaps a gone agent's records on its next sweep and its JSONL
history ages out under `retention.ended_agents_days`. `--force` does both now.
`--worktrees` also removes orphaned worktrees that are empty or merged, and with `--force`
discards unmerged work.

Operator-only. A spawned agent never reaps records it does not own.

`$ORCH_DIR/orch.db` is the store: liveness, leases, queue state, and outcomes are rows, and
every decision reads them. `$ORCH_DIR/agents/` is readable history beside it. Deleting it
mid-run costs you the history and nothing else.
