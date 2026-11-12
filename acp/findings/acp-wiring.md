# ACP wiring lookup

Paths below are relative to the repository root. Source was read while other agents were editing it.

## 1. Status and result reports

`packages/orch/src/daemon/server/status-report.ts:79`:
```ts
export function acceptStatusReport(
  orchDir: OrchDir,
  key: string,
  patch: StatusPatch,
  publish: (event: NotifyEvent) => void,
  now = Date.now(),
): { ok: true }
```

`packages/orch/src/daemon/server/status-report.ts:127`:
```ts
export function acceptResultReport(
  orchDir: OrchDir,
  key: string,
  result: ResultReport,
  now = Date.now(),
): { ok: true }
```

Types at `packages/orch/src/types/presence.ts:67` and `:100`:
```ts
export interface StatusPatch {
  state?: AgentState;
  lastError?: string | null;
  model?: { provider: string; id: string } | null;
  thinking?: string | null;
  task?: string | null;
  dispatchId?: string | null;
  lastText?: string | null;
  currentFile?: string | null;
  filesTouched?: readonly string[] | null;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  cost?: number | null;
  context?: { tokens: number; percent?: number | null } | null;
  turns?: number | null;
  sessionPath?: string | null;
  sessionId?: string | null;
  project?: string | null;
  extensionHash?: string | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  blockedMessage?: string | null;
}

export interface ResultReport {
  text: string;
  dispatchId?: string | null;
  task?: string | null;
  model?: { provider: string; id: string } | null;
  thinking?: string | null;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  cost?: number | null;
  turns?: number | null;
  sessionPath?: string | null;
  finishedAt: number;
}
```

Whole handler entries at `packages/orch/src/daemon/server/handlers/table.ts:114-115`:
```ts
    "report-status": waking(state, (params) => acceptStatusReport(directory, params.key, params.status, publish)),
    "report-result": waking(state, (params) => acceptResultReport(directory, params.key, params.result)),
```

## 2. Questions and asking

Neither function moves the agent to `asking`. The server uses `recordAgentQuestion` to open a question; that function only checks the agent exists and writes the pending question.

`packages/orch/src/store/question-rows.ts:10`:
```ts
export function recordQuestion(
  directory: OrchDir,
  input: { id: string; agentId: string; question: string; askedAt: number; options: readonly QuestionOption[]; supersede: boolean },
): void
```

`packages/orch/src/daemon/server/handlers/lifecycle.ts:280`:
```ts
export function recordAgentQuestion(directory: OrchDir, params: ParamsOf<"question">): { ok: true }
```

Whole existing call at `packages/orch/src/daemon/server/handlers/lifecycle.ts:283`:
```ts
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt, options: [], supersede: true });
```

Whole handler at `packages/orch/src/daemon/server/handlers/table.ts:211`:
```ts
    question: (params) => recordAgentQuestion(directory, params),
```

Today, the harness tool records the question, sets its own state to asking, and explicitly reports status. The whole sequence at `packages/orch/src/agent/tools.ts:129-133` is:
```ts
        await daemon.postQuestion({ notice: "question", agentId, questionId: id, question, askedAt });
        askingPreviousState = state.state;
        state.asking = { question, id, ts };
        state.state = "asking";
        presence.writeStatus();
```

`writeStatus` at `packages/orch/src/agent/presence.ts:133` builds a patch with `state: blocked.count > 0 ? "blocked" : state.state` and sends this whole call at `:158`:
```ts
    void daemon.reportStatus(state.key, patch);
```

Thus the `report-status` handler above reaches `acceptStatusReport`, whose store-writing call at `packages/orch/src/daemon/server/status-report.ts:89` is:
```ts
  const { previous, current } = recordAgentStatus(orchDir, placeHere(orchDir, key), lockWaitKept(orchDir, key, patch), now);
```

Claude also reports asking explicitly after its question notice at `packages/orch/extensions/claude/index.ts:119`:
```ts
  await reportStatus({ state: "asking", blockedMessage: notice.question, lastText: truncateOptional(text, MAX_TEXT) });
```

