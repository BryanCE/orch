# W14: tests for project writes

Context. orch now has a project settings file per project directory (`.orch/settings.json` by
default), whose keys override the install file `$ORCH_DIR/settings.json`. Paths are from the
repo root `/home/bryan/orch`. No `as` casts, no `any`. A test never writes outside a temp
directory it made.

## T1 Project manager writes
Edit `packages/orch/test/project-settings.test.ts`. It already has the helpers `install(settings)`
(returns a `fileSettingsManager` over a fresh temp install) and `project()` (returns a fresh temp
directory). Add imports: `existsSync`, `readFileSync` from `node:fs` (merge with the existing
`node:fs` import), `projectSettingsManager` and `projectViewSettingsManager` and
`installManagerOf` from `../src/settings/manager.ts` (merge), `writeRegisteredSetting` and
`clearRegisteredSetting` from `../src/settings/registry.ts`. Add a
`describe("project writes", ...)` after the existing describe, with these tests:
1. "the first write creates the file and its directory": `const manager = install({}); const dir = project();`
   `writeRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands", ["bunx oxlint"]);`
   then `JSON.parse(readFileSync(path.join(dir, ".orch", "settings.json"), "utf8"))` equals
   `{ schemaVersion: 1, workers: { verify_commands: ["bunx oxlint"] } }`, and
   `readFileSync(manager.file, "utf8")` does not contain `bunx oxlint`.
2. "a project write leaves the install file alone and wins over it": install
   `{ workers: { verify_commands: ["go vet"] } }`; write `["bunx oxlint"]` through the project
   manager; `projectSettingsManager(dir, manager).current().workers.verify_commands` is
   `["bunx oxlint"]` and `manager.current().workers.verify_commands` is `["go vet"]`.
3. "an install-only key is refused on write, by name": `expect(() => writeRegisteredSetting(projectSettingsManager(dir, manager), "daemon.tcp_port", 9)).toThrow("install-only")`,
   and `existsSync(path.join(dir, ".orch", "settings.json"))` is false.
4. "a council lineup outside the merged models.allowed is refused": install
   `{ models: { allowed: { pi: ["openai-codex/gpt-6-luna"] } } }`; writing
   `council.models` = `{ pi: ["openai-codex/gpt-6.2-sol:medium"] }` through the project manager
   throws an error containing `council.models.pi`.
5. "a clear removes the project's value so the install's applies": install
   `{ workers: { verify_commands: ["go vet"] } }`; write `["bunx oxlint"]` through the project
   manager, then `clearRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands")`;
   the merged `workers.verify_commands` is `["go vet"]`.
6. "a write to an invalid project file is refused": `writeProjectSettingsText(dir, "{ nope")`;
   writing `workers.verify_commands` through the project manager throws an error containing
   "expected valid JSON".
7. "the install's own directory has no project manager": `const home = project(); const orchDir = orchDirAt(path.join(home, ".orch")); writeSettingsFixture(orchDir, {});`
   `expect(() => projectSettingsManager(home, fileSettingsManager(orchDir))).toThrow("no project file")`.
8. "a view reads the merged settings and writes the install file": install
   `{ workers: { verify_commands: ["go vet"] } }`, project file `{ workers: { verify_commands: ["bunx oxlint"] } }`
   via `writeProjectSettingsFixture`; `const view = projectViewSettingsManager(dir, manager);`
   `view.current().workers.verify_commands` is `["bunx oxlint"]`; `installManagerOf(view)` is
   `manager` (`toBe`); `writeRegisteredSetting(view, "fleet.max_agents_per_tab", 6)` lands in
   the install file: `manager.current().fleet.max_agents_per_tab` is 6.
Import `orchDirAt` from `../src/orch-dir.ts` if the file does not import it yet.
Verify: packages/orch/test/project-settings.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
