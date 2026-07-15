# OpenSpec specs audit — slice 1

Ground truth checked against current source under `src/`, `extensions/`, `scripts/`, and relevant tests. No existing spec was rewritten: the drift is broad enough that minor edits would hide behavior gaps.

## agent-adapters — STALE

- **MATCHES:** `src/adapters/adapter.ts` declares `pi`, `claude`, and `codex`, capability fields, command builders, state detection, steering, answers, and result extraction. `src/adapters/pi.ts` and `src/adapters/claude.ts` implement the shared adapter contract. `src/commands.ts` supports adapter selection and records adapter metadata.
- **STALE:** The uniform presence requirement is not met by Codex. `src/adapters/codex.ts` explicitly says Codex has no presence writer and uses fallback state detection; no Codex hook/shim writes schema-2 `status.json`/`result.json` with `agent`.
- **STALE:** Core write behavior is not adapter-neutral for all adapters. `src/daemon/orchd.ts` hardcodes `piAdapter.steer(...)` when presence exists and otherwise calls herdr directly; it does not resolve the target adapter/capability.
- **STALE:** Claude's declared `keys` fallback is only usable through herdr (`src/adapters/claude.ts` returns `herdr agent send`), so it cannot satisfy the stated presence-only/headless contract.

## dispatch-broker — STALE

- **MATCHES:** `src/commands.ts` routes normal `run`, `dispatch`, and pane `steer`/`model` calls through `writeRpc`; `orch work` starts/uses orchd. `src/daemon/orchd.ts` owns RPC write handlers and `src/daemon/outbox.ts` persists pending writes before delivery.
- **STALE:** `src/commands.ts:1123-1143` directly calls `adapter.steer(...)` for a target without a herdr pane, bypassing the daemon and writing the presence inbox from the CLI path.
- **STALE:** `src/daemon/orchd.ts:76-91` is not backend-neutral: dispatch sends through `herdr pane run`/`agent send`, or calls the pi adapter directly. It cannot execute headless backend actions as required by the backend contract.
- **STALE:** `src/daemon/orchd.ts:138` writes the model inbox directly, and `src/commands.ts:setAgentModel` reports acceptance without a readiness/acknowledgement flow. This conflicts with the requirement's general brokered backend action/ack model.
- **MATCHES:** `DaemonAbsentError` and `writeRpc` provide the daemon-absent failure path; reads remain presence-based/offline-capable.

## dispatch-governance — MATCHES

- **MATCHES:** `src/daemon/orchd.ts:validateWriteParams/governWrite` applies the shared `checkWall` primitive and ownership checks before dispatch/steer/model writes. `--steal` and `--cross-workspace` are carried by `src/commands.ts` governance parsing.
- **MATCHES:** `src/store/sqlite.ts:checkOwnerWrite` refuses foreign owners or atomically reassigns on steal; spawn records write owners. Queue rows persist `origin_workspace`, and `src/work.ts` selects tasks using the worker workspace.
- **UNCLEAR:** The spec says every queued task carries its enqueue workspace. Legacy queue rows deliberately remain unscoped (`src/store/sqlite.ts` and `src/work.ts`), so behavior is permissive for migrated/legacy tasks rather than strictly same-workspace.

## doctor-config — STALE

- **MATCHES:** `src/config.ts` loads `config.toml`, accepts defaults/queue/notify/hosts, validates keys and types, reports file and line-oriented parse errors, and supports missing files. `src/commands.ts` applies flag > environment > config > fallback for the main agent settings.
- **STALE:** `src/doctor.ts:binaryStatus/checkBins` only checks bun, herdr, and pi. It does not check the configured adapter CLI (notably claude/codex) as required; herdr is always reported as an optional missing binary even when the configured backend/adapter needs it.
- **STALE:** `src/doctor.ts:runDoctor` does not show a distinct configured-adapter-binary check or configured-backend conditional check. It does include additional checks beyond the spec, but that does not satisfy the missing conditional diagnostics.
- **MATCHES:** Claude hook inspection, stale presence, spawn registry, config validity, gitignore, notification chain, and extension checks are present. Fixes are represented as explicit `CheckResult.fix` actions and reported after application.
- **UNCLEAR:** `applyFixes` applies every returned fix in unattended `--fix` mode. The listed fixes appear intended to be reversible, but the safety rule is not enforced by a separate destructive-action guard in `applyFixes` itself.

