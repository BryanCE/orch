# W19: tests for the launch policy, the held relaunch env and Claude's worker files

Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. Run only the test file you wrote or edited, once, from the root: `bun test packages/orch/test/<file>`. These exist:
- `launchPolicy(services: Pick<DaemonServices, "settingsFor" | "models">, request, refusal): LaunchPolicy` in `packages/orch/src/daemon/server/launch-policy.ts`. `request` is `{ adapter: AgentAdapter; project: string; model: string | undefined; name: string; readOnly: { out: string | null } | null }`; `refusal` is `(message: string) => Error`. `LaunchPolicy` is `{ workers, tools, env, preferredModels }`.
- `testDaemonServices({ orchDir, models })` in `packages/orch/test/helpers/services.ts`: its `settingsFor(dir)` reads `<dir>/.orch/settings.json` over the install settings.
- `writeProjectSettingsFixture(directory, settings)` and `writeClaudeInstallSettings(orchDir)` in `packages/orch/test/helpers/settings.ts`; `tempOrchDir(prefix)` and `removeTempDir(dir)` in `packages/orch/test/helpers/tempdir.ts`; `testLaunch()` in `packages/orch/test/helpers/launch.ts`.
- An empty model catalogue: `{ read: () => "", warm: () => Promise.resolve(), forget: () => undefined }`. With it a compaction point keyed by a model name is kept as written.

## T1 launchPolicy on its own
Create `packages/orch/test/launch-policy.test.ts`. One `describe("launchPolicy", ...)`. Each test makes its own `tempOrchDir("orch-launch-policy-")` for the orchDir and another for the project directory, and removes both in `afterEach`. `services = testDaemonServices({ orchDir, models: <the empty catalogue> })`. `refusal = (message: string) => new Error(message)`. Adapters from `resolveAdapterOrDie(id)` (`packages/orch/src/daemon/server/spawn/models.ts`).
Cases:
1. "an agent that is not read-only takes its project's policy, compaction point included": project file `{ workers: { compact_at_tokens: { claude: { haiku: 100000 } } }, models: { preferred: { claude: ["haiku"] } } }`. `launchPolicy(services, { adapter: claude, project, model: "haiku", name: "a", readOnly: null }, refusal)`:
   `env` toEqual `{ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000" }`; `workers.readOnly` toBeNull; `workers.compactAtTokens.claude` toEqual `{ haiku: 100000 }`; `preferredModels` toEqual `["haiku"]`.
2. "a project with no point launches with no compaction env": no project file. Same request: `env` toEqual `{}`; `preferredModels` toEqual `[]`.
3. "two projects give two policies": project A sets the point as in case 1, project B has no file. Launch A's env has the key, launch B's env toEqual `{}`.
4. "a read-only agent takes the read-only policy": no project file. pi, `readOnly: { out: null }`: `workers.allowTools` toEqual `["read", "grep", "find", "ls", "orch_ask"]`. pi with `readOnly: { out: "/repo/out/a" }`: `workers.readOnly` toEqual `{ out: "/repo/out/a" }` and `workers.allowTools` toEqual `["read", "grep", "find", "ls", "edit", "write", "orch_ask"]`. claude, model "haiku", `readOnly: { out: "/repo/out" }`: `env` toEqual `{ ORCH_READ_ONLY: "1", ORCH_OUT_DIR: "/repo/out" }`.
5. "a harness that cannot refuse a tool call is refused read-only, with the one message": codex, `readOnly: { out: null }`, name "rev": `toThrow("codex cannot run rev read-only: orch has no way to refuse its tool calls. Launch it on one of: pi, omp, claude.")`. The same request with `readOnly: null` does not throw.
If an expected value is off, print what you got in your report line and stop; do not change the source.
Verify: packages/orch/test/launch-policy.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".

## T2 A held relaunch starts with the new env
Edit `packages/orch/test/held-pty.test.ts`. Add one test, in the describe that holds the test at L54, built the way that file already builds its `PtyHold` over `FakePtyProvider` (`packages/orch/test/helpers/fake-pty.ts`; `FakePty` keeps its whole spawn `request`, env included):
"a relaunch starts its program with the env it is given, not the old one's":
- `start("agent-1", { file: "sh", args: ["-c", "old"], cwd: "/tmp", env: { KEEP: "1", STALE: "1" } })`, take its pid.
- `relaunchPid(pid, ["-c", "new"], { KEEP: "1", FRESH: "2" })`. The fake PTY must exit for the relaunch to go on: kill the old fake PTY the way the file's other tests end one, or check whether `FakePty.kill()` fires its exit on its own (read `fake-pty.ts`).
- The provider's last spawned PTY's `request.env` toEqual `{ KEEP: "1", FRESH: "2" }`, and its `request.args` toEqual `["-c", "new"]`, and its `request.cwd` is `"/tmp"`.
Do not use `ChildPtyProvider` or anything that starts a real process.
Verify: packages/orch/test/held-pty.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".

