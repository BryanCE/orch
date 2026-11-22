## 1. Worker header shapes
```ts
export interface WorkerHeaderContext {
  maySpawn: boolean;
  /** The agent's own directory: `{cwd}` and `{wincwd}` in a verify command become it. */
  cwd?: string;
  /** The worktree branch the agent runs on: only what it commits there reaches review. */
  worktreeBranch?: string;
  gatedCommands?: readonly string[];
  /** The commands that prove a slice is finished. Empty: the header asks for
   *  whatever the repository already has, because orch was told no verb. */
  verifyCommands?: readonly string[];
  /** The spawner's link is live and will accept a peer write. Default false: orch
   *  never instructs a reply it has not established the worker can actually deliver. */
  spawnerRepliable?: boolean;
  /** Set for a read-only agent: it has no shell, so its header names no verify command. */
  readOnly?: ReadOnly;
}
```
packages/orch/src/types/core.ts:201
```ts
worker: z.object({ harness: z.enum(ADAPTER_IDS).nullable(), context: WORKER_HEADER_CONTEXT }).optional()
```
packages/orch/src/daemon/client/protocol.ts:665

## 2. workerRules
```ts
export function workerRules(settings: OrchSettings): WorkerRules {
  return { gatedCommands: settings.gated_commands, verifyCommands: settings.workers.verify_commands };
}
```
packages/orch/src/worker-prompt.ts:15
```ts
export type WorkerRules = Pick<WorkerHeaderContext, "gatedCommands" | "verifyCommands">;
```
packages/orch/src/types/core.ts:219
- `workerHeaderContextOf` calls `workerRules`; `packages/orch/src/policy/spawner.ts:24-25`.
- `report` calls `workerRules`; `packages/orch/src/commands/spawn/report.ts:161`.
- `spawnHeadless` calls `workerRules`; `packages/orch/src/daemon/server/spawn/index.ts:146`.
- `runWorkLoop` calls `workerRules`; `packages/orch/src/daemon/server/work-loop.ts:105`.
- No calls in `packages/orch/extensions/` (searched for `workerRules(`).

## 3. Peer drive dispatch
```ts
case "dispatch":
case "steer": {
  const { accepted, id, ack } = await confirmTextWrite(state, params.action, agent, params.text, () => undefined);
  return { action: params.action, accepted, id, ack };
}
```
packages/orch/src/daemon/server/handlers/drive.ts:95-99
```ts
PEER_DRIVE_TARGET.extend({ action: z.literal("dispatch"), text: nonBlank }),
```
packages/orch/src/daemon/client/protocol.ts:470

## 4. Spawn on a linked host
- `spawnOnHost` sends `link.call("spawn-headless", ...)`; the prompt travels in field `prompt`. packages/orch/src/daemon/server/handlers/lifecycle.ts:132-139
```ts
async function spawnOnHost(state: DaemonState, hostName: string, params: ParamsOf<"spawn-headless">): Promise<ResultOf<"spawn-headless">>
```
packages/orch/src/daemon/server/handlers/lifecycle.ts:132
- The receiving RPC handler routes `spawn-headless` to `spawnHeadless`; packages/orch/src/daemon/server/handlers/table.ts:139
```ts
export async function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">, peer?: HostId): Promise<ResultOf<"spawn-headless">>
```
packages/orch/src/daemon/server/handlers/lifecycle.ts:61
- The receiving launch path is `spawnHeadless` -> `spawnHeldLaunch`, whose `firstPrompt` field is the held launch's first prompt. packages/orch/src/daemon/server/handlers/lifecycle.ts:61,113
```ts
export async function spawnHeldLaunch(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts & { readonly key: string; readonly firstPrompt: string | null }): Promise<ResultOf<"spawn-headless">>
```
packages/orch/src/daemon/server/handlers/lifecycle.ts:113

## 5. Harness tool-call handler
- The `tool_call` callback at line 298 is not declared `async`, and returns synchronously. packages/orch/src/agent/tools.ts:298-313
- No callback registered with `harness.on(` in `packages/orch/src/agent/` is `async` or returns a promise. `before_agent_start` is a plain callback with a `void` return. packages/orch/src/agent/tools.ts:203-209
- Whether the pi harness awaits a promise a handler returns is not known from this repository: its types are not in `node_modules`.
- No `harness.on` type declaration found in the inspected handler code; callbacks are supplied by the harness interface.

## 6. Claude tool gate
```ts
export function preToolUse(input: JsonRecord, settings: GateSettings, readOnly: ReadOnlyGate | null): JsonRecord | undefined {
```
packages/orch/extensions/claude/tool-gate.ts:38
- `gateToolCall` is not async. packages/orch/extensions/claude/index.ts:86
```ts
const handlers: Record<string, () => void | Promise<void>> = {
  pretooluse: gateToolCall,
  sessionstart: reportStart,
  userpromptsubmit: reportPrompt,
  notification: reportNotification,
  stop: reportStop,
  stopfailure: reportStopFailure,
};
await handlers[event]?.();
```
packages/orch/extensions/claude/index.ts:146-154

## 7. Caller identity and operator refusal
```ts
const GOVERNANCE = z.object({
  caller: CALLER.optional(),
  actor: z.string().min(1).optional(),
  actorSpace: z.string().optional(),
  actorIsOperator: z.boolean().optional(),
  steal: z.boolean().optional(),
  crossSpace: z.boolean().optional(),
});
```
packages/orch/src/daemon/client/protocol.ts:92-99
```ts
const CALLER = z.object({
  launch: z.string().nullable(),
  session: CALLER_SESSION.nullable(),
  pid: z.number().int().positive(),
}) satisfies z.ZodType<CallerCredential>;
```
packages/orch/src/daemon/client/protocol.ts:56-60
```ts
export function callerKindOf(orchDir: OrchDir, credential: CallerCredential): CallerKind {
```
packages/orch/src/policy/caller.ts:12
```ts
export function selfIdentityOf(orchDir: OrchDir, credential: CallerCredential): SelfIdentity | null {
```
packages/orch/src/identity/self.ts:16
- Operator-only refusal text: ```${key} is operator-only for an agent. An agent may set: ${may}. The human widens that with: orch settings grant ${key}```. packages/orch/src/policy/agent-settings.ts:34

## 8. Settings lock
```ts
lock: { retries: 50, interval_ms: 100, stale_ms: 10_000 },
```
packages/orch/src/settings/schema.ts:100
```ts
update: (mutate) => {
  const text = storage.read();
  let policy: SettingsLockPolicy = SETTINGS_DEFAULTS.lock;
  if (text !== null) {
    try {
      policy = settingsFromFile(storage.file, parseSettingsText(text, storage.file).settings).lock;
    } catch {
      // The repair path writes a malformed file whose policy is unknowable.
    }
  }
  storage.withLock(policy, mutate);
  held = undefined;
},
```
packages/orch/src/settings/manager.ts:30-41
