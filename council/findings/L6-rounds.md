## 1. Dispatch and the conversation
- `cmdDispatch` calls `prepareSession` before `dispatchToAgent`; unless `--keep-context` is set, `prepareSession` calls `clearSession`. The flag’s help says it sends the task “without clearing it.” `packages/orch/src/commands/control.ts:318-323`; `packages/orch/src/commands/control.ts:353-360`; `packages/orch/src/commands/registry.ts:94`
- `tui` with a bridge: `deliverLifecycle` uses the attached link’s `reset` role when present, starting a fresh conversation. The subsequent prompt uses the link if it declares it takes `dispatch`; otherwise it falls through to adapter control or terminal input. `packages/orch/src/control/dispatch.ts:203-217`; `packages/orch/src/control/dispatch.ts:76-91`
- `tui` without a bridge: `deliverLifecycle` types the adapter’s declared reset command into the backend input; the prompt likewise uses adapter control or backend input. `packages/orch/src/control/dispatch.ts:218-231`; `packages/orch/src/control/dispatch.ts:76-91`
- `acp` and `server`: these are orchd-owned sessions (`FORM_SESSION_OWNER`); their drivers/links handle session reset and dispatch, rather than preserving the former conversation. `packages/orch/src/types/form.ts:14-14`; `packages/orch/src/daemon/server/session-agents.ts:22-35`; `packages/orch/src/control/dispatch.ts:203-217`
- `oneshot`: it is harness-owned (`FORM_SESSION_OWNER`) and headless has no input role. Once its process has exited, there is no conversation to continue; dispatch’s default clear/reset cannot obtain a live backend handle and refuses rather than relaunching it. `packages/orch/src/types/form.ts:14-14`; `packages/orch/src/backends/headless/index.ts:115-117`; `packages/orch/src/control/dispatch.ts:218-231`

## 2. Dispatch to an exited oneshot agent
- Dispatch does not relaunch it. It clears first by default, and `deliverLifecycle` refuses when the dead headless process has no live handle: `cannot reset <target>: no live backend handle`. `--keep-context` skips the clear, but delivery still has no live route. `packages/orch/src/commands/control.ts:318-323`; `packages/orch/src/control/dispatch.ts:218-228`; `packages/orch/src/backends/headless/index.ts:115-117`

## 3. Oneshot result extraction
- pi: `extractResult` calls `resultFromPresenceOrSession`: daemon presence result first, then the last assistant entry from its session file. `packages/orch/src/adapters/pi.ts:310-320`; `packages/orch/src/adapters/pi.ts:395-397`
- omp: no `extractResult` member was found (searched `rg -n 'extractResult' packages/orch/src/adapters/omp.ts`). `packages/orch/src/adapters/omp.ts:102-105`
- claude: presence result, then last assistant JSONL from the supplied/status session path, then JSONL/native output, plain output, then status `lastText`. `packages/orch/src/adapters/claude.ts:300-316`
- codex: `extractCodexResult` reads notify text from the JSON/JSONL output, then optional output-last-message file, assistant messages in that output, then the session transcript. `packages/orch/src/adapters/codex.ts:171-173`; `packages/orch/extensions/codex/events.ts:132-171`
- opencode: parses `input.output` as run JSONL and joins text parts belonging to the last assistant message; falls back to raw output text. `packages/orch/src/adapters/opencode.ts:105-114`

## 4. Dispatch ID and result association
- `confirmTextWrite` mints the ID with `randomUUID`; the CLI receives this daemon-returned ID from `dispatchToAgent`. `packages/orch/src/daemon/server/handlers/write.ts:280-294`; `packages/orch/src/commands/control.ts:249-264`
- The delivery ID is carried by the run prompt/link; on turn start, orchd records it as status `dispatchId`. `packages/orch/src/daemon/server/session-agents.ts:97-101`
- A result report uses its reported `dispatchId`, or falls back to the agent status row’s current ID, then upserts the run keyed by that ID. `packages/orch/src/daemon/server/status-report.ts:131-147`; `packages/orch/src/daemon/server/status-report.ts:150-165`

