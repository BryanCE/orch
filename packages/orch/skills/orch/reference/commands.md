# Command doctrine

`orch help` is the map. `orch help <command>` (or `orch <command> -h`) carries every flag,
default and output format, and it is always current with the installed build. This file
holds only what help cannot: when to reach for a command and what goes wrong when you do
not. If a flag here disagrees with help, help wins.

## Spawn (`orch help spawn`)

A fleet is one command. `--prompt`, `--file` and `--model` each take one value for all
agents or exactly N, in positional order. Per-agent specs long enough for files are N
`--file` flags, not N dispatches. Mixed models are N `--model` flags, not two spawns.

- Every name and every model is validated before any tab or pane exists, so a refused spawn
  leaves nothing behind. Read `orch status --capacity` before sizing a wave.
- `--worktree` only when parallel agents would otherwise edit the same files.
- Outside every plexer spawn is headless and needs `--prompt` or `--file`; the agent runs the
  task and exits with nowhere to steer it. `--backend <plexer>` opens that plexer's own home
  behind a user grant.
- Inside a herdr pane the fleet lands as a new tab in your space with no grant and no
  `--space`. `--space <name>` files it in an orch space the user created (`orch space list`);
  a space is never a plexer workspace id.

## Models (`orch help models`, `orch help model`)

Every harness names models in its own vocabulary, so there is no global model string.

- A short name is enough. `luna:high` expands to the one listed, allowed model containing
  `luna`. Two matches are refused by name; pick one. Zero matches tells you what the harness
  does list. The same rule applies to spawn, tile, dispatch, reset and `orch model`.
- The launch model comes from `defaults.models.<harness>`. Pass `--model` for a deliberate
  choice, then confirm the MODEL column in `orch status`.
- An agent keeps the tuning it holds. Dispatch, reset, restart and settings reloads re-pin
  what the agent was last given unless the command names another model.
- Escalate one rung at a time, only when the task failed at the current rung, then
  re-dispatch. A capable model with a complete prompt beats a stronger model with a vague one.
- `orch model <target> <spec>` retargets a live agent where the harness supports it. Where it
  does not (Claude Code, for one), pin at spawn or use `orch reset --model`.
- `models.allowed.<harness>` gates what may launch. `models.preferred.<harness>` is only the
  quicklist that harness's picker cycles. `orch settings models` re-picks both.
  `orch settings thinking` sets effort independently of the model.

## Dispatch (`orch help dispatch`)

Dispatch clears the session, re-pins the held model, then sends. Never pair it with reset.
`--keep-context` only adds to work already in flight.

`--with <path>` points the agent at context it opens on demand; nothing is inlined, and orch
only checks the path exists. Put what the agent must know in the prompt, and what it may need
to look at behind `--with`.

### Quote the spec correctly. This is yours, not orch's.

The shell splits argv before orch runs. **Single-quote the spec.** Inside single quotes bash,
zsh and PowerShell all treat every character literally. Only a literal apostrophe differs:
`'\''` in bash and zsh, doubled `''` in PowerShell. `--file` is for a spec too long to want on
one line, never a way around quoting.

```sh
orch dispatch api-types 'keep $ORCH_DIR and `backticks` literal; say "done" when finished'
```

Dispatch prints `Delivered to <recipient> (dispatch <id>)` when the agent applied the prompt,
or `Queued to ...` when the daemon accepted a durable write with no bridge ack yet. Queued
writes retry on `daemon.outbox_drain_ms` up to `daemon.outbox_max_attempts`. `orch status
--json` echoes the id as `.dispatchId` once the agent runs that prompt, which is how you
prove a pane runs what you sent. `--steal` and `--cross-space` are operator-only.

## Queue (`orch help queue`, `orch help work`)

For fan-out where you do not care which agent takes which task: `orch queue add` per task,
then `orch work`. Failed tasks retry up to `queue.max_retries`. Check `orch queue list` before
reusing fleet names; a stale claimed task retries into a new agent of the same name.

`orch queue add` enqueues through orchd, so it needs the daemon like every other write. The
enqueue wakes the work loop at once, and so does every status report, result, answer and
bridge attach: an idle agent takes a queued task the moment either exists, never on a poll.
Claimed tasks dispatch in parallel, `queue.dispatch_concurrency` at a time. With nothing to
wake it the loop ticks every `daemon.work_tick_ms` for retention and question re-asks only.

## Watch (`orch help monitor`, `orch help events`)

