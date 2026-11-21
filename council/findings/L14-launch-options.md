## 1. Expressions building `BackendSpawnOpts` or `SpawnOpts`
- `spawnOptsOf` (`packages/orch/src/daemon/server/spawn/placement.ts:132-138`) builds `BackendSpawnOpts`; `env` is argument, `tools: spec.tools`, `workers: spec.workers` (136).
- `spawnOneIntoTab` calls `spawnOptsOf` twice, initially for `prepareTerminal` (181), then launches with spread plus optional `program` (186); env is `launchEnv` on launch, tools/workers from spec via helper.
- `spawnHeadless` builds `BackendSpawnOpts` (`packages/orch/src/daemon/server/handlers/lifecycle.ts:83-99`): `env: params.env` (88), `tools: params.tools` (97), `workers: params.workers` (98).
- `restartOpts` builds `BackendSpawnOpts` (`packages/orch/src/daemon/server/handlers/restart-form.ts:58`); inspect the function for values: `nl -ba packages/orch/src/daemon/server/handlers/restart-form.ts | sed -n '58,90p'`.
- `relaunch` builds `BackendSpawnOpts` (`packages/orch/src/daemon/server/handlers/relaunch.ts:150`); `nl -ba packages/orch/src/daemon/server/handlers/relaunch.ts | sed -n '145,180p'`.
- Headless `launch` builds adapter `SpawnOpts` (`packages/orch/src/backends/headless/index.ts:178`); `env`, tools and workers derive from backend opts; source lines 178-194.
- Held/session conversions: `grep -nE 'SpawnOpts|env:|tools:|workers:' packages/orch/src/backends/held/index.ts packages/orch/src/daemon/server/session-agents.ts`.

## 2. `SpawnSettings`, plan and builders
- `SpawnSettings` is quoted in full:
```ts
export interface SpawnSettings {
  readonly backend: string;
  readonly tools: string | undefined;
  readonly workers: WorkerPolicy;
  readonly tab: string | null;
  readonly backendChosen: boolean;
  readonly cwd: string;
  readonly commandFlag: boolean;
  readonly space: string | null;
  readonly host: { readonly name: string } | null;
  readonly prefix: string;
  readonly agents: readonly SpawnAgentPlan[];
  readonly worktree: WorktreeIntent | null;
  readonly fleet: OrchSettings["fleet"];
  readonly tiling: OrchSettings["tiling"];
}
```
  (`packages/orch/src/daemon/server/spawn/plan.ts:44-65`; comments omitted from shape.)
- `planFor` returns `SpawnAgentPlan`, finding the matching agent in `settings.agents` (`packages/orch/src/daemon/server/spawn/index.ts:66-70`). It is not the plan builder.
- `planSpawn(params, settings, chosen?)` builds `SpawnSettings` from RPC params and settings (`packages/orch/src/daemon/server/spawn/plan.ts:113-140`).
- Plan type returned by `planFor`: `SpawnAgentPlan = LocalSpawnAgentPlan | FarSpawnAgentPlan` (42); common fields and variants are lines 16-42. `planFor` itself returns that union.

## 3. Spawn RPC shapes and CLI construction
- `SPAWN_AGENT` (`protocol.ts:215`):
```ts
const SPAWN_AGENT = z.object({ name: nonBlank, harness: z.enum(ADAPTER_IDS), model: nonBlank, thinking: z.custom<ThinkingLevel>(isThinkingLevel), prompt: z.string().nullable() });
```
- `spawn-headless` params (`protocol.ts:670-688`): `GOVERNANCE.extend({ form: SPAWN_REGISTRATION.shape.form.nullable(), key: nonBlank, name: nonBlank, spawner: z.string().nullable(), worktree: agentWorktreeSchema.optional(), adapter: nonBlank, model: nonBlank, thinking: z.custom<ThinkingLevel>(isThinkingLevel), prompt: nonBlank.nullable(), cwd: optionalText, env: z.record(z.string(), z.string()).optional(), preferredModels: z.array(nonBlank).optional(), tools: optionalText, workers: workerPolicy.optional(), host: nonBlank.optional() })`.
- `spawn` params (`protocol.ts:691-701`): `GOVERNANCE.extend({ form: SPAWN_REGISTRATION.shape.form.nullable(), agents: z.array(SPAWN_AGENT).min(1), cmd: nonBlank.nullable(), plexer: nonBlank.nullable(), cwd: nonBlank, tab: nonBlank.nullable(), space: nonBlank.nullable(), host: nonBlank.nullable(), worktree: SPAWN_WORKTREE })`.
- CLI `resolveSpawnSettings` constructs a `SpawnRequest`, setting `params` from flags, resolved agents, and worktree (`packages/orch/src/commands/spawn/flags.ts:188-221`). `cmdSpawn` sends `request.params` to the `spawn` RPC (`commands/spawn/index.ts:40-42`).

