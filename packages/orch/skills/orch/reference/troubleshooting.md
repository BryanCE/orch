# Facts that bite

## Daemon

Daemon first, spawn last. Bridges reconnect to a restarted daemon on their own. After any
daemon stop, start or rebuild: respawn the fleet, then smoke-test one trivial dispatch
before fanning out. Trust `orch daemon status`, the RPC answer, not the existence of a pid
file. A hung daemon means stop, kill the pid, start.

A refusal reading `daemon hash=... differs from installed hash=...` is CLI/daemon skew after
a rebuild. `orch daemon reload` re-execs the daemon on the new code. Never `--stale-ok` past
it.

## Model refusals

- `model luna matches several pi models (a, b); name one` means the short name is ambiguous
  in this harness's allowed list. Send one of the named specs.
- `pi does not list model X; it offers ...` means nothing the harness lists contains that
  name. The hint carries a spec to paste; `orch models --agent=pi` lists the rest.
- `model X is not in models.allowed.pi (...)` means the harness lists it and the user's
  allowlist excludes it. That is the user's setting, not a typo; ask, never edit it yourself.

## Queued dispatches

`Queued to <agent> (dispatch <id>): no bridge ack within Nms` means the agent is live but
its bridge holds no link: the harness is still starting, or the bridge is redialing on
`daemon.bridge_reconnect_ms`. The write is safe in the outbox and retries every
`daemon.outbox_drain_ms`, up to `daemon.outbox_max_attempts` before the daemon closes it as
undeliverable. `orch status --json` shows `bridgeAttached` per agent. Watch `orch events` for
the delivery.

## Stalled spawn

`STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` means the attach
wait expired. Spawn exits 1 and the other agents are fine. Check harness startup, then
`orch restart <name>`.

## Ambiguous targets

`control target <name> is ambiguous: <key>, <key>` means two live agents answer to that
name. Names are per-slice, so this is a duplicate you created. Address the one you mean by
its identity key (`orch status --json` has `.key`), then `orch rename` one of them.

## `orch status --json`

A top-level array; filter with `.[]`. The full row field list is in `orch help status`. Three
fields settle arguments: `cwd` is the repo the worker is actually confined to; `dispatchId`,
diffed against the id `orch dispatch` printed, proves the pane runs the prompt you sent;
`bridgeAttached` says whether a dispatch will deliver or queue. `state` is what the agent
says about itself, `backendStatus` is what the plexer says and it lags. Read `state`.

## Space walls

Reads default to your space. A wall error on housekeeping means "not from here". Skip it;
do not chase it with `--space-wide` or `--all`. A human at a raw terminal sits in no space and
alone sees the whole machine.

## Another session's agents

`reset`, `dispatch`, `steer` and `model` against a live foreign holder are refused; `abort`,
`close` and `reap` never are. `orch detach` releases your own lease; `orch adopt` takes an
unleased one. Never plan on claiming a foreign fleet's agents; their orchestrator may close
them at any moment.

## Repair

`orch doctor` diagnoses, `-y` applies every fix unattended. `orch clean` removes presence
dirs that name no agent and closes queued writes to dead agents; ended agents stay as
history. `--force` reaps every dead agent's records and dir. `--worktrees` also clears
orphaned worktrees, and with `--force` discards unmerged work. `orch reap --dead` sweeps
provably-dead agents without a prompt.

`$ORCH_DIR/orch.db` is the store: liveness, leases, queue state and outcomes are rows, and
every decision reads them. `$ORCH_DIR/agents/` is readable history beside it, status, results
and the delivery log as files. Deleting it mid-run costs you the history and nothing else.
