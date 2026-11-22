# W11: orchd composes the worker header with the target's project rules

Context for every section. orch now has a project settings file per project directory. The
worker header a dispatch carries names the verify commands and gated commands, and those are a
project's: `workers.verify_commands` and `gated_commands`. Today the CLI puts them in the
header context from its own settings, so an agent of project B dispatched from project A is
told A's commands. After this wave the CLI sends no rules: orchd adds the rules of the target
agent's project when it composes the header, on the host the agent runs on. Paths are from the
repo root `/home/bryan/orch`; `<server>` is `packages/orch/src/daemon/server`. No `as` casts,
no `any`.

Built and ready to import:
- `<server>/project-settings.ts`: `agentProjectSettings(state, agentId): ProjectSettings`.
- `validProjectSettings(project): OrchSettings` in `packages/orch/src/settings/project.ts`:
  the merged settings, or throws the invalid file's message.
- `workerRules(settings: OrchSettings): WorkerRules` and
  `workerPrompt(prompt, raw, adapter, context)` in `packages/orch/src/worker-prompt.ts`.
- `storedHeaderContext(directory, agentId)` in `<server>/agent-policy.ts`.

Shapes other sections build against:
- `packages/orch/src/types/core.ts` exports
  `type WorkerCallerContext = Omit<WorkerHeaderContext, keyof WorkerRules>`: the header
  context a caller sends, without the rules.
- `packages/orch/src/daemon/client/protocol.ts` exports
  `type WorkerRequest = z.infer<typeof WORKER_REQUEST>`, which is
  `{ harness: AdapterId | null; context: WorkerCallerContext }`, used as the optional `worker`
  field of `dispatch`, of `peer-drive`'s `dispatch` action, and of `spawn-headless`.
- `<server>/worker-header.ts` exports
  `workerText(state: DaemonState, agentId: string, project: ProjectSettings, text: string, worker: WorkerRequest, extra?: Pick<WorkerHeaderContext, "readOnly">): string`.

## T1 The wire and the CLI send no rules
Edit `packages/orch/src/types/core.ts`, directly after
`export type WorkerRules = Pick<WorkerHeaderContext, "gatedCommands" | "verifyCommands">;`:
```ts
/** The header context a caller sends with work: where the agent sits and what its spawner can
 *  do. The rules are its project's, and orchd adds them on the agent's host. */
export type WorkerCallerContext = Omit<WorkerHeaderContext, keyof WorkerRules>;
```
Edit `packages/orch/src/daemon/client/protocol.ts`:
- In `WORKER_HEADER_CONTEXT` (L103), delete the `gatedCommands` and `verifyCommands` lines,
  and change `satisfies z.ZodType<WorkerHeaderContext>` to
  `satisfies z.ZodType<WorkerCallerContext>`. Fix the `types/core.ts` type import to bring
  `WorkerCallerContext` (drop `WorkerHeaderContext` if then unused).
- Directly after `WORKER_HEADER_CONTEXT`, add:
  ```ts
  /** Work wrapped in the worker header for that harness and context. orchd adds the rules of
   *  the agent's project where the agent runs. */
  const WORKER_REQUEST = z.object({ harness: z.enum(ADAPTER_IDS).nullable(), context: WORKER_HEADER_CONTEXT });
  export type WorkerRequest = z.infer<typeof WORKER_REQUEST>;
  ```
  If `ADAPTER_IDS` is imported below that point, it is still in scope; if the declaration
  order makes `WORKER_REQUEST` use something declared later, move it down to just before the
  first schema that uses it.
- In the `dispatch` request schema, replace
  `worker: z.object({ harness: z.enum(ADAPTER_IDS).nullable(), context: WORKER_HEADER_CONTEXT }).optional()`
  with `worker: WORKER_REQUEST.optional()`.
- In `PEER_DRIVE`, the dispatch member
  `PEER_DRIVE_TARGET.extend({ action: z.literal("dispatch"), text: nonBlank }),` becomes
  `PEER_DRIVE_TARGET.extend({ action: z.literal("dispatch"), text: nonBlank, worker: WORKER_REQUEST.optional() }),`.
- In the `spawn-headless` request schema, after the `prompt: nonBlank.nullable(),` line, add:
  ```ts
  /** The prompt's worker header, composed where the agent launches with its project's rules. Absent: the prompt is sent as written. */
  worker: WORKER_REQUEST.optional(),
  ```
