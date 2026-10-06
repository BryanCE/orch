# Facts that bite

## Daemon

`orch daemon status` asks orchd directly, so trust it over a pid file. After a daemon restart
the bridges reconnect on their own and the fleet keeps its agents. Check `orch status`, then
carry on. A hung daemon gets `orch daemon stop`, then `orch daemon start`.

`daemon hash=... differs from installed hash=...` means the CLI and orchd run different builds.
Run `orch daemon reload` to put orchd on the installed code, and leave `--stale-ok` for the
user.

## Model refusals

Each refusal names a spec to paste or the `orch models --harness <harness>` that lists the
rest. A model outside `models.allowed.<harness>` is the user's choice, so ask the user.
`orch help model` covers the rest.

## Queued dispatch

`Queued to <agent> (dispatch <id>): no bridge ack ...` means orchd holds the write and the
agent's bridge has not linked yet: the harness is still starting, or the bridge is redialing.
orchd delivers it when the bridge attaches, so move on. `claude` and `codex` run no bridge.
Spawn warns that they are UNVERIFIED, and `orch status` shows when they are ready.

## Stalled spawn

`STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` means
`timeouts.spawn_attach_ms` ran out. Spawn exits 1 and the other agents are fine. The task
stays queued and lands on attach, with no model set. An agent that `orch status` later shows
idle had a slow harness: set its model with `orch model`. One that stays stalled gets its
harness startup checked, then `orch restart <name>`.

## Stuck agent

`orch status` shows `working` on one task with a flat cost for minutes, and `orch peek <name>`
shows one tool call with a climbing `Elapsed`. A steer waits for that call to return.
`orch abort <name> "<text>"` cancels the turn, then steers. Name the slow step in the text and
give the faster route. A headless agent has no pane to abort: `orch restart <name>`.

## Ambiguous targets

`Ambiguous target "<t>": it matches N agents, so nothing was done.` lists each candidate key.
Address the one you mean by its key (`orch status --json`, `.rows[].key`), then `orch rename`
the collision away.

## `orch status --json`

Three row fields settle arguments. `cwd` is the directory the agent works in. `dispatchId`,
compared with the id `orch dispatch` printed, proves the agent runs your prompt.
`bridgeAttached` says whether a dispatch delivers or queues. Read `state` for what the agent is
doing, since `backendStatus` comes from the plexer and lags. `orch help status` lists every
field.

## Spaces

Reads default to your space. A housekeeping refusal outside it means that item is not yours:
skip it.

## Repair

`orch doctor` diagnoses, and `orch doctor -y` applies every fix. `orch clean` belongs to the
human's shell and removes leftovers of dead agents: `--all` deletes their records and history,
`--worktrees` clears orphaned worktrees. `orch reap --dead` deletes every provably dead agent
without asking.
