# W15: tests for orchd's project reads, the gates, `orch settings` and the council

Context for every section. orch now has a project settings file per project directory,
`<dir>/.orch/settings.json`, whose keys override the install file `$ORCH_DIR/settings.json`.
Paths are from the repo root `/home/bryan/orch`; tests are in `packages/orch/test/`. No `as`
casts, no `any`. A test never writes outside a temp directory it made: every project
directory in these tests is a fresh `tempOrchDir(...)` directory, pushed for cleanup.
Helpers: `writeProjectSettingsFixture(directory, settings)` and
`writeProjectSettingsText(directory, text)` in `./helpers/settings.ts` write
`<directory>/.orch/settings.json`; `testServices({ orchDir, settings })` in
`./helpers/services.ts` gives services over an in-memory install file;
`idleDaemonState(services, orchDir)` in `./helpers/daemon-state.ts` gives a `DaemonState`
whose `services.settingsFor(directory | null)` reads that directory's project file over the
install.

## T1 orchd's project reads
Create `packages/orch/test/project-settings-orchd.test.ts`. Imports: `afterEach, describe, expect, test`
from `bun:test`; `removeTempDir, tempOrchDir` from `./helpers/tempdir.ts`; `testServices` from
`./helpers/services.ts`; `idleDaemonState` from `./helpers/daemon-state.ts`;
`writeProjectSettingsFixture, writeProjectSettingsText` from `./helpers/settings.ts`;
`seedAgent` from `./helpers/agent.ts`; `acceptStatusReport` from
`../src/daemon/server/status-report.ts`; `mintAgentId` from `../src/shared/agent-id.ts`;
`agentProjectDirectory, agentSettings, lockRulingSettings` from
`../src/daemon/server/project-settings.ts`; `workerText` from
`../src/daemon/server/worker-header.ts`; `type OrchDir` from `../src/types/core.ts`.
Setup: `const dirs: OrchDir[] = []`, `afterEach` removes each; `tempDir(prefix)` makes, pushes
and returns a `tempOrchDir(prefix)`. A helper
`state(install: Record<string, unknown>)` returns
`idleDaemonState(testServices({ orchDir, settings: install }), orchDir)` with a fresh
`orchDir = tempDir("orch-ps-orchd-")`. A helper `agentIn(state, project: string): string`
mints an id, `seedAgent(id, { name: id }, state.directory)`,
`acceptStatusReport(state.directory, id, { project }, () => undefined)`, returns the id.
Tests in `describe("orchd reads an agent's project", ...)`:
1. "an agent's settings are its project's": install `{ workers: { verify_commands: ["go vet"] } }`,
   `const project = tempDir("orch-ps-project-")`,
   `writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } })`;
   `agentSettings(s, agentIn(s, project)).workers.verify_commands` is `["bunx oxlint"]`.
2. "two agents of two projects read their own": two project directories with `["a"]` and
   `["b"]`; each agent gets its own list.
3. "an agent that has not reported takes its spawner's project": a spawner from `agentIn(s, project)`
   with the project's verify `["bunx oxlint"]`; a child `seedAgent(child, { name: child, spawnedBy: spawner }, s.directory)`
   with no status report; `agentProjectDirectory(s, child)` is `project`. If `seedAgent` takes
   the spawner under another option name, use that name; report it if it takes none.
4. "the lock ruling reads the asking agent's project": install
   `{ locked_commands: { commands: ["go test"] } }`, project `{ locked_commands: { commands: ["bun test"] } }`;
   `lockRulingSettings(s, agentIn(s, project), "/elsewhere").locked_commands.commands` is
   `["bun test"]`.
5. "an unknown agent's lock ruling reads the directory asked from": same files;
   `lockRulingSettings(s, "no-such-agent", project).locked_commands.commands` is `["bun test"]`,
   and `lockRulingSettings(s, null, project)` gives the same.
6. "an invalid project file leaves the install's lock list": `writeProjectSettingsText(project, "{ nope")`;
   `lockRulingSettings(s, agentIn(s, project), project).locked_commands.commands` is `["go test"]`.
