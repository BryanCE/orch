# orch

**orch** is a fleet orchestration control plane for coding agents running in herdr panes. It gives one operator a durable loop for spawning, dispatching, observing, steering, and reviewing many agents. Built-in agent adapters cover **pi**, **Claude**, and **Codex**; execution can happen in visible herdr panes or through the headless backend.

orch is also a headless control-plane backend: the daemon, presence protocol, event stream, queue, and result files keep agent state observable and steerable without requiring a pane for every run.

## Install

### npm (end users)

Install the published CLI globally with npm:

```sh
npm install -g orch
orch setup
```

The npm package includes the prebuilt `dist/` bundle, so npm users do not need Bun to build orch locally. `herdr` is required for visible pane fleets; install and configure the agent CLI you plan to use. The `pi` adapter also requires [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent). Use `--backend headless` when a visible herdr fleet is not needed.

### Development (Bun)

From a checkout, install dependencies and link the local CLI:

```sh
bun install
bun run build
bun link
```

`bun link` makes the checkout's `orch` and `pif` commands available globally. `bun run build` refreshes the prebuilt extension bundle in `dist/`.

## Quickstart

Open a herdr workspace, then run the core loop:

```sh
orch spawn 2 --tab Team1 --agent pi
orch dispatch Team1-1 "fix the failing tests"
orch status
orch wait Team1-1
orch result Team1-1
orch reload Team1-1                 # refresh the current session
orch new Team1-1                    # reset to a fresh session/context
```

`dispatch` accepts `--raw`, `--model provider/id:think`, and `--agent adapter`. Targets can be agent names, presence keys, pane IDs, or unique suffixes. Use `orch steer <target> "..."` for a durable mid-run instruction, and `orch answer <target> "..."` for a pending question.

For detached execution:

```sh
orch spawn 2 --backend headless
orch dispatch <target> "run the unit tests"
orch status
```

## Command reference

These are the top-level commands accepted by the CLI. `orch status` is also the default when no command is supplied.

| Command | Description |
| --- | --- |
| `status` | Show merged agent and pane state; supports `--json`, `--all`, and `--offline`. |
| `questions` | List pending agent questions. |
| `events` | Stream state transitions, optionally filtered or notified. |
| `queue` | Add, list, inspect history, or cancel queued tasks. |
| `work` | Assign queued tasks to idle agents. |
| `review` | List, approve, reject, or interactively review worktree results. |
| `run` | Queue a prompt through orchd with the worker header. |
| `dispatch` | Durably dispatch a prompt to a target. |
| `answer` | Answer a pending agent question. |
| `pipe` | Send a completed result from one target to another. |
| `broadcast` | Steer multiple named targets or all targets. |
| `notify` | Test configured notification sinks. |
| `steer` | Send a durable mid-run instruction. |
| `model` | Change a target's model. |
| `wait` | Wait for a target to reach a state. |
| `result` | Print a target's final result. |
| `tail` | Show recent session entries. |
| `session` | Show a target's resolved session path and stats. |
| `reload` | Reload one or more panes and signal watchers. |
| `reset` / `new` | Start a fresh session/context while keeping the model. |
| `restart` | Close and relaunch a harness process. |
| `spawn` | Create a new tab with N balanced, tiled agents. |
| `tile` | Add one pane to an existing tab. |
| `rename` | Rename an agent or pane border. |
| `close` / `kill` | Close targets; `--all` only closes orch-spawned panes. |
| `abort` | Cancel a turn by sending the abort key sequence. |
| `keys` | Send raw keys to a pane. |
| `peek` | Read the visible screen of a pane. |
| `panes` | Print the raw merged pane list for scripting. |
| `tabs` | List tabs and their pane counts/status. |
| `tab` | Create, rename, close, or focus a tab. |
| `focus` | Focus a target pane. |
| `zoom` | Toggle or set pane zoom. |
| `move` | Move a pane to a tab or new tab. |
| `ws` | List or focus workspaces. |
| `daemon` | Start, stop, inspect, or reload orchd. |
| `doctor` | Check and optionally repair the installation. |
| `clean` | Remove dead agent directories and orphaned worktrees. |
| `setup` | Configure an agent/backend and install or link integrations. |
| `help` | Print the full built-in usage text. |

Run `orch help` for subcommands and flags.

## Concepts

### Three adapter axes

orch keeps these responsibilities separate:

- **Agent adapters** translate agent CLIs and their state protocols. The built-in adapters are `pi`, `claude`, and `codex`.
- **Execution backends** decide where an adapter runs: `herdr` creates visible, focusable panes; `headless` runs a detached process and records its handle and logs under `~/.orch`.
- **Notifier adapters** deliver canonical state events. Built-ins include `herdr`, `desktop`, `webhook`, and `command`.

### orchd and presence

`orchd` is the resident daemon that accepts durable dispatch, steer, model, queue, and event operations. Agents publish presence files under `~/.orch/agents`; orch merges those records with herdr and session data to report state, task, model, result, and liveness.

### Workspaces and walls

A workspace is a herdr grouping of tabs and panes. Pull-oriented commands such as `status`, `questions`, `tabs`, and `panes` default to the current workspace; use `--all` where supported for a cross-workspace view. Push paths such as events and notifications include workspace provenance and a stable workspace color, so alerts do not lose their wall context.

## Configuration

Configuration lives at `~/.orch/config.toml` (or `$ORCH_DIR/config.toml`). Flags override `ORCH_*` environment variables, which override this file, which overrides built-in defaults.

```toml
[defaults]
adapter = "pi"
backend = "herdr"
model = "provider/model:thinking"
spawn_cap = 8
worktree = false

[[notify]]
id = "desktop"
on = ["blocked", "error"]

[[notify]]
id = "webhook"
url = "https://example.test/orch-events"
on = ["done", "error"]

[hosts]
worker = { dest = "user@example.org", orch_dir = "/home/user/.orch", timeout_ms = 10000 }
```

`[defaults]` supports `adapter`, `backend`, `model`, `allowed_models`, `spawn_cap`, `worktree`, and `worker_peer_tools`. Each `[[notify]]` entry selects a notifier with `id` (the legacy `type` spelling is also accepted). `[hosts]` entries define remote SSH destinations with `dest` (or legacy `ssh`), optional `orch_dir`, and `timeout_ms`.

## Notifications and events

```sh
orch events --status blocked,error --notify
orch notify test --state blocked
```

Notifier sinks default to `blocked` and `error` unless `on = [...]` is specified. Webhooks receive canonical JSON; command sinks receive the same JSON on standard input.

## License

MIT
