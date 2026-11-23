# W22: the spawn plan previews each local agent's command, as the plan says

Read `project-settings/claude-worker-policy.md`, the "Previews" bullets under Part A (search `policyOf`). Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. The four tasks land together: until all four are in, `bun check` fails in the other tasks' files, and that is a `pending`, not a block.

The end state every task builds against:
- `planSpawn(params: ParamsOf<"spawn">, settings: OrchSettings, chosen: Backend | undefined, policyOf: (agent: ParamsOf<"spawn">["agents"][number]) => LaunchPolicy): SpawnSettings` in `packages/orch/src/daemon/server/spawn/plan.ts`.
- `LocalSpawnAgentPlan.cmd: string`: `--cmd` as given, else `shellLine(launchArgv(adapter, policyOf(agent), { model, thinking }, null))`. `FarSpawnAgentPlan.cmd: null`. `SpawnAgentCommon` has no `cmd`. A local plan always calls `policyOf`, so a refusal there refuses the spawn before anything is made. A far plan never calls it.
- Only a `--cmd` line reaches the backend: a place's spec takes `cmd` when `settings.commandFlag` is true.
- `admitSpawn(settings: SpawnSettings): void` in `admission.ts` checks host memory and the name prefix. `admitSpawnModels(params, settingsFile, catalogue): ParamsOf<"spawn">` expands each local agent's model before the plan. `spawnAgents` runs `assertSpawnPolicy` before both.

## T1 The plan carries the preview
Edit `packages/orch/src/daemon/server/spawn/plan.ts`:
- Imports: delete `import { requireReadOnlyAble } from "../launch-policy.ts";`. `import { errorMessage } from "../../../util.ts";` becomes `import { errorMessage, shellLine } from "../../../util.ts";`. `import { resolveAdapterOrDie } from "./models.ts";` becomes `import { launchArgv, resolveAdapterOrDie } from "./models.ts";`. `import type { ThinkingLevel } from "../../../types/policy.ts";` becomes `import type { LaunchPolicy, ThinkingLevel } from "../../../types/policy.ts";`.
- In `SpawnAgentCommon`, delete the `cmd` field and its doc line.
- `LocalSpawnAgentPlan` becomes:
  ```ts
  export interface LocalSpawnAgentPlan extends SpawnAgentCommon {
    readonly form: FormId;
    /** What this agent launches under, for the trust check and the preview: `--cmd`, or its
     *  harness's argv on its project's policy, built with no orchDir. Only a `--cmd` line reaches
     *  the backend. */
    readonly cmd: string;
  }
  ```
- `FarSpawnAgentPlan` gains, after `form`:
  ```ts
    /** The linked host builds this agent's command; nothing here previews it. */
    readonly cmd: null;
  ```
- `planSpawn`: the signature becomes `export function planSpawn(params: ParamsOf<"spawn">, settings: OrchSettings, chosen: Backend | undefined, policyOf: (agent: ParamsOf<"spawn">["agents"][number]) => LaunchPolicy): SpawnSettings {`. The `params.agents.map` callback becomes:
  ```ts
    const agents = params.agents.map((agent): SpawnAgentPlan => {
      const common = { requestedForm: params.form, name: agent.name, adapter: agent.harness, model: agent.model, thinking: agent.thinking, prompt: agent.prompt, backend, readOnly: agent.readOnly };
      // A far agent's policy and command are built on its host, which refuses what it cannot run.
      if (params.host !== null) return { ...common, form: null, cmd: null };
      const adapter = resolveAdapterOrDie(agent.harness);
      // Its policy refuses a harness that cannot run it read-only, here, before anything is made.
      const launch = policyOf(agent);
      const cmd = params.cmd ?? shellLine(launchArgv(adapter, launch, { model: agent.model, thinking: agent.thinking }, null));
      return { ...common, cmd, ...selectSpawnForm(params.form, settings.defaults.forms, adapter, backend, heldBackend) };
    });
  ```
