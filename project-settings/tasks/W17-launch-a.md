# W17: every launch builds its policy through prepareLaunch

Context. Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. These already exist and typecheck:
- `packages/orch/src/daemon/server/launch-policy.ts` exports
  `prepareLaunch(state, request, refusal): Promise<LaunchPolicy>` and `launchPolicy(services, request, refusal): LaunchPolicy`,
  where `request` is `{ adapter: AgentAdapter; project: string; model: string | undefined; name: string; readOnly: ReadOnly | null }`
  and `refusal` is `(message: string) => Error`.
- `LaunchPolicy` (type, `packages/orch/src/types/policy.ts`) is `{ workers, tools, env, preferredModels }`.
- `launchCommand(adapter: AgentAdapter, launch: LaunchPolicy, tuning: { model?: string; thinking?: ThinkingLevel }, orchDir: OrchDir | null): string`
  in `packages/orch/src/daemon/server/spawn/models.ts`. `policyCommand` and `adapterCommand` are deleted.
- `SpawnAgentPlan` (`spawn/plan.ts`) no longer has `workers` or `preferredModels`; it has `readOnly: ReadOnly | null` and `cmd: string | null`.
- `TabSpawnSpec` (`types/command.ts`) has `launch: LaunchPolicy` in place of `tools`, `workers`, `preferredModels`.
- `PreparedAgent` has `launch: LaunchPolicy`.
- `spawnEnv(orchDir, key, adapter, form, launch: LaunchPolicy)` in `spawn/placement.ts`.
- `growFleetIntoGroup(services, settings, place, launches: ReadonlyMap<string, LaunchPolicy>, backend, names, self, role, notes, prepareTerminal)`.
- `admitSpawn(directory, self, settingsFile, settings, logger, catalogue)` (no install argument any more).

## T1 Spawn call sites
Edit `packages/orch/src/daemon/server/spawn/index.ts`:
- Imports: add `import { launchPolicy, prepareLaunch } from "../launch-policy.ts";` and add `LaunchPolicy` to a type import from `../../../types/policy.ts`. In the `./models.ts` import replace `adapterCommand` with `launchCommand`. Delete the `withLaunchPoints` import. From the `../../../policy/workers.ts` import delete every name that is no longer used after the edits below (likely all three: delete the line if empty). Delete the `installSettings` import if unused. Delete `offeredModels` from the models import if unused.
- `executeHeadlessSpawn`, inside the `for (const name of names)` loop: right after `const adapter = resolveAdapterOrDie(plan.adapter);` add
  `const project = projectDirectory(state.directory, self.id, settings.cwd);`
  and change the local-host `prepareWorkspace(...)` call's last argument from `plan.cmd` to
  `plan.cmd ?? launchCommand(adapter, launchPolicy(services, { adapter, project, model: plan.model, name, readOnly: plan.readOnly }, (message) => new SpawnRefusalError(message)), plan, null)`.
  In the `spawnHeadless(state, { ... })` object: `project:` becomes `project,`; delete the `preferredModels: [...plan.preferredModels],`, `tools: policyTools(plan.workers),`, `workers: plan.workers,` and `env: policyEnv(adapter, plan.model, plan.workers),` lines; add `readOnly: plan.readOnly,`.
- `prepareAgents`: make it `async function prepareAgents(state: DaemonState, settings: SpawnSettings, names: readonly string[], project: string): Promise<PreparedAgent[]>`. Loop body becomes:
  ```ts
      const plan = planFor(settings, name);
      const adapter = resolveAdapterOrDie(plan.adapter);
      const launch = await prepareLaunch(state, { adapter, project, model: plan.model, name, readOnly: plan.readOnly }, (message) => new SpawnRefusalError(message));
      const { cwd, worktree } = prepareWorkspace(settings.cwd, settings.worktree, name, adapter, plan.cmd ?? launchCommand(adapter, launch, plan, null));
      const key = mintAgentId();
      const env = spawnEnv(state.directory, key, adapter, plan.form, launch);
      prepared.push({ name, cwd, key, launch, env, worktree, handle: undefined });
  ```
  Update its doc comment to say each agent's launch is prepared here, before any place opens.
- `spawnIntoNewTab`: `const prepared = await prepareAgents(state, settings, names, projectDirectory(state.directory, self.id, settings.cwd));`
- `launchPrepared`, in the `spawnOneIntoTab(...)` spec: replace `form: plan.form, model: plan.model, thinking: plan.thinking, preferredModels: plan.preferredModels,` and the next line `tools: ..., workers: ..., cmd: settings.commandFlag ? plan.cmd : undefined,` with
  `form: plan.form, model: plan.model, thinking: plan.thinking, launch: item.launch,` and `...(plan.cmd === null ? {} : { cmd: plan.cmd }),`.
- `spawnAgents`: in the `admitSpawn(...)` call delete the `installSettings(state), ` argument.
- `spawnPartition`, in the `if (existing) {` block, before the `growFleetIntoGroup` call, add:
  ```ts
    const project = projectDirectory(state.directory, self.id, settings.cwd);
    const launches = new Map<string, LaunchPolicy>();
    for (const name of names) {
      const plan = planFor(settings, name);
      const adapter = resolveAdapterOrDie(plan.adapter);
      launches.set(name, await prepareLaunch(state, { adapter, project, model: plan.model, name, readOnly: plan.readOnly }, (message) => new SpawnRefusalError(message)));
    }
  ```
  and pass `launches` as the 4th argument of `growFleetIntoGroup`, right after the `{ space, workspace: placement.workspace, group: existing.id }` argument.
