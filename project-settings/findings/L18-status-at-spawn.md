## 1. `agent_status` shape and writers

Columns in `agentStatus`:

```ts
agentId, state, lastError, modelProvider, modelId, thinking, task, dispatchId,
lastText, currentFile, filesTouched, tokensIn, tokensOut, cacheRead, cacheWrite,
cost, contextTokens, contextPercent, turns, sessionPath, sessionId, project,
extensionHash, startedAt, finishedAt, updatedAt, blockedMessage
```

Only `mergeAgentStatus` inserts/upserts `agentStatus`; the two `selectAgentStatus(es)` functions only read it. Its signature is:

```ts
export function mergeAgentStatus(
  orchDir: OrchDir,
  agentId: string,
  previous: AgentStatusRow | undefined,
  patch: StatusPatch,
  now: number,
): AgentStatusRow
```

`agentStatus` definition: `packages/orch/src/db/schema.ts:242`; writes and signature: `packages/orch/src/store/status-rows.ts:20-94`.

## 2. Agent launch paths and status-row writes

- **Tab spawn:** `registerSpawnedTabAgent` records the agent by calling `registerSpawnedAgent`; that registration writes the normalized agent/process/environment records, not `agent_status`. The call is:
  ```ts
  registerSpawnedAgent(services.orchDir, { ... });
  ```
  `packages/orch/src/daemon/server/spawn/placement.ts:169-184`; registration: `packages/orch/src/store/spawn-registration.ts:22-24`.
- **Held launch:** `spawnHeldLaunch` starts the held/session agent using `startSessionAgent`, `startAttachedTerminal`, or `startHeldAgent`, and returns its launch result. It does not record the new agent in the normalized agent store and does not write `agent_status` at that point. `packages/orch/src/daemon/server/handlers/lifecycle.ts:116-132`.
- **Detached headless launch:** `spawnHeadless` starts the backend and returns its handle/process; it does not record an agent or write `agent_status` at that point. The launch call is:
  ```ts
  const handle = headlessBackend.spawn(adapter, { ...opts, spawner: params.spawner });
  ```
  `packages/orch/src/daemon/server/handlers/lifecycle.ts:108-111`.
- **Linked-host launch:** `spawnOnHost` records the hosted agent with `registerHostedAgent`, which writes the agent reference and related records, not `agent_status`. The call is:
  ```ts
  registerHostedAgent(state.directory, { form: launched.form, key, harnessId: adapter, cwd: params.cwd, name, model, thinking, spawner, host: greeting.host });
  ```
  `packages/orch/src/daemon/server/handlers/lifecycle.ts:143-145`; registration: `packages/orch/src/store/spawn-registration.ts:33-41`.

## 3. `BackendSpawnOpts.project` reads in orchd

The launch paths pass `project` into backend spawn options and use it as `ORCH_PROJECT` in the spawned process environment (`packages/orch/src/policy/spawner.ts:36-54`). I found no read of `BackendSpawnOpts.project` by orchd after the launch is built; the status row's `project` is sourced from a later status report, not the spawn registration.

## 4. Status report behavior

`acceptStatusReport` signature:

```ts
export function acceptStatusReport(
  orchDir: OrchDir,
  key: string,
  patch: StatusPatch,
  publish: (event: NotifyEvent) => void,
  now = Date.now(),
): { ok: true }
```

`packages/orch/src/daemon/server/status-report.ts:84-90`.

`mergeAgentStatus` signature:

```ts
export function mergeAgentStatus(
  orchDir: OrchDir,
  agentId: string,
  previous: AgentStatusRow | undefined,
  patch: StatusPatch,
  now: number,
): AgentStatusRow
```

`packages/orch/src/store/status-rows.ts:20-27`. A patch with only `project` set **does write a row** for an agent with no existing status row: merge supplies defaults (including `state: "idle"`), preserves the project, and unconditionally upserts the resulting row. `packages/orch/src/store/status-rows.ts:28-30, 75-94`.
