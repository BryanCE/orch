# L23 — test seams by launch path

## 1. Daemon service seams

`packages/orch/src/types/services.ts:58-59`:
> `readonly settingsFor: (directory: string | null) => ProjectSettings;`
> `readonly models: ModelCatalogue;`

`settingsFor` returns `ProjectSettings` (`packages/orch/src/settings/project.ts:18-25`):
> `export interface ProjectSettings {`
> `readonly file: string | null;`
> `readonly state: ProjectSettingsState;`
> `readonly settings: OrchSettings;`
> `readonly values: ProjectSettingsFile | null;`
> `}`

`ModelCatalogue` (`packages/orch/src/types/adapter.ts:232-242`):
> `export interface ModelCatalogue {`
> `read(bin: string, argv: readonly string[], stdin?: string): string;`
> `warm(bin: string, argv: readonly string[], stdin?: string): Promise<void>;`
> `forget(): void;`
> `}`

`offeredModels` (`packages/orch/src/daemon/server/spawn/models.ts:20-22`):
> `export function offeredModels(catalogue: ModelCatalogue): OfferedModels {`
> `  return (harness) => resolveAdapter(harness).models?.listModels(catalogue) ?? [];`
> `}`

## 2. Compaction policy

`withLaunchPoints` (`packages/orch/src/policy/compaction.ts:28-32`):
> `export function withLaunchPoints(workers: WorkerPolicy, offered: OfferedModels): WorkerPolicy {`
> `  const table = Object.entries(workers.compactAtTokens).map(([harness, points]): [string, Record<string, number>] =>`
> `    [harness, launchKeyed(points ?? {}, offered(harness))]);`
> `  return { ...workers, compactAtTokens: Object.fromEntries(table) };`
> `}`

`policyEnv` (`packages/orch/src/policy/workers.ts:63-66`):
> `export function policyEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>> {`
> `  const readOnly = policy === undefined ? null : policy.readOnly;`
> `  return { ...compactionLaunch(adapter, model, policy).env, ...(readOnly === null ? {} : readOnlyEnv(readOnly)) };`
> `}`

Setting: `OrchSettings.workers.compact_at_tokens` (`packages/orch/src/types/settings.ts:43,55`), type `CompactionTable = Partial<Record<AdapterId, Readonly<Record<string, number>>>>`; workers' camel-case runtime field is `compactAtTokens`.

Adapters with a compaction point: `packages/orch/src/adapters/claude.ts:76,342` uses `CLAUDE_CODE_AUTO_COMPACT_WINDOW` in env (`{ [COMPACT_WINDOW_ENV]: String(tokens) }`). `packages/orch/src/adapters/codex.ts:19,116` writes `model_auto_compact_token_limit` as a command argument, not env (`env: {}`). Pi has `NO_COMPACTION` (`pi.ts:440`); opencode and omp set compaction `null` (`opencode.ts:61`, `omp.ts:87`). Thus only Claude among adapters with a launch env writes the compaction point into env.

## 3. Test service/project settings

`TestServicesOptions` (`packages/orch/test/helpers/services.ts:11-18`) accepts only `orchDir`, optional in-memory `settings`, `proc`, and `models`; it has no project-settings-file option. `testDaemonServices` (`:29-32`) is:
> `export function testDaemonServices(options: TestServicesOptions): DaemonServices {`
> `  const services = testServices(options);`
> `  return { ...services, settingsFor: settingsForProjects(services.settings), models: options.models ?? createModelCatalogue(services.orchDir, services.logger) };`
> `}`

Resolution is `settingsForProjects` in `packages/orch/src/settings/project.ts:114`; it resolves the supplied directory's project file over install settings, and `null` to install settings alone (per its declaration comment at `:113`). A project fixture can still be created on disk and resolved by passing its directory.

`writeProjectSettingsFixture` (`packages/orch/test/helpers/settings.ts:48-50`):
> `export function writeProjectSettingsFixture(directory: string, settings: ProjectSettingsFile): string {`
> `  return writeProjectSettingsText(directory, JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, ...settings }, null, 2) + "\n");`
> `}`

## 4. Form/pipes restart tests

`packages/orch/test/restart-form.test.ts:119`, test **“an acp agent restarted to tui ends its session, releases its pipes and runs the resume argv in a PTY, same agent”** (also subsequent tests call these functions). Setup (`:65-83`) makes temp orch dir, fake pipes and fake PTYs, then builds state with `idleDaemonState(testDaemonServices({ orchDir }), orchDir, ptys, pipes)`. Agent setup (`:88-96`) calls `spawnHeldLaunch` with project `/fleet/project`, selected form, key, name, cwd and orchDir, then optionally records session status. These tests use fakes; no real pane/terminal is opened.

The requested `grep -rn "terminalAttach\|attach" packages/orch/test/*restart*` finds no `restartAttached` test (only link bookkeeping in restart-form). No test matching the specified terminal-attach restart seam was found.

## 5. Held relaunch seam

`grep -rn relaunch packages/orch/test` finds no test of the named `heldRelaunch` role itself; `packages/orch/test/held-pty.test.ts:54` only checks `hold.relaunchPid(process.pid, [], {})` returns null. The lifecycle restart tests are `packages/orch/test/held-lifecycle.test.ts:111` onward; they use `heldFarAgent`/`startHeldFar` from the helper and `ChildPtyProvider`, not `FakePtyProvider`.

`FakePtyProvider.spawn` (`packages/orch/test/helpers/fake-pty.ts:39-43`) constructs `new FakePty(this.nextPid(), request)` and stores it in `spawned`. `FakePty` retains the whole request as `readonly request` (`:20`), so its env is retained as `request.env`.

## 6. Linked-host headless spawn

`packages/orch/test/acp-far.test.ts:54` calls `spawnHeadless(far.state, { project: "/fleet/project", ... })`. Far orchd setup is shared via `packages/orch/test/helpers/far-orchd.ts:59`: `testDaemonServices({ orchDir, settings: { timeouts: { dispatch_ack_ms: 50, ...options.timeouts } }, models: options.models })`; `idleDaemonState` uses those services. `held-far.ts:186` likewise builds far-side services through `testDaemonServices`. No project settings option exists in `TestServicesOptions`; the far side can have its own project file on disk and `settingsFor(project)` reads it, but the helper does not inject a file.

## 7. New-tab env capture

`packages/orch/test/spawn-preferred-models.test.ts:73` defines `capturingPaneBackend`; tests at `:83`, `:106`, and `:136` use it. The helper captures `BackendSpawnOpts` in `seen`/`allSeen` via its fake pane backend. New-tab creation passes env in `packages/orch/src/daemon/server/spawn/index.ts:196`: `groupHome.create({ workspace, cwd: root.cwd, label, env: root.env })`. The matching tests are fake backend tests and do not open a real pane.

## 8. Do not use for live-terminal verification

Among the named/search-result test files, `packages/orch/test/held-lifecycle.test.ts` starts a `ChildPtyProvider` real child process (not a real plexer pane); do not run it under the no-terminal rule. `restart-form.test.ts`, `held-pty.test.ts`, `acp-far.test.ts`, and `spawn-preferred-models.test.ts` use fake providers/backends and do not open panes/windows or drive a real plexer. No test of `restartAttached` was located.