## durable-messaging — STALE

- **MATCHES:** `src/store/sqlite.ts` has a durable SQLite outbox; `src/daemon/orchd.ts` inserts before drain; `src/daemon/outbox.ts` retries failed delivery and pending rows survive daemon restart.
- **STALE:** Delivery is marked complete when the backend send returns true (`src/daemon/outbox.ts:37-48`), not after agent acknowledgement/consumption. No consumption acknowledgement is wired from `extensions/orchestrator-bridge.ts` or the other adapters back to the outbox message id.
- **STALE:** `src/daemon/rpc.ts:ReplayBuffer` stores events only in an in-memory array. Sequence numbers restart at 1 on daemon restart and recent events are not persisted, so reconnect/restart cannot guarantee the specified durable replay semantics.
- **UNCLEAR:** The replay API can replay missed in-process events (`subscribe-events` with `since`), but the implementation reports a gap rather than supplying all events when the 1,000-event window is exceeded.

## fleet-backends — STALE

- **MATCHES:** `src/backends/herdr.ts` and `src/backends/headless.ts` implement two backends; `src/commands.ts:resolveAgentSettings` selects explicit/configured backends and auto-falls back to headless when herdr is unavailable. Headless close verifies registry, presence key, pid, and liveness before signalling.
- **STALE:** The required spawn registry record shape is incomplete. `src/backends/headless.ts:181-183` records backend, `{pid,key}` handle, and adapter but no cwd; the separate `recordSpawned` call stores metadata but does not add cwd to the headless backend registry handle record. `src/store.ts`'s `SpawnedRecord` also has no handle field.
- **STALE:** Full headless control is not implemented. `src/commands.ts:1123-1143` directly steers only through an adapter and `src/commands.ts:2168` resolves `orch model` through `resolvePane`, while `wait` also requires a herdr pane. These conflict with the required headless presence-protocol surface.
- **STALE:** `src/daemon/orchd.ts:deliverBackend` has no backend registry/selection and sends via herdr or pi presence logic, so daemon-mediated dispatch is not backend-agnostic.
- **MATCHES:** Herdr-only geometry/control commands clearly reject headless targets, and event observation is built around presence watching.

## fleet-steering — STALE

- **MATCHES:** `src/daemon/events.ts:startPresenceWatch` watches the agents root and can discover later-created agent dirs; tab/pane resolution code supports tab metadata and ambiguity handling; `orch notify test` exists in `src/commands.ts` and help output.
- **STALE:** `orch model` does not implement the specified readiness wait. `src/commands.ts:setAgentModel/cmdModel` performs one immediate RPC and reports `accepted`; `--no-wait` is parsed away but has no bounded polling behavior or timeout-duration error.
- **STALE:** Model acknowledgement is not verified. `setAgentModel` returns `{ confirmed: true }` immediately after enqueueing the inbox command, so it cannot distinguish confirmed change from unconfirmed change/current model as required.
- **STALE:** Spawn-time pinning uses that same unverified immediate result (`src/commands.ts:pinModels`), so per-pane failures only mean RPC/local errors, not bridge readiness or model reflection.
- **UNCLEAR:** The empty-fleet event behavior appears supported by the root watcher, but event subscription is preferred only when orchd is available and the exact `--all` filtering/transition behavior needs an end-to-end check against a live empty-to-present fleet.
- **MATCHES:** `orch notify test [--state]` is exposed and reports per-sink outcomes through the notifier registry; notification failure sets a nonzero result.

## Files touched

- `openspec-specs-audit-1.md` — created this audit report; records source-verified matches, contradictions, and unclear points for the assigned seven specs.
