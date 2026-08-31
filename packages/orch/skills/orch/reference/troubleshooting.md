# Facts that bite

## Daemon

Daemon first, spawn last. Bridges reconnect to a restarted daemon on their own. After any
daemon stop or start or rebuild: respawn the fleet, then smoke-test one trivial dispatch
before fanning out. Trust `orch daemon status`, the RPC answer, not the existence of a pid
file. A hung daemon means stop, kill the pid, start.

After rebuilding or reinstalling orch, `orch daemon reload` re-execs the daemon on the new
code. That is the fix for a CLI/daemon hash-skew refusal.

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

`orch doctor` diagnoses, `-y` applies every fix unattended. `orch clean` reaps dead-pid
presence. `--worktrees` also clears orphaned worktrees, and `--force` discards unmerged work.

`$ORCH_DIR/agents/` is the store.