Answered questions are settled by `settleQuestion` at `packages/orch/src/store/question-rows.ts:42`:
```ts
export function settleQuestion(
  directory: OrchDir,
  input: { id: string; answer: string; answeredAt: number },
): boolean
```
It updates `answeredAt` and `answer` only where `answeredAt IS NULL`, returning whether exactly one row changed. `answerHere` at `packages/orch/src/daemon/server/handlers/write.ts:349` invokes it at `:371`:
```ts
settleQuestion(directory, { id: current.id, answer: text, answeredAt: Date.now() })
```
`recordQuestion` with `supersede: true` also settles earlier pending questions, but with a null answer, at `question-rows.ts:15-19`.

## 3. Bridge attachment and detachment

`packages/orch/src/daemon/server/rpc.ts:83`:
```ts
function attachRequest(
  orchDir: OrchDir,
  socket: Socket,
  request: Extract<RpcRequest, { method: "attach" }>,
  state: ConnectionState,
  transport: "unix" | "tcp",
  onBridgeAttached: ((key: string) => void) | undefined,
  logger: Logger,
): AttachOutcome
```

Whole `AgentLink` assignment at `rpc.ts:102-108`:
```ts
    link = {
      takes: adapter?.bridge?.takes ?? [],
      abort: null,
      push: (delivery: BridgeDelivery) => lineResponse(socket, { kind: "delivery", delivery }),
      close: () => socket.destroy(),
    };
    attachLink(orchDir, key, link);
```

`packages/orch/src/control/agent-links.ts:32,37`:
```ts
export function attachLink(orchDir: OrchDir, key: string, link: AgentLink): void
export function detachLink(orchDir: OrchDir, key: string, link: AgentLink): void
```

The socket's `close` listener runs `detach` at `rpc.ts:239`. That callback calls `detachConnectionBridge(orchDir, state)` at `:233`, which calls `detachLink(orchDir, state.bridge.key, state.bridge.link)` at `:62` and clears the connection's bridge. The same helper also runs before replacing an attachment at `:96`.

## 4. Outbox delivery and acknowledgment

`packages/orch/src/daemon/server/outbox.ts:115`:
```ts
export async function deliverOutboxMessage(orchDir: OrchDir, id: string, deps: OutboxDeps): Promise<void>
```
It selects the row and calls `attemptDelivery`. At `outbox.ts:63`, that calls `deps.deliver(message.target, message.payload, message.id)`. The server delivery entry is `packages/orch/src/daemon/server/handlers/write.ts:73`:
```ts
async function deliverOutboxWrite(state: DaemonState, target: string, payload: unknown, id: string): Promise<OutboxDelivery>
```

The dispatcher pushes prompts at `packages/orch/src/control/dispatch.ts:109`:
```ts
    pushToLink(agent, { id: action.id, message: { action: bridgeAction, text: action.text } });
```

`packages/orch/src/control/agent-links.ts:56`:
```ts
export function pushToLink(agent: HereAgent, delivery: BridgeDelivery): void
```
It finds the attached link, throws if detached, and invokes `link.push(delivery)`.

The complete message types at `packages/orch/src/shared/bridge-message.ts:9` and `:50` are:
```ts
export type BridgeMessage =
  | { readonly action: "dispatch"; readonly text: string }
  | { readonly action: "steer"; readonly text: string }
  | { readonly action: "answer"; readonly text: string; readonly questionId: string; readonly optionId: string | null }
  | { readonly action: "model"; readonly model: string };

export interface BridgeDelivery {
  readonly id: string;
  readonly message: BridgeMessage;
}
```
The socket wraps it as `{ kind: "delivery", delivery }`, as copied in item 3.

`packages/orch/src/daemon/server/outbox.ts:22`:
```ts
export function ackOutboxRow(state: DaemonState, id: string): { ok: true }
```
Whole handler at `packages/orch/src/daemon/server/handlers/table.ts:214`:
```ts
    ack: (params) => ackOutboxRow(state, params.id),
```
It marks the row delivered, acknowledges delivery, and wakes the loop.

## 5. Held agent startup and process recording

`packages/orch/src/backends/held/index.ts:155`:
```ts
export async function startHeldAgent(holder: PtyHolder, adapter: AgentAdapter, opts: BackendSpawnOpts): Promise<LaunchedAgent>
```

The actual PTY startup is `PtyHold.start` at `packages/orch/src/daemon/server/held.ts:33`:
```ts
  async start(key: string, request: HeldStartRequest): Promise<{ readonly pid: number }>
```
It awaits `this.provider.spawn({ ...request, term, cols, rows })` at `held.ts:39` and retains the resulting PTY and screen.