7. "the worker header names the target's project commands": install
   `{ workers: { verify_commands: ["go vet"] } }`, project `["bunx oxlint"]`;
   `workerText(s, agentIn(s, project), s.services.settingsFor(project), "do it", { harness: "pi", context: { maySpawn: false } })`
   contains `bunx oxlint`, does not contain `go vet`, and ends with `do it`.
8. "a worker header refuses an invalid project file, naming it": `writeProjectSettingsText(project, '{"runtime":"node"}')`;
   `expect(() => workerText(...same...)).toThrow("runtime")`.
9. "a read-only agent's header names no verify command":
   `workerText(s, id, s.services.settingsFor(project), "read it", { harness: "pi", context: { maySpawn: false } }, { readOnly: { out: null } })`
   does not contain `bunx oxlint`.
Verify: packages/orch/test/project-settings-orchd.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 The pi bridge's gate reads the project at each call
Edit `packages/orch/test/bridge-command-gate.test.ts`. Its `toolInput(toolName, input)` builds
`const settings = testServices({ orchDir: root, settings: { locked_commands: { commands: ["bun test"] } } }).settings;`
and registers the bridge with it. Add a second helper beside it,
`projectToolCalls(project: string, commands: readonly string[], between: () => void): unknown[]`,
that does what `toolInput` does with one change and one addition: the settings are
`projectViewSettingsManager(project, testServices({ orchDir: root, settings: { locked_commands: { commands: ["go test"] } } }).settings)`
(import `projectViewSettingsManager` from `../src/settings/manager.ts`), and it fires one
`bash` tool_call per entry of `commands` on the same registered bridge, calling `between()`
after the first, and returns each call's resulting `input.command`. Extract the code the two
helpers share into one local function rather than copying it. Tests, in a new
`describe("the gate reads the project's lists", ...)`:
1. "a project's lock list replaces the install's": project written with
   `writeProjectSettingsFixture(project, { locked_commands: { commands: ["bun test"] } })`;
   `projectToolCalls(project, ["bun test", "go test"], () => undefined)`: the first matches
   `/ lock -- 'bun test'$/`, the second equals `"go test"`.
2. "a project file changed between two calls applies to the second": project starts with no
   file; `between` writes `{ locked_commands: { commands: ["bun test"] } }`; calls
   `["bun test", "bun test"]`: the first equals `"bun test"`, the second matches `/ lock -- 'bun test'$/`.
3. "an invalid project file leaves the install's lists": `writeProjectSettingsText(project, "{ nope")`;
   calls `["go test"]`: matches `/ lock -- 'go test'$/`.
Import `writeProjectSettingsFixture, writeProjectSettingsText` from `./helpers/settings.ts`.
Project directories are fresh `tempOrchDir("orch-bridge-project-")` directories pushed onto
`roots`.
Verify: packages/orch/test/bridge-command-gate.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 `orch settings` writes the project file
Edit `packages/orch/test/settings-command.test.ts`. Its `runSettingsCli(orchDir, extraEnv, args)`
calls `cmdSettings(createServices({ orchDir }), [...args])`. Give it a fourth parameter
`project: string | null = null`, and when it is not null call
`cmdSettings(createServices({ orchDir, settings: projectViewSettingsManager(project, fileSettingsManager(orchDir)) }), [...args])`
instead (import both from `../src/settings/manager.ts`). Add
`runProjectSettings(orchDir, project, extraEnv, ...args)` and
`runProjectSettingsExpectingFailure(orchDir, project, extraEnv, ...args)` beside `runSettings`
and `runSettingsExpectingFailure`, passing `project` through. Tests in a new
`describe("orch settings in a project", ...)`, each with a fresh `tempDir()` install written by
`writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } })` and a fresh
project directory `tempDir()`:
1. "a write lands in the project file, created on first write":
   `runProjectSettings(dir, project, {}, "workers.verify_commands", '["bunx oxlint"]')`; the
   output contains `path.join(project, ".orch", "settings.json")`; that file parses to an
   object whose `workers.verify_commands` is `["bunx oxlint"]`; the install file
   `path.join(dir, "settings.json")` does not contain `bunx oxlint`.
