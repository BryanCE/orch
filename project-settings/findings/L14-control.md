## deliverControl
- **Defined**: `packages/orch/src/control/dispatch.ts:252`
```ts
export async function deliverControl(orchDir: OrchDir, settings: OrchSettings, catalogue: ModelCatalogue, agent: HereAgent, action: ControlAction): Promise<ControlBoundaryOutcome>
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**:
  - `timeouts.abort_gap_ms` — install — `packages/orch/src/control/dispatch.ts:252` (via `deliverAbort`)
  - `timeouts.adapter_command_ms` — install — `packages/orch/src/control/dispatch.ts:256`
  - `timeouts.dispatch_ack_ms` — install — `packages/orch/src/control/dispatch.ts:260`
- **Verdict**: install only

## buildEntities
- **Defined**: `packages/orch/src/entities/inventory.ts:198`
```ts
export function buildEntities(root: OrchDir, settings: OrchSettings, options: { skipBackends?: boolean } = {}): Entity[]
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**:
  - `enabled.backends` — install — `packages/orch/src/entities/census.ts:18` (through `enabledBackends` → `heldCensus`)
  - `defaults.backend` — project — `packages/orch/src/entities/census.ts:28` (through `heldCensus` → `plexersInUse`)
- **Verdict**: project: `defaults.backend`

## heldCapacity
- **Defined**: `packages/orch/src/daemon/server/capacity.ts:16`
```ts
export function heldCapacity(orchDir: OrchDir, settings: OrchSettings): HeldCapacity
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**:
  - `fleet.max_agents_per_pack` — project — `packages/orch/src/policy/capacity.ts:94`
  - `spaces` — project — `packages/orch/src/policy/capacity.ts:104`
  - `fleet.max_agents_per_space` — install — `packages/orch/src/policy/capacity.ts:106`
  - `fleet.max_agents_total` — install — `packages/orch/src/policy/capacity.ts:112`
- **Verdict**: project: `fleet.max_agents_per_pack`, `spaces`

## resolveTargetFor
- **Defined**: `packages/orch/src/entities/resolve.ts:87`
```ts
export function resolveTargetFor(root: OrchDir, settings: OrchSettings, credential: CallerCredential, target: string, opts?: { all?: boolean; crossSpace?: boolean }): Entity
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**: same settings keys as `buildEntities`, through `buildEntities`.
  - `enabled.backends` — install — `packages/orch/src/entities/census.ts:18`
  - `defaults.backend` — project — `packages/orch/src/entities/census.ts:28`
- **Verdict**: project: `defaults.backend`

## lifecycleResolutionFor
- **Defined**: `packages/orch/src/entities/lifecycle.ts:143`
```ts
export function lifecycleResolutionFor(orchDir: OrchDir, settings: OrchSettings, credential: CallerCredential, target: string): LifecycleResolution
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**:
  - `enabled.backends` — install — `packages/orch/src/entities/census.ts:18` (through `buildEntities`; here `skipBackends: true`, so backend census is skipped)
- **Verdict**: install only

## buildFleetStatus
- **Defined**: `packages/orch/src/daemon/server/fleet-status.ts:46`
```ts
export function buildFleetStatus(settings: OrchSettings, options: FleetStatusOptions): FleetStatus
```
- **Settings parameter**: `settings: OrchSettings`.
- **Reads**:
  - `enabled.backends` — install — `packages/orch/src/entities/census.ts:18` (through `buildEntities`)
  - `defaults.backend` — project — `packages/orch/src/entities/census.ts:28` (through `buildEntities` → `heldCensus`)
  - `spaces` — project — `packages/orch/src/daemon/server/fleet-rows.ts:129` (through `fleetNames`)
- **Verdict**: project: `defaults.backend`, `spaces`

## peerOrchs
- **Defined**: `packages/orch/src/daemon/server/peer-orchs.ts:51`
```ts
export function peerOrchs(orchDir: OrchDir, settings: OrchSettings, credential: CallerCredential): PeerOrch[]
```
- **Settings parameter**: `settings: OrchSettings`; passes `settings.fleet` as `Pick<OrchSettings["fleet"], "orch_peers">`.
- **Reads**:
  - `fleet.orch_peers` — install — `packages/orch/src/daemon/server/peer-orchs.ts:31`
- **Verdict**: install only
