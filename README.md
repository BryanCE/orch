# orch

`orch` is a general-purpose fleet orchestration control plane for coding agents. It lets one operator spawn, dispatch, observe, steer, review, and reap many agents from one CLI. **pi is the shipped adapter today, not the limit of the design**; the adapter and backend contracts are intentionally independent.

## Prerequisites

- [bun](https://bun.sh) (runs the CLI and workers)
- [herdr](https://herdr.dev) (needed for visible pane fleets)
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) (the current agent adapter)

Install globally:

```sh
bun add -g orch
orch setup
```

`orch setup` checks dependencies, creates `~/.orch/agents`, installs the pi extensions, installs optional Claude Code skills/agents, and links `orch`/`pif`. Use `--yes`, `--no-install`, or `--copy` for non-interactive, report-only, or copy-based setup.

## Quickstart

From a herdr workspace:

```sh
orch spawn 4 --tab Team1                 # four balanced, named agents
orch dispatch Team1-1 "fix the tests" --wait
orch status                              # state, model, cost, context, task, last text
orch result Team1-1                      # final result (or pi session fallback)
orch close --all --stream                # close only orch-spawned panes; stop events too
```

Useful follow-ups include `orch steer <target> "..."`, `orch answer <target> "..."`, `orch wait <target>`, `orch tail <target>`, and `orch session <target>`. Targets can be agent names, presence keys, pane IDs, or unique suffixes.

## Agent adapters

An adapter translates an agent CLI into orch's presence protocol: interactive/headless launch commands, state detection, steering and answers, model changes, and final-result extraction. **pi** is implemented now (`--agent pi`, the default) with lossless inbox steering, questions, model switching, session tailing, and `result.json` integration. The contract is suitable for future Claude, Codex, or other adapters; those are roadmap items, not currently shipped adapters.

## Backends

Backends decide where an adapter runs:

- **herdr** (default): creates visible, focusable panes/tabs and supports the normal `spawn`, `tile`, focus, layout, and close workflow.
- **headless**: runs a detached adapter process, redirects output to `~/.orch/logs`, records pid/key handles in `~/.orch/spawned.jsonl`, and has no panes or focus. Select with `--backend headless` or `ORCH_BACKEND=headless` where supported.

## Task queue and review

Queue work for idle agents, optionally isolated in a git worktree:

```sh
id=$(orch queue add "add regression coverage" --worktree)
orch queue list
orch work --once                         # claim and dispatch queued work
orch queue history
orch queue cancel "$id"                  # queued tasks only
```

`orch work` matches queued tasks to idle agents (FIFO, adapter/workspace-aware), retries failures according to config, and records results. Worktree tasks use `.orch-worktrees/` and an `orch/<name>` branch. When an agent finishes with commits ahead of the base branch:

```sh
orch review list
orch review approve <target>             # merge, then remove worktree/branch
orch review reject <target> -m "please add tests"  # re-dispatch feedback in place
```

Use `orch clean --worktrees [--force]` for orphaned worktrees; `--force` discards unmerged work.

## Notifications and the events stream

`orch events` is the live state-transition stream:

```sh
orch events --status blocked,error --notify
orch events --all --json
orch notify test --state blocked
```

Configured notification sinks can be desktop (herdr notification, `notify-send`, WSL notifications/toast), webhook (HTTP POST JSON), or command (JSON on stdin). Sinks default to `blocked` and `error` unless `on = [...]` is specified. Events include agent, tab, model, task, cost, and workspace provenance.

## WORKSPACE WALLS

Orch separates **pull views** from **push alerts**:

- Pull commands (`status`, `questions`, `tabs`, `panes`, and workspace-scoped listings) default to the **current workspace**. Add `--all` to opt into a cross-workspace view (workspace labels are shown when mixed).
- Push paths (events, notifications, and toasts) cross workspace boundaries. Every alert carries `[workspace]` provenance plus a stable workspace color, so an event from another workspace is immediately identifiable.

This prevents a status glance in one workspace from silently mixing in another while still ensuring important alerts are delivered.

## Configuration

The default directory is `~/.orch` (override with `ORCH_DIR`). `~/.orch/config.toml` is TOML; flags override `ORCH_*` environment variables, which override config, which overrides built-in defaults.

```toml
[defaults]
adapter = "pi"
backend = "herdr"
model = "provider/model:thinking"
spawn_cap = 8
worktree = false

[queue]
max_retries = 1

[[notify]]
type = "desktop"
on = ["blocked", "error"]

[[notify]]
type = "webhook"
url = "https://example.test/orch-events"
on = ["done", "error"]

[[notify]]
type = "command"
command = ["logger", "-t", "orch"]
```

Supported defaults are `adapter`, `backend`, `model`, `spawn_cap`, and `worktree`; queue configuration currently exposes `max_retries`. Notification tables support `desktop`, `webhook` (requires `url`), and `command` (string or argv array).

## Doctor and maintenance

```sh
orch doctor
orch doctor --fix
orch doctor --json
orch daemon start                 # optional resident event daemon
orch daemon status
```

Doctor checks required binaries, herdr version, stale presence directories, extension hashes and links, spawn registry, config validity, notification availability, daemon health/locks/socket, and worktree gitignore. `--fix` applies safe repairs and reruns checks.

## Layout

```
bin/orch.ts        CLI
bin/pif            headless pi wrapper
src/adapters/      agent adapter contracts and implementations
src/backends/      herdr and headless backend implementations
extensions/        pi presence/state extensions
```

Remote-host fan-out and additional adapters are planned; they are not part of the shipped CLI yet.