## 5. Read the first of three dispatches
- Use `orch runs <target> --json` to find the first dispatch ID, then `orch result <dispatchId>` is not a valid target: `result` resolves an agent, not a run. Historical per-dispatch results are read by the RPC `run` using `{ dispatchId }`; the CLI `result` command reads the agent’s current result. `packages/orch/src/commands/registry.ts:71-74`; `packages/orch/src/commands/registry.ts:132-135`; `packages/orch/src/daemon/client/protocol.ts:795`; `packages/orch/src/daemon/client/protocol.ts:985`
- Flag definitions: `result` has `--steal` (from `STEAL`, help “Read an agent a live foreign holder leases.”); `runs` has `-n <count>` (“How many rows.”) and global `--json`. `packages/orch/src/commands/registry.ts:9-10`; `packages/orch/src/commands/registry.ts:71-74`; `packages/orch/src/commands/registry.ts:130-135`
- `cmdRuns` calls `readRpc(services, "runs", ...)`; `cmdResult` calls `readAgentThroughOrchd(..., { kind: "result" })`, which calls RPC `agent-read`. `packages/orch/src/commands/runs.ts:48-55`; `packages/orch/src/commands/results.ts:22-25`; `packages/orch/src/commands/agent-read.ts:10-13`

## 6. `orch result --json` shape
- One found result serializes as `{ target, host, source, result }`; a missing result as `{ target, host, error }`. `jsonEntry` emits this union:

```ts
{ target: string; host: string | null; source: ResultSource; result: unknown }
| { target: string; host: string | null; error: string }
```

- `ResultSource` is `"presence" | "dispatch" | "history" | "session"`; JSON output is an array of these entries. `packages/orch/src/commands/results.ts:70-73`; `packages/orch/src/commands/results.ts:86-88`; `packages/orch/src/commands/results.ts:94-97`; `packages/orch/src/types/agent-read.ts:8-10`

## 7. `orch wait`
- The parser accepts any `AgentState` (`idle`, `working`, `waiting`, `blocked`, `asking`, `done`, `error`, `aborted`, `exited`, `unknown`); the registry help documents only `done`, `idle`, `working`, `blocked` and defaults to `done`. One invocation takes one positional target and the summary says “one agent.” `packages/orch/src/agent-state.ts:10-12`; `packages/orch/src/commands/lifecycle/index.ts:17-23`; `packages/orch/src/commands/registry.ts:121-126`
- It sends one `agent-wait` RPC for that target; there is no multi-agent wait in the call. `packages/orch/src/commands/lifecycle/index.ts:28-31`; `packages/orch/src/daemon/server/handlers/wait.ts:24-35`

## 8. Per-name harness and model in one spawn
- Yes. `perAgent` broadcasts one value or accepts exactly one per name; adapters are resolved from per-agent harness values and models use the same pairing. `packages/orch/src/commands/spawn/flags.ts:80-87`; `packages/orch/src/commands/spawn/flags.ts:139-153`; `packages/orch/src/commands/spawn/flags.ts:173-178`
- Spawn request shape:

```ts
spawn: GOVERNANCE.extend({
  form: SPAWN_REGISTRATION.shape.form.nullable(),
  agents: z.array(SPAWN_AGENT).min(1),
  cmd: nonBlank.nullable(),
  plexer: nonBlank.nullable(),
  cwd: nonBlank,
  tab: nonBlank.nullable(),
  space: nonBlank.nullable(),
  host: nonBlank.nullable(),
  worktree: SPAWN_WORKTREE,
})
// SPAWN_AGENT: { name, harness, model, thinking, prompt }
```

- The wire request is `agents: SPAWN_AGENT[]`; each agent object carries its own `harness` and `model`. `packages/orch/src/daemon/client/protocol.ts:214-217`; `packages/orch/src/daemon/client/protocol.ts:691-701`
