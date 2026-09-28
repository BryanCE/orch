# Facts that bite

## Daemon

Check the daemon before you spawn. Bridges reconnect to a restarted daemon on their own. After
a daemon stop or start, respawn the fleet and send one trivial dispatch before you fan out.
`orch daemon status` asks the daemon over RPC, so trust it over a pid file. A hung daemon gets
stop, kill the pid, start.

`daemon hash=... differs from installed hash=...` means the CLI and the daemon run different
builds after an update. `orch daemon reload` re-execs the daemon on the new code. Fix the skew
rather than pass `--stale-ok`.

## Model refusals

- `model luna matches several pi models (a, b); name one`: the short name is ambiguous in this
  harness's list. Send one of the named specs.
- `pi does not list model X; it offers ...`: the harness lists nothing with that name. The hint
  carries a spec to paste, and `orch models --agent=pi` lists the rest.
- `model X is not in models.allowed.pi (...)`: the harness lists it and the user's allowlist
  leaves it out. The allowlist is the user's choice, so ask the user.
- `model X matches only a, b, none in models.allowed.pi (...)`: the short name matches only
  models the allowlist leaves out. Ask the user.

## Queued dispatches

`Queued to <agent> (dispatch <id>): no bridge ack within Nms` (N is `timeouts.dispatch_ack_ms`)
means the agent is live and its bridge has no link yet. The harness is still starting, or the
bridge is redialing on `daemon.bridge_reconnect_ms`. The write sits safe in the outbox and
retries every `daemon.outbox_drain_ms`, up to `daemon.outbox_max_attempts`, before the daemon
closes it as undeliverable.

`orch status --json` shows `.rows[].bridgeAttached` per agent (null under `--offline`, and
`claude` and `codex` have no bridge). `orch events` shows the delivery. The `working` state it
starts flips mid-turn, so `orch monitor` leaves it out.

## Stalled spawn

`STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` means
`timeouts.spawn_attach_ms` ran out. Spawn exits 1, and the other agents are fine. The launch
dispatch stays queued (`queued <name> <id>`) and lands on attach. Only the model pin is
skipped. A bridge that dialed before orchd registered its agent re-sends the attach every
`daemon.bridge_reconnect_ms`, so a STALLED agent that `orch status` later shows idle had a slow
harness. When it stays stalled, check the harness startup, then `orch restart <name>`.

## Stuck agent

`orch status` shows `working` on the same task with a flat cost for minutes, and
`orch peek <name>` shows one tool call with a climbing `Elapsed`, such as a repo-wide grep or a
slow read across the WSL boundary. A steer lands only after that call returns.
`orch abort <name> "<text>"` presses Escape twice to cancel the turn, then steers with the
text. The cancel ignores leases, and the steer half checks them like `orch steer`. Name the
slow step in the text and give the faster route. A headless agent has no pane to abort. Still
stuck: `orch restart <name>`.

## Ambiguous targets

`Ambiguous target "<t>": it matches N agents, so nothing was done.` lists each candidate key.
The word matched more than one name, key, pane id, suffix or harness id. Spawn and rename
refuse a name already live in the same space. Address the one you mean by its key
(`orch status --json`, `.rows[].key`), then `orch rename` the collision away.

## `orch status --json`

An object `{names, rows}`. Filter rows with `.rows[]`. Ids map to display names through
`.names.agents` and `.names.spaces`. `orch help status` lists every row field. Three fields
settle arguments:

- `cwd` is the repo the worker is confined to.
- `dispatchId`, compared with the id `orch dispatch` printed, proves the pane runs your prompt.
- `bridgeAttached` says whether a dispatch delivers or queues.

`state` is what the agent reports about itself. `backendStatus` is what the plexer reports, and
it lags. Read `state`.

## Space walls

Reads default to your space. A wall error on housekeeping means "not from here", so skip that
item. A human at a raw terminal sits in no space and sees the whole machine.

## Repair

`orch doctor` diagnoses, and `-y` applies every fix. `orch clean` is for the operator, and a
spawned agent is refused. It removes presence dirs that name no agent and closes queued writes
to dead agents. Ended agents stay as history. `--force` reaps every dead agent's records and
dir. `--worktrees` also clears orphaned worktrees, and with `--force` it discards unmerged
work. `orch reap --dead` sweeps agents that are provably dead, with no prompt.

`$ORCH_DIR/orch.db` is the store. Liveness, leases, queue state and outcomes are rows there,
and every decision reads them. `$ORCH_DIR/agents/` beside it is history: `status.jsonl`,
`results.jsonl` and `outcomes.jsonl` per agent. Deleting it mid-run loses the history and
nothing else.
