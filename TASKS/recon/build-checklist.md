# Build checklist (current-tree recon)

Legend: **SAT** satisfied; **PART** partially built; **NO** not started. Evidence is current file:line; targets are future-slice files.

## A. Foundations
- A1 — PART: legacy identity/ownership still split (`src/store/{identity,ownership,spawned}-rows.ts:1-`; `src/entities.ts:1-`); target `src/store/*`, `src/entities.ts`, `src/daemon/rpc.ts`.
- A2 — PART: rebuild DDL exists but legacy schema is co-created (`src/store/schema.ts:1-120`); target `src/store/schema.ts`, all store row modules/tests.
- A16 — NO: no space/pack/host plexer or task queue schema (`src/store/schema.ts:1-120`); target `src/store/schema.ts`, new row modules.
- A14 — NO: workspace-centric placement remains (`src/policy/workspace.ts:1-`); target schema/composer, `src/commands/spawn.ts`, daemon responses.
- A15 — NO: no composition line/axis abstraction (`src/backends/registry.ts:1-`); target environment composer and backend adapters.
- A3 — PART: mixed booleans/text instants remain (`src/store/schema.ts:1-`; `src/presence/schema.ts:1-`); target schema/rows and presence types.
- A4 — PART: some STRICT/partial indexes in rebuild DDL, legacy tables remain (`src/store/schema.ts:1-120`); target `src/store/schema.ts`.
- A5 — NO: `openStore` FK pragma absent on current path (`src/store/connection.ts:1-`); target `src/store/connection.ts`.
- A7 — PART: workspace/path policy still used (`src/policy/workspace.ts:1-`; `src/commands/spawn.ts:418-430`); target policy, spawn, schema.
- A8 — NO: vocabulary persisted as workspace/backend labels (`src/notify/format.ts:1-`; `src/config.ts:1-`); target display mapping and consumers.
- A9 — PART: workspace caps exist, no recursive pack depth policy (`src/commands/spawn.ts:322-330`); target spawn policy/settings.
- A10 — NO: no pack membership model (`src/store/schema.ts:1-`; `src/store/agent-rows.ts:1-`); target schema, registration, spawn.
- A11 — NO: roles not derived from provenance tree (`src/entities.ts:1-`; `src/policy/spawner.ts:1-`); target entity/policy/UI.
- A12 — PART: global/workspace caps only (`src/commands/spawn.ts:322-330`); target settings and spawn capacity logic.
- A13 — NO: cap error offers no bind/pack choices (`src/commands/spawn.ts:327-330`); target spawn command/policy.

## B. Identity and registration
- B1 — PART: hello exists, but issues session identity/legacy row (`src/daemon/rpc.ts:183-214,597`); target `src/daemon/rpc.ts`, registration/store rows.
- B9 — NO: hello records pid/start/label only, not full environment (`src/daemon/rpc.ts:183-205`); target RPC params, schema, presence/environment composer.
- B2 — PART: daemon token file exists (`src/daemon/runtime-files.ts:12-14`), trust/permissions need unified registration; target runtime-files/RPC setup.
- B3 — PART: TCP/socket clients share RPC but transport selection is split (`src/daemon/rpc.ts:560-620`; `src/presence/socket-client.ts:1-`); target RPC client seam.
- B4 — SAT: no peer-credential trust path found; evidence `src/daemon/rpc.ts:183-205`; target none.
- B5 — NO: `selfActor`/fallback remain (`src/entities.ts:1-`; `src/policy/spawner.ts:1-`; `src/commands/target.ts:84-127`); target these files and all callers.
- B6 — PART: offline/help/setup paths exist (`src/commands/index.ts:1-`; `src/commands/setup.ts:1-`); target command identity gating audit.
- B7 — PART: inbox protocol exists (`src/presence/inbox.ts:1-`), not every agent/schema-backed; target registration, presence/store.
- B8 — NO: session identity table/API remains (`src/store/identity-rows.ts:1-`; `src/daemon/rpc.ts:183-205`); target schema, rows, tests.

