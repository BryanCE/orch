Score: 7/10

The rewrite closes every round-2 item of mine:
- The wire no longer leaks env.
- The refusal is built in `daemon/server`, so there is no cycle.
- The reader returns a tagged result, and setup still creates the file from nothing.
- `planSpawn`'s new parameter and the tests it touches are named.
- `adapterCommand` is deleted.
- `relaunchTarget` is split out.

I checked the G4 claim and the `spawn-headless` schema against the source, and both hold. The score stays at 7 because of the most common launch, a spawn into a tab. The table in Part A puts `prepareLaunch` where it cannot run, and in the wrong order for the pane's env.

Where I stand on the other round-2 reviews:
- Sonnet's items 1 to 6 are all taken, and I agree with each of them.
- I agree with Sol #1 to #4. They are taken.
- I disagree with Sol #5, the Claude-only quoting. Quoting belongs at the backend's shell boundary for every harness. `createInteractiveCommand` already quotes `program` there, and a Claude-side fix would be harness code doing a backend's job.
- I agree with Sol that passing `orchDir` does not prove restart behaviour. Part C now says what a restart in place keeps, but see item 3.

## Improvements

1. Put a tab spawn's `prepareLaunch` where it can run, and before the pane opens. The table says `spawnOneIntoTab` calls `prepareLaunch` and builds `spawnEnv` from the result. Two facts in the source break that:
   - `spawnOneIntoTab(services: DaemonContext, spec)` (`spawn/placement.ts:175`) gets `orchDir`, `settings` and `logger` only (`types/services.ts:63`). It has no `settingsFor`, no `models` and no `DaemonState`, so it cannot call `prepareLaunch(state, …)`.
   - For `orch spawn` into a tab, the pane's env is fixed before `spawnOneIntoTab` runs. `prepareAgents` (`spawn/index.ts:175-192`) builds `env = spawnEnv(..., plan.workers)`. That env goes to `groupHome.create` (`:198`) and `placement.open` (`:217`), and reaches `spawnOneIntoTab` as `spec.env`, which wins over the `spec.env ?? spawnEnv(...)` fallback (`placement.ts:180`). After `plan.workers` is gone, an engineer who follows the table sees nothing fail. A tab-spawned agent silently loses its compaction env, and its read-only env too.

   Say instead:
   - `prepareAgents` becomes async and calls `prepareLaunch` once per agent. It stores the `LaunchPolicy` on `PreparedAgent` and builds `env` from it.
   - `tileAgent` calls `prepareLaunch` itself before it opens the place.
   - `TabSpawnSpec` carries the resolved `launch: LaunchPolicy` in place of `workers`, `tools`, `preferredModels` and the `readOnly` the plan proposes. `spawnOneIntoTab` keeps its `DaemonContext` signature, resolves nothing, and builds `spawnOptsOf` and the `spec.env` fallback from `spec.launch`. `registerSpawnedTabAgent` reads `spec.launch.workers.readOnly`.

   Add a core test: a tab spawn whose project sets a compaction point, where the env given to `placement.open` and `groupHome.create` holds that point.

2. Say where `prepareLaunch` goes in `spawnHeadless`. "`spawnHeadless` calls `prepareLaunch` with `params.readOnly`, for every launch" includes the asking side of a linked-host spawn. There `params.host !== undefined` and the agent does not run here. Put the call after the `params.host` branch (`handlers/lifecycle.ts:75-78`), so only the host that starts the process refreshes and resolves. Also list every sender of `spawn-headless` and confirm that none uses `env` for anything but `policyEnv`. `executeHeadlessSpawn` and `spawnOnHost` are the two senders this review found, and dropping the field drops any other use silently. Reuse the zod schema that `workerPolicy` already holds for `readOnly` instead of writing `{ out: string | null } | null` again, per Rule 16.

3. Bring a restart in place under ruling 2, or say why it cannot be. Part C accepts that a restart in place keeps the old launch's env, so a project's compaction window does not reach a restarted agent until its next spawn or form switch. Ruling 2 names restarts as launches whose policy comes from their project. Say which `RelaunchRole`s can take an env today and pass `LaunchPolicy.env` to those. The fallback that types into a pane is the one place it cannot reach, and it stays out of scope there. If no role can take an env, say that in one sentence, and the out-of-scope line then stands.

4. Make the Windows rename tolerance check the claim it relies on. "The name proves the target already holds these bytes" is true only when the target exists. `EPERM` from an ACL problem, or `EBUSY` with no target, would pass Claude a path to a file that is not there. On `EPERM` or `EBUSY`, carry on only when `fs.existsSync(file)`, and rethrow otherwise. That checks existence and opens nothing, so Rule 18 is not touched. Add the case to test 8.

5. Use one model for the preview and the launch. `planSpawn`'s `policyOf` runs before `admitSpawn` expands the model through `admitLaunchModel` (`admission.ts:215`). `prepareLaunch` gets the expanded spec. The policy env and any compaction argument are keyed by model, so the previewed command can differ from the launched one. That breaks "a previewed command is the command the backend runs" (`spawn/models.ts:32-34`). Either expand the model before `policyOf`, or say that the preview is keyed by the requested name and may leave out a compaction argument.