Edit `packages/orch/src/policy/spawner.ts`:
- `workerHeaderContextOf` returns `WorkerCallerContext` (import it from `../types/core.ts` in
  place of `WorkerHeaderContext` if that becomes unused), and its body loses
  `, ...workerRules(settings)`. Drop `workerRules` from the `../worker-prompt.ts` import. Its
  doc comment becomes "The header context a caller sends with work for a worker. orchd adds
  the worker's project rules."
Edit `packages/orch/src/types/command.ts` L15: `context?: WorkerHeaderContext;` becomes
`context?: WorkerCallerContext;`, with the import changed to match.
Edit `packages/orch/src/commands/spawn/report.ts` `dispatchSpawnPrompts` (about L161): the
context object loses `, ...workerRules(settingsFile)`. Drop `workerRules` from its import.
Verify: packages/orch/src/types/core.ts packages/orch/src/daemon/client/protocol.ts packages/orch/src/policy/spawner.ts packages/orch/src/types/command.ts packages/orch/src/commands/spawn/report.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 orchd composes on the agent's host, for a dispatch and a peer dispatch
Create `<server>/worker-header.ts`:
```ts
// The worker header orchd puts on work for an agent it runs, with the rules of the agent's project.
import { getAdapter } from "../../adapters/registry.ts";
import { validProjectSettings, type ProjectSettings } from "../../settings/project.ts";
import { workerPrompt, workerRules } from "../../worker-prompt.ts";
import { storedHeaderContext } from "./agent-policy.ts";
import type { WorkerRequest } from "../client/protocol.ts";
import type { WorkerHeaderContext } from "../../types/core.ts";
import type { DaemonState } from "./state.ts";

/** `text` wrapped in the worker header for `agentId`: the caller's context, what the store holds
 *  about the agent, and the verify and gated commands of `project`. An invalid project file
 *  refuses the work, naming the file and the key. */
export function workerText(state: DaemonState, agentId: string, project: ProjectSettings, text: string, worker: WorkerRequest, extra: Pick<WorkerHeaderContext, "readOnly"> = {}): string {
  const adapter = worker.harness === null ? undefined : getAdapter(worker.harness);
  const rules = workerRules(validProjectSettings(project));
  return workerPrompt(text, false, adapter, { ...worker.context, ...storedHeaderContext(state.directory, agentId), ...extra, ...rules });
}
```
Check that `getAdapter` is what `<server>/handlers/write.ts` imports for `dispatch` today, and
import it from the same module; fix the import path to match.
Edit `<server>/handlers/write.ts`:
- `writeText(state, action, params)` (about L307) gains a fourth parameter
  `worker: WorkerRequest | undefined = undefined`. Its `here` closure's
  `confirmTextWrite(state, action, agent, text, ...)` sends
  `worker === undefined ? text : workerText(state, agent.id, agentProjectSettings(state, agent.id), text, worker)`
  in place of `text`. Its `there` closure's
  `driveOnHost(state, link, { action, key, text, actor: params.actor ?? null })` becomes
  `driveOnHost(state, link, { action, key, text, actor: params.actor ?? null, ...(worker === undefined ? {} : { worker }) })`.
  If TypeScript refuses `worker` on the `steer` action there, build the request as
  `action === "dispatch" && worker !== undefined ? { action, key, text, actor, worker } : { action, key, text, actor }`.
- `dispatch(state, params)` (about L327) becomes:
  ```ts
  /** Work for an agent. A `worker` dispatch is wrapped in the worker header where the agent runs,
   *  with its project's rules; any other is sent as written. */
  export async function dispatch(state: DaemonState, params: ParamsOf<"dispatch">): Promise<Accepted> {
    return writeText(state, "dispatch", params, params.worker);
  }
  ```
- Import `workerText` from `../worker-header.ts`, `agentProjectSettings` from
  `../project-settings.ts`, `type WorkerRequest` from `../../client/protocol.ts`. Remove the
  imports that become unused (`getAdapter`, `workerPrompt`, `storedHeaderContext`).
