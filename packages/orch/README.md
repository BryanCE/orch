# orch

**orch** is a control plane for a fleet of coding agents. One orchestrator spawns many
workers, hands each a slice of work, watches them transition, and collects results — while
a resident daemon brokers every write so a dispatch survives a restart.

The orchestrator is usually **another agent**. orch ships skills that teach a coding agent
to drive it, and the whole surface is built for that: every command takes `--json`, state
arrives as a push stream rather than a poll, and a worker gets tools to ask its
orchestrator a question and to message its peers. You can drive it by hand — it is a normal
CLI — but the design target is an agent running the loop.

Workers run under a **harness** (`pi`, `omp`, `claude`, `codex`) inside a **plexer**
(`herdr`, `tmux`, or detached `headless`).

## Install

### npm

```sh
npm install -g @bryance/orch
orch setup
```

The package ships the prebuilt `dist/` bundle and runs on node, so end users need neither
Bun nor a checkout. `orch setup` records which harnesses and plexers you use, installs
missing dependencies, wires each harness's shim, and asks before copying orch's skills into
your agent directories.

A harness is a separate install (`orch setup` offers each one):

| Harness | Install | Sign in |
| --- | --- | --- |
| `pi` | `bun add -g @earendil-works/pi-coding-agent` | `pi auth` |
| `omp` | `bun add -g @oh-my-pi/pi-coding-agent` | `omp setup` |
| `claude` | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| `codex` | [openai/codex](https://github.com/openai/codex) | `codex login` |

Visible panes need `herdr` or `tmux`; `--backend headless` needs neither.

### Development (Bun)

```sh
bun install
bun run build:dev
```

`build:dev` clears stale build/install artifacts, rebuilds the CLI, runs `npm pack`, and does a
real `npm install -g` of the tarball under the active node prefix — the same thing an npm user
gets. It then asks doctor to re-link configured harness shims. There is no `bun link` and no
symlink into the repo, so **editing source does not change the installed `orch`**; re-run
`build:dev` to pick up CLI changes.

## Teaching an agent to drive orch

orch ships three skills — `orch`, `pi-agent`, and `herdr`. `orch setup` asks before writing
them, and `skills.roots` decides where: `~/.claude/skills` (Claude Code's own directory)
and `~/.agents/skills` (the cross-harness convention). The same files go to every root,
because a skill is read by whichever harness finds it.

```sh
orch settings skills --install                   # install into the recorded roots
orch settings skills --no-install                # stop installing; existing files are yours
orch settings skills --roots=~/.agents/skills    # one root only
```

[`skills/orch/SKILL.md`](skills/orch/SKILL.md) is the fleet doctrine an orchestrating agent
follows: how to size a fleet, how to slice work, when to reuse a pane instead of spawning,
and how to watch the event stream instead of blocking. Read it before writing your own
orchestration prompt — the README below is the reference; that file is the method.

## The loop

```sh
orch spawn 2 --name api --cwd "$(git rev-parse --show-toplevel)"
orch dispatch api-1 "add the FooBar type to src/types/core.ts and export it"
orch events                                   # push stream; do not poll
orch result api-1
orch runs -n 20                               # durable dispatch history
orch reset api-1                              # fresh context, same pane, name and model kept
```

`spawn` opens one tab of balanced, tiled agents named `<prefix>-1..N` and never steals
focus. Always pass `--cwd` — it silently defaults
to wherever you ran the command.

Detached, no plexer required:

```sh
orch spawn 1 --backend headless --prompt "run the unit tests and report failures"
orch status --json
```

A headless spawn **requires `--prompt`**: the process runs that prompt and exits.

Targets resolve as an agent name, an identity key, or a unique key suffix. `orch help` is
the authoritative command map and `orch help <command>` carries every flag.

### Steering a running worker

`orch steer <target> "<text>"` lands a durable mid-run instruction. `orch answer <target>
"<text>"` responds to a pending question. These are different operations and orch enforces
it: **a steer aimed at a pane in `asking` is refused** and names `orch answer`, because the
inbox would accept the message and the harness would lose it inside the blocked turn.
`orch broadcast` steers several at once and reports which refused rather than failing the
whole fan-out.

## What a worker sees

Every dispatch is prefixed with a **worker header** unless you pass `--raw`. It tells the
worker the pane is unattended, forbids it from fanning out its own subagents or shelling
out to `orch`, and names the machine-wide locked commands. The header is composed from the
harness's declared capabilities — a clause is only added when the mechanism behind it
actually works ([`src/worker-prompt.ts`](src/worker-prompt.ts)).

Inside the pane a worker gets orch's own tools:

| Tool | What it does | Availability |
| --- | --- | --- |
| `orch_ask` | Ask the orchestrator a question and block until answered. Surfaces in `orch questions`. | harnesses declaring `ask` |
| `orch_agents` | List live peer agents with compact status. | `fleet.worker_peer_tools` |
| `orch_send` | Send a message to a peer. Target `"spawner"` reaches the session that spawned this agent. | `fleet.worker_peer_tools` |
| `orch_read` | Read a peer's latest result or status text. | `fleet.worker_peer_tools` |

`fleet.worker_peer_tools` is **off by default** — a fleet of workers messaging each other is
a deliberate choice, not a default. `orch_ask` is always available and is never removed by
`workers.allow_tools`, because an allowlist that muted it would leave the worker unable to
talk back.

The `orch_send target "spawner"` clause is only added when the spawner actually has a
mailbox. A Claude Code session orchestrating a pi fleet has no presence inbox, so its
workers are never told to reply to an address that would refuse them.

## Command reference

`orch status` is the default when no command is given.

| Command | Description |
| --- | --- |
| `status [--json] [--all] [--all-panes] [--offline]` | Fleet table; `--all-panes` includes panes orch did not spawn, `--offline` reads agent files only. |
| `questions` | Pending agent questions from live agents. |
| `events [--agent=<name>] [--agent-id=<id>] [--any-agent] [--all] [--status s[,s…]] [--json]` | Push stream of state transitions with durable replay; needs a running daemon. Bare: one readable line per transition, scoped to the agents this session spawned. |
| `logs [--since <when>] [--level <level>] [--agent <id>] [--dispatch <id>] [--json]` | Query the structured diagnosis log. |
| `queue add \| list \| history \| cancel` | Durable task queue; `add` takes `--worktree`. |
| `work [--once]` | Assign queued tasks to idle agents. |
| `review [list \| approve \| reject]` | Review, merge, or re-dispatch worktree results. |
| `run <target> "<prompt>" [--raw]` | Queue a prompt through orchd with the worker header. |
| `dispatch <target> "<prompt>" [--raw] [--model M] [--agent A]` | Durable dispatch; prints a dispatch id that `status --json` echoes back as `.dispatchId`. |
| `answer <target> "<text>" [--force]` | Answer a pending question. |
| `steer <target> <text…>` | Durable mid-run instruction; refused while the target is `asking`. |
| `broadcast "<text>" [target ...\|--all]` | Steer many; reports per-target refusals. |
| `pipe <src> <dst> ["instruction"]` | Hand one agent's finished result to another. |
| `model <target> <model[:thinking]>` | Change a target's model. |
| `wait <target> [--status s] [--timeout ms]` | Block until a status (default `done`, `timeouts.wait_ms`). |
| `result <target> [--force] [--json]` | Print a result from presence, run history, or adapter session text. |
| `runs [<target>] [-n <count>] [--json]` | Durable dispatch history, newest first; optionally filter by target. |
| `tail <target> [-n N]` / `session <target>` | Recent session entries; resolved session path and stats. |
| `reload <target>… \| --all` | Reload panes and signal watchers. |
| `reset <target>… \| --all [--model M]` / `new` | Fresh session and context, same pane. |
| `restart <target>… \| --all [--cmd C]` | Close the harness process and relaunch it. |
| `lock run \| check \| status \| release` | One heavy command machine-wide; see `locked_commands`. |
| `spawn <N> [--tab L] [--cwd P] [--name PREFIX] [--model M] [--agent A] [--backend B] [--prompt T] [--worktree]` | Fresh tab of tiled agents. |
| `tile <tab\|pane> [--name X] …` | Add one pane to an existing tab. |
| `grant [<hash>\|--list]` | Approve an action an agent was refused. Needs a terminal; no flag answers the prompt for you. |
| `rename <target> <name> [--pane]` | Rename the agent, or the pane border. |
| `close <target>… \| --all [--stream]` / `kill` | Close targets; `--all` spares panes orch did not spawn. |
| `abort <target>` | Cancel the current turn. |
| `detach <target>` / `adopt <target> \| --all` / `reap <target>` | Release a lease; take an unleased agent; delete an ended agent's record and presence dir. |
| `keys <target> <key>…` / `peek <target> [-n N]` | Raw keys into a pane; read its visible screen. |
| `panes` / `tabs` / `tab new\|rename\|close\|focus` | Pane and tab listing and lifecycle. |
| `focus <target>` / `zoom <target>` / `move <target>` | Focus (the one command that steals focus), zoom, relocate. |
| `space list \| create \| rename \| delete \| focus` | orch's own grouping of agents; see below. |
| `daemon start [--fg] \| stop \| status \| reload` | Manage orchd. |
| `doctor [--fix] [-y] [--json]` | Check the install; `-y` applies every fix unattended. |
| `clean [--worktrees [--force]]` | Reap dead agent dirs and orphaned worktrees. |
| `notify test [--state <state>]` | Push a synthetic transition through every configured sink. |
| `setup` / `settings` / `settings models` / `settings notify` / `settings thinking` / `settings skills` / `models` | Configure the install; list what each harness can run. |
| `help [command]` | Full usage, or one command's detail. |

## Concepts

### Identity, provenance, ownership, environment

Four facts about an agent, and they are never welded together:

- **Identity** is one minted opaque id and nothing else. It is immutable, and it never
  encodes where the agent is running — an agent that moves between plexers or spaces keeps
  the same id.
- **Provenance** is who spawned it. Immutable.
- **Ownership** is who holds it *now* — a lease, recorded with a fencing token.
- **Environment** is where it is: cwd, repo, worktree, branch, plexer, handle, space. It is
  mutable, it lives in its own rows, and it is queryable and displayable but never identity.

### Leases, not walls

An orchestrator that drives an agent holds a **lease** on it. A lease is mutual exclusion,
not authorization:

- `dispatch`, `steer`, `model`, and `reset` are refused while a **live** foreign orch holds
  the lease. A dead holder is not a collision — its lease is a stale row.
- `abort`, `close`, and `reap` are **never** lease-gated. The human must always be able to
  kill an agent from the CLI or the web, whatever happened to whoever spawned it.
- `orch detach` releases a lease; the agent keeps running and stays adoptable. `orch adopt`
  takes an unleased agent, or one whose holder is gone; `--steal` takes one a live orch
  still holds.

Work survives its spawner, always. Losing an orchestrator costs a driver, never a life.

### Spaces

A **space** is orch's own grouping of agents — orch names it, orch owns it, and it is
independent of whatever the plexer calls its own groupings. `orch space create/list/rename/
delete/focus` manages them; `fleet.max_agents_per_space` limits agents per space and `fleet.cross_space`
decides whether one orch may reach across them. Notifications carry the originating space and
a stable per-space color so an alert keeps its context.

Running `orch spawn` from outside a pane is **refused** until a human approves opening a space
with `orch grant`; `--space <id>` uses one that is already open.

### Harness × plexer

These are independent axes, and nothing in orch branches on the pair:

- **Harnesses** (agent adapters) translate a coding-agent CLI and its state protocol:
  `pi`, `omp`, `claude`, `codex`.
- **Plexers** (execution backends) decide where a harness runs: `herdr` and `tmux` give
  visible focusable panes, `headless` runs a detached process and records its handle and log.
- **Notifier sinks** deliver state events: `desktop`, `webhook`, `command`, `herdr`.

Per-harness shipped code lives in `extensions/<harness>/`; plexer-specific code lives in
`src/backends/<plexer>/`. Design rules are in
[`docs/reference/design-patterns.md`](docs/reference/design-patterns.md).

### orchd and presence

`orchd` is the resident daemon. Every write — dispatch, steer, answer, model, queue —
travels through it, is persisted to an outbox before delivery, and is retried until acked,
so a daemon restart never drops an in-flight instruction. State flows the other way as a
push stream with monotonic sequence numbers; a subscriber that reconnects replays from its
last sequence and is told explicitly if there was a gap.

Agents publish presence under `$ORCH_DIR/agents/<id>/` — `status.json`, `result.json`,
`question.json`, and `control.json` are agent records; `inbox.jsonl`, `answer.json`, and
`ack.jsonl` carry control traffic. Every spawned agent receives its identity as
`ORCH_AGENT_KEY` and nothing else; a harness shim never reads `HERDR_PANE_ID`, `TMUX_PANE`,
or any other plexer variable.

## Configuration

`$ORCH_DIR/settings.json` (default `~/.orch/settings.json`) is a `schemaVersion`-stamped,
strictly validated JSON file you may edit by hand. Flags beat `ORCH_*` environment
variables, which beat this file, which beats built-in defaults. `orch settings` prints every
effective value with the source that won.

```json
{
  "schemaVersion": 1,
  "runtime": "node",
  "enabled": {
    "adapters": ["pi", "claude"],
    "backends": ["herdr", "headless"]
  },
  "defaults": {
    "adapter": "pi",
    "backend": "herdr",
    "models": { "pi": "provider/model", "claude": "opus" },
    "thinking": "medium",
    "thinking_by_harness": { "claude": "high" },
    "worktree": false
  },
  "fleet": { "max_agents_per_pack": 10, "max_depth": 1, "worker_peer_tools": false, "cross_space": false },
  "models": {
    "preferred": { "pi": ["provider/fast", "provider/deep"] },
    "allowed": { "pi": ["provider/*"] }
  },
  "workers": { "inherit_extensions": true, "builtin_tools": true, "allow_tools": [] },
  "queue": { "max_retries": 1 },
  "logging": { "level": "info" },
  "retention": {
    "ended_agents_days": 90, "queue_days": 14, "events_days": 7,
    "runs_days": 30, "outbox_days": 7, "logs_days": 7
  },
  "timeouts": { "dispatch_ack_ms": 10000, "wait_ms": 300000, "adapter_command_ms": 60000, "notify_ms": 3000 },
  "notify": [
    { "id": "desktop", "on": ["blocked", "error", "done"] },
    { "id": "webhook", "url": "https://example.test/orch-events", "on": ["done", "error"] }
  ],
  "locked_commands": [],
  "daemon": { "tcp_port": 3716, "idle_shutdown_minutes": 30 },
  "tiling": { "first_split": "rows" },
  "skills": { "install": true, "roots": ["~/.claude/skills", "~/.agents/skills"] },
  "hosts": {
    "worker": { "dest": "user@example.org", "orch_dir": "/home/user/.orch", "timeout_ms": 10000 }
  }
}
```

`runtime` (`node`, `deno`, or `bun`) is a required top-level scalar chosen at setup — exactly
one runtime executes an install, so it is neither a default a spawn may override nor an
`enabled` set. An unknown key, a wrong type, or an unknown adapter/backend id fails the load
loudly with the file path and the reason; there is exactly one current schema and an
out-of-date file is malformed, never migrated.

### Tiling

A tab's opening split decides its whole grid; every split after it halves the biggest
pane's longer visual side.

| `tiling.first_split` | Second agent lands | Four agents land |
| --- | --- | --- |
| `rows` (default) | under the first | 2x2 at any tab width |
| `columns` | beside the first | 2x2 until the tab is wide enough that halving keeps picking columns |
| `longest-edge` | across the tab's longer edge | four thin columns on a wide monitor |

### Models: three independent per-harness settings

Every harness names models in its own vocabulary, so each of these is recorded per harness
and none substitutes for another:

| Setting | What it does | Empty means |
| --- | --- | --- |
| `defaults.models.<harness>` | The model a new agent launches on. | nothing recorded; spawn refuses until `--model` or `orch settings models` supplies one |
| `models.preferred.<harness>` | The quicklist handed to that harness's own picker (`pi`/`omp`: `--models`). | no quicklist is passed |
| `models.allowed.<harness>` | The launch gate: a spawn is refused unless the model matches one of these globs. | every model the harness offers is allowed |

A model outside `preferred` is still launchable — the quicklist is convenience, never
permission. Restricting what may launch is `allowed` and nothing else.

```sh
orch models                          # every enabled harness's full catalogue
orch models --agent=pi --search=son  # narrow by spec or label
orch models --agent=pi --pick=3      # print one full spec, for scripting
```

`orch models` lists everything the harness reports whatever is configured, and records
nothing.

### Thinking

Thinking effort is its own axis, configured through orch rather than smuggled into the model
string. Levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`.

```sh
orch settings thinking                          # the effective level, and any per-harness overrides
orch settings thinking high                     # the default for every harness
orch settings thinking high --harness=claude    # override one harness
```

`--model <model[:thinking]>` still pins both at once for a single spawn or dispatch.

## Notifications and events

Two different surfaces, often confused:

- **`orch events`** is a stream for whoever is watching the fleet — a human in a terminal or
  an orchestrating agent. It is a subscriber, not a notifier. Events are stored durably so a
  reconnect after a daemon restart can replay (subject to retention). Bare `orch events` is
  the normal use: one readable line per transition, scoped to the agents this session
  spawned, with no flag or `jq` filter needed to make it legible.
- **Notifier sinks** are delivered by **orchd**, whether or not anyone has `orch events`
  open. Each entry in `notify` hands the event to something outside orch: `desktop` shells
  out to an OS notification daemon (`notify-send`, `wsl-notify-send`, or a bundled
  PowerShell toast on WSL), `herdr` to `herdr notification show`, `webhook` POSTs the
  canonical JSON, `command` spawns your argv with that JSON on stdin.

Two gates decide whether a configured sink ever fires, and both are silent:

1. **`on` defaults to `["blocked", "error", "done"]`** — work needs you, work broke, work
   finished. Name the states explicitly to narrow or widen that.
2. **Each sink is probed at delivery time, in orchd's environment.** `desktop` needs a
   notification tier on the daemon's PATH; `herdr` needs `HERDR_ENV=1` there, so a daemon
   started outside a herdr pane will never deliver herdr notifications even when configured.

`orch settings notify` is the writer for that array; each sink declares the fields it takes,
so `add` names them as flags. A sink already configured is replaced, keeping the fields the
call does not name — which is how you change `on` alone.

```sh
orch settings notify                                          # what is configured, and when each fires
orch settings notify add desktop --on=blocked,error,done      # fire on done too
orch settings notify add command --command="notify-send orch" # spawns with canonical JSON on stdin
orch settings notify add webhook --url=https://example.org/hook
orch settings notify remove command
```

```sh
orch doctor                        # reports each sink's availability and how to fix it
orch notify test --state blocked   # push a synthetic event through every sink now
```

Webhook and command sinks receive one canonical JSON object. `title` is the outcome-first
rendered line; `body` is that title plus details. Nullable fields are emitted as `null`.

```json
{
  "title": "BLOCKED demo/agent-4f2a1c: approve deployment",
  "body": "BLOCKED demo/agent-4f2a1c: approve deployment\nSpace: demo (#db2777)\nTab: tab-1\nModel: model-1",
  "space": "demo",
  "spaceColor": "#db2777",
  "host": null,
  "key": "4f2a1cb830",
  "agent": "demo/agent-4f2a1c",
  "name": "api-1",
  "tab": "tab-1",
  "model": "model-1",
  "oldState": "working",
  "newState": "blocked",
  "seq": 12,
  "task": "approve deployment",
  "cost": null,
  "ts": "2026-08-29T16:00:00.000Z",
  "lastError": null
}
```

The space color is derived from the space name and is stable for that name. `done` events
summarize what the agent reported; `error` events use `lastError`; `blocked` events use the
task.

## Files and data layout

All state lives under `$ORCH_DIR` (default `~/.orch`):

```
$ORCH_DIR/
├── orch.db                  # SQLite (WAL): every brokered table
├── settings.json            # user configuration (JSON)
├── reload.signal            # touch signal for config/extension reload watchers
├── cmd-lock.json            # machine-wide command lock holder; present only while held
├── orchd.sock               # daemon RPC endpoint (or a marker)
├── orchd.port               # loopback TCP port when TCP transport is used
├── orchd.token              # owner-readable loopback RPC credential
├── orchd.lock               # daemon single-instance lock
├── orchd.log                # detached daemon output and lifecycle log
├── logs/                    # detached headless-agent output
└── agents/<id>/             # one directory per agent, named by its minted id
    ├── status.json          # liveness, state, and run facts
    ├── result.json          # settled-turn result
    ├── inbox.jsonl          # orchestrator-to-agent control lines
    ├── ack.jsonl            # delivery markers for those lines
    ├── question.json        # agent-to-orchestrator blocking question
    ├── answer.json          # the reply to it
    └── control.json         # outcome of a model/thinking control command
```

The database holds the agents and their environments, leases, queue, outbox, catalogues,
durable events, runs, grants, and spaces; its migrations live in `drizzle/`. Presence files
are disposable and regenerated by live agents — losing `agents/<id>/` loses the last observed
status and result, never queued work, event history, or run history. `orch result` falls back
to run history after a presence directory has been reaped.

SQLite runs in WAL mode, so `orch.db-wal` and `orch.db-shm` appear beside the database while
it is open. Stop the daemon before copying the store, and copy `orch.db` alone.

## License

MIT
