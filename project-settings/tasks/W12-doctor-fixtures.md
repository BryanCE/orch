# W12: doctor checks the project file; test fixtures for orchd's install-only settings

Context for every section. orch now has a project settings file per project directory, whose
keys override the install file. orchd's `services.settings.current()` is typed
`InstallSettings` (the install-only keys); `services.settingsFor(directory | null)` gives a
`ProjectSettings` (`{ file; state: { kind: "none" | "ok" } | { kind: "invalid"; message }; settings: OrchSettings; values }`),
and `settingsFor(null).settings` is every key of the install file alone. The work loop's
options gained `settingsFor: (directory: string | null) => ProjectSettings`.
`settingsForProjects(install: SettingsManager)` in `packages/orch/src/settings/project.ts`
builds that function from a manager. Paths are from the repo root `/home/bryan/orch`. No `as`
casts, no `any`.

## T1 Test fixtures
Each line below fails to typecheck. Fix it as said, and change nothing else in the test.
- `packages/orch/test/answer-dispatch.test.ts` L130, L145, L155, L170, L184, and
  `packages/orch/test/control-dispatch.test.ts` L70,
  `packages/orch/test/dispatch-channel-first.test.ts` L52, L65,
  `packages/orch/test/every-agent-has-a-link.test.ts` L56, L68: each passes
  `<services>.settings.current()` (directly, or through a local helper such as
  `settingsFor(directory)` in `answer-dispatch.test.ts`) to `deliverControl`, which takes an
  `OrchSettings`. Use `<services>.settingsFor(null).settings` in its place, where `<services>`
  is the same `testDaemonServices(...)` value. When the value comes from a local helper, fix the
  helper's body once.
- `packages/orch/test/event-identity.test.ts` L62, `packages/orch/test/retention.test.ts`
  L351, `packages/orch/test/work-loop-binding.test.ts` L72, L95,
  `packages/orch/test/work-loop-identity.test.ts` L51, L79, L98: each `runWorkLoop({ ... })`
  call lacks `settingsFor`. Add `settingsFor: settingsForProjects(<the manager passed as settings:>),`
  after its `settings:` property, importing `settingsForProjects` from
  `../src/settings/project.ts`. In `retention.test.ts` the `settings:` value is a hand-built
  manager literal: pass that same `settingsManager` variable to `settingsForProjects`. If its
  type is refused, report the exact error.
- `packages/orch/test/settings-watch.test.ts` L41 and L61: the `changes` array that
  `onChange` pushes to is typed `OrchSettings[]`; type it `InstallSettings[]`, importing
  `type InstallSettings` from `../src/types/settings.ts` (drop `OrchSettings` from the import if
  unused).
