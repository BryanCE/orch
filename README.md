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

From a checkout, install dependencies and do a real global install of the CLI:

```sh
bun install
bun run build:dev
```

`bun run build:dev` builds the CLI (`build:cli`), runs `npm pack`, and does an `npm install -g` of the resulting tarball — a real copied global install under the active node prefix, identical to what an npm end user gets (`orch` bin = `dist/bin/orch.js`, node shebang, node runtime). There is no `bun link` and no symlink from any bin dir into the repo: the installed CLI does not run live from source. Editing repo source does not change the installed `orch` — re-run `bun run build:dev` to pick up CLI changes.

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
| `status [--json] [--all] [--offline]` | Show merged agent and pane state; no command defaults to `status`. |
| `questions [--all] [--json] [--local]` | List pending agent questions. |
| `events [--all] [target ...] [--status s[,s…]] [--notify] [--json] [--offline]` | Stream pane state transitions. |
| `queue add|list|history|cancel` | Add, list, inspect history, or cancel queued tasks; `add` accepts `--host`, `--worktree`, and `--json`. |
| `work [--once] [--json]` | Assign queued tasks to idle agents. |
| `review [list|approve|reject]` | Interactively review, or list, approve, or reject worktree results; subcommands accept `--json`. |
| `run <target> "<prompt>" [--raw] [--steal] [--cross-workspace] [--json]` | Queue a prompt through orchd with the worker header. |
| `dispatch <target> "<prompt>" [--raw] [--model provider/id:think] [--agent adapter] [--steal] [--cross-workspace] [--json]` | Durably accept a prompt through orchd. |
| `answer <target> "<text>" [--force] [--json]` | Answer a pending agent question; `--force` permits a missing question. |
| `pipe <src> <dst> ["instruction"] [--json]` | Send a completed result from one target to another. |
| `broadcast "<text>" [target ...\|--all] [--json]` | Steer named targets or all live pane agents. |
| `notify test [--state <state>] [--json]` | Send a synthetic transition to configured notification sinks. |
| `steer <target> <text…> [--steal] [--cross-workspace] [--json]` | Send a durable mid-run instruction. |
| `model <target> <provider/model[:thinking]> [--steal] [--cross-workspace] [--no-wait] [--json]` | Change a target's model. |
| `wait <target> [--status done\|idle\|working\|blocked] [--timeout ms] [--json]` | Wait for a target to reach a status; default is `done` after `300000ms`. |
| `result <target> [--json]` | Print a target's result, falling back to session text when needed. |
| `tail <target> [-n N] [--json]` | Show recent session entries; default is 20. |
| `session <target> [--json]` | Show a target's resolved session path and stats. |
| `reload <target>… \| --all [--json]` | Reload panes and signal watchers. |
| `reset <target>… \| --all [--json]` / `new` | Start a fresh session/context while keeping the model. |
| `restart <target>… \| --all [--cmd pi] [--json]` | Fully close the harness process and relaunch it. |
| `spawn <N> [--tab L] [--cwd P] [--cmd C] [--name PREFIX] [--model M] [--agent A] [--backend B] [--spawn-cap N] [--worktree]` | Create a fresh tab with balanced, tiled agents; maximum cap is 8. |
| `tile <tab\|pane> [--name X] [--cmd C] [--cwd P] [--model M] [--agent A] [--backend B]` | Add one pane to an existing tab. |
| `rename <target> <name> [--pane] [--json]` | Rename an agent or pane border. |
| `close <target>... \| --all [--stream] [--json]` / `kill` | Close targets; `--all` only closes orch-spawned panes. |
| `abort <target> [--json]` | Cancel a turn by sending the abort key sequence. |
| `keys <target> <key> [key...]` | Send raw keys to a pane. |
| `peek <target> [-n N] [--json]` | Read the visible pane screen; default is 25 lines. |
| `panes [--all] [--json]` | Print the raw merged pane list for scripting. |
| `tabs [--all] [--json]` | List tabs and their pane counts/status. |
| `tab new|rename|close|focus [--json]` | Create, rename, close, or focus a tab. |
| `focus <target> [--json]` | Focus a target pane. |
| `zoom <target> [--on\|--off] [--json]` | Toggle or set pane zoom; default is toggle. |
| `move <target> --tab <tab_id\|label> [--split right\|down] \| --new-tab [--label X] [--json]` | Move a pane to a tab or new tab. |
| `ws [list\|focus <workspace_id>] [--json]` | List or focus workspaces. |
| `daemon start [--fg] \| stop \| status [--json] \| reload [--json]` | Manage the resident orch daemon. |
| `doctor [--fix] [-y\|--yes] [--json]` | Check the install; TTY fix mode opens a menu, while `-y`/`--yes` applies every fix unattended. |
| `clean [--worktrees [--force]] [--json]` | Remove dead agent directories and optionally clean orphaned worktrees. |
| `setup [--agent <id>] [--backend <id>] [--yes] [--no-install] [--copy]` | Configure an agent/backend and install or link integrations. |
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

Configuration lives at `~/.orch/settings.json` (or `$ORCH_DIR/settings.json`) — a `schemaVersion`-stamped, zod-validated JSON file. Flags override `ORCH_*` environment variables, which override this file, which overrides built-in defaults.

```json
{
  "schemaVersion": 1,
  "defaults": {
    "adapter": "pi",
    "backend": "herdr",
    "model": "provider/model:thinking",
    "spawn_cap": 8,
    "worktree": false
  },
  "notify": [
    { "id": "desktop", "on": ["blocked", "error"] },
    { "id": "webhook", "url": "https://example.test/orch-events", "on": ["done", "error"] }
  ],
  "hosts": {
    "worker": { "dest": "user@example.org", "orch_dir": "/home/user/.orch", "timeout_ms": 10000 }
  }
}
```

`defaults` supports `adapter`, `backend`, `model`, `allowed_models`, `spawn_cap`, `worktree`, and `worker_peer_tools`. Each `notify` entry selects a notifier with `id`. `hosts` entries define remote SSH destinations with `dest`, optional `orch_dir`, and `timeout_ms`.

## Files and data layout

orch keeps all state under one directory (`$ORCH_DIR`, default `~/.orch`), including the SQLite database `orch.db`, the daemon socket/lock, and the per-agent presence dirs. See [docs/reference/files-and-data-layout.md](docs/reference/files-and-data-layout.md) for the full on-disk map.

## Notifications and events

```sh
orch events --status blocked,error --notify
orch notify test --state blocked
```

Notifier sinks default to `blocked` and `error` unless `on = [...]` is specified. Webhooks receive canonical JSON; command sinks receive the same JSON on standard input.

## License

MIT
