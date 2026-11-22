# W21: the tests on one argv per adapter, and the shell renderer's own tests

Read `project-settings/claude-worker-policy.md`, section "Part E", for what changed. Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`.
What the source now is:
- No adapter has `interactiveCmd` or `restrictedInteractiveCmd`. `adapter.interactiveArgv(opts): readonly string[]`, and pi and omp have `restrictedInteractiveArgv(opts): readonly string[]` (also on `adapter.workerLaunch`).
- argv elements are raw: pi's quicklist is `--models` followed by `a,b` with no shell quotes, codex's model is not quoted.
- `launchCommand` is gone; `launchArgv(adapter, launch, tuning, orchDir): readonly string[]` in `packages/orch/src/daemon/server/spawn/models.ts`.
- `shellCommand(dialect, program)` and `shellLaunchLine(dialect, program, env, unset)` in `packages/orch/src/shared/shell.ts`; `LaunchProgram` in `packages/orch/src/types/backend.ts`; `AgentInputRole` has `readonly shell: "posix" | "cmd"`.
The translation rule for an old string assertion: `x.interactiveCmd(opts)` becomes `x.interactiveArgv(opts).join(" ")`, and `x.restrictedInteractiveCmd(opts)` becomes `x.restrictedInteractiveArgv(opts).join(" ")`. An expected string that held shell quotes around a value (`'a,b'`, `'openai/gpt-5.6'`) drops them. A test that only compared the string form with the argv form, now that the string form is gone, is deleted with a one-line note in your report.
Run only the test files of your task, once, from the root: `bun test packages/orch/test/<file> ...`. Never run `cli-backends-herdr-headless.test.ts`: report it as not run.

## T1 pi and omp tests
Apply the translation rule in:
- `packages/orch/test/adapter-allowlist.test.ts` (L29, 38, 44, 52, 59, 76, 84, 96)
- `packages/orch/test/adapter-model-flag.test.ts` (L15-16, 20, 23, 28-29, 33-34, 46, 68-69)
- `packages/orch/test/adapter-pi.test.ts` (L50, 67)
- `packages/orch/test/orch-bugs-4-5.test.ts` (L23-24)
Verify: those four files.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".

## T2 claude, codex, compaction, spawn and herdr tests
Apply the translation rule in:
- `packages/orch/test/claude-adapter.test.ts` L164
- `packages/orch/test/codex-adapter.test.ts` L85-86
- `packages/orch/test/compaction-env.test.ts` L38
- `packages/orch/test/commands-spawn.test.ts` L327-329
- `packages/orch/test/cli-backends-herdr-headless.test.ts` L84, 91-92, 171. Where a herdr test expected a worker's args from `interactiveArgv` and the worker now gets `workerLaunch.restrictedInteractiveArgv`, expect the restricted argv: herdr now launches a worker the way every backend does. Where a herdr test expected `--cmd` to be ignored, expect the refusal `"herdr starts the harness itself, so it cannot run a --cmd line; spawn without --cmd"`. Do not run this file.
Verify: those five files (run all but the herdr one).
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".

## T3 Adapter fakes, the quicklist test and the fake input roles
Edit `packages/orch/test/helpers/adapter.ts`: delete the `interactiveCmd` local and field; `interactiveArgv` becomes `overrides.interactiveArgv ?? ((): readonly string[] => ["fake-agent"])` placed where the old field was (the `...overrides` spread, if the function has one at the end, keeps overriding it).
Edit `packages/orch/test/adapter-hardening.test.ts` L52: `interactiveCmd: () => "true",` becomes `interactiveArgv: () => ["true"],`.
Edit `packages/orch/test/herdr-notify-hardening.test.ts` L63: delete the `interactiveCmd` line; keep `interactiveArgv`.
Edit `packages/orch/test/spawn-preferred-models.test.ts`:
- Import `launchArgv` in place of `launchCommand`.
- "the previewed command is the command a launch runs":
  ```ts
    const previewed = launchArgv(piAdapter, testLaunch(QUICKLIST), { model: "openai/gpt-5.6" }, null);
    expect(previewed.join(" ")).toContain("--model openai/gpt-5.6");
    expect(previewed.join(" ")).toContain(`--models ${QUICKLIST.join(",")}`);

    expect(launchArgv(piAdapter, testLaunch(), { model: "openai/gpt-5.6" }, null)).not.toContain("--models");
  ```
- `CapturingPiAdapter.workerLaunch`: `restrictedInteractiveCmd: (opts: SpawnOpts): string => super.restrictedInteractiveCmd(opts)` becomes `restrictedInteractiveArgv: (opts: SpawnOpts): readonly string[] => super.restrictedInteractiveArgv(opts)`.
Edit `packages/orch/test/control-dispatch.test.ts` (L125 and L312): each `Object.defineProperty(backend, "agentInput", { value: { ... } })` object gains `shell: "posix",` first.
Verify: packages/orch/test/helpers/adapter.ts packages/orch/test/adapter-hardening.test.ts packages/orch/test/herdr-notify-hardening.test.ts packages/orch/test/spawn-preferred-models.test.ts packages/orch/test/control-dispatch.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".

## T4 The shell renderer's tests, and the pane restart sets the env
Create `packages/orch/test/shell.test.ts`, `describe("shell rendering", ...)`, importing `shellCommand` and `shellLaunchLine` from `../src/shared/shell.ts`:
1. "posix quotes each argument, so a space or a quote stays one argument": `shellCommand("posix", { kind: "argv", argv: ["claude", "--settings", "/a dir/s.json", "it's"] })` toBe `"'claude' '--settings' '/a dir/s.json' 'it'\\''s'"`.
2. "cmd wraps each argument in double quotes and doubles a quote in it": `shellCommand("cmd", { kind: "argv", argv: ["pi", 'say "hi"'] })` toBe `'"pi" "say ""hi"""'`.
3. "a --cmd line is passed as given": `shellCommand("posix", { kind: "shell", line: "pi | tee log" })` toBe `"pi | tee log"`.
4. "a posix launch line sets the env and removes what it dropped": `shellLaunchLine("posix", { kind: "argv", argv: ["claude"] }, { ORCH_DIR: "/o", CLAUDE_CODE_AUTO_COMPACT_WINDOW: "9" }, ["CLAUDE_CODE_AUTO_COMPACT_WINDOW", "ORCH_READ_ONLY"])` toBe `"env -u ORCH_READ_ONLY ORCH_DIR='/o' CLAUDE_CODE_AUTO_COMPACT_WINDOW='9' 'claude'"`.
5. "a posix launch line runs a --cmd line under sh -c": `shellLaunchLine("posix", { kind: "shell", line: "pi | tee log" }, { A: "1" }, [])` toBe `"env A='1' sh -c 'pi | tee log'"`.
6. "a cmd launch line sets each variable first": `shellLaunchLine("cmd", { kind: "argv", argv: ["pi"] }, { A: "1" }, ["B"])` toBe `'set "B=" & set "A=1" & "pi"'`.
Edit `packages/orch/test/commands-lifecycle.test.ts`, test "restart --harness quits with the old harness, launches the new one, and records it":
- The fake `agentInput` object in `Object.defineProperty(backend, "agentInput", ...)` (L87) gains `shell: "posix",` first.
- The four assertions on `submitted[1]` become:
  ```ts
      // The pane's shell still holds the old launch's env: the restart line sets the project's and removes what it dropped.
      expect(submitted[1]).toStartWith("env -u ");
      expect(submitted[1]).toContain(`ORCH_DIR='${root}'`);
      expect(submitted[1]).toContain(`'claude' '--model' '${tuning.model}'`);
      expect(submitted[1]).toMatch(/'--settings' '\S*settings\.[0-9a-f]{64}\.json'/);
  ```
Verify: packages/orch/test/shell.test.ts packages/orch/test/commands-lifecycle.test.ts
If an expected value is off, put what you got in your report line and stop; do not change the source.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".
