## assertSpawnPolicy
- **Defined**: `packages/orch/src/daemon/server/spawn/admission.ts:93`
```ts
assertSpawnPolicy(settings: Pick<OrchSettings, "fleet">, space: string | null, requested: number, views: ReadonlyMap<string, AgentView>, presence: ReadonlyMap<string, PresenceEntry>, spawnerId: string | null): void
```
- **Settings parameter**: `settings` (`Pick<OrchSettings, "fleet">`).
- **Reads**:
  - `fleet.max_depth`, project, `packages/orch/src/daemon/server/spawn/admission.ts:83` (via `spawnPolicyError`)
  - `fleet.max_agents_per_pack`, project, `packages/orch/src/daemon/server/spawn/admission.ts:90` (via `spawnPolicyError`)
- **Verdict**: `project: fleet.max_depth, fleet.max_agents_per_pack`

## assertSpawnCapacity
- **Defined**: `packages/orch/src/daemon/server/spawn/admission.ts:153`
```ts
assertSpawnCapacity(settings: Pick<OrchSettings, "fleet">, space: string | null, requested: number, views: ReadonlyMap<string, AgentView>, presence: ReadonlyMap<string, PresenceEntry>): void
```
- **Settings parameter**: `settings` (`Pick<OrchSettings, "fleet">`).
- **Reads**:
  - `fleet.max_agents_per_space`, install, `packages/orch/src/daemon/server/spawn/admission.ts:126` (via `assertSpaceCapacity`)
  - `fleet.max_agents_total`, install, `packages/orch/src/policy/capacity.ts:104` (via `assertHostCapacity` → `computeFleetCapacity` → `fleetCapacity`)
  - `spaces`, install, `packages/orch/src/policy/capacity.ts:101` (same call chain; supplies display names)
- **Verdict**: `install only`

## assertSpaceCapacity
- **Defined**: `packages/orch/src/daemon/server/spawn/admission.ts:116`
```ts
assertSpaceCapacity(settings: Pick<OrchSettings, "fleet">, space: string | null, requested: number, views: ReadonlyMap<string, AgentView>, presence: ReadonlyMap<string, PresenceEntry>): void
```
- **Settings parameter**: `settings` (`Pick<OrchSettings, "fleet">`).
- **Reads**:
  - `fleet.max_agents_per_space`, install, `packages/orch/src/daemon/server/spawn/admission.ts:126`
- **Verdict**: `install only`

## assertHostAdmits
- **Defined**: `packages/orch/src/daemon/server/spawn/admission.ts:167`
```ts
assertHostAdmits(directory: OrchDir, settings: Pick<OrchSettings, "fleet">, requested: number): void
```
- **Settings parameter**: `settings` (`Pick<OrchSettings, "fleet">`).
- **Reads**:
  - `fleet.min_free_memory_mb`, install, `packages/orch/src/policy/memory.ts:27` (via `assertHostMemory` → `memoryRefusal`)
  - `fleet.max_agents_total`, install, `packages/orch/src/policy/capacity.ts:104` (via `assertHostCapacity` → `computeFleetCapacity` → `fleetCapacity`)
  - `spaces`, install, `packages/orch/src/policy/capacity.ts:101` (same chain)
- **Verdict**: `install only`

## admitModel
- **Defined**: `packages/orch/src/policy/model.ts:106`
```ts
admitModel(settings: OrchSettings, adapter: AgentAdapter, catalogue: ModelCatalogue, model: string): string
```
- **Settings parameter**: `settings` (`OrchSettings`).
- **Reads**:
  - `models.allowed`, project, `packages/orch/src/settings/read.ts:395` (via `isAllowedModel` → `allowedModelPatterns`)
  - `defaults.models`, project, `packages/orch/src/settings/read.ts:395` (same chain; default model is merged into allowed patterns)
- **Verdict**: `project: models.allowed, defaults.models`

## admitLaunchModel
- **Defined**: `packages/orch/src/daemon/server/spawn/models.ts:55`
```ts
admitLaunchModel(settings: OrchSettings, adapterId: AdapterId, catalogue: ModelCatalogue, model: string): string
```
- **Settings parameter**: `settings` (`OrchSettings`).
- **Reads**: same as `admitModel` above, via `admitModel` at `packages/orch/src/daemon/server/spawn/models.ts:58`.
- **Verdict**: `project: models.allowed, defaults.models`

