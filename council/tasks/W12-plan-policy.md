# W12: each agent's own policy on the spawn plan

Context. A spawn's worker policy is one value for the whole spawn today
(`SpawnSettings.tools`, `SpawnSettings.workers`). An agent launched with a write root needs a
policy of its own, so the policy moves onto each agent's plan. The wire field
`SPAWN_AGENT.writeRoot: string | null` exists, and so do these in
`packages/orch/src/policy/workers.ts`:
```ts
export function policyTools(policy: WorkerPolicy): string | undefined
export function workerPolicyFrom(settings: OrchSettings): WorkerPolicy
export function confinedPolicy(settings: OrchSettings, root: string, tools: ToolVocabulary): WorkerPolicy
export function policyEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>>
```
Every adapter has `toolVocabulary: ToolVocabulary | null`.
Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript, no `as` casts, no
`any`, double quotes, a `/** ... */` doc comment on every export.

Verify: run exactly these from the repo root, once, after the edits. Ignore any other verify
command your header names; it belongs to another project. Run no typecheck.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test packages/orch/test/worker-tools.test.ts packages/orch/test/commands-spawn.test.ts packages/orch/test/spawn-preferred-models.test.ts
```

## T14 The plan carries each agent's policy
Edit `packages/orch/src/daemon/server/spawn/models.ts`:
- The workers import (L6) becomes
  `import { policyTools, workerPolicyFrom } from "../../../policy/workers.ts";`, and add
  `WorkerPolicy` to the type import from `"../../../types/policy.ts"` (add that import if the
  file has none).
- Replace `adapterCommand` and its doc comment (L31-42) with:
  ```ts
  /** The command one harness launches a worker under for its policy, built by that harness's own
   *  adapter. `launch` carries what this launch selected: the model it starts on and the
   *  quicklist its picker shows. A previewed command is the command the backend runs. */
  export function policyCommand(
    adapter: string,
    workers: WorkerPolicy,
    launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {},
  ): string {
    const resolved = resolveAdapterOrDie(adapter);
    const opts = { ...launch, tools: policyTools(workers), workers };
    return resolved.workerLaunch?.restrictedInteractiveCmd(opts) ?? resolved.interactiveCmd(opts);
  }

  /** The command one harness launches a worker under for the policy the settings give. */
  export function adapterCommand(
    adapter: string,
    settings: OrchSettings,
    launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {},
  ): string {
    return policyCommand(adapter, workerPolicyFrom(settings), launch);
  }
  ```
Edit `packages/orch/src/daemon/server/spawn/plan.ts`:
- The workers import (L4) becomes
  `import { confinedPolicy, workerPolicyFrom } from "../../../policy/workers.ts";`.
- The models import (L7) becomes `import { policyCommand, resolveAdapterOrDie } from "./models.ts";`.
- Add `import { ADAPTER_IDS } from "../../../types/adapter.ts";` beside the existing type import
  from that module.
- `SpawnAgentCommon` gains a last member:
  ```ts
    /** What this agent may load, and the one directory it may write in when it has a write root. */
    readonly workers: WorkerPolicy;
  ```
- `SpawnSettings`: delete the members `tools` and `workers`.
- Above `planSpawn` add:
  ```ts
  /** The policy one agent launches under. A write root needs a harness whose integration can refuse a tool call. */
  function agentPolicy(settings: OrchSettings, agent: ParamsOf<"spawn">["agents"][number]): WorkerPolicy {
    if (agent.writeRoot === null) return workerPolicyFrom(settings);
    const tools = resolveAdapterOrDie(agent.harness).toolVocabulary;
    if (tools !== null) return confinedPolicy(settings, agent.writeRoot, tools);
    const able = ADAPTER_IDS.filter((id) => resolveAdapterOrDie(id).toolVocabulary !== null);
    throw new SpawnRefusalError(`${agent.harness} cannot hold ${agent.name} to a write root: orch has no way to refuse its tool calls. Launch it on one of: ${able.join(", ")}.`);
  }
  ```
- In `planSpawn`, inside the `params.agents.map` callback: add
  `const workers = agentPolicy(settings, agent);` as its first line, the `cmd` line calls
  `policyCommand(agent.harness, workers, { model: agent.model, thinking: agent.thinking, preferredModels })`
  in place of `adapterCommand(agent.harness, settings, { ... })`, and `common` gains `workers`.
- In the object `planSpawn` returns, delete `tools: workerTools(settings),` and
  `workers: workerPolicyFrom(settings),`.
Edit `packages/orch/src/daemon/server/spawn/admission.ts` (L218-223):
- The `const agents = ...` line becomes
  ```ts
  const offered = offeredModels(catalogue);
  const agents = settings.agents.map((agent) => ({ ...agent, model: admitLaunchModel(settingsFile, agent.adapter, catalogue, agent.model), workers: withLaunchPoints(agent.workers, offered) }));
  ```
- The return becomes `return { ...settings, agents };`.
Edit `packages/orch/src/daemon/server/spawn/index.ts`:
- Merge the two workers imports (L7, L9) into
  `import { policyEnv, policyTools, workerPolicyFrom } from "../../../policy/workers.ts";`.
- L146-148 become
  `tools: policyTools(plan.workers),`, `workers: plan.workers,`,
  `env: policyEnv(adapter, plan.model, plan.workers),`.
- L179: the last argument of `spawnEnv(...)` becomes `plan.workers`.
- L249: `tools: settings.tools, workers: settings.workers,` becomes
  `tools: policyTools(plan.workers), workers: plan.workers,`.
- In the tile handler, directly above `const spec: TabSpawnSpec = {` (L408), add
  `const workers = withLaunchPoints(workerPolicyFrom(settingsFile), offeredModels(services.models));`
  and L418-419 become `tools: policyTools(workers),` and `workers,`.
Edit `packages/orch/src/daemon/server/spawn/placement.ts` (L244-245):
`tools: settings.tools,` and `workers: settings.workers,` become
`tools: policyTools(plan.workers),` and `workers: plan.workers,`. Add `policyTools` to its
import from `"../../../policy/workers.ts"`.
Edit `packages/orch/src/policy/workers.ts`: delete `workerTools` and its doc comment.
Edit `packages/orch/test/worker-tools.test.ts`: every `workerTools(<x>)` becomes
`policyTools(workerPolicyFrom(<x>))`, and the import names `policyTools` in place of
`workerTools`.
Edit `packages/orch/test/commands-spawn.test.ts`: add one test inside the
`describe("--write-root", ...)` at the end of the file, getting `dir` and `settingsFor` the
way its neighbours do:
```ts
  test("an agent with a write root is planned under a policy of its own", () => {
    const dir = tempOrchDir("orch-spawn-root-plan-");
    tempDirs.push(dir);
    const plan = planned(parseSpawnFlags(["a", "b", "--harness", "pi", "--dir", "/repo", "--write-root", "out/a", "--write-root", "out/b"]), settingsFor(dir));
    expect(plan.agents.map((agent) => agent.workers.writeRoot)).toEqual(["/repo/out/a", "/repo/out/b"]);
    expect(plan.agents[0]?.workers.allowTools).toEqual(["read", "grep", "find", "ls", "edit", "write", "orch_ask"]);
    expect(planned(parseSpawnFlags(["a", "--harness", "pi"]), settingsFor(dir)).agents[0]?.workers.writeRoot).toBeNull();
  });

  test("a harness that cannot refuse a tool call is refused a write root", () => {
    const dir = tempOrchDir("orch-spawn-root-refused-");
    tempDirs.push(dir);
    expect(() => planned(parseSpawnFlags(["a", "--harness", "codex", "--write-root", "out"]), mixedSettingsFor(dir))).toThrow(/codex cannot hold a to a write root/);
  });
```
If `mixedSettingsFor(dir)` does not enable codex, report that in one line and leave the second
test out.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
