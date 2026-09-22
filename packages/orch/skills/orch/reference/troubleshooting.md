# Facts that bite

## Daemon

Daemon first, spawn last. Bridges reconnect to a restarted daemon on their own. After any
daemon stop or start: respawn the fleet, then smoke-test one trivial dispatch before
fanning out. Trust `orch daemon status`, the RPC answer, not the existence of a pid file. A
hung daemon means stop, kill the pid, start.

A refusal reading `daemon hash=... differs from installed hash=...` is CLI/daemon skew after
an update of orch. `orch daemon reload` re-execs the daemon on the new code. Never
`--stale-ok` past it.

## Model refusals

- `model luna matches several pi models (a, b); name one` means the short name is ambiguous
  in this harness's allowed list. Send one of the named specs.
- `pi does not list model X; it offers ...` means nothing the harness lists contains that
  name. The hint carries a spec to paste; `orch models --agent=pi` lists the rest.
- `model X is not in models.allowed.pi (...)` means the harness lists it and the user's
  allowlist excludes it. That is the user's setting, not a typo; ask, never edit it yourself.
- `model X matches only a, b, none in models.allowed.pi (...)` means the short name matches
  only models the user's allowlist excludes. Same ruling: ask.

## Queued dispatches

`Queued to <agent> (dispatch <id>): no bridge ack within Nms` (N is
`timeouts.dispatch_ack_ms`) means the agent is live but
its bridge holds no link: the harness is still starting, or the bridge is redialing on
`daemon.bridge_reconnect_ms`. The write is safe in the outbox and retries every
`daemon.outbox_drain_ms`, up to `daemon.outbox_max_attempts` before the daemon closes it as
undeliverable. `orch status --json` shows `.rows[].bridgeAttached` per agent (null under
`--offline`; `claude` and `codex` have no bridge). Watch `orch events` for
the delivery: the `working` transition it starts is a mid-turn flip, so `orch monitor` does
not carry it.

## Stalled spawn

`STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` means the attach
wait (`timeouts.spawn_attach_ms`) expired. Spawn exits 1 and the other agents are fine. The
launch dispatch is still queued (`queued <name> <id>`) and lands on attach; only the model
pin is skipped. A bridge that dialed before orchd registered its agent is refused and
re-sends the attach every `daemon.bridge_reconnect_ms` on its own, so a STALLED agent that
`orch status` later shows idle is a slow harness, not a lost bridge. Check harness startup,
then `orch restart <name>`.

## Stuck agent

`orch status` shows `working` with the same task and a flat cost for minutes, and `orch peek
<name>` shows one tool call with a climbing `Elapsed`: a repo-wide grep, a slow read across
the WSL boundary. A steer lands only after the tool returns, so it does not free the agent.
`orch abort <name> "<text>"` presses Escape twice to cancel the turn, then steers with the
text. The cancel has no lease gate; the steer half does, like `orch steer`. A headless agent
has no pane to abort. Name the slow step and forbid it in the text. Still stuck: `orch restart <name>`.

## Ambiguous targets

`Ambiguous target "<t>": it matches N agents, so nothing was done.` lists each candidate
key. The word matched more than one of: a name, a key or pane id, a suffix, a harness id.
Spawn and rename refuse a name already live in the same space. Address the one you mean by
its key (`orch status --json`, `.rows[].key`), then `orch rename` if two names collide.

## `orch status --json`

An object `{names, rows}`. Filter rows with `.rows[]`. Ids resolve to display names through
`.names.agents` and `.names.spaces`. The full row field list is in `orch help status`. Three
fields settle arguments: `cwd` is the repo the worker is actually confined to; `dispatchId`,
diffed against the id `orch dispatch` printed, proves the pane runs the prompt you sent;
`bridgeAttached` says whether a dispatch will deliver or queue. `state` is what the agent
says about itself, `backendStatus` is what the plexer says and it lags. Read `state`.

## Space walls

Reads default to your space. A wall error on housekeeping means "not from here". Skip it;
do not chase it with `--space-wide` or `--all`. A human at a raw terminal sits in no space and
alone sees the whole machine.

## Another session's agents

From your session, an agent you hold no lease on does not resolve: every verb answers
`No target matches "<t>"`, and `close` refuses with `cannot close <name>: it belongs to
<owner>`. Only the human at an unregistered shell kills (`abort`, `close`, `reap`) without a
lease check. `orch detach` releases your own lease; `orch adopt` takes an
unleased one. Never plan on claiming a foreign fleet's agents; their orchestrator may close
them at any moment.

## Repair

`orch doctor` diagnoses, `-y` applies every fix unattended. `orch clean` is operator-only (a
spawned agent is refused). It removes presence
dirs that name no agent and closes queued writes to dead agents; ended agents stay as
history. `--force` reaps every dead agent's records and dir. `--worktrees` also clears
orphaned worktrees, and with `--force` discards unmerged work. `orch reap --dead` sweeps
provably-dead agents without a prompt.

`$ORCH_DIR/orch.db` is the store: liveness, leases, queue state and outcomes are rows, and
every decision reads them. `$ORCH_DIR/agents/` is readable history beside it: `status.jsonl`,
`results.jsonl` and `outcomes.jsonl` (control outcomes) per agent. Deleting it mid-run costs you the history and nothing else.