## C. Leases
- C1 — NO: no lease lifecycle API (only owner rows, `src/store/ownership-rows.ts:1-`); target `src/store/lease-rows.ts`, daemon RPC, commands.
- C2 — PART: owner gate exists (`src/daemon/orchd.ts:143-165`), not lease authority; target daemon governance and lease rows.
- C3 — PART: provenance/workspace gates remain (`src/daemon/orchd.ts:143-165`; `src/commands/target.ts:188-`); target governance/target resolution.
- C4 — NO: no steal semantics against live lease (`src/commands/control.ts:40-`); target control/lease rows.
- C4a — NO: no monotonic fencing lease id (`src/store/ownership-rows.ts:1-`); target schema/lease rows/dispatch.
- C4b — PART: reads and writes share current owner checks (`src/daemon/orchd.ts:143-165`); target RPC governance.
- C4c — NO: name resolution assumes uniqueness (`src/policy/name.ts:1-`; `src/commands/target.ts:1-`); target name rows/resolver.
- C4e — NO: spawn accepts prefix/defaults, not required name (`src/commands/spawn.ts:217-304`); target spawn parser/name policy.
- C4f — NO: rename is lifecycle/backend-oriented (`src/commands/lifecycle.ts:330-370`); target rename command/lease gate.
- C4d — NO: resolution is distributed (`src/commands/target.ts:1-`; `src/entities.ts:1-`); target shared resolver boundary.
- C5 — NO: no handoff/adoption transfer (`src/store/ownership-rows.ts:1-`; `src/commands/lifecycle.ts:1-`); target lease service.
- C6 — NO: events scope by `spawnedBy` (`src/commands/events.ts:58-59`); target events query/lease scope.
- C7 — NO: live status groups provenance (`src/commands/status.ts:140-141`); target status/live-history grouping.

## Cq. Queue
- Cq1 — NO: queue claims are pull/work-loop based (`src/daemon/work-loop.ts:211-217`); target queue/store/work-loop/RPC.
- Cq2 — NO: no typed agent/pack/space enqueue scopes (`src/queue.ts:1-`); target schema, queue command/store.
- Cq3 — NO: no two-sided space consent (`src/commands/queue.ts:1-`); target queue/store/daemon.
- Cq4 — NO: results still tied to current queue rows (`src/queue.ts:1-`); target task attempts/outbox.
- Cq5 — NO: enqueue does not lease target (`src/queue.ts:1-`; `src/store/ownership-rows.ts:1-`); target queue + lease service.
- Cq6 — NO: retry remains agent/workspace-bound (`src/queue.ts:71-101`); target attempts/work-loop.
- Cq7 — NO: `workspace`/origin fields remain (`src/store/schema.ts:1-`; `src/queue.ts:1-`); target schema/rows.
- Cq8 — PART: workspace claiming bug explicit (`src/daemon/work-loop.ts:211-217`); target work-loop/queue routing.
- Cq9 — NO: queue CRUD uses legacy ownership (`src/commands/queue.ts:1-`; `src/store/queue-rows.ts:1-`); target queue command/store.
- Cq10 — NO: no unrunnable/stale derived classification (`src/daemon/work-loop.ts:1-`); target task_states/doctor.
- Cq11 — NO: no deliberate unrunnable reap command (`src/commands/clean.ts:1-`); target queue command/reaper.
- Cq12 — NO: no orphan resolution verbs (`src/commands/queue.ts:1-`); target queue command/lease.
- Cq13 — NO: adoption does not carry queue (`src/commands/lifecycle.ts:1-`); target adoption/task scope.
- Cq14 — PART: task/attempt rebuild tables exist, facade still old (`src/store/task-rows.ts:1-`; `src/queue.ts:1-`); target schema, queue facade, work-loop, fixtures.
- Cq15 — PART: `task_states` view exists but legacy stored state remains (`src/store/schema.ts:1-120`); target schema/rows/consumers.
- Cq16 — NO: no exactly-one typed nullable scope refs (`src/store/schema.ts:1-120`); target schema/task rows.

