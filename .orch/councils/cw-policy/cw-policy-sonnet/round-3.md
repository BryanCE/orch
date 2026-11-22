Score: 7/10

## Improvements

1. Fix the table row for a spawn into a tab. As written it cannot be built. The row says `spawnOneIntoTab` calls `prepareLaunch` and builds `spawnOptsOf` and `spawnEnv` from the result. Three facts in the source break that:
   - A fleet's panes are opened with their env before `spawnOneIntoTab` runs. `prepareAgents` (`spawn/index.ts:175-191`) calls `spawnEnv(state.directory, key, adapter, plan.form, plan.model, plan.workers)` and keeps it in `PreparedAgent.env`. `createSpawnGroup` opens the root place with `env: root.env` (`:198`), `placeRemainingAgents` opens the others with `env: item.env` (`:217`), and `launchPrepared` passes `env: item.env` back into the spec (`:257`). For `orch spawn` into a new tab the policy env therefore has to be resolved in `prepareAgents`, before any group or pane exists. `prepareAgents` is a synchronous function and `prepareLaunch` is async. Say that `prepareAgents` becomes async and calls `prepareLaunch` per agent, that `PreparedAgent` carries the `LaunchPolicy`, and that `spawnOneIntoTab` takes the policy from the spec in that path. A failed refusal there must still discard the worktrees, which the existing `catch` does.
   - `spawnOneIntoTab`, `tileAgentIntoGroup`, `placeAgent` and `growFleetIntoGroup` take `DaemonContext` (`orchDir`, `settings`, `logger`), not `DaemonState` (`placement.ts:175,202,227,262`). `prepareLaunch(state, ...)` needs `installSettings(state)`, and `launchPolicy` needs `settingsFor` and `models`. Say that these functions take `DaemonState`, or `DaemonServices`, and that the callers at `spawn/index.ts:249,387,450` change.
   - So the row has two cases: a new tab resolves in `prepareAgents`, and an existing tab or `tileAgent` resolves in `spawnOneIntoTab`. Say which, and where `TabSpawnSpec.env` and `.workers` are dropped.

2. Keep the refresh in `reloadHere`. The plan says "The calls at `relaunch.ts:91` and `:211` go too". Line 91 is `reloadHere`: `await refreshStaleShims(...)` before `verbAndAwaitBridge(state, agent, "reload", null)`. A reload is not a launch. It sends text to a running agent, and its doc comment says it exists to pick up new code. Removing the call means `orch reload` no longer redeploys a stale shim. Export the refresh as its own function, for example `refreshShim(state, adapter)`, from `launch-policy.ts`. `prepareLaunch` calls it, and `reloadHere` calls it too. Only the line-211 call goes. Also say that the line-211 refresh is for `request.harness`, which `relaunchTarget` now covers through the planned adapter.

3. Make the writer's Windows tolerance safe. Part D has one `writeWorkerSettings` shared by the install file and the worker files. It says the writer drops its temp file on `EPERM` or `EBUSY` "because the name proves the bytes". That holds only for a content-named file. For the install file, a swallowed rename would report a sync or setup as written when nothing changed, and the next launch would copy stale hooks. A real permission error on a worker file's directory also leaves the launch pointing at a file that does not exist. Settle both:
   - Put the tolerance in `workerSettingsFile` only, or give the writer a flag that the content-named caller sets.
   - Before it goes on, it checks that the target exists and rethrows otherwise. An existence check is not a read that decides state, and the plan should say so for Rule 18.
   - Test the install-file write with a failing rename, and expect a throw.

4. Name every test the changes break, so the engineer is not surprised. The plan names `commands-spawn.test.ts:14`, `spawn-viewers.test.ts:100` and `:201`, and `commands-lifecycle.test.ts:104`. It misses these:
   - `spawn-preferred-models.test.ts:185` and `:189` call `adapterCommand`, which the plan deletes.
   - `spawn-preferred-models.test.ts:224-233` assert that `preferredModels` is accepted and that wrong types are rejected on `spawn-headless`. After the field is dropped, zod strips the unknown key, so the three rejection cases at `:231-233` pass `success: true` and the test fails. Rewrite them around `readOnly`.
   - `test/helpers/rpc-handlers.ts` stubs the method, and any fixture that builds a `spawn-headless` request needs `readOnly` and loses `env`, `tools`, `workers` and `preferredModels`.
   - Anything that builds a `TabSpawnSpec` with `workers`, `tools` or `preferredModels`.
   A single sentence, "the compiler finds the rest", is enough for the last item, but the schema test at `:224-233` fails silently and has to be named.

5. State how the far host builds `BackendSpawnOpts`, since the request no longer carries the fields. `spawnHeadless` today copies `env`, `tools`, `workers` and `preferredModels` from `params` into `opts` (`lifecycle.ts:89-106`). Say that every one of them comes from the `LaunchPolicy`, including the quicklist, and that the far host's launch env is `launchPolicy.env` and nothing else. Also say that `prepareLaunch` runs after the `params.host !== undefined` branch that forwards to `spawnOnHost`. The asking host must not refresh a shim or resolve a policy for an agent it does not run. The table says "for every launch", and this is the one launch that must not call it.

6. Smaller points:
   - A fleet of N agents refreshes the shim N times, since `prepareLaunch` replaces the one admission refresh. `diagnoseShim` reads the install file each time. Say that it is accepted, or have `prepareLaunch` skip a second refresh for the same adapter within one spawn.
   - The plan puts the Rule 17 position in words, but `workerSettingsFile` still has the literal `"workers"` inline. Keep the constant next to `claudeSettingsPath` in `claude-hooks.ts`, so the layout lives in one file.
   - Part C says a pane restart still needs a restart text from the harness. Claude declares none, so for Claude only the relaunching-role path runs. Say so, and say that G3 is therefore a bug on that path only.

7. Where I agree and disagree with the other members.
   - I agree with Sol #1 and Opus #1 on the env leak. The plan's answer is the better one: the far host takes only `readOnly`, and an overlay leaves keys behind.
   - I agree with Sol #3 and Opus #3 on a tagged read result. The plan now has it, and test 9, the fresh setup, covers the case I raised in round 2.
   - I agree with Opus #2 on the import cycle. The plan puts the module in `daemon/server` with one message, which is the right fix.
   - I disagree with Opus #4 that one call at the top of `restartHere` is better. `restartOpts` and `planRelaunch` need the policy anyway, so each path resolves once through `prepareLaunch`, and a second call would only refresh twice.
   - I disagree with Sol #5, quoting only for Claude. The plan is right that this is the backend's boundary. One caveat: `createInteractiveCommand` joins the adapter's own `interactiveCmd` string, so the backend cannot quote an argv it never sees. The plan's sentence that the quoting belongs "where `backends/backend.ts` already quotes `program`" is only partly true, and it should say that the fix needs backends to take argv. That remains out of scope.
   - I agree with Sol #2 on restart semantics. Part C now says what a restart keeps and does not claim support the harness lacks.
