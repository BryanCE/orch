## 1. Spawn RPC handler

- Handler is `spawnAgents`; the table binds `spawn: governed(state, (params) => spawnAgents(state, params))` (`packages/orch/src/daemon/server/handlers/table.ts:139`). `governed` supplies params after governance/caller resolution; `state` is closed over by the table. No directory or context argument is passed separately.
- Signature and return:
```ts
export async function spawnAgents(state: DaemonState, params: ParamsOf<"spawn">): Promise<SpawnResult>
```
  It returns `SpawnResult` (`packages/orch/src/daemon/server/spawn/index.ts:320-321`); it gets caller credential from `params.caller` at line 324 and returns combined spawned result at lines 344-346.

## 2. Spawn prompt delivery

- Prompts for a spawned agent are dispatched in `dispatchSpawnPrompts`, called by `reportSpawnResults` (`packages/orch/src/commands/spawn/report.ts:150-171,186`). It calls `dispatchToAgent` at lines 159-163. The function that sends a headless spawn's initial prompt is not the same path: `spawn/index.ts:144` supplies `workerPrompt(...)` to `spawnHeadless`.
- Spawn prompt delivery through `dispatchToAgent` does mint an id: the daemon's `confirmTextWrite` does `const id = randomUUID()` (`packages/orch/src/daemon/server/handlers/write.ts:281-282`), and records/delivers it at lines 286-291. Spawn report records returned `id` in `dispatches` at report.ts:163.

## 3. Dispatch RPC

- Params (`GOVERNANCE` includes the governance/caller fields):
```ts
dispatch: GOVERNANCE.extend({ target: nonBlank, text: nonBlank, worker: z.object({ harness: z.enum(ADAPTER_IDS).nullable(), context: WORKER_HEADER_CONTEXT }).optional() }),
```
  `packages/orch/src/daemon/client/protocol.ts:634-635`. The current RPC has no explicit keep-context, raw, or with-files params: keep-context is handled client-side; raw omits `worker`; `--with` is incorporated into text before RPC.
- Handler:
```ts
export async function dispatch(state: DaemonState, params: ParamsOf<"dispatch">): Promise<Accepted>
```
  (`packages/orch/src/daemon/server/handlers/write.ts:326`). Returns `writeText(...)`, an `Accepted` result.

## 4. `--with`

- Spawn does not read files or inline contents: `referencesByAgent` maps each value through `contextReference` (`packages/orch/src/commands/spawn/flags.ts:160-170`), and `resolveSpawnParams` applies `taskWithReferences` to prompt (`flags.ts:214-215`). RPC agent params carry the resulting prompt; see `spawn/index.ts:227-232` for params construction. The paths are references, not file contents.
- Dispatch similarly builds `prompt: taskWithReferences(prompt, flags.withPaths.map(contextReference))` (`packages/orch/src/commands/control.ts:377-385`) and sends that text through `dispatchToAgent` (`control.ts:249-255`). It passes references in the prompt, not file contents.

## 5. Worker header

- Spawn's headless prompt calls `workerPrompt` directly at `packages/orch/src/daemon/server/spawn/index.ts:144`; spawned-pane prompts go through `dispatchSpawnPrompts` → `dispatchToAgent` (`packages/orch/src/commands/spawn/report.ts:150-163`), whose RPC worker field is constructed in `packages/orch/src/commands/control.ts:253`; daemon `dispatch` wraps it at `packages/orch/src/daemon/server/handlers/write.ts:326-330`.
- `--raw` makes `dispatchToAgent` omit `worker` (`control.ts:253`); daemon then sends text without adding a worker header (`write.ts:328-330`).

## 6. Dispatch id

- Minted by daemon: `const id = randomUUID();` (`packages/orch/src/daemon/server/handlers/write.ts:281-282`). `confirmTextWrite` returns `{ accepted: true, id, ack }` at lines 286-291.
- RPC result shape is `ACCEPTED` (`packages/orch/src/daemon/client/protocol.ts:858`; definition at protocol.ts:149-151), with accepted status, `id`, and acknowledgement. CLI receives `delivered.id` in `dispatchToAgent` (`packages/orch/src/commands/control.ts:249-259`) and logs it.

## 7. Close

- Close-by-id RPC is `agent-closed`, params `GOVERNANCE.extend({ key: nonBlank })` (`packages/orch/src/daemon/client/protocol.ts:714`); table invokes `closeAnywhere` through `agent-closed` at `packages/orch/src/daemon/server/handlers/table.ts:146-150`. Handler signature: `closeAnywhere(state: DaemonState, params: ParamsOf<"agent-closed">): Promise<ResultOf<"agent-closed">>` (`packages/orch/src/daemon/server/handlers/drive.ts:70`).
- It closes one agent through `closeHere`, which uses `closeAgent(state, record)` (`drive.ts:47-65`); `closeAgent` is imported from `handlers/lifecycle.ts` at line 13.
- Separate `close-targets` lookup RPC params are `{ caller: CALLER, targets: z.array(nonBlank), all: z.boolean() }` (`protocol.ts:802`).

## 8. Caller and target resolution

- Caller credential type is `CallerCredential`, carried in `CALLER`'s `launch`, `session`, and `pid` fields (`packages/orch/src/daemon/client/protocol.ts:55-59`). A dispatch handler uses `params.actor`/governance rather than directly resolving caller; example `writeText` passes params into `governWrite` at `packages/orch/src/daemon/server/handlers/write.ts:306-309`.
- Target names are normalized in `placedKey` via `normalizeControlTarget(directory, target)` (`write.ts:294-302`), used by `writeText` at lines 306-310.

## 9. Dispatch gate

- Lease gate is `governWrite` in `packages/orch/src/daemon/server/handlers/write.ts` (lines 166 onward); it refuses a live foreign lease at lines 213-229.
- Dispatch path calls it in `writeText`'s `here` callback, passed to `confirmTextWrite` (`write.ts:306-310`); `confirmTextWrite` invokes the gate in `write.ts:286`.