## D. Lifecycle
- D1 — NO: lifecycle still tied to spawner/close (`src/commands/lifecycle.ts:1-`); target lifecycle/lease.
- D2 — NO: no holder-death driver semantics (`src/daemon/work-loop.ts:1-`); target work-loop/lease.
- D3 — NO: no indefinite unleased/adoptable state (`src/store/ownership-rows.ts:1-`); target lease/status.
- D4 — NO: timer/retention paths still exist (`src/daemon/retention.ts:31-68`); target lifecycle/retention.
- D5 — NO: nested spawn handling is provenance-based (`src/policy/spawner.ts:1-`); target registration/adoption.
- D6 — NO: abort/close/reap split absent (`src/commands/lifecycle.ts:1-`); target lifecycle commands.
- D7 — PART: close routes through backend (`src/commands/lifecycle.ts:408-416`); target direct process kill/lifecycle.
- D8 — NO: no startup adoption announcement (`src/daemon/rpc.ts:183-214`); target hello/adoption.
- D9 — NO: detach verb absent (`src/commands/index.ts:1-`); target lifecycle/lease.
- D10 — needs design/ruling (status DESIGN).
- D11 — PART: close/retention timers conflict with rule (`src/commands/clean.ts:76-83`; `src/daemon/retention.ts:31-`); target lifecycle/retention.
- D12 — NO: dead enqueuer does not preserve queued work model (`src/daemon/work-loop.ts:1-`); target queue/work-loop.
- D13 — NO: no `agent_endings` fact (`src/store/schema.ts:1-`; `src/daemon/events.ts:1-`); target schema/events.
- D14 — NO: agent records lack user-delete/long fallback semantics (`src/daemon/retention.ts:31-68`); target retention/schema.

## E. Environment/backends
- E1 — PART: backend port exists but delivery still backend-mediated (`src/backends/backend.ts:1-234`; `src/backends/herdr/index.ts:200-220`); target port, outbox/presence.
- E2 — needs design/ruling (DESIGN); target `src/backends/headless/index.ts`, presence bridge.
- E3 — NO: many backend-id/method branches (`src/commands/panes.ts:1-`; `src/commands/spawn.ts:1-`); target capability strategy and consumers.
- E4 — SAT: capabilities exposed end-to-end (`src/backends/backend.ts:18-28`; `src/daemon/orchd.ts:350-390`).
- E5 — PART: source fallback exists, packaged build not refreshed (`src/commands/spawn.ts:418-430`); target build artifact via `bun run build:dev` (user-only).
- E8 — PART: herdr create API exists, orch does not create pack home (`src/commands/spawn.ts:418-430`); target backend port/spawn/schema coordinates.
- E9 — needs design/ruling (DESIGN); target backend group API, spawn, schema.
- E6 — NO: daemon still uses `caps` naming (`src/backends/backend.ts:18-28`); target backend/commands/control/doctor/tests (not table locals).
- E10 — PART: workspace/group coordinates are exposed as nouns (`src/commands/panes.ts:316-329`); target schema/composer/CLI.
- E11 — NO: packs/spaces have no environment rows (`src/store/schema.ts:1-120`); target schema/composer.
- E12 — NO: environment is workspace-centric (`src/policy/workspace.ts:1-`; `src/commands/spawn.ts:418-430`); target composer/schema.
- E13 — NO: capability flags/method presence are duplicated (`src/backends/backend.ts:18-234`); target backend port/strategies/consumers.
- E14 — NO: `herdrBestEffort` swallows failures (`src/backends/herdr/index.ts:1-`); target backend error propagation.
- E15 — NO: moves/upgrades not modeled (`src/store/schema.ts:1-120`); target environment/host rows.
- E16 — NO: boolean error conversion remains (`src/backends/herdr/index.ts:1-`; `src/backends/headless/index.ts:1-`); target backend callers.
- E17 — NO: no host plexer version table (`src/store/schema.ts:1-120`); target schema/doctor.
- E18 — NO: registration does not compare integration versions (`src/daemon/rpc.ts:183-205`); target hello/doctor.
- E19 — NO: no supported-range declarations (`src/backends/registry.ts:1-`); target integration metadata/doctor.

