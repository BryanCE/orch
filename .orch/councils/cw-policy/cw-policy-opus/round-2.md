Score: 7/10

The rewrite fixes every round-1 finding of mine. The digest now covers the whole contents. The write is atomic and shared with the install file, there is no read-back, and an absent install file refuses the launch. G2 through G5 are real, and I checked each one against the source. What remains are a correctness gap on linked hosts, an import cycle that Part A sets up, and several places where the engineer would have to ask a question.

Where I stand on the other round-1 reviews:
- Sonnet's items match mine, and the rewrite takes them. I agree with all of them.
- Sol #1 (resolve the policy on the far host) is right. The rewrite takes it, but only half: see item 1.
- I disagree with Sol #2. Writing inside the argv builder is sound under the `orchDir` rule. A prepare step would add a core call on five paths for one harness's need.
- I disagree with Sol #3. The reason the plan gives for not passing inline JSON holds: `--settings <file>` already carries `enabledPlugins` and `env` today.
- Sol #4 is right that a missing install file must be told apart from an unreadable one, and the rewrite still does not do that. See item 3.

## Improvements

1. Close G4 for the env as well as the policy. The only env a spawn sends is `env: policyEnv(adapter, plan.model, plan.workers)` (`spawn/index.ts:152`), so `params.env` is entirely the asking host's policy env. Part A says the far host's `policyEnv` "is laid over `params.env`". A key that the far policy does not set therefore survives from the asking host. Example: the asking project sets a Claude compaction point and the far project sets none. The far launch still gets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` from the asking host, which is exactly the leak G4 names. Fix it one of two ways:
   - On a peer spawn, the far host uses its own `policyEnv` in place of `params.env`, not over it.
   - `spawnOnHost` stops sending `env` and `tools`, and sends only `workers.readOnly`.

   If anything other than `policyEnv` can reach `spawn-headless`'s `env`, the plan should name it. Add the reverse test: the asking host sets a compaction point and the far host sets none, and the far launch's env has no compaction key.

2. Keep the import graph acyclic in Part A. `launchPolicy` lives in `policy/workers.ts`, and the refusal it replaces lists the able harnesses with `ADAPTER_IDS` and `resolveAdapterOrDie` (`spawn/plan.ts:106`). Building that list inside `workers.ts` makes `workers.ts` import the adapter registry. The registry imports `claude.ts`, and Part D makes `claude.ts` import `workerPolicyFrom` from `workers.ts`. That is a cycle, and fallow and `bun check` will flag it. The plan should also settle who writes the refusal text. Today `plan.ts` and `agent-policy.ts` word it differently, and `plan.ts`'s version names `agent.name`, which `launchPolicy` does not have. Make `launchPolicy` call `refuse(adapter.id)` with no message. Each caller, in `daemon/server`, builds its own text with the able-harness list, so `workers.ts` imports nothing new.

3. Make `readInstallSettings` buildable as specified. The plan says it wraps `readWorkerSettings` and throws "no <path>; run orch setup" when the file is absent. But `readWorkerSettings` (`claude.ts:111-124`) returns `{}` for any read error, so a wrapper cannot tell three cases apart:
   - the file is absent;
   - the file holds `{}`;
   - the file exists but cannot be read, with EACCES or EISDIR.

   Change `readWorkerSettings` to return a tagged result: `{ kind: "absent" }`, `{ kind: "unreadable"; reason }`, `{ kind: "malformed"; reason }` or `{ kind: "ok"; value }`. Only ENOENT counts as absent. `diagnoseClaudeShim` maps `absent` to `{}` as it does today, and `readInstallSettings` throws for every kind but `ok`. Test an unreadable file too.

4. Put Part C's restart refresh in one place, and make sure it covers every restart. `restartHere` (`relaunch.ts:204-233`) returns early through `restartInForm` and `restartAttached` before line 211. Read literally, "replace the line 211 refresh" still misses `restartAttached`, and the plan does not list it. Call `prepareLaunch(state, request.harness === null ? recorded : resolveAdapterOrDie(request.harness))` once at the top of `restartHere`. Then drop the separate calls in `restartPipes` and `switchForm`, which `restartInForm` reaches only from `restartHere`. That is one call site, per Rule 16. Also move `prepareLaunch` out of `doctor/runner.ts`. A launch step that takes `DaemonState` and `installSettings` belongs beside `project-settings.ts`, or in a launch module under `daemon/server/`. Leave `runner.ts` as the doctor that it calls.

5. Name the signature changes Part A implies.
   - `planSpawn(params, settings, chosen)` (`spawn/plan.ts:123`) has no model catalogue, so it cannot call `launchPolicy` with `offered`. Say that it gains `offered: OfferedModels`, and that `spawnAgents` (`spawn/index.ts:338`) passes `offeredModels(services.models)`.
   - Say that the preview command at `plan.ts:129` now carries the launch points. Codex's `-c model_auto_compact_token_limit` then appears in the preview, which matches "a previewed command is the command the backend runs".
   - `tileAgent` builds its preview from a second policy: `adapterCommand(agent.harness, settingsFile, …)` at `spawn/index.ts:426`. After Part A, that preview should be `policyCommand(agent.harness, workers, { …, orchDir: null })` from the one `launchPolicy` result, so tile computes one policy, per Rule 16. Part B lists only `plan.ts:129` as a preview, and should list this one too.
   - After Part A, `planRelaunch` (`relaunch.ts:109`) always has `workers`, so its `adapterCommand` branch is dead. Say that it becomes `policyCommand` only. If `adapterCommand` then has no caller left, delete it.

6. Say what `planRelaunch` writes when `restartAttached` calls it only for `relaunch` (`relaunch.ts:155`). With `orchDir` passed, that call writes a worker file for a command that never runs. That is harmless, but it is a write the plan does not mention. Either split out a `relaunchTarget` that returns `relaunch` with no command, or note that the write is accepted.

7. State the Rule 17 position on the fixed names. `CLAUDE_WORKER_SETTINGS_DIR = "workers"` is a constant, but it is still a hardcoded name, as `claudeSettingsPath`'s `"claude"` and `"settings.json"` are today. Either say that harness-owned file layout under `$ORCH_DIR/<harness>/` is exempt, as the existing path already is, or derive the directory from the install file's name. Do not leave it unstated for a reviewer to raise.
