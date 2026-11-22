## planViewers
- **Defined**: `packages/orch/src/daemon/server/spawn/viewers.ts:77`
```ts
export function planViewers(request: ViewerPlanRequest): ViewerPlan | null
```
- **Settings parameter**: `request.settings` is a spawn-plan value, not an `OrchSettings`.
- **Reads**: none from an OrchSettings/SettingsManager/Services/DaemonClient settings parameter.
- **Verdict**: install only (no settings keys)

## spawnOneIntoTab
- **Defined**: `packages/orch/src/daemon/server/spawn/placement.ts:175`
```ts
export async function spawnOneIntoTab(services: DaemonClient, spec: TabSpawnSpec): Promise<CreatedAgent>
```
- **Settings parameter**: `services` (`DaemonClient`); no settings read.
- **Reads**: none.
- **Verdict**: install only

## openFleetHome
- **Defined**: `packages/orch/src/daemon/server/spawn/placement.ts:100`
```ts
export function openFleetHome(request: OpenFleetHomeRequest): CreatedHome
```
- **Settings parameter**: none.
- **Reads**: none.
- **Verdict**: install only

## growFleetIntoGroup
- **Defined**: `packages/orch/src/daemon/server/spawn/placement.ts:262`
```ts
export async function growFleetIntoGroup(services: DaemonClient, settings: SpawnSettings, place: { space: string | null; workspace: string | undefined; group: string }, backend: Backend, names: readonly string[], self: CallerSelf, role: GroupLayoutRole, notes: SpawnNotes, prepareTerminal: TerminalPreparer): Promise<CreatedAgent[]>
```
- **Settings parameter**: `settings` is `SpawnSettings`, a resolved spawn plan, not OrchSettings.
- **Reads**: no global settings keys (passes its spawn plan into `placeAgent`; that reads `settings.tiling.first_split`, derived launch input).
- **Verdict**: install only (no settings keys)

## openHome
- **Defined**: `packages/orch/src/daemon/server/home.ts:31`
```ts
export function openHome(request: OpenHomeRequest): CreatedHome
```
- **Settings parameter**: none.
- **Reads**: none.
- **Verdict**: install only

## relaunchPolicy
- **Defined**: `packages/orch/src/daemon/server/agent-policy.ts:14`
```ts
export function relaunchPolicy(directory: OrchDir, settings: OrchSettings, adapter: AgentAdapter, agentId: string): WorkerPolicy | undefined
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**: `fleet.worker_peer_tools`, project, `packages/orch/src/policy/workers.ts:18` (through `workerPolicyFrom`).
- **Verdict**: project: `fleet.worker_peer_tools`

## adapterCommand
- **Defined**: `packages/orch/src/daemon/server/spawn/models.ts:45`
```ts
export function adapterCommand(adapter: string, settings: OrchSettings, launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {}): string
```
- **Settings parameter**: `settings: OrchSettings`, passed to `workerPolicyFrom`.
- **Reads**: `fleet.worker_peer_tools`, project, `packages/orch/src/policy/workers.ts:18`.
- **Verdict**: project: `fleet.worker_peer_tools`

## resolveTuningOrDie
- **Defined**: `packages/orch/src/shared/tuning.ts:20`
```ts
export function resolveTuningOrDie(flags: AgentFlags, settings: OrchSettings, harness: AdapterId, pinned: AgentTuning | null): Tuning
```
- **Settings parameter**: `settings: OrchSettings`, passed to `resolveTuning`.
- **Reads**: `defaults.models`, project, `packages/orch/src/policy/tuning.ts:51`.
- **Verdict**: project: `defaults.models`

## refreshStaleShims
- **Defined**: `packages/orch/src/daemon/server/doctor/runner.ts:196`
```ts
export async function refreshStaleShims(orchDir: OrchDir, logger: Logger, harnesses: readonly string[], settings: OrchSettings | null): Promise<string[]>
```
- **Settings parameter**: `settings: OrchSettings | null`, passed to `adapter.shim.diagnoseShim`.
- **Reads**: `enabled.adapters`, install, `packages/orch/src/daemon/server/doctor/runner.ts:200`.
- **Verdict**: install only

## selectBackend
- **Defined**: `packages/orch/src/daemon/server/spawn/plan.ts:69`
```ts
export function selectBackend(explicit: string | null, settings: OrchSettings): Backend
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**: `defaults.backend`, project, `packages/orch/src/daemon/server/spawn/plan.ts:71`.
- **Verdict**: project: `defaults.backend`

## reopens (form-driver method)
- **Declared**: `packages/orch/src/types/held-session.ts:159`
```ts
reopens(pipes: PipesProvider, settings: OrchSettings): Promise<boolean>
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**: none at declaration.
- **Verdict**: install only (no keys)

### ACP driver implementation
- **Defined**: `packages/orch/src/daemon/server/acp-driver.ts:53`
```ts
async reopens(pipes, settings)
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**: `timeouts.acp_probe_ms`, install, `packages/orch/src/daemon/server/acp-driver.ts:54`.
- **Verdict**: install only
