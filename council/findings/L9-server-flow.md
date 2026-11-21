## 1. Event bus
- `EventBus` carries `NotifyEvent`; `emit(event: NotifyEvent): void` publishes and `on(handler: (event: NotifyEvent) => void): () => void` subscribes and returns an unsubscribe function. `createEventBus(logger?: Logger): EventBus` stores subscribers in a `Set`; handler failures are caught and logged. (`packages/orch/src/daemon/server/event-bus.ts:5-26`)
- `NotifyEvent` is the union of `transition` (old/new agent state), `asking` (old state, `asking`, count and gave-up flag), `message` (message state, dispatch id, mail), `closed` (old state, closed state), and `task` (old/new task state, task and optional error). (`packages/orch/src/types/notify.ts:42-47`)
- Publishing to the stream/sinks uses `emitAndNotify(...)`; it suppresses repeated transitions before calling `deliverEvent(...)`. The latter stamps a per-agent `seq`, emits the canonical event and routes it to configured notifications. (`packages/orch/src/daemon/server/events.ts:49-99`)

## 2. Result report to the spawner
- `acceptResultReport(orchDir, key, result, now = Date.now()): { ok: true }` verifies the agent exists, writes result history, chooses the report's `dispatchId` or falls back to the agent status row's id, then upserts a completed run when it has an id. It does not itself deliver a result to a spawner. (`packages/orch/src/daemon/server/status-report.ts:127-145`)
- For queue work, `settleClaimedTasks(...)` scans claimed tasks and checks that the current status speaks for that attempt; on `done` it calls `recordTaskDone`, then `deliverTaskResult`, then emits the task event. (`packages/orch/src/daemon/server/work-loop.ts:201-224`)
- `deliverTaskResult(orchDir, settings, taskId, logger?)` finds the latest settled attempt, skips delivery when the enqueuer was also the runner, and constructs the result/failure body before calling `acceptMail` from the runner to `task.enqueuedBy`. (`packages/orch/src/daemon/server/result-delivery.ts:20-48`)
- Core signatures:
  ```ts
  export function acceptResultReport(orchDir: OrchDir, key: string, result: ResultReport, now = Date.now()): { ok: true }
  function settleClaimedTasks(orchDir: OrchDir, settings: ReturnType<WorkOptions["settings"]["current"]>, emit: (event: NotifyEvent) => void, logger: import("../../types/core.ts").Logger): void
  export function deliverTaskResult(orchDir: OrchDir, settings: OrchSettings | null, taskId: string, logger?: Logger): void
  ```
  (`packages/orch/src/daemon/server/status-report.ts:127-132`; `packages/orch/src/daemon/server/work-loop.ts:201`; `packages/orch/src/daemon/server/result-delivery.ts:20`)

## 3. Spawner's result text and route
- For a completed queued task, exact body: `` `[result from ${runnerName}] ${task.text}\n${JSON.stringify(settled.result)}` ``; failure body: `` `[failed on ${runnerName}] ${task.text}\n${settled.error ?? "no error recorded"}` ``. (`packages/orch/src/daemon/server/result-delivery.ts:37-40`)
- The route is an outbox/mail row, not a monitor line or prompt: `deliverTaskResult` calls `acceptMail(orchDir, settings, settled.agentId, task.enqueuedBy, body, logger)`, which sends runner-to-enqueuer. (`packages/orch/src/daemon/server/result-delivery.ts:42-43`)
- This is queue-result delivery specifically; `acceptResultReport` by itself only writes history and run data (see §2). (`packages/orch/src/daemon/server/status-report.ts:127-145`)

## 4. Work loop completion detection
- `statusSpeaksForTask(status, task)` requires a status and accepts it if its `dispatchId` is absent/null (hook-based harnesses cannot attribute) or equals the current attempt's `dispatchId`; a different id is rejected. (`packages/orch/src/daemon/server/work-loop.ts:72-77`)
- `settleClaimedTasks` checks that predicate against the current presence status, then compares state to `done` or `error`; a done task is recorded, delivered, and emitted. (`packages/orch/src/daemon/server/work-loop.ts:201-224`)
- The work loop calls this settlement sweep during its loop. (`packages/orch/src/daemon/server/work-loop.ts:311-366`)