- `tileAgent`: replace the lines from `const preferredModels = ...` through `const workers = withLaunchPoints(...);` with:
  ```ts
  const intent = worktreeIntent(params.worktree, settingsFile);
  const project = projectDirectory(state.directory, self.id, params.cwd);
  const launch = await prepareLaunch(state, { adapter, project, model, name: agent.name, readOnly: null }, (message) => new SpawnRefusalError(message));
  const command = params.cmd ?? launchCommand(adapter, launch, { model, thinking: agent.thinking }, null);
  const { cwd, worktree } = prepareWorkspace(params.cwd, intent, agent.name, adapter, command);
  ```
  In the `spec` object: `project: projectDirectory(...)` becomes `project,`; delete `tools: policyTools(workers),`, `workers,`, `preferredModels,` and the comment line above `tools`; add `launch,` after `model,`.
Verify: packages/orch/src/daemon/server/spawn/index.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 spawn-headless takes only the read-only request
Edit `packages/orch/src/daemon/client/protocol.ts`, the `"spawn-headless": GOVERNANCE.extend({` params (near L711):
- Delete the lines `env: z.record(z.string(), z.string()).optional(),`, `preferredModels: z.array(nonBlank).optional(),`, `tools: optionalText,`, `workers: workerPolicy.optional(),`.
- Add, after the `project: nonBlank,` line:
  ```ts
    /** Set for a read-only agent: the request. The host that launches builds its policy from its project. */
    readOnly: SPAWN_AGENT.shape.readOnly,
  ```
- If `workerPolicy` (the `const workerPolicy = z.object({...}) satisfies z.ZodType<WorkerPolicy>;` near L115) has no other use in the file after this, delete it, and delete `WorkerPolicy` from its type import if then unused.
Edit `packages/orch/src/daemon/server/handlers/lifecycle.ts`:
- Add `import { prepareLaunch } from "../launch-policy.ts";` and `import { CommandRefusal } from "../../../refusal.ts";` if not imported.
- In `spawnHeadless`, right after the `if (params.host !== undefined) { ... return spawnOnHost(...); }` block, add:
  ```ts
  // The host that starts the process builds the launch's policy from its own project; the asking host sends only the read-only request.
  const launch = await prepareLaunch(state, { adapter, project: params.project, model, name: params.name, readOnly: params.readOnly }, (message) => new CommandRefusal(message));
  ```
- In the `workerText(...)` call, replace `params.workers?.readOnly ? { readOnly: params.workers.readOnly } : {}` with `params.readOnly === null ? {} : { readOnly: params.readOnly }`.
- In the `opts: BackendSpawnOpts` object: `env: params.env,` becomes `env: launch.env,`; `preferredModels: params.preferredModels,` becomes `preferredModels: launch.preferredModels,`; `tools: params.tools,` becomes `tools: launch.tools,`; `workers: params.workers,` becomes `workers: launch.workers,`. Keep the comment above preferredModels.
- In `spawnOnHost`: the destructure becomes `const { key, name, spawner, adapter, model, thinking, prompt, worker, cwd, readOnly, form } = params;` and the `link.call("spawn-headless", { ... })` object drops `env, preferredModels, tools, workers` and gains `readOnly`.
Verify: packages/orch/src/daemon/client/protocol.ts packages/orch/src/daemon/server/handlers/lifecycle.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Lookup: the restart and relaunch paths
Read these files and write `project-settings/findings/L22-restart-paths.md`. Answer each item with file:line and the code quoted:
1. `packages/orch/src/daemon/server/handlers/restart-form.ts`: the full text of `restartOpts`, and every caller of it (file:line, the enclosing function, and whether that function is async).
2. `packages/orch/src/daemon/server/handlers/relaunch.ts`: the full text of `planRelaunch`, `restartAttached`, `relaunchInPlace`, `restartInForm`, `restartHere`, `reloadHere`, and every `refreshStaleShims` call with its line.
3. `packages/orch/src/daemon/server/agent-policy.ts`: every caller of `relaunchPolicy` in the repo (`grep -rn relaunchPolicy packages/orch/src packages/orch/test`).
4. `packages/orch/src/daemon/server/terminal-relaunch.ts`: every caller of `relaunchPlace` and `relaunchTerminal` in `packages/orch/src` (file:line, enclosing function), and for each, what `BackendSpawnOpts` or launch opts are in scope there, if any.
5. `packages/orch/src/daemon/server/held.ts`: the full text of `relaunchPid` and of the function that starts a held PTY with an env (how the env reaches the PTY). `packages/orch/src/backends/held/index.ts`: the full text of `heldLaunchEnv` and `heldRelaunch`.
6. `packages/orch/src/daemon/server/session-agents.ts` around L240-270: the function that calls `relaunchTerminal`, quoted whole.
Write nothing else. Report: one line, "done: project-settings/findings/L22-restart-paths.md".
