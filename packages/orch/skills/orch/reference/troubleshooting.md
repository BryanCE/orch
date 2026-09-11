# Facts that bite

## Daemon

Daemon first, spawn last. Bridges reconnect to a restarted daemon on their own. After any
daemon stop or start or rebuild: respawn the fleet, then smoke-test one trivial dispatch
before fanning out. Trust `orch daemon status`, the RPC answer, not the existence of a pid
file. A hung daemon means stop, kill the pid, start.

After rebuilding or reinstalling orch, `orch daemon reload` re-execs the daemon on the new
code. That is the fix for a CLI/daemon hash-skew refusal.

## Queued dispatches

`Queued for <agent> (dispatch <id>): no bridge ack within Nms` means the agent is live but
its bridge holds no link. The harness is still starting, or the bridge is redialing on
`daemon.bridge_reconnect_ms`. The write is safe in the outbox. `orch status --json` shows
`bridgeAttached` per agent. Watch `orch events` for the delivery state change.

## Stalled spawn

`STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` means the
spawn attach wait expired. Spawn exits 1. Check harness startup, then retry
`orch restart <name>`.

## Ambiguous targets

After a pane's first completed dispatch, control targets can go ambiguous (`ambiguous:
<agent-key>, <pane-id>`) and even reset may not clear it. This is not a licence to skip
reuse. Attempt reset and dispatch on the idle pane first, which costs one command. Only on
the actual error, spawn a replacement, `orch move` it into the domain tab by tab ID, and
close the zombie.

## Queue leftovers

Stale claimed queue tasks retry into new panes with the same name. Check `orch queue list`
before reusing fleet names and cancel leftovers.

## `orch status --json`

It is a top-level array. Filter with `.[]`. There is no `.agents` key.

Row fields: `key, paneId, managed, name, owner, tab, agent, model, modelShort, state, cost,
ctxPercent, tokens, turns, task, lastText, alive, exited, cwd, dispatchId, backendStatus,
sessionPath, presenceDir, workspace, spawnedBy`.

Two fields settle arguments. `cwd` is the repo the worker is actually confined to.
`dispatchId`, diffed against the id `orch dispatch` printed, proves the pane runs the prompt
you sent.

`state` is what the agent says about itself. `backendStatus` is what the plexer says about
the pane and it lags. Read `state` for completion, never `backendStatus`.

## Workspace walls

Reads default to the current workspace. A wall error on housekeeping means "not from here".
Skip it, do not chase it with `--all`.

## Repair

`orch doctor` diagnoses, `-y` applies every fix unattended. `orch clean` removes presence
dirs that name no agent and closes queued writes to dead agents; ended agents stay as
history. `--force` reaps every dead agent's records and dir. `--worktrees` also clears
orphaned worktrees, and with `--force` discards unmerged work.

`$ORCH_DIR/orch.db` is the store. Liveness, leases, queue state and outcomes are rows, and
every decision reads them. `$ORCH_DIR/agents/` is readable history beside it — status,
results and the delivery log as files you may read, parse, archive or delete. Deleting it
mid-run costs you the history and nothing else.
