Score: 5/10

## Improvements

1. Fix the claim in section 3 that the install file is always current before a launch, and close the paths where it is not. `refreshStaleShims` runs in `admitSpawn` (`spawn/admission.ts:219`), in `reloadHere` (`handlers/relaunch.ts:91`), and in restart only when `request.harness !== null` (`relaunch.ts:211`). It does not run in four places:
   - `spawnHeadless` called by a linked host's orchd. `peer !== undefined` in `handlers/lifecycle.ts:63-114` runs only `assertHostAdmits`.
   - `tileAgent` (`spawn/index.ts:406`), which never calls `admitSpawn`.
   - `restartPipes` and `switchForm` (`handlers/restart-form.ts`).
   - A restart that keeps its harness.

   `readWorkerSettings` reads an absent file as `{}` (`claude.ts:116`), and `withWorkerKeys` adds no hooks. So on a fresh linked host, the plan writes a worker file with no hooks. That Claude worker never reports presence, which breaks criterion 4. The plan should say two things. First, `ensureWorkerSettings` throws when the install file is absent or its `hooks` is not a record, naming `orch setup`, and never writes a hookless worker file. Second, the linked-host `spawnHeadless`, `tileAgent` and the form restarts call `refreshStaleShims(directory, logger, [adapter.id], installSettings(state))` before they launch. That is one generic, harness-agnostic line per path. Add a test for the absent install file.

2. Cover restarts, or criterion 2 fails. `relaunchPolicy` (`daemon/server/agent-policy.ts:14-20`) returns `undefined` for every agent that is not read-only. `restartOpts` (`restart-form.ts:62-80`) then passes no `workers`, so under the plan's `settingsArgv` a restarted Claude worker falls back to the install file and loses its project's plugin list and connector switch. `mcpArgv` sees `undefined` too and adds `--strict-mcp-config` whatever the project says. The plan should make `relaunchPolicy` return `workerPolicyFrom(settings)` with the launch points applied for a non-read-only agent, the same policy a fresh spawn gets. `settings` there is already `agentSettings(state, view.id)`, the agent's project. Then make the `opts.workers === undefined` branch in `settingsArgv` reachable only from launches with no policy, and name those launches.

3. Correct the list of argv build sites in section 3. `daemon/server/spawn/models.ts` builds a preview: `policyCommand` passes no `orchDir`, so `settingsArgv` returns `[]` there and nothing is written. The list also misses `handlers/restart-form.ts:168`, where `adapter.resume.argv(opts, sessionId)` calls `interactiveArgv` on a relaunch. Replace the list with the real set: every caller of `interactiveCmd`, `interactiveArgv`, `headlessCmd` and `resume.argv` that passes `orchDir`, which are `backends/backend.ts:24`, `backends/headless/index.ts:194`, `backends/herdr/index.ts:399` and `handlers/restart-form.ts:168`. Each one runs in orchd on the agent's host.

4. Fix the test plan where it is wrong. The test at `claude-adapter.test.ts:189` passes `{ orchDir, model, thinking }` with no `workers`, so under the plan it still expects `claudeSettingsPath(orchDir)` and should not change. The test that should change is the one at `:199-203`, and only if it gains a policy. Add three tests:
   - An absent install file throws. This is the case from item 1.
   - A restart of a non-read-only agent passes its project's worker file. This is the case from item 2.
   - A worker file's `hooks` deep-equals the install file's.

5. Drop the truncated digest. "The first 16 hex characters" is a hardcoded number, which Rule 17 forbids. Use the whole sha256 hex digest as the file name, so there is no length to configure.

6. Write the file through one atomic writer, per Rule 16. Make `writeWorkerSettings` (`claude.ts:162`) write a temp file and rename it, using `settingsTemporaryPath` (`settings/schema.ts:476`) as `settings/storage.ts:85-87` already does. Use that one function for both the install file and the worker files. The plan should also say that `ensureWorkerSettings` is fully synchronous. That is what makes a pid-named temp file safe when two launches run at once in one orchd, and it answers criterion 4 for concurrency.

7. Drop "when the file there differs" and write every time, per Rule 18. Reading the worker file back to decide whether to write is a file read that decides something. The file is a few hundred bytes and deterministic for a given install file and policy, so an unconditional atomic write costs nothing. It also keeps every worker file in step with the current install file, since the path keys only on the policy but the contents also depend on the install file.

8. Answer the two Open questions in the plan itself:
   - Pruning: leave the worker files. The store does not record which digest an agent launched with, so doctor cannot tell which files are unused without a new column. A running Claude may also re-read its `--settings` file, so deleting one under a live agent is a risk. The number of files is bounded by the number of distinct policies.
   - The side effect in the argv builder is acceptable. Every caller that passes `orchDir` is server code on the agent's host. Previews pass no `orchDir`, so they write nothing. A `prepare` step would add a core touchpoint on four launch paths for one harness's need, which runs against Rules 9 and 10. State this rule in the `settingsArgv` doc comment: a write happens only when `orchDir` is set.