## F. CLI
- F1 — NO: no detach verb (`src/commands/index.ts:1-`; `src/commands/lifecycle.ts:1-`); target command index/lifecycle/lease rows.
- F2 — NO: no adopt verb (`src/commands/index.ts:1-`); target command index/lifecycle/registration.
- F3 — NO: no reap verb (`src/commands/index.ts:1-`; `src/commands/clean.ts:1-`); target command/lifecycle/reaping.
- F4 — PART: spawn supports generated prefixes/default names (`src/commands/spawn.ts:217-304`); target parser/name policy/tests.
- F5 — needs design/ruling (DESIGN); target new `src/commands/space.ts`, command index/settings.
- F6 — PART: status uses workspace/provenance ownership (`src/commands/status.ts:140-189`); target status rows/lease joins.
- F7 — NO: target resolution is scattered (`src/commands/target.ts:1-`; `src/entities.ts:1-`); target resolver module and command callers.

## G. Web
- G1–G7 — claimed-built (verify nothing): `src/server/daemon.ts`, `src/web/`, `src/daemon/orchd.ts`.
- G8 — needs design/ruling (DESIGN); target web layout/page components.
- G9 — NO: no orphan/live lease bucket (`src/commands/status.ts:140-189`; web status components); target status API/UI.
- G10 — NO: history still shares status grouping (`src/commands/status.ts:140-189`); target daemon response and web history view.
- G11 — NO: names derive workspace/plexer labels (`src/notify/format.ts:1-`; `src/commands/status.ts:1-`); target API/UI naming.

## H. Retention
- H1–H2 — known broken (claimed state): `src/presence/store.ts:194-214`, current presence dirs.
- H3 — NO: reaping walks flat presence dirs, no provenance-descendant guard (`src/presence/store.ts:182-214`); target presence reaper/schema.
- H4 — PART: defaults exist but not all schema clocks (`src/config.ts:63`; `src/daemon/retention.ts:62-68`); target settings/schema retention.
- H5 — NO: `agent_dirs_days` still configured (`src/config.ts:63`); target config/retention.
- H6 — NO: identities retention/session table remains (`src/store/identity-rows.ts:1-`; `src/config.ts:63`); target schema/config.
- H7 — PART: retention config exists, per-window wiring incomplete (`src/config.ts:63`; `src/daemon/retention.ts:62-68`); target config/retention.
- H8 — NO: settings fallback is not independently modeled (`src/config.ts:1-`); target config loader/retention.
- H9 — NO: agent and orch byproducts share current retention sweep (`src/daemon/retention.ts:31-68`); target retention policy.

## I. Enforcement
- I1 — NO: no static lease/provenance rule (`scripts/check-bridge.ts:1-`); target checker/tests.
- I2 — NO: checker does not prohibit capability/id branches (`scripts/check-bridge.ts:1-`); target checker and tests.
- I3 — NO: no complete ungated command matrix (`test/close-always.test.ts:1-`; `src/commands/lifecycle.ts:1-`); target lifecycle tests/implementation.
- I4 — needs design/ruling (DESIGN); target doctor checks and schema APIs.
- I5 — claimed-built: recursive extensions scan (`scripts/check-bridge.ts`).
- I6–I7 — NO: no scope-rebind/concurrent-attempt regressions (`test/commands-queue.test.ts:1-`); target queue tests/store.
- I8 — needs design/ruling (DESIGN); target doctor queue/presence checks.