- Add to the end of the doc comment above `planSpawn` one line: `` `policyOf` gives a local agent's launch policy for its preview; a far agent's is built on its host. ``
Verify: `bun check`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Admission checks what the plan cannot
Edit `packages/orch/src/daemon/server/spawn/admission.ts`:
- Replace the whole `admitSpawn` function and the doc comment above it with:
  ```ts
  /** Each local agent's model admitted, before the plan: a short name comes back expanded, so the
   *  plan's preview and every launch run the spec the harness receives. A linked host admits its
   *  own agents' models. */
  export function admitSpawnModels(params: ParamsOf<"spawn">, settingsFile: OrchSettings, catalogue: ModelCatalogue): ParamsOf<"spawn"> {
    if (params.host !== null) return params;
    return { ...params, agents: params.agents.map((agent) => ({ ...agent, model: admitLaunchModel(settingsFile, agent.harness, catalogue, agent.model) })) };
  }

  /** What refuses a planned spawn before it creates anything: the host's memory and the name
   *  prefix. A refused spawn leaves no handle, no worktree and no queue entry. Depth and pack size
   *  refused before the plan (`assertSpawnPolicy`). */
  export function admitSpawn(settings: SpawnSettings): void {
    // Memory is the limit of the host the agents run on; a linked host's orchd checks its own.
    if (settings.host === null) assertHostMemory(settings);
    // A plexer may reject an invalid prefix, so no placement side effect may precede it.
    try {
      assertValidAgentName(settings.prefix);
    } catch (error: unknown) {
      throw new SpawnRefusalError(errorMessage(error));
    }
  }
  ```
- `import type { ResultOf } from "../../client/protocol.ts";` becomes `import type { ParamsOf, ResultOf } from "../../client/protocol.ts";`.
- Delete any import the lint then reports unused in this file.
Verify: `bun check`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The spawn paths use the plan's preview
Edit `packages/orch/src/daemon/server/spawn/index.ts`:
- Import `admitSpawnModels` from `./admission.ts` in the existing import from that file.
- In `spawnAgents`, the lines from `const project = services.settingsFor(...)` through `const settings = admitSpawn(...)` become:
  ```ts
    const projectDir = projectDirectory(state.directory, self.id, params.cwd);
    const project = services.settingsFor(projectDir);
    const settingsFile = params.agents.some((agent) => agent.prompt?.trim()) ? validProjectSettings(project) : project.settings;
    // Provenance depth and pack size refuse first: before a model is admitted, a backend is
    // resolved or any space is allocated.
    const { views, presence } = liveFleet(state.directory);
    assertSpawnPolicy(settingsFile, params.space ?? self.space, params.agents.length, views, presence, self.id);
    const environment = callerEnvironment(self);
    const notes: SpawnNotes = [];
    const requested = plexerRequest(params, settingsFile);
    const chosen = params.host === null
      ? spawnBackend(services.logger, { backend: requested.backend.id, space: params.space, backendChosen: requested.backendChosen }, environment.plexer, notes)
      : requested.backend;
    const policyOf = (agent: ParamsOf<"spawn">["agents"][number]): LaunchPolicy => launchPolicy(services, { adapter: resolveAdapterOrDie(agent.harness), project: projectDir, model: agent.model, name: agent.name, readOnly: agent.readOnly }, (message) => new SpawnRefusalError(message));
    const settings = planSpawn(admitSpawnModels(params, settingsFile, services.models), settingsFile, chosen, policyOf);
    admitSpawn(settings);
  ```
  Keep what follows (`const partitions = ...`) as it is.
