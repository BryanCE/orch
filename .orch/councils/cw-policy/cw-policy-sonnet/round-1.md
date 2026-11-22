Score: 6/10

## Improvements

1. Close the restart and form-switch holes, which break criterion 2 and the plan's claim that core does not change. `restartOpts` (`daemon/server/handlers/restart-form.ts:62-79`) takes `workers` from `relaunchPolicy`, and that returns `undefined` for every agent that is not read-only (`daemon/server/agent-policy.ts:14-16`). Under the plan, `settingsArgv` sends `workers === undefined` to the install file. So an ordinary Claude worker switched to another form or resumed through `resume.argv` runs on the install's policy, not its project's. The restart command has the same gap. `planRelaunch` (`handlers/relaunch.ts:109`) builds it with `adapterCommand`/`policyCommand`, and those pass no `orchDir` (`spawn/models.ts:41`). `settingsArgv` returns `[]` without an `orchDir`, so a restarted Claude pane gets no `--settings` at all: no hooks, no policy. The plan's list of four argv-building sites leaves out `relaunch.ts`, `restart-form.ts` and `spawn/plan.ts:129`. It names `spawn/models.ts` as a site, but that file passes no `orchDir` today, so nothing is written there. Decide each path in the plan:
   - `restartOpts` carries `workerPolicyFrom(settings)` for every agent, with the read-only policy where it applies. This is a small core edit and the plan has to say so.
   - Every `policyCommand`/`adapterCommand` call states whether it is a preview with no `orchDir`, or a real launch that must pass `orchDir`. A restart command that runs in the pane must pass it.
   - The plan states that the first Claude settings file a restart gets is the worker file.

2. Fix the test claim. The plan says the test at `claude-adapter.test.ts:189` now expects `claudeWorkerSettingsPath(...)`. That test passes `{ orchDir, model, thinking }` with no `workers`, so under the plan's own `settingsArgv` it still gets `claudeSettingsPath(orchDir)`. The test at `:201-202` is the same. No existing test changes. Test 5 in the plan repeats `:201`, so drop it. Add tests that cover the real gaps:
   - A `readOnlyPolicy` launch gets the connector switch off in its own file.
   - A `headlessCmd` launch and a `resume.argv` launch with `workers` both get a worker file.
   - A restart with the project's policy gets a worker file.

3. Make concurrency correct for criterion 4. The plan promises that two launches at once never leave a half-written file. It does not cover these cases:
   - The temp file name must be unique per call, for example pid plus a random suffix. A fixed `.tmp` name lets two launches collide.
   - The install file is written with a plain `fs.writeFileSync` in `writeWorkerSettings` (`claude.ts:162-165`), and `syncWorkerSettings` and `installClaudeHooks` both use it. One launch's `refreshStaleShims` can rewrite it while another launch's `ensureWorkerSettings` reads it. That read can see a truncated file and throw "malformed ... fix the JSON by hand" on a good file. Make `writeWorkerSettings` itself write through temp and rename, so the install file and the worker files share one writer. That also keeps Rule 16.
   - Say that the worker file is rewritten under a running Claude whenever the install file changes. State whether that is accepted.

4. Pin down the linked host case. The plan says a linked host's orchd builds its own argv. For headless spawns that is true: `spawnHeadless` (`handlers/lifecycle.ts:63-105`) takes `workers` from the request and passes it with the host's own `orchDir`. Two things are left open:
   - The base file and the hooks come from the host's install file. The plan says admission runs `refreshStaleShims` first. On a linked host, `spawnHeadless` calls `admitModel` but never `refreshStaleShims`. The only call sites are `spawn/admission.ts`, which runs on the spawning orchd, and `relaunch.ts`. So a linked host can copy hooks that are stale or missing. Say what makes the host's install file current, or have `ensureWorkerSettings` fail with a clear message when it is absent. Today an absent file reads as `{}` and yields a worker file with no hooks, so presence never reports.
   - A policy resolved on the spawning host reaches the linked host and is used as is. State that this is intended. A restart on the linked host re-resolves it from that host's project settings through `agentSettings`, which can give a different policy from the first spawn.

5. Answer the first Open question: leave the worker files and do not add a doctor prune. The file name is a digest of the two keys, so the count is bounded by distinct policies. Every launch rewrites its own file, so none goes stale in a way a launch would pick up. A prune would need the store to record which policy each live agent launched with, and that is new state for a few hundred bytes. Delete the question and write the decision into "Choices made". Add one sentence on why the worker files satisfy Rule 18. They are generated harness config under `$ORCH_DIR/claude/`, like `claude/settings.json`. Only Claude reads them, and no orch code reads one to decide anything. The plan's "write when the file differs" reads the target to decide, so either compare in memory or write unconditionally and atomically.

6. Answer the second Open question: the side effect in the argv builder is acceptable, but only with these limits written into the plan.
   - It is the only way every launch path is covered. `createInteractiveCommand` serves the held, tmux and orca backends, and herdr, headless and `resume.argv` call the adapter directly. A prepare step would have to be added to all of them.
   - The write is gated on `opts.orchDir`. The previews in `spawn/plan.ts:129` and `spawn/index.ts:426` must keep passing no `orchDir`. If they ever pass one, a spawn aimed at a linked host would write a file on the spawning host, which is the wrong host.
   - `settingsArgv` can now throw, which `claudeSettingsPath` never did. The plan must say that a malformed install file refuses the launch and which callers surface the error.
   - Document the side effect on `settingsArgv` and on `interactiveArgv`, so nobody adds a call from a pure context.

7. Remove the "engineer can build it without one question" gaps, so that an engineer needs no further answer:
   - Say where `ensureWorkerSettings`, the digest function and `withWorkerKeys` live. `claude-hooks.ts` is described as a leaf kept free of heavy imports, and `readWorkerSettings` sits in `claude.ts`. Putting writers in the leaf conflicts with that.
   - Say how the "same message `expectedWorkerSettings` throws" is shared rather than copied. Extract one `readInstallSettingsOrThrow` that both `expectedWorkerSettings` and `ensureWorkerSettings` call. That is Rule 16.
   - Name the existing sha256 helper if one exists, or the `node:crypto` call. `claudeWorkerKeys` with `disabledPlugins` sorted and a fixed JSON key order is the digest input. Say that the arrays are sorted into a copy.
   - Rule 17: the digest length of 16 and the `workers` directory name are literals. Name them as constants next to `claudeSettingsPath`, or use the full digest.

8. Smaller points:
   - `mcpArgv` sends `workers === undefined` to `--strict-mcp-config`, while `settingsArgv` sends it to the install file with the install's connector switch. This is the same split the plan set out to remove, and it still exists for a launch with no `workers`. Say whether that launch should pass the policy of the install settings, or whether it can no longer happen once item 1 is done.
   - The unquoted `--settings <path>` in the pane command breaks when `orchDir` holds a space, which is common on Windows. The plan rules out JSON for lack of quoting and does not mention that the path has the same problem. Either quote the path in `interactiveCmd` through `shellQuote` or note it as out of scope.