Edit `<server>/handlers/drive.ts`, `peerDrive`'s `case "dispatch": case "steer":` (about L91):
split it so `dispatch` composes with this host's project rules:
```ts
case "dispatch": {
  const text = params.worker === undefined ? params.text : workerText(state, key, agentProjectSettings(state, key), params.text, params.worker);
  const { accepted, id, ack } = await confirmTextWrite(state, "dispatch", agent, text, () => undefined);
  return { action: "dispatch", accepted, id, ack };
}
case "steer": {
  const { accepted, id, ack } = await confirmTextWrite(state, "steer", agent, params.text, () => undefined);
  return { action: "steer", accepted, id, ack };
}
```
with the imports of `workerText` and `agentProjectSettings`.
Verify: packages/orch/src/daemon/server/worker-header.ts packages/orch/src/daemon/server/handlers/write.ts packages/orch/src/daemon/server/handlers/drive.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 A spawn's first prompt is composed where the agent launches
Edit `<server>/spawn/index.ts` `executeHeadlessSpawn`, the `spawnHeadless(state, { ... })`
call (about L130-155):
- The `prompt:` property becomes `prompt: plan.prompt?.trim() ? plan.prompt : null,`.
- Add after it:
  ```ts
  ...(plan.prompt?.trim() ? { worker: { harness: plan.adapter, context: { maySpawn, cwd, ...(worktree === undefined ? {} : { worktreeBranch: worktree.branch }), spawnerRepliable: self.id !== null } } } : {}),
  ```
  If `plan.adapter` is not an `AdapterId`, use the adapter id the `spawnHeadless` call already
  passes as `adapter:` and narrow it with `isAdapterId` from `../../../shared/harness.ts`,
  passing `null` when it is not one.
- Remove `workerPrompt` and `workerRules` from the imports if they become unused.
Edit `<server>/handlers/lifecycle.ts`:
- In `spawnHeadless` (about L61), replace `const prompt = params.prompt;` with:
  ```ts
  // The first prompt's header is composed here, where the agent runs, with its project's rules.
  const prompt = params.prompt === null || params.worker === undefined
    ? params.prompt
    : workerText(state, key, state.services.settingsFor(params.project), params.prompt, params.worker, params.workers?.readOnly ? { readOnly: params.workers.readOnly } : {});
  ```
  Place it before the `if (params.host !== undefined)` branch only if `prompt` is used there;
  otherwise leave it where `const prompt` is now. The linked-host branch passes
  `{ ...params, model }`, so it forwards the raw prompt and `worker`.
- In `spawnOnHost` (about L132), add `worker` to the destructured fields and to the
  `link.call("spawn-headless", { ... })` object: `...(params.worker === undefined ? {} : { worker: params.worker })`.
- Import `workerText` from `../worker-header.ts`.
If `ReadOnly` from `params.workers.readOnly` (`{ out: string | null }`) is not assignable to
`WorkerHeaderContext["readOnly"]`, report the exact error.
Verify: packages/orch/src/daemon/server/spawn/index.ts packages/orch/src/daemon/server/handlers/lifecycle.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The claude hook gates with its project's lists
Edit `packages/orch/extensions/claude/index.ts`, `gateToolCall` (about L86):
```ts
/** PreToolUse prints what the tool gate decides. Printing nothing lets the call run as it is.
 *  The lists are this project's, read at this call: a project file changed since the last call applies. */
function gateToolCall(): void {
  const gate = projectSettings(projectRoot(), fileSettingsManager(orchDir)).settings;
  const output = preToolUse(input, gate, readOnlyGate(process.env, textValue(input.cwd) ?? process.cwd(), CLAUDE_TOOLS));
  if (output !== undefined) process.stdout.write(JSON.stringify(output));
}
```
Import `projectSettings` from `orch/core/settings/project.ts` and `fileSettingsManager` from
`orch/core/settings/manager.ts`, the way this file imports its other `orch/core/...` modules
(match the prefix the file already uses for `projectRoot`). If `OrchSettings` is not assignable
to `preToolUse`'s `GateSettings` parameter, report the exact error.
Check `packages/orch/src/agent/tools.ts` L298-313, the pi bridge's `tool_call` handler: it must
read `gatedPatterns(<settings manager>.current())` at each call, through the manager the bridge
was registered with (now a project view that reads the project file at each `current()`). If it
reads a value held from registration instead of calling `.current()` at the call, change it to
call `.current()` at the call. Report which it was.
Verify: packages/orch/extensions/claude/index.ts packages/orch/src/agent/tools.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