The spawn entry at `packages/orch/src/daemon/server/handlers/lifecycle.ts:61` is:
```ts
export async function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">, peer?: HostId): Promise<ResultOf<"spawn-headless">>
```
Terminal forms branch to `spawnHeldForPeer` at `:99`; that helper at `:114` has this signature and whole call:
```ts
async function spawnHeldForPeer(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts & { readonly key: string; readonly firstPrompt: string | null }): Promise<ResultOf<"spawn-headless">>
```
```ts
  const launched = await startHeldAgent(state.held, adapter, opts);
```

The holder call in `packages/orch/src/backends/held/index.ts:159` is:
```ts
  const { pid } = await holder.start(key, {
    ...shellRun(command),
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, ...agentLaunchEnv(opts, HELD_ENVIRONMENT_STAMP) },
  });
```
At `:168` it registers the launched process:
```ts
    registerSpawnedAgent(opts.orchDir, unplacedRegistration(heldBackend, adapter.id, key, opts, launched));
```
`packages/orch/src/store/spawn-registration.ts:106-110` writes the process through:
```ts
  recordProcess(directory, agent, now, { pid: input.process.pid, startToken: input.process.startToken });
```
`recordProcess` at `packages/orch/src/store/interval-rows.ts:96` writes the process interval. A held-agent log-path store write is **not found**: searched `logPath`, `logFile`, `log_path`, and `ORCH_AGENT_LOG` across held startup, registration, store, schema, and backend sources. Held startup records a pid and keeps a PTY screen, not a log path.

## 6. Writer screen and pipe ownership

`PtyHold.openScreen` at `packages/orch/src/daemon/server/held.ts:50`:
```ts
  openScreen(key: string, size: { readonly cols: number; readonly rows: number }): { write(text: string): void; close(): void }
```
Its return type is the inline object with `write(text: string): void` and `close(): void`; it opens a writer-backed screen and feeds output through the same terminal and subscribers as PTYs.

`packages/orch/src/daemon/server/held-pipes.ts:6,15,20`:
```ts
export function holdPipes(agentId: string, process: PipesProcess): void
export function heldPipes(agentId: string): PipesProcess | null
export function releasePipes(agentId: string): void
```

## 7. Log path at spawn

For headless agents, `packages/orch/src/backends/headless/index.ts:185-187` decides and opens the path:
```ts
    mkdirSync(logDirectory(directory), { recursive: true });
    const logPath = join(logDirectory(directory), logFileName(key));
    const logFd = openSync(logPath, "a");
```
The helpers at `:30`, `:43`, and `:47` are:
```ts
function logDirectory(directory: string): string
function headlessLogKey(key: string): string
function logFileName(key: string): string
```
They produce `<orchDir>/logs/<sanitized-key>.log`. The path goes to the child's `ORCH_AGENT_LOG` environment at `:196`. `packages/orch/extensions/codex/index.ts:38` reads that variable as `sessionPath`.

A dedicated stored spawn log path or public helper returning a stored log path is **not found**. Searched `logPath`, `logFile`, `log_path`, and `ORCH_AGENT_LOG` under `src`, including `db/schema.ts`, `types/store.ts`, and `store`. The actual transcript reference is status `sessionPath`, merged at `packages/orch/src/store/status-rows.ts:84`; the reader takes it from presence at `packages/orch/src/agent/read.ts:60`. Held startup does not choose a log path. `logFileName` returns only a filename, not the full path.

## 8. Session id into the store

Harness `updateSessionRef` at `packages/orch/src/agent/presence.ts:178` reads `ctx.sessionManager.getSessionId()` into `state.sessionId`. `writeStatus` at `:133` includes `sessionId: state.sessionId` at `:151` and reports it at `:158`.

`acceptStatusReport` from item 1 reaches `packages/orch/src/presence/store.ts:335`:
```ts
export function recordAgentStatus(
  root: OrchDir,
  agent: HereAgent,
  patch: StatusPatch,
  now: number,
): { previous: AgentStatusRow | undefined; current: AgentStatusRow }
```
The final writer is `packages/orch/src/store/status-rows.ts:22`:
```ts
export function mergeAgentStatus(
  orchDir: OrchDir,
  agentId: string,
  previous: AgentStatusRow | undefined,
  patch: StatusPatch,
  now: number,
): AgentStatusRow
```
At `:85`, it preserves or replaces the status field with `sessionId: keepOrNull(patch.sessionId, previous?.sessionId)`. The column is `agent_status.session_id` at `packages/orch/src/db/schema.ts:263`.