Bare `orch monitor` is the whole of normal use: the agents you own, one line each, only the
states you act on (`monitor.on`: `asking`, `blocked`, `done`, `error`, `aborted`, `exited`)
and every `message` a worker sends you. Arm it through the Monitor tool in the same message
as the spawn. `orch events` is the same stream with every state on it, mid-turn flips
included; take it only when you were told to observe one. Both take the same flags.

- **Preflight before arming, every time.** It reads the OS instead of your memory, so it
  survives a context compaction:

  ```bash
  pgrep -fa "orch (monitor|events)" | grep -v pgrep
  ```

  Non-empty means a watch is armed; do not arm another. If it names agents that no longer
  exist, `kill` that pid and arm one fresh.
- **Smoke-test before arming.** `timeout 6 orch monitor --since-seq 0` replays past
  transitions. Silence has three causes, and orch names the first for you: you own no agents
  yet, the fleet is mid-turn with no state change, or your scope excludes the agents that did.
- **Scope: three rings, and you are in the first.** Default is the agents this session owns,
  matched on `spawnedBy` and the open lease, and it follows agents you dispatch to later.
  `--space-wide` widens to the rest of your space, for two orchs coordinating. Past that is
  the wall, and nothing lifts it. `--agent=<name>` narrows to one; `--filter=working,idle`
  drops those states from `orch events`.
- **Act on the type.** `transition` is the normal line. `asking` means answer now. `message`
  is a worker's report to you, text on the line. `closed` and `task` are bookkeeping, and
  stay on `orch events`.
- **No dedupe, no timestamp floor.** The daemon suppresses repeats and `(key, seq)` identifies
  an event. A `date`-based floor only drops real events to clock skew.

`orch status` is the same scope as a table, right now, with cost and context. `orch wait` is
one blocking checkpoint on one agent, never a substitute for the stream. An attached stream
counts as daemon usage, so orchd stays up beneath it. Notifications go to the `notify` sinks
in settings.json whether or not anyone streams; `orch notify test` fires every sink.

## Targets

A target is an agent name, an identity key, or a unique handle suffix. All resolve to the
same agent. Names are the readable option, so keep them meaningful. Several verbs take
`<target>...`: `result`, `reset`, `reload`, `restart`, `close`.

## Answer, steer, arrange

`orch answer` for a pending question; it has no force flag and refuses by name when the
target is not asking. `orch steer` at most once per running agent; a doctrine change big
enough to explain twice is a new dispatch. An agent in `asking` refuses a steer and names
`orch answer`. `orch broadcast` steers several and reports which refused. `orch abort` cancels
the current turn. `orch pipe <src> <dst>` hands one agent's finished result to another.

Arrange without stealing focus: `orch tile`, `orch move`, `orch zoom`, `orch tab`, `orch
space`. Only `focus` verbs jump the user's view. `orch close --all` sweeps only agents you
spawned; `--stream` also kills your `orch monitor` or `orch events` stream.

## Worktree review (`orch help review`)

With `--worktree` each agent commits on its own branch. `orch review list` shows done agents
with commits ahead, `approve` merges and removes the worktree, `reject -m` re-dispatches
feedback into the same worktree. Bare `orch review` walks it interactively.

## Settings (`orch help settings`)

`orch settings` prints every effective setting with the source that won (flag, env,
settings.json, default) and opens the editor on a TTY. Every number orch uses is a setting
there; the names that bite a fleet most: `fleet.max_agents_per_tab`,
`fleet.max_agents_per_pack`, `fleet.max_depth`, `fleet.worker_peer_tools`,
`fleet.cross_space`, `mail.to_spawner` and `mail.to_worker` (per direction: `prompt` types
the mail into the recipient's input whoever is in the pane, `prompt-unless-focused` does the
same unless the human is in that pane and then publishes instead, `events` always publishes
it as a `message` line on `orch monitor` and `orch events` and leaves the input alone;
defaults `prompt-unless-focused` to the spawner, `prompt` to everyone else), `monitor.on` (the states `orch
monitor` shows), `defaults.models`,
`defaults.thinking`, `models.allowed`, `questions.renag_ms`, `timeouts.dispatch_ack_ms`,
`daemon.outbox_drain_ms`, `daemon.work_tick_ms`, `queue.dispatch_concurrency`.

`orch settings notify` manages the sinks orchd delivers through. `sound`, `desktop` and
`herdr` take no fields; `webhook` needs `--url`, `command` needs `--command` and gets the
event JSON on stdin. `--on` defaults to `blocked,error,done`.