## T3 Claude's worker settings snapshots
Edit `packages/orch/test/claude-adapter.test.ts`. Add one `describe("worker settings snapshots", ...)` at the end. Each test makes its own `tempOrchDir("orch-claude-workers-")` (not the file's shared `orchDir`) and removes it after. Write the install file at `claudeSettingsPath(dir)` (already imported) yourself with `fs.mkdirSync(path.dirname(file), { recursive: true })` and `fs.writeFileSync(file, JSON.stringify(install))`, where
`install = { model: "x", hooks: Object.fromEntries(CLAUDE_HOOK_EVENTS.map((event) => [event, [{ hooks: [{ type: "command", command: \`orch-hook ${event}\` }] }]])) }` (`CLAUDE_HOOK_EVENTS` from `../src/adapters/claude-hooks.ts`).
A helper in the describe: `settingsFileOf(argv: readonly string[]): string` returns the element after `"--settings"`, and throws when there is none. Policies: `const base = testLaunch().workers;` (`testLaunch` from `./helpers/launch.ts`), `withPlugins = (ids: string[]) => ({ ...base, excludeExtensions: { ...base.excludeExtensions, claude: ids } })`.
Cases:
1. "policies that differ get two files, each with its own plugins and the install's keys": `a = settingsFileOf(claudeAdapter.interactiveArgv({ orchDir: dir, workers: withPlugins(["one@m"]) }))`, `b` the same with `["two@m"]`. `a !== b`. Parse each file: `enabledPlugins` toEqual `{ "one@m": false }` and `{ "two@m": false }`; each `model` is `"x"`; each `hooks` toEqual `install.hooks`. Both paths match `/settings\.[0-9a-f]{64}\.json$/` and sit in `path.dirname(claudeSettingsPath(dir))`.
2. "equal policies share a file; a changed install file gives a new one and leaves the old": two launches with `withPlugins(["one@m"])` give the same path. Rewrite the install file with `model: "y"`; the next launch gives a new path; the first file's text is unchanged (read it before and after).
3. "a read-only policy turns the account's connectors off, an inheriting one does not": `{ ...base, inheritMcp: false }` gives a file whose `env.ENABLE_CLAUDEAI_MCP_SERVERS` is `"false"`; `{ ...base, inheritMcp: true }` gives a file with no `env` key `ENABLE_CLAUDEAI_MCP_SERVERS` (check `env` is absent or lacks the key).
4. "a launch never changes the install file": the install file's text is the same before and after two launches.
5. "a launch refuses a bad install file": each with `workers: base`, `expect(() => claudeAdapter.interactiveArgv({ orchDir: dir, workers: base })).toThrow(<text>)`:
   - no install file: `"run orch setup"`;
   - `{ model: "x" }` with no hooks: `"run orch setup"`;
   - hooks missing `"Stop"`: `"run orch setup"`;
   - text `"{not json"`: `"fix the JSON by hand"`;
   - a directory made at the install file's path: `"fix the JSON by hand"`.
6. "headless and resume launches pass a worker file too": `claudeAdapter.headlessCmd("reply", { orchDir: dir, workers: base })` holds `--settings` followed by a path matching the digest pattern. Same for `claudeAdapter.resume?.argv(...)` if `resume` is not null: read its signature in `packages/orch/src/types/adapter.ts` (`ResumeRole`) and call it with `{ orchDir: dir, workers: base, form: "tui", key: "k" }` plus whatever it requires, and a session id `"s1"`. If its opts type needs fields you cannot fill without a cast, skip the resume half and say so in the report.
7. "an argv with no orchDir writes nothing": `claudeAdapter.interactiveArgv({ workers: base })` has no `--settings`, and `fs.readdirSync(path.dirname(claudeSettingsPath(dir)))` lists only `settings.json`.
8. "a second publish of the same snapshot succeeds and leaves no temp file": two launches with equal policies; the directory lists `settings.json` and exactly one `settings.<digest>.json`, and no name ending `.tmp`.
9. "setup creates the install file from nothing": on a fresh dir with no `claude/` directory, `claudeAdapter.settingsFile.sync(dir, settings)` where `settings = settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({ schemaVersion: SETTINGS_SCHEMA, runtime: "node" }))` (`settingsFromFile` from `../src/settings/read.ts`, the other two from `../src/settings/schema.ts`). Afterwards `claudeSettingsPath(dir)` exists and its parsed `hooks` has every `CLAUDE_HOOK_EVENTS` key.
Leave the existing tests at L186-203 as they are.
If an expected value is off, print what you got in your report line and stop; do not change the source.
Verify: packages/orch/test/claude-adapter.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean, N pass", "pending: <files>", or "blocked: <exact error>".