## 4. Registration shapes and callers
- `SpawnRegistration` starts at `types/store.ts:219`; quote full definition with `nl -ba packages/orch/src/types/store.ts | sed -n '219,289p'`.
- `HostedSpawnRegistration` (`types/store.ts:290-293`):
```ts
export type HostedSpawnRegistration = Pick<SpawnRegistration, "form" | "key" | "harnessId" | "cwd" | "name" | "model" | "thinking" | "spawner" | "now"> & {
  readonly host: HostIdentity;
};
```
- `registerSpawnedAgent`: backend headless `spawn` (`backends/headless/index.ts:163`), backend registration values come from `opts`; held `recordHeldAgent` (`backends/held/index.ts:190`, from opts); adoption handler (`handlers/adopt.ts:16`, source fields from adopted agent); spawn placement (`spawn/placement.ts:160`, fields from spec). For model/thinking follow each input `opts`/spec; spawn placement explicitly uses `spec.model` and resolved `thinking` (163).
- `registerHostedAgent`: `spawnOnHost` (`handlers/lifecycle.ts:140`), model/thinking from RPC params destructured at 138; registration uses those values.

## 5. `spawnEnv`
```ts
export function spawnEnv(orchDir: OrchDir, key: string, adapter: AgentAdapter, form: FormId | null, model: string | undefined, workers: WorkerPolicy | undefined): Record<string, string> {
  return { [LAUNCH_ENV]: key, ORCH_DIR: orchDir, ...compactionEnv(adapter, model, workers), ...terminalClientEnv(adapter, form) };
}
```
(`spawn/placement.ts:117-119`.) Callers: `prepareAgents` (`spawn/index.ts:179`); `spawnOneIntoTab` fallback (`spawn/placement.ts:178`). Grep: `grep -RIn 'spawnEnv(' packages/orch/src`.

## 6. Backend process environment and argv
- Headless backend constructs `SpawnOpts` at `backends/headless/index.ts:178`; `headlessCmd` / `restrictedHeadlessCmd` selection is 193-194. Environment passed to process and exact fields: `nl -ba packages/orch/src/backends/headless/index.ts | sed -n '169,205p'`.
- Held launch `startHeldAgent`: `backends/held/index.ts:226`; `heldLaunchEnv`/`heldAgentEnv` at 170-186. Exact process environment and adapter argv: inspect `nl -ba packages/orch/src/backends/held/index.ts | sed -n '170,250p'`.
- `startSessionAgent` is `daemon/server/session-agents.ts:174`; inspect lines 174 onward for env and argv.
- Adapter argv methods: `interactiveArgv` is adapter-defined; `restrictedHeadlessCmd` is used by headless backend. Herdr uses `adapter.interactiveArgv(opts)` (`backends/herdr/index.ts:399`).

## 7. `restartOpts` callers
- `restartOpts` is defined at `handlers/restart-form.ts:58`; callers at lines 115 and 148. First result starts session agent in `restartSameForm` via `swapProcess` (120); second feeds form-switch branches, starting session agent (152) or held agent (163).

## 8. Relaunch
- `relaunch.ts` constructs `BackendSpawnOpts` at line 150. Read `nl -ba packages/orch/src/daemon/server/handlers/relaunch.ts | sed -n '130,190p'` for launch source and consumer. Grep: `grep -nE 'opts|relaunch|spawn\(' packages/orch/src/daemon/server/handlers/relaunch.ts`.