2. "an install-only key lands in the install file": `"daemon.tcp_port", "4000"`; the install
   file contains `4000`; no project file exists.
3. "--install writes the install file's value": `"workers.verify_commands", '["go vet"]', "--install"`;
   the install file contains `go vet`; no project file exists.
4. "--install is refused for an agent": with the `asAgent()` env the file's other agent tests
   use (`{ [LAUNCH_ENV]: mintAgentId() }`), `runProjectSettingsExpectingFailure(dir, project, asAgent(), "workers.verify_commands", '["go vet"]', "--install")`
   has a message containing `--install`. Define `asAgent` at file scope if it is local to
   another describe now, and use it in both places.
5. "--clear removes the project's value": write `["bunx oxlint"]` to the project, then
   `"workers.verify_commands", "--clear"`; the output contains "cleared"; the project file's
   `workers` holds no `verify_commands`.
6. "the table and --json name the project as the source":
   `writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } })`;
   `settingsReport(await runProjectSettings(dir, project, {}, "--json"))["workers.verify_commands"]`
   equals `{ value: ["bunx oxlint"], source: "project", agentWritable: true }`; the table output
   (no `--json`) contains `project   ` followed by the project file path.
7. "an invalid project file shows its error and refuses a write":
   `writeProjectSettingsText(project, '{"runtime":"node"}')`; the table output contains
   `install-only`; `runProjectSettingsExpectingFailure(dir, project, {}, "workers.verify_commands", '["x"]')`
   has a message containing `install-only`.
Import `writeProjectSettingsFixture, writeProjectSettingsText` from `../test/helpers/settings.ts`
(merge with the existing import of that module).
Verify: packages/orch/test/settings-command.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The editor's views and the council's directory
Edit `packages/orch/test/settings-shell.test.ts`. It builds a `Session` literal over
`fileSettingsManager(directory)` with `views: { install: manager, project: null }, view: "install"`.
Add a `describe("the Project and Install views", ...)` with:
1. "the Project view lists only project keys and shows the project's source": install
   `writeSettingsFixture(directory, { workers: { verify_commands: ["go vet"] } })`, a fresh
   project directory with `writeProjectSettingsFixture(project, { workers: { verify_commands: ["bunx oxlint"] } })`;
   `const rows = loadEntries(projectSettingsManager(project, fileSettingsManager(directory)))`;
   no row has `spec.scope` "install"; the `workers.verify_commands` row has
   `value` `["bunx oxlint"]` and `source` "project"; the `fleet.max_agents_per_tab` row has
   source "default" or "install".
2. "Tab switches the view and keeps the focused key": a `Session` with
   `views: { install, project: projectSettingsManager(project, install) }, view: "project"`,
   `state: createEditorState(loadEntries(<the project manager>))`, focused on
   `workers.verify_commands`; `switchView(session)`; `session.view` is "install", the focused
   row's key is still `workers.verify_commands`, and `session.state.settings` holds a row with
   `spec.scope` "install".
3. "with no project file there is only the Install view": `views.project` null; `switchView`
   leaves `view` "install" and sets a `status` containing "only the Install view".
Import `projectSettingsManager` from `../src/settings/manager.ts`, `switchView` from
`../src/settings/shell/state.ts`, `writeProjectSettingsFixture` from `./helpers/settings.ts`.
Edit `packages/orch/test/council-handlers.test.ts`: add a test in its existing describe:
"a council's round limit is its directory's project setting": `const { dir, state } = seeded(["ada"]);`
`writeProjectSettingsFixture(dir, { council: { rounds: 1 } });` one asked and scored round as
the existing round-limit test does for round 1; then
`expect(councilRound(state, { ...ref(dir), subject: "go" })).rejects.toThrow("has run its 1 rounds")`.
(`ref(dir)` uses `dir` as the council's directory, so `dir/.orch/settings.json` is its project file.)
Verify: packages/orch/test/settings-shell.test.ts packages/orch/test/council-handlers.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