## 5. Multi-agent completion barrier
- Not found. The work loop iterates claimed tasks and settles each matching task individually; it has no all-agents-finished barrier or one-shot action after several agents finish. (`packages/orch/src/daemon/server/work-loop.ts:201-224`; grep: `rg -n 'Promise\.all|allSettled|wait.*agents|agents.*wait' packages/orch/src/daemon/server`)

## 6. `orchs` verb files
- Registry entry defines `orchs` as an observe command; summary says it lists other live leading orchs and requires `fleet.orch_peers`. (`packages/orch/src/commands/registry.ts:62`)
- Command module `cmdOrchs` invokes the `orchs` RPC (via `readOrchs`), prints JSON or a table; module also resolves message recipients. (`packages/orch/src/commands/orchs.ts:16-25`)
- CLI wiring maps `orchs: cmdOrchs`. (`packages/orch/src/commands/index.ts:153`)
- Protocol request schema is `orchs: z.object({ caller: CALLER })`; response schema is `orchs: z.object({ orchs: z.array(PEER_ORCH) })`. (`packages/orch/src/daemon/client/protocol.ts:805`; `packages/orch/src/daemon/client/protocol.ts:994`)
- Handler table wires `orchs: (params) => ({ orchs: peerOrchs(directory, services.settings.current(), params.caller) })`. (`packages/orch/src/daemon/server/handlers/table.ts:220`)
- `peerOrchs` requires `fleet.orch_peers`, resolves the leading caller, filters to other live leading orchestrators, and maps them to `PeerOrch`. (`packages/orch/src/daemon/server/peer-orchs.ts:31-45`)
- Test coverage is in `packages/orch/test/peer-orchs.test.ts`, which checks leading-orch filtering, disabled setting refusal and nested caller refusal. (`packages/orch/test/peer-orchs.test.ts:188-216`)

## 7. `pack_intakes` table files
- Schema declares `pack_intakes` with `pack_id`, `space_id`, `since`, nullable `until`, a composite primary key, one-open-intake partial unique index and interval check. The task-state SQL view joins open intake rows to determine runnable space-scoped tasks. (`packages/orch/src/db/schema.ts:399-408`; `packages/orch/src/db/schema.ts:538-542`)
- Row module `task-rows.ts` reads open pack intakes, opens/closes them and lists their history. (`packages/orch/src/store/task-rows.ts:168-169`; `packages/orch/src/store/task-rows.ts:273-289`)
- Queue module `queue.ts` exposes `packIntakes` and uses it to list/open/close intake records. (`packages/orch/src/queue.ts:130-160`)
- Readers/writers are wired through the queue RPC handler for listing, and through its imported open/close queue functions. (`packages/orch/src/daemon/server/handlers/queue.ts:3`; `packages/orch/src/daemon/server/handlers/queue.ts:43`)
- Migration creates the table and its unique index; its task-state view also joins active intakes. (`packages/orch/drizzle/20261112045316_silly_the_stranger/migration.sql:297-306`; `packages/orch/drizzle/20261112045316_silly_the_stranger/migration.sql:451`; `packages/orch/drizzle/20261112045316_silly_the_stranger/migration.sql:470`)
- Schema rebuild test includes the table in expected schema and tests its constraint behavior. (`packages/orch/test/store-rebuild-schema.test.ts:23`; `packages/orch/test/store-rebuild-schema.test.ts:63`)
- Store task rows test checks integer timestamp storage. (`packages/orch/test/store-task-rows.test.ts:141`)
- Queue test checks intake listing. (`packages/orch/test/queue.test.ts:15`; `packages/orch/test/queue.test.ts:124`)
- Drizzle snapshot records the table, indexes, constraints and view reference. (`packages/orch/drizzle/20261112045316_silly_the_stranger/snapshot.json:126`; `packages/orch/drizzle/20261112045316_silly_the_stranger/snapshot.json:1671-1701`; `packages/orch/drizzle/20261112045316_silly_the_stranger/snapshot.json:4083`)
- `home-rows.ts` does not use `pack_intakes`; it operates on `pack_plexers` and `space_plexers`. (`packages/orch/src/store/home-rows.ts:3-4`; `packages/orch/src/store/home-rows.ts:17-30`)
- `check-layers.ts` does not name `pack_intakes`; it declares server/client import boundaries, including `src/store/` and `src/db/` as server-only. (`packages/orch/scripts/check-layers.ts:31-59`)
