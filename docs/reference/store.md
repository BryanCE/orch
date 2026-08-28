# Store reference

This page is the map for orch's persistence. It describes the files and tables as they are implemented, not a proposed storage design.

## `$ORCH_DIR` at a glance

`$ORCH_DIR` defaults to `~/.orch`. There are three storage categories:

1. **SQLite internal state** — `orch.db` is brokered by orchd. Code opens it through `src/store/connection.ts`; table DDL and the store stamp live in `src/store/schema.ts`.
2. **Presence and harness IPC** — `agents/<key>/` is the human-visible truth channel and the harness IPC surface. The protocol constants and schema stamp are in `src/presence/schema.ts`; status/result writes and atomic file writes are in `src/presence/writer.ts`; inbox/ack handling is in `src/presence/inbox.ts`. Harness adapters and agent code use those protocol primitives.
3. **Plain files** — files that are not rows in the database: user settings, daemon runtime files, and reload signalling. Each has one owning module.

## Choosing a home for new state

Choose the first home whose rule matches; each condition is sufficient.

| Home | Choose it when | Existing examples |
|---|---|---|
| **File** | A process other than orch writes it; a human edits it; something watches it for change; the operating system owns its meaning; or it is an append-only stream nobody updates that a person may tail. Harness shims under `extensions/` run inside the agent process, so requiring SQLite would ship a driver into every bundle, contend with the daemon's write lock, and stall a turn; they write `status.json`, `result.json`, and `ack.jsonl`. | `settings.json`; the daemon's `status.json` filesystem watch; `orchd.lock`, `orchd.sock`, `orchd.port`, `orchd.token`; session transcripts and headless stdout logs. |
| **Table** | More than one process writes it concurrently (the daemon plus each CLI invocation); the record mutates over its life; reads are by predicate rather than key (pending work due for its next attempt, settled rows before a cutoff); two writes must commit together (lease transfer plus control outbox); it needs a never-reused monotonic identifier; or it is pruned by age (removing the middle of JSONL rewrites the whole file). | `tasks` (`queued` → `claimed` → `done`), `agent_leases` + `outbox` transfer, `events.seq`, and retained runs. |

**Rule above both: ONE FACT, ONE HOME.** Never mirror one fact in a file and a table. The `spawned.jsonl`-beside-the-`spawned`-table incident was exactly that duplicate registry.

Run history is the edge case: it looks like append-only JSONL, but is a table because a run row is upserted while alive as state, tokens, and cost change, and because it is pruned by age. It becomes history only after it stops moving; `orch runs --json` keeps it grep-able.

| Artifact | Category | Owner | What it is |
|---|---|---|---|
| `orch.db` | SQLite | `src/store/connection.ts`, `src/store/schema.ts` | WAL SQLite database for the tables below. |
| `orch.db-wal`, `orch.db-shm` | SQLite | SQLite/`src/store/connection.ts` | WAL and shared-memory sidecars; transient while the store is open. |
| `agents/<key>/status.json` | Presence | `src/presence/writer.ts`; harness bridges write it | Agent identity, liveness, state, task, model and run facts. |
| `agents/<key>/result.json` | Presence | `src/presence/writer.ts`; harness bridges write it | Settled-turn result. |
| `agents/<key>/inbox.jsonl` | Presence/IPC | `src/presence/inbox.ts` plus the selected adapter | Orchestrator-to-agent control lines; the agent atomically drains them. |
| `agents/<key>/answer.json` | Presence/IPC | `src/presence/schema.ts` plus the adapter/agent answer path | Answer to a blocking agent question. |
| `agents/<key>/question.json` | Presence/IPC | agent question tool; filename from `src/presence/schema.ts` | Agent-to-orchestrator blocking question. |
| `agents/<key>/ack.jsonl` | Presence/IPC | `src/presence/inbox.ts` / agent ack path | Agent delivery markers; the daemon ack path can mark an outbox row delivered. |
| `agents/<key>/control.json` | Presence/IPC | agent control path; filename from `src/presence/schema.ts` | Outcome of a model/thinking control command. |
| `settings.json` | Plain file | `src/config.ts` | User-editable composition and retention settings; `schemaVersion` is validated on load. |
| `reload.signal` | Plain file | `src/config.ts` watcher and lifecycle command | Touch signal for config/extension reloads. |
| `orchd.lock` | Plain file | `src/daemon/runtime-files.ts`, `src/daemon/lifecycle.ts` | One-per-host daemon ownership record. |
| `orchd.sock` | Plain file | `src/daemon/runtime-files.ts`, `src/daemon/rpc.ts` | Unix RPC endpoint (or a Windows marker). |
| `orchd.port` | Plain file | `src/daemon/runtime-files.ts`, `src/daemon/rpc.ts` | Loopback TCP port advertised when needed. |
| `orchd.token` | Plain file | `src/daemon/runtime-files.ts`, `src/daemon/rpc.ts` | Owner-readable credential for RPC hello. |
| `orchd.log` | Plain file | `src/daemon/runtime-files.ts`, `src/daemon/lifecycle.ts` | Detached daemon stdout/stderr and lifecycle record. |

