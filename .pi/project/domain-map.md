# Project Domain Map

Project path: `/mnt/c/Users/Bryan/Documents/orch`
Updated: 2026-07-15

## Runtime boundaries

- `src/commands.ts` is the CLI surface: status, review, queue, questions, events, notify, result, steering, panes/tabs, cleanup, setup, and related remote fan-out.
- `src/daemon/orchd.ts` runs the local daemon. It owns RPC dispatch/steer writes, model changes, lifecycle, presence watching, work processing, notification delivery, and outbox draining.
- `src/backends/` controls where agents run. `herdr.ts` spawns agents in herdr panes; `headless.ts` manages detached child processes and their registry/logs.
- `src/adapters/` controls agent-specific spawn, state detection, steering, answers, and result extraction for Pi, Claude, and Codex. `adapter.ts` defines the shared contract.

## Core domains

- `src/entities.ts`: builds and resolves local/remote agent, pane, tab, and workspace targets; applies workspace scoping and stable ordering.
- `src/store.ts`: filesystem-facing orchestration state, presence records, spawned records, bridge registration, answers, steering, and default model settings.
- `src/store/sqlite.ts`: SQLite persistence for queue tasks, ownership, spawned records, and notification outbox messages.
- `src/queue.ts`: task lifecycle (`queued`, `claimed`, `done`, `failed`, `cancelled`), retry/requeue rules, history, and workspace-aware claiming.
- `src/work.ts`: worker loop; claims queued tasks, dispatches them through the selected backend/adapter, waits for state, settles success/failure, retries, and emits task events.
- `src/policy/workspace.ts`: workspace identity/name resolution, same-workspace checks, scoped collections, and wall/ownership decisions.
- `src/remote.ts`: SSH command execution and JSON result/error normalization for configured remote orch hosts.
- `src/config.ts`: TOML configuration loading, validation, environment/flag precedence helpers, config watching support, allowed model patterns, and default-entry writes.

## Daemon support

- `src/daemon/rpc.ts`: Unix-socket/TCP RPC server and client, request validation, errors, subscriptions, and a replay buffer for events.
- `src/daemon/events.ts`: presence polling/watch transitions, preferred event transport, worker metadata, and event-to-notifier routing.
- `src/daemon/configwatch.ts`: debounced `config.toml` and reload-signal watching.
- `src/daemon/lifecycle.ts`: daemon lock identity, socket/log paths, stale-lock handling, daemonization, foreground execution, and code-hash re-exec.
- `src/daemon/outbox.ts`: retries pending notification messages with backoff and delivery bookkeeping.

## Integrations and presentation

- `src/herdr.ts`: validated herdr CLI JSON access, panes/tabs/names lookup, reachability, and best-effort commands.
- `src/notify.ts`: notification event/sink types, built-in desktop/herdr/webhook/command delivery, workspace labels/colors, availability checks, and timeout-bounded notifier registry.
- `src/setup-notifiers.ts`: probes notifiers and renders selected notifier configuration.
- `src/setup-wizard.ts`, `src/doctor-wizard.ts`, `src/wizard-io.ts`: interactive setup, diagnostics presentation/fix selection, and prompt/spinner helpers.
- `src/doctor.ts`: binary, daemon, config, extension, notifier, host, presence, worktree, and installation health checks plus safe fixes.
- `src/session.ts`: parses agent session data and extracts text/tool content and usage.
- `src/worktree.ts`: creates, lists, reviews, merges, and removes agent git worktrees.
- `src/bridge-bundle.ts`: builds and locates the bridge extension bundle used to integrate agent panes.
- `src/table.ts`: bounded table formatting; `src/util.ts`: shared error formatting.

## Ownership

- `agent-teams-runtime`: `src/adapters/`, `src/backends/`, `src/daemon/`, `src/entities.ts`, `src/store.ts`, `src/store/sqlite.ts`, `src/queue.ts`, `src/work.ts`, and `src/policy/`.
- CLI/integration behavior: `src/commands.ts`, `src/config.ts`, `src/remote.ts`, `src/herdr.ts`, `src/notify.ts`, setup/doctor modules, session/worktree helpers.

## Shared paths

- Runtime state is under the configured orch directory: presence, spawned-agent records, SQLite store, daemon lock/socket/log/port files, and notification outbox.
- Configuration and policy are shared across CLI, daemon, worker, adapters, and backends.

## Forbidden / protected

- Do not modify secrets or environment files without approval.
- Do not modify generated/cache/build folders (`node_modules/`, `dist/`, `.git/`).
- Do not modify `openspec/changes/pluggable-plexer-backends/` or `openspec/changes/archive/` in this slice.