## 9. Session-entry rendering

`packages/orch/src/commands/results.ts:188,208`:
```ts
function renderViewEntry(entry: SessionViewEntry): string | undefined
function tailEntries(entries: readonly SessionViewEntry[], count: number): string
```
`tailEntries` maps entries through `renderViewEntry`, skips undefined rows, selects the last count, and joins with newlines. `writeTailText` uses it at `results.ts:233`.

This is **client** code: `packages/orch/scripts/check-layers.ts:72` includes `src/commands/` in the client prefixes, and `:91-93` classifies modules.

The premise about `orch peek` is wrong. `packages/orch/src/commands/panes.ts:109`:
```ts
export async function cmdPeek(services: Services, args: string[]): Promise<void>
```
At `:114` it requests `{ kind: "screen", lines: n }`, then prints `lookup.text`; it does not render `SessionViewEntry` values. Searching `peek`, `tailEntries`, and `renderViewEntry` located no entry renderer for peek.

## 10. Liveness tick

`packages/orch/src/daemon/server/status-report.ts:163`:
```ts
export function startLivenessTick(
  orchDir: OrchDir,
  intervalMs: number,
  publish: (event: NotifyEvent) => void,
  logger: Logger,
): { stop(): void }
```
Its inner tick probes processes, loads presence, skips null/already-exited/invalid status and non-dead liveness, then writes `exited` with a finish time and publishes the transition at `:177-186`.

For a held agent there is no special PTY-map test. `packages/orch/src/presence/store.ts:390` probes all recorded placements. `livenessOf` at `:260` returns unknown during a process swap, otherwise calls `placedLiveness`. At `packages/orch/src/process-place.ts:146-149`, a local agent without a process is dead; one with a process goes through process-instance liveness. `packages/orch/src/process-identity.ts:168` checks the pid and recorded start token:
```ts
export function recordedInstanceIsLive(process: LocalProcess, probe: InstanceProbe = OS_PROBE): boolean
```
```ts
  const { pid, startToken } = process;
  if (!probe.isAlive(pid)) {
    knownStartTokens.delete(pid);
    return false;
  }
  return startToken === null || knownStartToken(pid, probe) === startToken;
```
The pid is the held PTY's program pid recorded in item 5. `heldPipes` or `PtyHold.has` is not part of this check.

## 11. Package identity

`packages/orch/src/util.ts:60-72` provides the name and version for a client-info value:
```ts
export interface PackageManifest {
  readonly name: string;
  readonly version: string;
}
```
```ts
export function packageManifest(): PackageManifest
```
It reads `join(packageRoot(), "package.json")`, validates string `name` and `version`, and returns `{ name: parsed.name, version: parsed.version }`. `packageRoot` at `util.ts:49` resolves the package root; no version or package name needs to be hardcoded.

## Verification

Read back this findings file and checked its diff for whitespace errors. No source files were edited and no tests were run. The required repository `bun check` gate failed in concurrently edited code:

```text
check:layers ok: 511 modules, 4 baseline loads left
check:bridge FAIL src/daemon/server/spawn/plan.ts:75 method-presence capability checks are forbidden; read the composed environment capability instead
scripts/bench-daemon.ts(133,35): error TS2741: Property 'form' is missing in type '{ key: AgentId; harnessId: string; placed: false; cwd: OrchDir; name: string; model: string; spawner: null; process: { host: HostId; pid: number; startToken: null; }; }' but required in type 'SpawnRegistration'.
test/commands-spawn.test.ts(71,39): error TS2740: Type '{ workerLaunch: { restrictedInteractiveCmd: (opts: SpawnOpts) => string; restrictedHeadlessCmd: (prompt: string, opts: SpawnOpts) => string[]; }; modelControl: { setModel: (request: ModelRequest) => AdapterCommand | undefined; }; ... 17 more ...; acp: { argv: () => never[]; env: () => {}; sharesSessions: boolean; }; }' is missing the following properties from type 'AgentAdapter': interactiveCmd, interactiveArgv, headlessCmd, detectState, and 2 more.
check:web exited with code 0
check:orch lint completed
error: script "check" exited with code 1
```