For the category map and owning modules, see [Choosing a home for new state](#choosing-a-home-for-new-state) and the table below.

## The SQLite store

`openStore()` creates `$ORCH_DIR/orch.db`, enables WAL and a busy timeout, creates the table/index DDL, and caches one connection per database path. Callers do not open SQLite directly. The store uses `node:sqlite` when available and a guarded `bun:sqlite` fallback.

### Tasks and attempts (`tasks`, `task_attempts`)

`tasks` holds task text, options, enqueuer, scope, and creation time. Each claim is a `task_attempts` row with its agent, dispatch id, interval, outcome, result, or error; `task_states` derives queued, claimed, settled, and cancelled state. `src/store/task-rows.ts` owns both tables. `src/queue.ts` is the domain wrapper used by `orch queue add`, `list`, `history`, and `cancel`; `src/daemon/work-loop.ts` reads claimable tasks and writes attempt transitions.

### Agent/session registration and leases (`agents`, `agent_processes`, `agent_leases`)

Every orch session is registered as an ordinary row in `agents`; there is no separate session-identity table. The daemon RPC `hello` handler (`src/daemon/rpc.ts`) gets or creates that agent row and records the running process in `agent_processes`. Each process interval stores `(pid, start_token)` so PID reuse cannot make a different process appear to be the same session; the minted agent id remains immutable while the interval ends when that process does. `src/store/agent-rows.ts` owns these rows.

`agent_leases` records the current holder of an agent, with a fencing-token lease id. `src/store/lease-rows.ts` owns acquisition, release, handoff, adoption, and expiry. Lease ownership gates control writes, but lifecycle ending and reaping (`abort`, `close`, and `reap`) are deliberately never lease-gated.

### Outbox (`outbox`)

Stores durable control messages: id, target, JSON payload, pending/delivered state, attempts, creation time, and the next retry time. `src/store/outbox-rows.ts` owns it. `src/daemon/orchd.ts` inserts dispatch/steer messages and handles explicit acks, then drains due work; `src/daemon/outbox.ts` reads pending rows, delivers them, marks success, or schedules exponential retry. The pending rows remain in SQLite across a daemon restart; a later drain can resume them.

### Spawn registry (`spawned`)

Stores the per-pane/agent registry: serialized pane key, spawn timestamp, adapter/model/backend, workspace and backend handle, display name, cwd, worktree/branch, and spawning session metadata. `src/store/spawned-rows.ts` owns it. Spawn paths call `src/presence/store.ts` (`recordSpawned()`). Status, target resolution, review, work-loop routing, and backends read it; lifecycle and clean/reap paths delete or relabel rows.

### Events (`events`)

An append-only sequence (`seq`, timestamp, JSON payload). `src/store/event-rows.ts` owns it and provides append, sequence reads, oldest-sequence lookup, and deletion-before-cutoff. `src/daemon/rpc.ts` uses this module for the replay buffer: publishing an RPC event appends it, and a `subscribe-events` request reads from the durable sequence (up to `REPLAY_WINDOW`, currently 1,000). `orch events` consumes that daemon RPC stream.

### Runs (`runs`)

One row per `dispatch_id`, with agent, adapter/model/workspace/task, state, start/finish times, token and cost counters, turns, result, and last error. `src/store/run-rows.ts` owns it and provides upsert, filtered/limited reads, and deletion-before-cutoff. No production command or daemon loop currently calls these row functions; status and session views read presence/native session data instead.

### Catalogues (`catalogues`)

A command-keyed cache row containing the time (`at`) and stdout returned by a catalogue command. `src/store/catalogue-rows.ts` owns the table and its reads, upserts, and clear operation. `src/adapters/model-catalogue.ts` is the production caller: it serves cached answers, refreshes stale entries in the background, records successful/failed queries, warms catalogues, and clears them on request.

## Single writer

Every table has exactly one owning row module under `src/store/`:

| Table | Owning module |
|---|---|
| `tasks`, `task_attempts`, `task_cancellations` | `src/store/task-rows.ts` |
| `agent_leases` | `src/store/lease-rows.ts` |
| `outbox` | `src/store/outbox-rows.ts` |
| `spawned` | `src/store/spawned-rows.ts` |
| `agents`, `agent_processes` | `src/store/agent-rows.ts` |
| `events` | `src/store/event-rows.ts` |
| `runs` | `src/store/run-rows.ts` |
| `catalogues` | `src/store/catalogue-rows.ts` |

Callers use those module functions. They must not open the database, issue table SQL, or duplicate row conversion themselves. `src/store/connection.ts` is the connection/transaction boundary, not a second table owner.

## Schema handling

`STORE_SCHEMA` in `src/store/schema.ts` (currently `6`) is stamped into SQLite `PRAGMA user_version`. A populated file carrying any other stamp is malformed: `src/store/connection.ts` closes it, removes the database and WAL/SHM sidecars, and recreates an empty store. It does not migrate rows.

That behavior is deliberate pre-publish policy under repository Rule 8. There is one current store shape; an older or otherwise differently stamped file is old data to reap, not a second schema to accept. A newly created empty file is initialized normally.

## Retention and growth

Retention settings live under `retention` in `settings.json` and are normalized by `src/config.ts`. The current built-in windows are:

| Data | Setting | Current default | Store operation / current wiring |
|---|---|---:|---|
| Settled tasks | `queue_days` | 14 days | No task-prune operation is present in `src/store/`; settled task rows therefore grow without bound in the current wiring. |
| Stored events | `events_days` | 7 days | `deleteEventsBefore()` exists, but no production caller was found; appended rows grow without bound in the current wiring. |
| Completed runs | `runs_days` | 30 days | `deleteRunsBefore()` exists, but no production caller was found; rows grow without bound in the current wiring. |
| Delivered outbox messages | `outbox_days` | 7 days | `deleteDeliveredBefore()` exists; no production caller was found, so delivered rows are not automatically pruned. Pending rows are not covered by this window. |

The remaining tables have no retention setting: `agent_leases` close as lifecycle events occur; `spawned` rows are removed only by explicit lifecycle/reap paths; and `catalogues` is keyed by command and can be cleared explicitly. If a retention loop is added, it should call the owning row module rather than issue SQL from the daemon.
