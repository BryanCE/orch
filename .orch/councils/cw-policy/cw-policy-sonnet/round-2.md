Score: 7/10

## Improvements

1. Fix the reader contradiction in Part D. It would break `orch setup` on a fresh install. The plan says `readInstallSettings` throws "no <path>; run orch setup" on an absent file, and that `expectedWorkerSettings`, `diagnoseClaudeShim` and the worker file all call it. `expectedWorkerSettings` is the function `installClaudeHooks` and `syncWorkerSettings` use to build the install file (`claude.ts:156-174`, `adapters/registry.ts:35`). On a first run that file is absent, and today it reads as `{}` so that setup can create it. If `expectedWorkerSettings` calls the throwing reader, setup can never write the file. The plan carves out `diagnoseClaudeShim` but not these two. Split the reader into two functions with named behaviors:
   - The existing `readWorkerSettings` stays the tolerant one: absent reads as `{}`, malformed throws "fix the JSON by hand". `expectedWorkerSettings` and `diagnoseClaudeShim` use it.
   - `workerSettingsFile` alone adds the two refusals: absent file, and no `hooks`. Say that `readInstallSettings` is only that launch-side wrapper.
   - Add a test that `installShim` still creates the file from nothing.

2. Close two holes in G4, the linked-host policy. Both break criterion 2 for the far host.
   - The far host must not overlay env. `executeHeadlessSpawn` sends `env: policyEnv(adapter, plan.model, plan.workers)` (`spawn/index.ts:152`). That is the asking host's compaction window and read-only keys. Part A says the far host's env is "laid over `params.env`". An overlay keeps the asking host's `CLAUDE_CODE_AUTO_COMPACT_WINDOW` whenever the far project sets no point for that harness. The asking host's policy then reaches the far agent through the env, which is the bug G4 names. Say that on a peer launch the far host sets `env` to its own `policyEnv(...)` and takes nothing from `params.env`, `params.tools` or `params.workers` except `readOnly`. Add that case to the core test: the asking project sets a point, the far project sets none, and the far launch has no compaction env.
   - The claim that every orchd launch carries `workers` is false. `spawn-headless` takes `workers: workerPolicy.optional()` (`daemon/client/protocol.ts:730`), so a local call without it launches with `workers === undefined`. That launch falls to the install-file branch and to `--strict-mcp-config`, the split the plan set out to remove. Resolve in `spawnHeadless` for every launch, local and peer, from `settingsFor(params.project)` with `params.workers?.readOnly ?? null`. Then no `spawnHeadless` launch depends on what the caller sent, and the "last branch" in `settingsArgv` is unreachable from orchd. Make `workers` required in the schema, or name which callers can still omit it.

3. Specify `launchPolicy` fully, so an engineer needs no question:
   - It needs `offered`, which today comes from `offeredModels(services.models)`. `planSpawn` is a pure function with no services, and three tests call it with two arguments: `commands-spawn.test.ts:14`, and `spawn-viewers.test.ts:100` and `:201`. State the new parameter of `planSpawn` and that those tests change. "`admitSpawn` gains no parameter" is true, but `planSpawn` does.
   - The refusal text differs between callers. `plan.ts:106-107` lists the harnesses that can run read-only, and that list comes from `ADAPTER_IDS` and the registry. `relaunchPolicy` says "cannot hold it to that". `launchPolicy` receives one adapter, so it cannot build the list. Say who composes the message, or have `launchPolicy` throw one neutral error that each caller wraps.
   - `adapterCommand` loses its reason to exist once `relaunchPolicy` always returns a policy. Its remaining callers are the `tileAgent` preview at `spawn/index.ts:426`, which the Part B list does not name as an `orchDir: null` caller, and two tests. Delete it or keep it, but say which. Rule 16. Say that `commands-lifecycle.test.ts:104` compares the restart command to `adapterCommand`, so it changes.

4. Correct the Part C and G5 lists, and say where the call goes.
   - `restartHere` reaches `restartInForm` and `restartAttached` before the only refresh it has at line 211. So "`restartHere`, for every restart" has to place the call at the top of `restartHere`, or else `restartAttached` is missed. `restartAttached` builds `opts` with `orchDir` and launches a Claude terminal program. Name it in G5 and in Part C.
   - `prepareLaunch` takes `adapter`. For a restart onto another harness that must be the planned adapter, not `recorded`. The line-211 code refreshes `request.harness` for this reason. State which adapter each caller passes.
   - `refreshStaleShims` only warns and goes on when a fix fails. State that the worker file then copies hooks that may be stale, and that this is accepted, because the refusal on "no hooks" is the only guard.

5. Say what a worker file's rename over an open file does. The plan writes the same bytes again on every launch through `writeFileSync` and `renameSync`. A running Claude may hold or watch that path. On Windows, where Bryan works part of the time, a rename onto an open file can fail with EPERM, and `settingsArgv` would throw on a launch that needed no write. Either state that orchd runs only on the side that owns `$ORCH_DIR` and that this is not a problem, or have the writer ignore a failed rename when the target already holds the same bytes. The second option reads the file back, which Rule 18 forbids, so the first is the one to document.

6. Tests the plan should list, because the changed behavior has no assertion yet:
   - A form switch of a non-read-only agent: `restartOpts` carries `workers`, `tools` and `env`.
   - `restartAttached` carries `workers` for a non-read-only agent.
   - Two concurrent `workerSettingsFile` calls with equal policies, in one process, leave one valid file and no `.tmp` file.
   - `planRelaunch`'s command for a non-Claude harness is unchanged, so that Part B is shown to be harness-neutral.

7. Where I agree and disagree with the other members.
   - I agree with the plan's rejection of Sol's item 3, inline JSON on `--settings`. The file route assumes nothing new, since `claude.ts` already writes `env` and `enabledPlugins` into the file Claude reads. The command line is unquoted, and user keys and hooks should not sit on a process command line. Sol's request to verify Claude's precedence and re-read behavior against the supported version is fair, but this repo cannot prove it, and the plan does not need it.
   - I disagree with Sol's item 2, a harness-neutral launch hook for preparation. The plan's reasoning stands: every launch path passes the builder, a hook would be a core call on five paths for one harness, and the `orchDir` rule limits the side effect. Opus agrees, and so do I.
   - I agree with Sol on immutable snapshots named by the full digest, the shared atomic writer and the answer of no pruning. I agree with Opus on writing every time and on the full digest. The plan took all of these.
   - I agree with Opus that previews write nothing, and that the refresh gap in G5 was the largest hole. Part C closes it except for the paths in item 4.

8. Smaller points:
   - Rule 17 reads strictly: `CLAUDE_WORKER_SETTINGS_DIR = "workers"` is a hardcoded path name. `claudeSettingsPath` already hardcodes `"claude"` and `"settings.json"`, so there is precedent. Say so in a sentence, so the plan does not look like it missed the rule.
   - The wire still carries `tools`, `env` and all of `workers` to a far host that ignores them except `readOnly`. State that this is deliberate clutter for a later change, or trim the fields in this one, since Rule 8 says one shape.
   - `restartAttached` calls `planRelaunch` only for its `relaunch` value, and `planRelaunch` now writes a worker file. Harmless, but one sentence would save the next reader a search.
