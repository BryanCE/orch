# W19 lookup: where the launch-policy tests go

Paths are from the repo root `/home/bryan/orch`. Read only; write one file.

## L23 The test seams for each launch path
Write `project-settings/findings/L23-test-seams.md`. For each item, give file:line and quote the code.
1. `DaemonServices["settingsFor"]` and `DaemonServices["models"]` in `packages/orch/src/types/services.ts`: their types quoted, and the type `settingsFor` returns, quoted whole. The `ModelCatalogue` type, quoted. `offeredModels` in `packages/orch/src/daemon/server/spawn/models.ts`, quoted.
2. `withLaunchPoints` in `packages/orch/src/policy/compaction.ts` and `policyEnv` in `packages/orch/src/policy/workers.ts`, quoted whole. Which settings key sets a compaction point (its path under `OrchSettings`, its type), and which env var name `policyEnv` writes for each harness that has one (`adapter.compaction` or whatever the adapter field is; quote it from each adapter in `packages/orch/src/adapters/` that sets one).
3. `testDaemonServices` and `TestServicesOptions` in `packages/orch/test/helpers/services.ts`, quoted whole: can a test give it a project settings file, and how does its `settingsFor` resolve one (quote). `writeProjectSettingsFixture` in `packages/orch/test/helpers/settings.ts`, quoted.
4. An existing test that calls `switchForm` or `restartPipes` (`grep -rn "switchForm\|restartPipes\|restart-form" packages/orch/test`): file:line, the test name, and how it builds its `DaemonState` and agent (quote the setup lines). Same for `restartAttached` (search for a test that restarts a terminal agent attached to a session: `grep -rn "terminalAttach\|attach" packages/orch/test/*restart*`).
5. An existing test that restarts a held agent in place through `heldRelaunch` / `relaunchPid` (grep `relaunch` in `packages/orch/test`): file:line, test name, setup quoted. Does it use `FakePtyProvider` (`test/helpers/fake-pty.ts`)? Quote what `FakePtyProvider.spawn` records about each request (does it keep `env`?).
6. An existing test that drives `spawnHeadless` for a linked host (`test/helpers/held-far.ts`, `test/acp-far.test.ts`): how the far orchd's settings and project are built; quote the setup. Can the far side get its own project file?
7. An existing test that spawns into a new tab and checks the env given to `groupHome.create` or `placement.open` (grep `groupHome` and `capturingPaneBackend` in `packages/orch/test`): file:line and the capture helper quoted.
8. Every test that would open a pane, a window or a real terminal, or drive a real plexer, among the files named above: list them, so they are not used.
Report: one line, "done: project-settings/findings/L23-test-seams.md".

## L24 How a launch command reaches each backend's shell
Write `project-settings/findings/L24-command-boundary.md`. For each item, give file:line and quote the code.
1. `createInteractiveCommand` in `packages/orch/src/backends/backend.ts`, quoted whole, and every caller of it in `packages/orch/src` (file:line, enclosing function).
2. `interactiveCmd`, `interactiveArgv` and `workerLaunch.restrictedInteractiveCmd` on the `AgentAdapter` type (`packages/orch/src/types/adapter.ts`), quoted. For each adapter in `packages/orch/src/adapters/` (pi, omp, claude, codex, and any other): how `interactiveCmd` is built from `interactiveArgv` (quote it), and whether anything quotes an argument (grep `shellLine`, `shellQuote`, `quote` in `packages/orch/src/adapters` and `packages/orch/src/util.ts`; quote `shellLine` and any quoting helper whole).
3. For each backend in `packages/orch/src/backends/` (held, headless, herdr, tmux, orca, and any other): how the launch command and the env reach the plexer or process. Quote the spawn path from `BackendSpawnOpts` to the process or pane: whether the backend gets a string or an argv, whether it passes env as a process env, as `export`/`env A=B` text typed into a shell, or as a plexer API field, and where any quoting happens.
4. `shellRun` in `packages/orch/src/backends/held/index.ts` (or wherever it lives), quoted whole.
5. The pane fallback of a restart: `pane.input.submit(pane.handle, command)` in `packages/orch/src/daemon/server/handlers/relaunch.ts` `restartHere`. For each backend that has `agentInput`, does its pane run a shell whose env orch set at spawn (quote where the pane's env is set at spawn)?
6. `SpawnOpts` in `packages/orch/src/types/adapter.ts`, quoted whole.
Report: one line, "done: project-settings/findings/L24-command-boundary.md".
