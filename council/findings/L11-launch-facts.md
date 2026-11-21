## 1. `spawnHeadless`
- `spawnHeadless` is in `packages/orch/src/daemon/server/handlers/lifecycle.ts:61`; full signature: `export async function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">, peer?: HostId): Promise<ResultOf<"spawn-headless">>`.
- `tools` and `workers` are copied from `params` into `BackendSpawnOpts`; `headlessBackend.spawn` receives those opts for `stdio === "none"`, while `spawnHeldLaunch` receives them for other forms. `env` is likewise copied into opts. (`lifecycle.ts:79-111`)
- For `host`, `spawnOnHost` forwards all three values in the `spawn-headless` link call; the remote handler invokes `spawnHeadless`. (`lifecycle.ts:67-69,132-140`; `handlers/table.ts:138`)

## 2. Store rows written for a spawned agent
- `insertAgent` in `packages/orch/src/store/agent-rows.ts:44` inserts `agents`, and opens the initial `agent_hosts` row (`agent-rows.ts:63-82`). Called via `insertSpawnedRow` in `packages/orch/src/store/spawn-registration.ts:78-93`.
- `setAgentPlexer` inserts `agent_plexers` when `backendId` is present; `setHandle` inserts `agent_handles` when a handle is present. (`spawn-registration.ts:115-117`; `interval-rows.ts:103-111`)
- `recordProcess` inserts `agent_processes`; `setSpace` inserts `agent_spaces` when space is present; `setTuning` inserts `agent_tunings`; `setWorktree` records `agent_worktrees` when present. This is the write order in `writeEnvironment`. (`spawn-registration.ts:110-128`)
- `setOrigin` may insert the provenance row `agent_origins`; `holdSpawned` may acquire an `agent_leases` row. These follow form/environment writes. (`spawn-registration.ts:59-63,70-76,101-107`)
- Hosted registration writes `agents`, `agent_hosts`, `agent_forms`, `agent_tunings`, then possibly `agent_leases`; it has no local process/handle/plexer row. (`spawn-registration.ts:31-40`)

## 3. `agent_tunings`
```ts
export const agentTunings = sqliteTable("agent_tunings", {
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  since: integer("since").notNull(),
  until: integer("until"),
  model: text("model").notNull(),
  thinking: text("thinking"),
}, (table) => [
  primaryKey({ columns: [table.agentId, table.since] }),
  uniqueIndex("one_tuning").on(table.agentId).where(sql`until IS NULL`),
  check("agent_tunings_interval", sql`${table.until} IS NULL OR ${table.until} > ${table.since}`),
]);
```
- Definition: `packages/orch/src/db/schema.ts:332-342`.
- Insert function `setTuning(orchDir: OrchDir, agentId: string, now: number, values: TuningValues): void`, `packages/orch/src/store/interval-rows.ts:135`; it closes any open row then inserts the new interval (`interval-rows.ts:136-142`). Spawn call sites: `writeEnvironment` (`spawn-registration.ts:126`) and `registerHostedAgent` (`spawn-registration.ts:36`). Other call sites: `setTuning` usages from `rg -n 'setTuning\(' packages/orch/src`.
- Readers: `currentTuning(orchDir: OrchDir, agentId: string): TuningRow | undefined`, `interval-rows.ts:207-210`; `buildAgentViews` reads all current tunings (`packages/orch/src/store/agent-view.ts:152-153`); `agentView` reads one current tuning (`agent-view.ts:298-299`).

## 4. Restart and form change
- A held restart launches through `startSessionAgent` from `restartPipes` or `switchForm`; a terminal form may use `startAttachedTerminal` or `startHeldAgent`. (`packages/orch/src/daemon/server/handlers/restart-form.ts:104-118,148-169`)
- `restartOpts` reads model/thinking from `view.tuning`, worktree from `worktreeOf`, and preferred models from current settings. Its comment and returned object explicitly omit `env`, `tools`, and `workers`: the store holds none of them. (`restart-form.ts:52-70`)
- Therefore those launch facts are neither re-read from settings nor read from the store on restart: they are not included. The exact comment is `The store holds no env, tools or workers for an agent, so a restart carries none.` (`restart-form.ts:52-54`)

## 5. Pane launch path
- `prepareAgents` computes `env` with `spawnEnv(...)`, using the resolved adapter/form/model and `settings.workers`; it stores that env on each prepared agent. (`packages/orch/src/daemon/server/spawn/index.ts:171-181`)
- `launchPrepared` calls `spawnOneIntoTab` with `tools: settings.tools`, `workers: settings.workers`, and `env: item.env`. (`spawn/index.ts:239-252`)
- `spawnOptsOf` forwards tools/workers/env into `BackendSpawnOpts`; `spawnOneIntoTab` gives those opts to `spec.backend.spawn`. (`packages/orch/src/daemon/server/spawn/placement.ts:130-139,176-189`)
- Backend-specific conversion into a launched command: Orca's `launchLine` turns env entries into shell `env NAME=value` assignments (`packages/orch/src/backends/orca/index.ts:77-78`); tmux converts env entries to `-e NAME=value` (`packages/orch/src/backends/tmux/index.ts:34`); herdr converts them to `--env NAME=value` (`packages/orch/src/backends/herdr/index.ts:410`).

## 6. Does spawn `env` reach each process?
- Headless: yes, passed in `BackendSpawnOpts` to `headlessBackend.spawn`; backend process launch applies its env (`packages/orch/src/daemon/server/handlers/lifecycle.ts:79-110`; `packages/orch/src/backends/`).
- Held: yes, opts including env go through `startHeldAgent` / session-agent launch (`lifecycle.ts:113-122`).
- Pane: yes; env is passed into `backend.spawn` and the backend applies it; conversion examples are Orca `launchLine`, tmux `envArgs`, and herdr `envArgs` (`packages/orch/src/daemon/server/spawn/placement.ts:176-189`; cited backend files above).
- Linked host: yes, `spawnOnHost` forwards `env` in the RPC params, then remote `spawnHeadless` assigns it to opts (`packages/orch/src/daemon/server/handlers/lifecycle.ts:132-140,79-88`).

## 7. Tests naming `agent_tunings` and rebuild expected tables
- `packages/orch/test/store-interval-rows.test.ts:6,113,139` names `agent_tunings` / `agentTunings`.
- `packages/orch/test/store-rebuild-schema.test.ts:23` includes `agent_tunings` in the expected table list; line 24 lists expected indexes, including `one_tuning`.