## J. Migration
- J1 — NO: keys still serialize backend~workspace~id (`src/backends/identity.ts:104-132`); target identity module and ~12 consumers.
- J2 — NO: tests contain legacy key fixtures (`test/identity.test.ts:1-`; `test/*`); target all fixture files listed in scope.
- J3 — NO: spawned pane remains primary key (`src/store/spawned-rows.ts:1-`; `src/commands/spawn.ts:359-384`); target schema/spawn/rows.
- J4 — NO: presence dirs use legacy identity names (`src/presence/store.ts:182-214`); target presence naming/reaper.
- J5 — PART: schema constants bumped for rebuild but old stores accepted (`src/store/schema.ts:1-120`; `src/presence/schema.ts:1-`); target schema open/migration.
- J6 — NO: port seam and key migration not sequenced/current (`src/backends/backend.ts:1-234`; `src/backends/identity.ts:104-132`); target backend seam then identity consumers.
- J7 — PART: task rows added but queue facade/fixtures old (`src/store/task-rows.ts:1-`; `src/queue.ts:1-`); target queue/work-loop/tests.
- J8 — NO: deprecated retention settings remain (`src/config.ts:63`); target config/settings migration.

## K. Tooling/environment
- K1 — known broken (environment/tooling; no source slice).
- K2 — claimed requirement, not source-built; target packaging only when release slice runs.
- K3 — known broken (leaked daemon pids; operational cleanup).
- K4 — claimed-built (`test/broker-routing.test.ts`).

## M. Daemon integration
- M1 — PART: one RPC daemon is assumed but clients still read local stores (`src/daemon/rpc.ts:1-`; `src/commands/status.ts:1-`); target all readers/daemon seam.
- M2 — PART: runtime files/token exist, `$ORCH_DIR` is also used as address/data by clients (`src/daemon/runtime-files.ts:1-`; `src/commands/status.ts:1-`); target discovery/config.
- M3 — NO: shell-home and direct presence reads remain (`src/agent/presence.ts:32`; `src/commands/status.ts:1-`); target presence/client readers.
- M4 — PART: no explicit OS privilege in RPC, but cross-OS execution absent (`src/daemon/rpc.ts:1-`; `src/remote.ts:1-`); target daemon/remote backend.
- M5 — PART: DrvFs refusal exists (`src/doctor/config.ts:71`), native-host placement not enforced; target daemon/config/doctor.
- M6–M8 — needs design/ruling (DESIGN); target daemon lock, cross-OS backend, offline command/doctor.
- M9 — PART: status scopes by workspace (`src/commands/status.ts:187`); target status query/default visibility and tests.

## Claimed-built / fixed (listed, not verified)
- A6 — claimed-built: `src/process-identity.ts`.
- E4 — claimed-built: capabilities served end-to-end (`src/backends/backend.ts`, `src/daemon/orchd.ts`).
- E5 — claimed-built in source; packaged artifact pending user `bun run build:dev`.
- G1–G7 — claimed-built: web daemon/SSE/RPC/capability surfaces.
- I5 — claimed-built: recursive extensions scan (`scripts/check-bridge.ts`).
- K4 — claimed-built: dispatch leak tests removed (`test/broker-routing.test.ts`).
- L8 — claimed-fixed: workspace labels read from `workspaces()`.

## Needs design / ruling
- D10, E2, E9, F5, G8, I4, I8, M6, M7, M8 — status DESIGN; target files are noted above.
- Open ruling: whether `TASKS/08-identity-registration.md` moves into `TASKS/` (scope open-ruling section).

## L. Known defects (reference only)
- L1–L7, L9–L12 — known broken; evidence and target files are recorded in `TASKS/02-scope.md` and `TASKS/recon/wave1-review.md`.
- L8 — claimed-fixed (`src/backends/herdr/index.ts` workspace label path).