- In `executeHeadlessSpawn`'s loop, delete `const adapter = resolveAdapterOrDie(plan.adapter);` and make the workspace lines:
  ```ts
      // On another host, --dir names a directory there: nothing here is made or trusted for it.
      const { cwd, worktree } = plan.form === null
        ? { cwd: settings.cwd, worktree: undefined }
        : prepareWorkspace(settings.cwd, settings.worktree, name, resolveAdapterOrDie(plan.adapter), plan.cmd);
  ```
  If `adapter` is used further down that loop, keep the const and pass `adapter` instead.
- In `prepareAgents`: `const plan = planFor(settings, name);` becomes `const plan = localAgentPlan(planFor(settings, name));`, and the `prepareWorkspace(...)` call's last argument becomes `plan.cmd`.
- In `launchPrepared`: `...(plan.cmd === null ? {} : { cmd: plan.cmd }),` becomes `...(settings.commandFlag ? { cmd: plan.cmd } : {}),`.
Edit `packages/orch/src/daemon/server/spawn/placement.ts`, in `placeAgent`:
- The `prepareWorkspace(...)` call's last argument becomes `plan.cmd`.
- `...(plan.cmd === null ? {} : { cmd: plan.cmd }),` becomes `...(settings.commandFlag ? { cmd: plan.cmd } : {}),`.
- Delete the imports of `shellLine` and `launchArgv` if nothing else in the file uses them.
Verify: `bun check`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The plan tests
Edit `packages/orch/test/commands-spawn.test.ts`:
- Imports: add `import { testLaunch } from "./helpers/launch.ts";`, `import { shellLine } from "../src/util.ts";` and `import { launchArgv, resolveAdapterOrDie } from "../src/daemon/server/spawn/models.ts";`.
- `planned` returns `planSpawn(resolveSpawnSettings(flags, settings).params, settings, undefined, () => testLaunch());`.
- In "one --harness per name launches each agent on its own harness", the comment and assertion at the end become:
  ```ts
      // A local plan carries the command each agent launches under, previewed on its policy with no orchDir.
      expect(settings.agents.map((agent) => agent.cmd)).toEqual(settings.agents.map((agent) => shellLine(launchArgv(resolveAdapterOrDie(agent.adapter), testLaunch(), agent, null))));
      expect(settings.agents[0]?.cmd).toStartWith("'pi' ");
  ```
- Add after that test:
  ```ts
    test("--cmd is the plan's command as given", () => {
      const dir = tempOrchDir("orch-spawn-cmd-");
      tempDirs.push(dir);
      expect(planned(parseSpawnFlags(["a", "--harness", "pi", "--cmd", "pi --x"]), mixedSettingsFor(dir)).agents[0]?.cmd).toBe("pi --x");
    });

    test("a local agent whose policy refuses is refused at plan time", () => {
      const dir = tempOrchDir("orch-spawn-policy-refused-");
      tempDirs.push(dir);
      const settings = mixedSettingsFor(dir);
      const params = resolveSpawnSettings(parseSpawnFlags(["a", "--harness", "pi"]), settings).params;
      expect(() => planSpawn(params, settings, undefined, () => { throw new Error("refused by policy"); })).toThrow("refused by policy");
    });
  ```
Edit `packages/orch/test/spawn-viewers.test.ts`:
- Imports: add `import { testLaunch } from "./helpers/launch.ts";` and `import type { LaunchPolicy } from "../src/types/policy.ts";`.
- Above `farSpawn`, add:
  ```ts
  /** A far agent's policy is built on its host: planning one here must not ask for it. */
  const farPolicy = (): LaunchPolicy => { throw new Error("a far agent's plan built a policy here"); };
  ```
- `farSpawn`'s `planSpawn(..., settings)` gains `, undefined, farPolicy` after `settings`.
- `localSpawn`'s `planSpawn(..., settings, backend)` gains `, () => testLaunch()` after `backend`.
Verify: `bun check`, then `bun test packages/orch/test/commands-spawn.test.ts packages/orch/test/spawn-viewers.test.ts` once from the root.
If an expected value is off, put what you got in your report line and stop; do not change the source.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".