## admitAgentModel
- **Defined**: `packages/orch/src/daemon/server/spawn/models.ts:83`
```ts
admitAgentModel(settings: OrchSettings, adapterId: AdapterId, catalogue: ModelCatalogue, model: string, name: string): string
```
- **Settings parameter**: `settings` (`OrchSettings`).
- **Reads**:
  - `enabled.adapters`, install, `packages/orch/src/daemon/server/spawn/models.ts:72` (if initial admission fails, via `otherHarnessFor`)
  - `models.allowed`, project, `packages/orch/src/settings/read.ts:395` (via `admitModel` and potentially `otherHarnessFor`)
  - `defaults.models`, project, `packages/orch/src/settings/read.ts:395` (same chain)
- **Verdict**: `project: models.allowed, defaults.models`

## admitSpawn
- **Defined**: `packages/orch/src/daemon/server/spawn/admission.ts:199`
```ts
admitSpawn(directory: OrchDir, self: CallerSelf, settingsFile: OrchSettings, settings: SpawnSettings, logger: Logger, catalogue: ModelCatalogue): Promise<SpawnSettings>
```
- **Settings parameter**: `settingsFile` (`OrchSettings`) and `settings` (`SpawnSettings`, carrying `fleet`).
- **Reads**:
  - `fleet.max_depth`, project, `packages/orch/src/daemon/server/spawn/admission.ts:83` (via `assertSpawnPolicy` → `spawnPolicyError`)
  - `fleet.max_agents_per_pack`, project, `packages/orch/src/daemon/server/spawn/admission.ts:90` (same chain)
  - `fleet.min_free_memory_mb`, install, `packages/orch/src/policy/memory.ts:27` (via `assertHostMemory` when local)
  - `models.allowed`, project, `packages/orch/src/settings/read.ts:395` (via `admitLaunchModel` → `admitModel`)
  - `defaults.models`, project, `packages/orch/src/settings/read.ts:395` (same chain)
  - `enabled.adapters`, install, `packages/orch/src/daemon/server/doctor/runner.ts:198` (via `refreshStaleShims`)
  - `workers.compact_at_tokens`, project, `packages/orch/src/policy/workers.ts:38` (via `withLaunchPoints`)
- **Verdict**: `project: fleet.max_depth, fleet.max_agents_per_pack, models.allowed, defaults.models, workers.compact_at_tokens`

## planSpawn
- **Defined**: `packages/orch/src/daemon/server/spawn/plan.ts:123`
```ts
planSpawn(params: ParamsOf<"spawn">, settings: OrchSettings, chosen?: Backend): SpawnSettings
```
- **Settings parameter**: `settings` (`OrchSettings`).
- **Reads**:
  - `defaults.backend`, install, `packages/orch/src/daemon/server/spawn/plan.ts:76` (via `plexerRequest` → `selectBackend`)
  - `models.preferred`, project, `packages/orch/src/daemon/server/spawn/plan.ts:128`
  - `workers.*` (`inherit_extensions`, `inherit_mcp`, `exclude_extensions`, `builtin_tools`, `allow_tools`, `compact_at_tokens`), project, `packages/orch/src/policy/workers.ts:28-39` (via `agentPolicy` → `workerPolicyFrom`)
  - `fleet`, project, `packages/orch/src/daemon/server/spawn/plan.ts:145` (whole section passed into `SpawnSettings`; no further settings reads in this function)
  - `tiling`, install, `packages/orch/src/daemon/server/spawn/plan.ts:146`
  - `worktrees`, project, `packages/orch/src/daemon/server/spawn/plan.ts:117` (via `worktreeIntent`)
  - `defaults.forms`, install, `packages/orch/src/daemon/server/spawn/plan.ts:138` (via `selectSpawnForm`)
- **Verdict**: `project: models.preferred, workers.inherit_extensions, workers.inherit_mcp, workers.exclude_extensions, workers.builtin_tools, workers.allow_tools, workers.compact_at_tokens, fleet, worktrees`

## plexerRequest
- **Defined**: `packages/orch/src/daemon/server/spawn/plan.ts:94`
```ts
plexerRequest(params: Pick<ParamsOf<"spawn">, "plexer" | "host">, settings: OrchSettings): { backend: Backend; backendChosen: boolean }
```
- **Settings parameter**: `settings` (`OrchSettings`).
- **Reads**:
  - `defaults.backend`, install, `packages/orch/src/daemon/server/spawn/plan.ts:76` (via `selectBackend`)
- **Verdict**: `install only`