Verify: packages/orch/test/answer-dispatch.test.ts packages/orch/test/control-dispatch.test.ts packages/orch/test/dispatch-channel-first.test.ts packages/orch/test/every-agent-has-a-link.test.ts packages/orch/test/event-identity.test.ts packages/orch/test/retention.test.ts packages/orch/test/work-loop-binding.test.ts packages/orch/test/work-loop-identity.test.ts packages/orch/test/settings-watch.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Doctor checks the project file of the directory it runs in
Edit `packages/orch/src/daemon/client/protocol.ts`, the `doctor` request (L691):
`doctor: z.object({ fix: z.boolean(), only: z.array(nonBlank).optional() }),` becomes
```ts
/** `project` is the CLI's project directory: doctor checks its project file, never orchd's own directory. */
doctor: z.object({ fix: z.boolean(), only: z.array(nonBlank).optional(), project: nonBlank }),
```
Edit `packages/orch/src/commands/doctor.ts`: `askDoctor(services, params)` keeps its signature;
its two callers in this file (L41 `{ fix: true, only: toApply }` and L60 `{ fix }`) add
`project: projectRoot()`. Edit `packages/orch/src/commands/setup.ts` L92 and L173 the same way.
Import `projectRoot` from `../util.ts` where missing.
Edit `packages/orch/src/daemon/server/handlers/machine.ts` `doctorRun` (L17-19): pass
`project: params.project` into the `runDoctor({ ... })` options.
Edit `packages/orch/src/daemon/server/doctor/runner.ts`:
- The `DoctorContext` type (the type of `runDoctor`'s `services` parameter) gains
  `readonly project: string;` with the doc comment
  `/** The project directory doctor checks the project file of: the asking CLI's. */`.
- In `runDoctor`, after `settings = fileSettingsManager(orchDir).currentOrNull();` hold the
  manager: change that block to
  ```ts
  const install = fileSettingsManager(orchDir);
  settings = install.currentOrNull();
  ```
  with `install` declared before the `try` as `let install: SettingsManager | null = null;`
  and assigned inside it, so a later check can use it. Import `type SettingsManager` from
  `../../../types/services.ts`.
- Add, right after the `const bins = ...` line:
  ```ts
  // The project's own settings win where they are set, so the lock count and the worktree
  // check read the merged settings of the asking CLI's project.
  let projectFile: ProjectSettings | null = null;
  try {
    projectFile = install !== null && settings !== null ? projectSettings(services.project, install) : null;
  } catch {}
  const merged = projectFile?.settings ?? settings;
  ```
  importing `projectSettings` and `type ProjectSettings` from `../../../settings/project.ts`.
- In the `Promise.all([...])` list: directly after the
  `isolated("settings", "Settings validity", () => checkSettingsFile(orchDir)),` entry, add
  `isolated("project-settings", "Project settings", () => checkProjectSettings(projectFile)),`.
  The `command-locks` entry passes `merged` in place of `settings`:
  `settingsDependent(orchDir, merged, "command-locks", ...)`. Find the `worktree-gitignore`
  entry and pass `merged` and `services.project`: `checkWorktreeGitignore(current, services.project)`
  through the same `settingsDependent(orchDir, merged, ...)`. If those entries do not go
  through `settingsDependent`, pass `merged` the way they pass `settings` now.
Edit `packages/orch/src/daemon/server/doctor/settings-file.ts`:
- `checkWorktreeGitignore(settings)` gains a second parameter `project: string`. In its body,
  `path.join(process.cwd(), directory)` becomes `path.join(project, directory)`, and
  `commandOutput("git", ["check-ignore", "-q", directory])` becomes
  `commandOutput("git", ["-C", project, "check-ignore", "-q", directory])`.
- Add an exported check:
  ```ts
  /** The asking CLI's project file: absent is fine, an invalid one is a finding with its path and
   *  key, and so is a council lineup outside the merged `models.allowed`. */
  export async function checkProjectSettings(project: ProjectSettings | null): Promise<CheckResult> {
    const id = "project-settings";
    const label = "Project settings";
    if (project === null) return { id, label, status: "skip", detail: "settings unavailable" };
    if (project.file === null) return { id, label, status: "ok", detail: "this directory holds the install file, so it has no project file" };
    if (project.state.kind === "none") return { id, label, status: "ok", detail: `no ${project.file}` };
    if (project.state.kind === "invalid") return { id, label, status: "fail", detail: `${project.state.message}\nThe install settings apply until it is fixed.` };
    try {
      requireCouncilModelsAllowed(project.file, project.settings);
    } catch (error: unknown) {
      return { id, label, status: "fail", detail: errorMessage(error) };
    }
    return { id, label, status: "ok", detail: project.file };
  }
  ```
  importing `type ProjectSettings` from `../../../settings/project.ts`,
  `requireCouncilModelsAllowed` from `../../../settings/read.ts`, and `errorMessage` from
  `../../../util.ts` where missing. If the file declares checks without `async`, match the
  file's style.
- Every other caller of `checkWorktreeGitignore` in `packages/orch/src/` and
  `packages/orch/test/`: pass the directory it should check as the second argument; in a test,
  the temp directory the test made.
Edit `packages/orch/test/doctor-settings-defects.test.ts`: add a `describe("project settings", ...)`
with four tests, building a `ProjectSettings` by calling `projectSettings(directory, fileSettingsManager(orchDir))`
over an install fixture written with `writeSettingsFixture` and a project file written with
`writeProjectSettingsText` or `writeProjectSettingsFixture` (both in `./helpers/settings.ts`),
in temp directories made the way this file makes them:
1. no project file: `status` "ok", detail starts with "no ".
2. a project file holding `{"runtime":"node"}`: `status` "fail", detail contains "runtime" and
   "install-only".
3. a project file with bad JSON: `status` "fail", detail contains "expected valid JSON".
4. a project file whose `council.models` names a model outside its `models.allowed`:
   `writeProjectSettingsFixture(dir, { models: { allowed: { pi: ["openai-codex/gpt-6-luna"] } }, council: { models: { pi: ["openai-codex/gpt-6.2-sol:medium"] } } })`:
   `status` "fail", detail contains "council.models.pi".
Verify: packages/orch/src/daemon/client/protocol.ts packages/orch/src/commands/doctor.ts packages/orch/src/commands/setup.ts packages/orch/src/daemon/server/handlers/machine.ts packages/orch/src/daemon/server/doctor/runner.ts packages/orch/src/daemon/server/doctor/settings-file.ts packages/orch/test/doctor-settings-defects.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
