# W8: the CLI reads its project, `orch settings` writes it, the editor's two views, the docs

Context for every section. orch now has a project settings file per project directory,
`<project directory>/.orch/settings.json` by default (`project.file`), whose keys override the
install file `$ORCH_DIR/settings.json`. An install-only key (`isInstallOnlyKey` in
`packages/orch/src/settings/schema.ts`) lives only in the install file. Built so far:
- `packages/orch/src/settings/project.ts`: `projectFilePath(directory, install): string | null`
  (null in the install's own directory), `projectSettings(directory, install): ProjectSettings`
  with `{ file: string | null; state: { kind: "none" } | { kind: "ok" } | { kind: "invalid"; message: string }; settings: OrchSettings; values: ProjectSettingsFile | null }`.
- `packages/orch/src/settings/manager.ts`: `projectSettingsManager(directory, install)` (reads
  merged, writes the project file) and `projectViewSettingsManager(directory, install)` (reads
  merged, writes the install file).
- `SettingSpec.scope` is `"project" | "install"`. `SettingSource` is
  `"flag" | "project" | "install" | "default"`.
- `projectRoot()` in `packages/orch/src/util.ts` is the project directory of this process.
Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. The tree's typecheck
has known errors under `packages/orch/src/daemon/server/`; ignore those.

Shapes other sections build against:
- `SettingsScope` in `packages/orch/src/types/services.ts` gains a third member
  `{ readonly kind: "view"; readonly directory: string; readonly install: SettingsManager }`,
  and `projectViewSettingsManager` returns a manager with that scope.
- `packages/orch/src/settings/manager.ts` exports
  `installManagerOf(settings: SettingsManager): SettingsManager`.
- `packages/orch/src/settings/shell/index.ts` exports
  `interface SettingsViews { readonly install: SettingsManager; readonly project: SettingsManager | null }`
  and `runSettingsEditor(views: SettingsViews, offers: HarnessOffers): Promise<void>`.

## T1 The view scope and the CLI's settings
Edit `packages/orch/src/types/services.ts`, the `SettingsScope` type: add a member
`| { readonly kind: "view"; readonly directory: string; readonly install: SettingsManager }`
and change its doc comment to: "Which file a manager writes: the install file; one project
directory's file over its install's; or, for a view, the install file under a project's
merged reads."
Edit `packages/orch/src/settings/manager.ts`:
- In `projectViewSettingsManager`, `scope: install.scope,` becomes
  `scope: { kind: "view", directory, install },`.
- Add at the end:
  ```ts
  /** The install file's own manager behind `settings`: itself, or the install a project manager or a view reads under. */
  export function installManagerOf(settings: SettingsManager): SettingsManager {
    return settings.scope.kind === "install" ? settings : settings.scope.install;
  }
  ```
Edit `packages/orch/src/commands/index.ts` L206, `const services = createServices();`:
- It becomes
  ```ts
  const orchDir = envOrchDir();
  const services = createServices({ orchDir, settings: projectViewSettingsManager(projectRoot(), fileSettingsManager(orchDir)) });
  ```
- Add the imports that are missing: `envOrchDir` from `../orch-dir.ts`, `projectRoot` from
  `../util.ts`, `fileSettingsManager` and `projectViewSettingsManager` from
  `../settings/manager.ts`. If a local named `orchDir` already exists in `runCommand`, name the
  new one `installDir`.
Edit `packages/orch/extensions/pi/compose.ts`:
- `const settings = fileSettingsManager(orchDir);` becomes
  `const settings = projectViewSettingsManager(projectRoot(), fileSettingsManager(orchDir));`.
- Import `projectViewSettingsManager` beside `fileSettingsManager` from
  `orch/core/settings/manager.ts`, and `projectRoot` from `orch/core/util.ts`.
Verify: packages/orch/src/types/services.ts packages/orch/src/settings/manager.ts packages/orch/src/commands/index.ts packages/orch/extensions/pi/compose.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 `orch settings`: where a write lands, `--install`, `--clear`, the sources
Edit `packages/orch/src/commands/registry.ts`, the `settings` command entry (about L431):
- `args: "[<key> <value>]"` becomes `args: "[<key> [<value>]]"`.
- Its `flags` array gains, after the PLEXER entry:
  ```ts
  { name: "--install", arity: "none", help: "Write or clear the install file's value, which every project without its own inherits." },
  { name: "--clear", arity: "none", help: "Remove the key so it falls back: from the project file, or with --install from the install file." },
  ```
Edit `packages/orch/src/commands/settings.ts`:
- Imports to add: `clearRegisteredSetting` into the existing `../settings/registry.ts` import;
  `projectRoot`, `valueAtPath` into the existing `../util.ts` import;
  `import { installManagerOf, projectSettingsManager } from "../settings/manager.ts";`;
  `import { projectFilePath, projectSettings, type ProjectSettings } from "../settings/project.ts";`;
  `type SettingsManager` into the existing `../types/services.ts` type import.
- `refuseUngrantedAgentWrite(services, key)` gains a third parameter `install = false`. After
  the operator check, add:
  ```ts
  if (install) die(`--install writes the install file every project inherits, and that is the user's. An agent's write lands in its own project's file. Ask the user to run: orch settings ${key} <value> --install`);
  ```
- Add after `writableSpec`:
  ```ts
  /** The file a write of `spec` lands in: the install file for an install-only key, for
   *  `--install`, and in the install's own directory; the project file of this directory otherwise. */
  function settingsTarget(services: Pick<Services, "settings">, spec: SettingSpec, install: boolean): SettingsManager {
    const installManager = installManagerOf(services.settings);
    try {
      if (install || spec.scope === "install" || projectFilePath(projectRoot(), installManager) === null) return installManager;
      return projectSettingsManager(projectRoot(), installManager);
    } catch (error: unknown) {
      die(errorMessage(error));
    }
  }
  ```
- `setSingleSetting(services, key, input)` gains a fourth parameter `install: boolean`. Its
  `refuseUngrantedAgentWrite(services, key)` call passes `install`. Its
  `writeRegisteredSetting(services.settings, key, parsed.value)` becomes
  `const target = settingsTarget(services, spec, install);` before the try and
  `writeRegisteredSetting(target, key, parsed.value)` inside it. The output line becomes
  `process.stdout.write(\`${key} = ${formatValue(parsed.value)} in ${target.file}\n\`);`.
- Add after `setSingleSetting`:
  ```ts
  /** `orch settings <key> --clear`: remove the key so it falls back to the next file, then the default. */
  async function clearSingleSetting(services: DaemonClient, key: string, install: boolean): Promise<void> {
    const spec = writableSpec(key);
    await refuseUngrantedAgentWrite(services, key, install);
    const target = settingsTarget(services, spec, install);
    try { clearRegisteredSetting(target, key); } catch (error: unknown) { die(errorMessage(error)); }
    process.stdout.write(`${key} cleared in ${target.file}\n`);
  }
  ```
- `collectSettingsProvenance(services, settings)` gains a third parameter
  `project: ProjectSettings`. Its `const source = raw !== undefined ? "install" : "default";`
  becomes:
  ```ts
  const inProject = project.values !== null && valueAtPath(project.values, spec.key.split(".")) !== undefined;
  const source = inProject ? "project" : raw !== undefined ? "install" : "default";
  ```
- `printSettingsOutput(services, settings, provenance, json)` gains a fifth parameter
  `project: ProjectSettings`. In the table branch, directly after the line that writes
  `settings  ${services.settings.file}`, which becomes
  `process.stdout.write(\`settings  ${installManagerOf(services.settings).file}\n\`);`, add:
  ```ts
  if (project.file !== null) process.stdout.write(`project   ${project.file}${project.state.kind === "none" ? " (none yet)" : ""}\n`);
  if (project.state.kind === "invalid") process.stdout.write(`\n  ${project.state.message}\n  The install settings apply until it is fixed, and a write to it is refused.\n`);
  ```
  and remove the `\n` that the `settings  ...` line ended with only if the output then has
  two blank lines in a row; otherwise keep it. In the JSON branch, before the
  `process.stdout.write(JSON.stringify(out...` line, add
  `out.project_file = { value: project.file, source: project.state.kind, agentWritable: false };`
  and, when invalid, `out.project_error = { value: project.state.message, source: "invalid", agentWritable: false };`.
- In `settingsRoot`:
  - Replace `if (key !== undefined && input !== undefined && positional.length === 2) return setSingleSetting(services, key, input);`
    with:
    ```ts
    const install = flags.has("--install");
    if (flags.has("--clear")) {
      if (key === undefined || positional.length !== 1) throw usageError(invocation);
      return clearSingleSetting(services, key, install);
    }
    if (key !== undefined && input !== undefined && positional.length === 2) return setSingleSetting(services, key, input, install);
    if (install) throw usageError(invocation);
    ```
  - Replace `const settings = currentSettings(services);` with:
    ```ts
    let project: ProjectSettings;
    try { project = projectSettings(projectRoot(), installManagerOf(services.settings)); } catch (error: unknown) { die(errorMessage(error)); }
    const settings = project.settings;
    ```
  - Pass `project` as the new last argument to `collectSettingsProvenance` and
    `printSettingsOutput`.
- `launchSettingsEditor(services)`: its body's
  `await runSettingsEditor(services.settings, setupProbes(services).offers);` becomes:
  ```ts
  const install = installManagerOf(services.settings);
  const project = projectFilePath(projectRoot(), install) === null ? null : projectSettingsManager(projectRoot(), install);
  await runSettingsEditor({ install, project }, setupProbes(services).offers);
  ```
  inside the existing try.
Verify: packages/orch/src/commands/registry.ts packages/orch/src/commands/settings.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The editor's Project and Install views
Edit `packages/orch/src/settings/shell/state.ts`:
- Add `errnoCode` to the `../../util.ts` import.
- Replace `sourceFor` and `loadEntries` with:
  ```ts
  /** A settings file's raw root. An absent project file is empty; an unreadable install file is an error. */
  function rawRoot(file: string, absentIsEmpty: boolean): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(files.readFileSync(file, "utf8"));
      return isRecord(parsed) ? parsed : {};
    } catch (error: unknown) {
      if (absentIsEmpty) return {};
      if (errnoCode(error) === "ENOENT") throw new Error(`Could not read ${file}: ${errorMessage(error)}`);
      throw new Error(`Could not read ${file}: ${errorMessage(error)}`);
    }
  }

  function sourceFor(spec: SettingSpec, project: Record<string, unknown>, install: Record<string, unknown>): SettingSource {
    if (rawValue(project, spec.key) !== undefined) return "project";
    return rawValue(install, spec.key) === undefined ? "default" : "install";
  }

  /** Rebuild every row from disk so value and provenance show what the files hold. A project
   *  manager's rows are the keys a project may set, each with the value it has or inherits. */
  export function loadEntries(manager: SettingsManager): EditorSetting[] {
    const scope = manager.scope;
    const project = scope.kind === "project" ? rawRoot(manager.file, true) : {};
    const install = rawRoot(scope.kind === "install" ? manager.file : scope.install.file, false);
    const settings = manager.current();
    const specs = scope.kind === "project" ? SETTINGS_REGISTRY.filter((spec) => spec.scope === "project") : SETTINGS_REGISTRY;
    return specs.map((spec) => ({
      spec, value: spec.read(settings), source: sourceFor(spec, project, install), agentWritable: agentMayWriteSetting(settings, spec.key),
    }));
  }
  ```
  Then simplify `rawRoot`'s catch to one `throw new Error(...)` after the `absentIsEmpty`
  check, and drop `errnoCode` from the import again if it is unused.
- `interface Session` gains two fields after `filterKeySpent`:
  ```ts
  /** The files the editor can show. `project` is null in the install's own directory. */
  readonly views: { readonly install: SettingsManager; readonly project: SettingsManager | null };
  /** Which file the rows show and a save writes. */
  view: "project" | "install";
  ```
- Add after `interface Session`:
  ```ts
  /** The manager the shown view reads and writes. */
  export function activeManager(session: Session): SettingsManager {
    return session.view === "project" && session.views.project !== null ? session.views.project : session.views.install;
  }

  /** `Tab`: show the other file's settings, keeping the focused key when it is in both. */
  export function switchView(session: Session): void {
    if (session.views.project === null) {
      session.status = "this directory holds the install file, so it has only the Install view";
      return;
    }
    const focusKey = session.state.settings[session.state.focusedIndex]?.spec.key ?? "";
    session.view = session.view === "project" ? "install" : "project";
    reloadRows(session, activeManager(session), focusKey);
    session.status = session.view === "project" ? `Project: ${session.views.project.file}` : `Install: ${session.views.install.file}`;
  }
  ```
Edit `packages/orch/src/settings/shell/edit.ts`, `browseKey`: directly after the `escape`
branch, add
```ts
if (info.name === "tab") {
  switchView(session);
  return;
}
```
and import `switchView` from `./state.ts`. Find the browse keybar text constant
(`BROWSE_KEYBAR`) and add `tab project/install` to it in the same style as its other entries.
Edit `packages/orch/src/settings/shell/index.ts`:
- Export
  `export interface SettingsViews { readonly install: SettingsManager; readonly project: SettingsManager | null }`.
- `runSettingsEditor(manager: SettingsManager, offers)` becomes
  `runSettingsEditor(views: SettingsViews, offers: HarnessOffers)`. Inside:
  `repairSettingsFile(manager)` takes `views.install`; the session literal gains
  `views,` and `view: views.project === null ? "install" : "project",`, and its `state` is
  `createEditorState(loadEntries(views.project ?? views.install))`; in the loop,
  `browseOnce(session, manager)` and `editFocused(session, manager, offers)` take
  `activeManager(session)` in place of `manager`. Import `activeManager` from `./state.ts`.
- Every other file in `packages/orch/src/` and `packages/orch/test/` that builds a `Session`
  literal: grep `filterKeySpent:` and add `views: { install: <the manager it uses>, project: null }, view: "install",`
  to each. List them in your report.
Verify: packages/orch/src/settings/shell/state.ts packages/orch/src/settings/shell/edit.ts packages/orch/src/settings/shell/index.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The docs
Edit `packages/orch/help/settings.md`:
- Replace its first paragraph (L1-3, "Read or change orch's configuration. ... Two words set one
  key:") with:
  ```
  Read or change orch's configuration. Bare `orch settings` prints every effective setting and
  where its value came from (project, install or default); on a terminal it opens the editor,
  where `Tab` switches between the Project and the Install view. Two words set one key:
  ```
- Replace L7-8 ("The file is `$ORCH_DIR/settings.json` ... Every number orch uses is a setting
  there.") with:
  ```
  Two files hold settings, both plain JSON the user may edit by hand. The install file,
  `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), holds every setting and serves
  every project on the machine. A project file, `.orch/settings.json` in a project's directory
  (the `project.file` setting), holds that project's own values, and each key set there
  overrides the install's. A project is the directory a lead orch or the human runs orch in;
  an agent belongs to its spawner's project, wherever it launches. A subdirectory is its own
  project. Install-only keys, the ones about the machine, the install or orchd itself, live
  only in the install file.

  A write lands in the project file of the directory you are in, and an install-only key in
  the install file. `--install` writes the install file's value of a project key, the one every
  project without its own inherits. `--clear` removes a key so it falls back: from the project
  file, or with `--install` from the install file.

      orch settings workers.verify_commands '["bunx oxlint"]'
      orch settings workers.verify_commands --clear
  ```
- Replace L10-12 ("An agent may write only the keys ... `orch settings grant <key>`.") with:
  ```
  An agent may write only the keys the user granted it: by default `workers.verify_commands`
  and `locked_commands.commands`. Its write lands in its own project's file, so it changes no
  other project. A refusal names the keys it may set. To widen that, ask the user to run
  `orch settings grant <key>`. `--install` is the user's alone.
  ```
Edit `packages/orch/README.md`:
- L150-152, the sentence ending "which commands verify its work (`workers.verify_commands`)."
  becomes "which commands verify its work (`workers.verify_commands`, from the worker's
  project)."
- After the `### Commands that agents run` list (the bullet that starts
  "- `denied_commands`:", about L265), add a paragraph:
  ```
  These four are a project's: set them from the project's directory and they land in its
  `.orch/settings.json`, so each project keeps its own checks and locks. `orch help settings`
  has the two files.
  ```
Edit `packages/orch/skills/orch/reference/fleet.md` L5-16: replace "Before the first wave, set
the checks from the project's scripts. Keep what `orch settings` already shows. For a Bun
project:" with "Before the first wave, set the project's checks from its scripts. Keep what
`orch settings` already shows. The values land in the project's own `.orch/settings.json`, so
they change no other project. For a Bun project:". Leave the two commands as they are.
Edit `packages/orch/help/council.md` L13: after the sentence that starts "Who sits on a council
is the `council.models` setting", add the sentence "Both `council.models` and `council.rounds`
can be a project's own, set from its directory."
Edit `packages/orch/skills/orch-council/SKILL.md` L100-101: "the `council.models` row of
`orch settings`" becomes "the `council.models` row of `orch settings`, in its Project view".
Verify: none. These are docs.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
