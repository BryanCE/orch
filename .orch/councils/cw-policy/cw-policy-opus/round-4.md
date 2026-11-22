Score: 8/10

The rewrite takes every round-3 finding of mine, and I checked each one against the source:
- `prepareAgents` resolves before any group or place opens.
- `TabSpawnSpec` carries `launch` and the placement functions keep `DaemonContext`.
- `spawnHeadless` resolves after the `params.host` branch.
- `readOnly` reuses `SPAWN_AGENT.shape.readOnly` (`protocol.ts:220`).
- The rename tolerance checks that the target exists.
- The preview is keyed by the expanded model.
- `RelaunchRole.relaunch` (`types/backend.ts:90`) and `heldRelaunch` (`backends/held/index.ts:99`) are named correctly.

One finding keeps the score at 8. The new env for a held restart in place, set out in Part C, is built from the wrong function. It would remove the held agent's environment stamp.

Where I stand on the other round-3 reviews:
- Sonnet #1 asks for the placement functions to take `DaemonState`. The plan chose to carry the resolved policy in the spec instead. I prefer that: the placement code stays free of resolution and of state.
- I agree with Sonnet #2 to #6. All of them are taken.
- I agree with Sol #2, that a restart must replace the env and not overlay it. The plan does that now, but see item 1.
- I disagree with Sol #3 that an existing content-named target proves nothing. The target is only ever written by a rename from a fully written temp file, so if it exists it holds the full bytes its name hashes. The existence check is enough.
- I disagree with Sol #5. The plan's revised out-of-scope entry is right: backends must take argv before they can quote it, and that is a change for every harness.

## Improvements

1. Build a held restart's env with the function a held spawn uses. Part C sets the relaunch env to `spawnEnv(orchDir, key, adapter, form, model, launch)`, and the new PTY gets "the host env plus this env, in place of the old PTY's env". `spawnEnv` is the env for a spawn into a tab: `LAUNCH_ENV`, `ORCH_DIR`, `policyEnv` and `terminalClientEnv` (`spawn/placement.ts:118-120`). A held PTY starts with something else: `heldLaunchEnv(opts)`, which is `process.env` plus `agentLaunchEnv(opts, HELD_ENVIRONMENT_STAMP)` (`backends/held/index.ts:170-178`, `:231`). If the old env is replaced with `spawnEnv`, the relaunched agent loses `HELD_ENVIRONMENT_STAMP` and whatever else `agentLaunchEnv` sets from `opts`. Rule 11 says environment is recorded, never inferred, so the restarted agent would report a different environment than its spawn did.
   - Fix: `RelaunchRole.relaunch(handle, command, opts: BackendSpawnOpts)`. `heldRelaunch` calls `relaunchPid(pid, args, heldLaunchEnv(opts))`. One function then builds a held PTY's env for both a spawn and a restart, per Rule 16, and the role stays plexer-neutral.
   - Name the file that implements `HeldPtysByPid.relaunchPid`, and its type in `types/pty.ts`, since both gain the parameter.

2. Build a restart's `BackendSpawnOpts` in one place. Item 1 means `relaunchInPlace` needs full opts: `key`, `orchDir`, `project`, `cwd`, `model`, `thinking`, `workers`, `tools` and `env`. `restartOpts` (`handlers/restart-form.ts:62-80`) already builds them from the store, and `restartAttached` (`relaunch.ts:159-168`) builds a second copy by hand. Say that `restartOpts` moves to `launch-policy.ts` or beside it, takes the `LaunchPolicy` and the relaunch tuning, and that `restartPipes`, `switchForm`, `restartAttached` and `relaunchInPlace` all call it. That leaves one builder for a relaunch's opts.

3. State the new order of refusals in admission. Moving `admitLaunchModel` from `admitSpawn` (`admission.ts:215`) to before `planSpawn` makes it run before `assertSpawnPolicy` (`:211`), whose comment says provenance depth and pack size "come first". A spawn that is both too deep and on an unknown model would then get the model refusal, and every refused spawn would query the catalogue first. Either keep `assertSpawnPolicy` first by calling it before the expansion in `spawnAgents`, or say that the order changes and that this is accepted.

4. Type the preview that a linked-host spawn does not build. "A spawn on a linked host builds no preview command" leaves `SpawnAgentPlan.cmd` with no value on that path. Say that `cmd` becomes `string | null`, null when `params.host !== null`. `prepareWorkspace` is only reached when `settings.host === null` (`spawn/index.ts:128-130`), so it narrows there with no cast, per Rule 13.

5. Add the tests for items 1 and 2:
   - After a held restart in place, the PTY env holds the held environment stamp and the agent's `LAUNCH_ENV`, and holds no compaction key the project has removed.
   - `restartAttached` and `relaunchInPlace` produce the same opts as a form switch for the same agent.

## To reach 9

1. Part C: change `RelaunchRole.relaunch` to `relaunch(handle, command, opts: BackendSpawnOpts)`. `heldRelaunch` passes `heldLaunchEnv(opts)` to `relaunchPid`, which gains an `env` parameter in its type in `types/pty.ts` and in the file that implements it. Delete the sentence that sets the env to `spawnEnv(...)`.
2. Part A: "`restartOpts` takes a `LaunchPolicy` and the relaunch tuning, lives beside `prepareLaunch`, and is the one builder of a relaunch's `BackendSpawnOpts`. `restartPipes`, `switchForm`, `restartAttached` and `relaunchInPlace` call it. `restartAttached`'s hand-built opts at `relaunch.ts:159-168` are deleted."
3. Part A, Previews: "`spawnAgents` runs `assertSpawnPolicy` before it expands the models, so depth and pack size still refuse first." Alternatively, state that the order changes.
4. Part A, Previews: "`SpawnAgentPlan.cmd` is `string | null`, null for a spawn on a linked host."
5. Core tests: add the held-restart env assertions from item 5, including the environment stamp.

With these five, I would give it 9. One thing would still keep it from 10. The fallback that types a restart into a pane keeps its old env, and the plan says so honestly: closing that needs backends that take argv and env, which is out of scope.
