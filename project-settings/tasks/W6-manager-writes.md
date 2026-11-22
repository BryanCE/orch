# W6: the project manager, project writes, the reader's tests

Context for every section. orch is gaining a second settings file per project directory,
`<project directory>/.orch/settings.json`, whose keys override the install file
`$ORCH_DIR/settings.json`. Wave W5 landed: `packages/orch/src/settings/schema.ts` exports
`INSTALL_ONLY_KEYS`, `isInstallOnlyKey`, `PROJECT_SETTINGS_FILE_SCHEMA`,
`type ProjectSettingsFile`; `OrchSettings` has `project: { file: string }`;
`packages/orch/src/settings/project.ts` exports `projectFilePath(directory, install)`,
`parseProjectSettingsText(text, file, installFile)`, `mergeProjectSettings(file, install, project)`,
`projectSettings(directory, install): ProjectSettings` with
`{ file: string | null; state: { kind: "none" } | { kind: "ok" } | { kind: "invalid"; message: string }; settings: OrchSettings; values: ProjectSettingsFile | null }`,
and `validProjectSettings(project)`. Paths are from the repo root `/home/bryan/orch`. No `as`
casts except the one named in T1, no `any`.

Shapes other sections build against:
- `packages/orch/src/types/services.ts`: `SettingsManager` gains
  `readonly scope: SettingsScope`, where
  `export type SettingsScope = { readonly kind: "install" } | { readonly kind: "project"; readonly directory: string; readonly install: SettingsManager };`
- `packages/orch/src/settings/schema.ts` exports `projectSettingsPath(file: string): SettingsFilePath`.
- `packages/orch/src/settings/storage.ts` exports `projectSettingsStorage(file: SettingsFilePath): SettingsStorage`.
- `packages/orch/src/settings/manager.ts` exports
  `projectSettingsManager(directory: string, install: SettingsManager): SettingsManager` and
  `projectViewSettingsManager(directory: string, install: SettingsManager): SettingsManager`.

## T1 The project file's path, its storage, and the registry's scope test
Edit `packages/orch/src/settings/schema.ts`:
- The body of `const FLEET_SCHEMA = z.strictObject({ ... });` is indented 4 spaces. Re-indent
  every line inside it to 2 spaces, like the other sections. Change nothing else in it.
- The doc comment on `export type SettingsFilePath` says "Minted here and nowhere else".
  Replace that sentence with "Minted in this file and nowhere else: `settingsPath` for the
  install file, `projectSettingsPath` for a project's."
- Directly after `export function settingsPath(...) { ... }`, add:
  ```ts
  /** A project's settings file, as `projectFilePath` resolved it. The brand's other mint. */
  export function projectSettingsPath(file: string): SettingsFilePath {
    return file as SettingsFilePath;
  }
  ```
Edit `packages/orch/src/settings/storage.ts`:
- Add `import * as path from "node:path";` and add `type SettingsFilePath` is already imported.
- Rename the body of `fileSettingsStorage` into a new internal function
  `function fileStorageAt(file: SettingsFilePath, ensureDir: () => void): SettingsStorage`
  holding the whole current implementation, where both `ensurePrivateDir(orchDir)` calls
  become `ensureDir()` and `const file = settingsPath(orchDir);` is gone (it is the parameter).
- `fileSettingsStorage` becomes:
  ```ts
  export function fileSettingsStorage(orchDir: OrchDir): SettingsStorage {
    return fileStorageAt(settingsPath(orchDir), () => ensurePrivateDir(orchDir));
  }
  ```
  keeping its doc comment.
- Add after it:
  ```ts
  /** A project's settings file. Its directory is made on the first write. */
  export function projectSettingsStorage(file: SettingsFilePath): SettingsStorage {
    return fileStorageAt(file, () => filesystem.mkdirSync(path.dirname(file), { recursive: true }));
  }
  ```
Edit `packages/orch/test/settings-registry.test.ts`:
- Add `import { INSTALL_ONLY_KEYS, isInstallOnlyKey } from "../src/settings/schema.ts";` (merge
  into an existing import from that module if there is one).
- Add a new `describe("setting scope", ...)` at the end of the file with two tests:
  ```ts
  test("every install-only key is a registered setting, or a section of registered ones, all of scope install", () => {
    for (const entry of INSTALL_ONLY_KEYS) {
      const covered = SETTINGS_REGISTRY.filter((spec) => spec.key === entry || spec.key.startsWith(`${entry}.`));
      expect({ entry, count: covered.length > 0 }).toEqual({ entry, count: true });
      for (const spec of covered) expect({ key: spec.key, scope: spec.scope }).toEqual({ key: spec.key, scope: "install" });
    }
  });

  test("every other registered setting has scope project", () => {
    for (const spec of SETTINGS_REGISTRY.filter((entry) => !isInstallOnlyKey(entry.key))) {
      expect({ key: spec.key, scope: spec.scope }).toEqual({ key: spec.key, scope: "project" });
    }
    expect(registered("workers.verify_commands").scope).toBe("project");
    expect(registered("locked_commands.commands").scope).toBe("project");
    expect(registered("fleet.max_agents_total").scope).toBe("install");
    expect(registered("project.file").scope).toBe("install");
  });
  ```
  `registered` and `SETTINGS_REGISTRY` already exist in that file. If `describe`/`test`/`expect`
  are imported under other names there, use those.
Verify: packages/orch/src/settings/schema.ts packages/orch/src/settings/storage.ts packages/orch/test/settings-registry.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 The manager's scope and the two project managers
Edit `packages/orch/src/types/services.ts`:
- Above `export interface SettingsManager`, add:
  ```ts
  /** Which file a manager writes: the install file, or one project directory's file over its install's. */
  export type SettingsScope =
    | { readonly kind: "install" }
    | { readonly kind: "project"; readonly directory: string; readonly install: SettingsManager };
  ```
- In `interface SettingsManager`, after `readonly file: SettingsFilePath;` and its comment, add:
  ```ts
  /** Which file `update` writes, and so which schema a write is validated with. */
  readonly scope: SettingsScope;
  ```
Edit `packages/orch/src/settings/manager.ts`:
- Add imports: `import { projectFilePath, projectSettings } from "./project.ts";`,
  `import { projectSettingsStorage } from "./storage.ts";` (merge into the existing storage
  import), and `projectSettingsPath` into the existing `./schema.ts` imports.
- In `createSettingsManager`, the returned object gains `scope: { kind: "install" },` after `file: storage.file,`.
- Add at the end of the file:
  ```ts
  /** One project directory's file over its install's. A read gives the merged settings, read now
   *  with no cache. A write lands in the project file, validated as a project file, under the
   *  install's lock policy; the first write creates the file and its directory. */
  export function projectSettingsManager(directory: string, install: SettingsManager): SettingsManager {
    const resolved = projectFilePath(directory, install);
    if (resolved === null) throw new Error(`${directory} is the directory that holds ${install.file}, so it has no project file. Write the install file.`);
    const storage = projectSettingsStorage(projectSettingsPath(resolved));
    const merged = (): OrchSettings | null => install.currentOrNull() === null ? null : projectSettings(directory, install).settings;
    return {
      file: storage.file,
      scope: { kind: "project", directory, install },
      currentOrNull: merged,
      current: () => {
        install.current();
        return projectSettings(directory, install).settings;
      },
      reload: () => {
        install.reload();
        return merged();
      },
      update: (mutate) => storage.withLock(install.current().lock, mutate),
    };
  }

  /** The settings of a process that acts for one project, the CLI or an agent's own process: a
   *  read gives the merged settings of `directory`, read now; a write goes to the install file. */
  export function projectViewSettingsManager(directory: string, install: SettingsManager): SettingsManager {
    const merged = (): OrchSettings | null => install.currentOrNull() === null ? null : projectSettings(directory, install).settings;
    return {
      file: install.file,
      scope: install.scope,
      currentOrNull: merged,
      current: () => {
        install.current();
        return projectSettings(directory, install).settings;
      },
      reload: () => {
        install.reload();
        return merged();
      },
      update: (mutate) => install.update(mutate),
    };
  }
  ```
Edit `packages/orch/test/retention.test.ts`:
- In `settingsFixture` (L42), after the `settings_file: { typo_max_edits: 2 },` line (L65), add
  `project: { file: ".orch/settings.json" },`.
- In the `const settingsManager = { ... }` literal (about L338), add `scope: { kind: "install" as const },`
  after `file: baseSettings.file,`. If the literal is passed where a `SettingsManager` is
  expected and `as const` is refused by the repo's lint, declare it
  `const settingsManager: SettingsManager = { ... }` with `scope: { kind: "install" }` and import
  `type SettingsManager` from `../src/types/services.ts`.
Edit `packages/orch/test/settings.test.ts`: after each of the two
`settings_file: { typo_max_edits: 2 },` lines (L136 and L254), add
`project: { file: ".orch/settings.json" },` at the same indentation.
Verify: packages/orch/src/types/services.ts packages/orch/src/settings/manager.ts packages/orch/test/retention.test.ts packages/orch/test/settings.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 A write to a project file
Edit `packages/orch/src/settings/read.ts`:
- `requireCouncilModelsAllowed(file: string, root: SettingsFile)` reads only
  `root.models?.allowed`, `root.defaults?.models` and `root.council?.models`. Change its
  parameter type to `root: Pick<SettingsFile, "models" | "defaults" | "council">`. Body unchanged.
Edit `packages/orch/src/settings/write.ts`:
- Add imports: `import { mergeProjectSettings, parseProjectSettingsText } from "./project.ts";`
  and `import type { SettingsScope } from "../types/services.ts";` (merge into the existing
  `SettingsManager` type import).
- `setSettingsPath` (L106) and `deleteSettingsPath` (L128) each parse with
  `SETTINGS_FILE_SCHEMA.parse(...)`. Every write is validated whole by its serializer, so drop
  the parse: change each return type to `Record<string, unknown>` and return
  `setSettingsPathRecord(root, segments, value)` and `deleteSettingsPathRecord(root, segments)`
  directly. If `SETTINGS_FILE_SCHEMA` has no other use in the file, remove it from the import.
- Change `updateSettingsFile`'s `mutate` parameter type to
  `(root: Partial<SettingsFile>) => object`.
- Directly above `updateSettingsFile`, add:
  ```ts
  /** Validate and serialize a project file's root. An install-only key is refused by name, and a
   *  council lineup outside the merged `models.allowed` is refused as the install write refuses it. */
  function serializeProjectRoot(file: string, scope: Extract<SettingsScope, { kind: "project" }>, candidate: unknown): string {
    const parsed = parseProjectSettingsText(JSON.stringify(candidate), file, scope.install.file);
    requireCouncilModelsAllowed(file, mergeProjectSettings(file, scope.install.current(), parsed));
    return JSON.stringify({ ...parsed, schemaVersion: SETTINGS_SCHEMA }, null, 2) + "\n";
  }
  ```
- In `updateSettingsFile`, before the existing `settings.update(...)` call, add:
  ```ts
  const scope = settings.scope;
  if (scope.kind === "project") {
    settings.update((current) => {
      const root = current === null ? { schemaVersion: SETTINGS_SCHEMA } : parseProjectSettingsText(current, settings.file, scope.install.file);
      return serializeProjectRoot(settings.file, scope, mutate(root));
    });
    return;
  }
  ```
  If `ProjectSettingsFile` is not assignable to `Partial<SettingsFile>` at the `mutate(root)`
  call, report the exact compiler error and stop.
Verify: packages/orch/src/settings/read.ts packages/orch/src/settings/write.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The reader's tests
Edit `packages/orch/test/helpers/settings.ts`:
- Add imports: `import * as path from "node:path";` and
  `import type { ProjectSettingsFile } from "../../src/settings/schema.ts";` (merge with an
  existing import from that module). `mkdirSync` and `writeFileSync` are already imported; if
  not, import them from `node:fs`.
- Add at the end:
  ```ts
  /** Write raw text as `<directory>/.orch/settings.json`, the default project file. Returns its path. */
  export function writeProjectSettingsText(directory: string, text: string): string {
    const file = path.join(directory, ".orch", "settings.json");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    return file;
  }

  /** Write a schemaVersion-stamped project file into `directory`. Returns its path. */
  export function writeProjectSettingsFixture(directory: string, settings: ProjectSettingsFile): string {
    return writeProjectSettingsText(directory, JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, ...settings }, null, 2) + "\n");
  }
  ```
Create `packages/orch/test/project-settings.test.ts`. Imports: `describe, test, expect, afterEach`
from `bun:test`; `mkdirSync` from `node:fs`; `path` from `node:path`; `tempOrchDir`,
`removeTempDir` from `./helpers/tempdir.ts`; `writeSettingsFixture`, `writeProjectSettingsFixture`,
`writeProjectSettingsText` from `./helpers/settings.ts`; `fileSettingsManager` from
`../src/settings/manager.ts`; `projectSettings` from `../src/settings/project.ts`;
`PROJECT_SETTINGS_FILE_SCHEMA` from `../src/settings/schema.ts`; `type OrchDir` from
`../src/types/core.ts`. Setup: a `dirs: string[]` array, `afterEach` removes each with
`removeTempDir`. A helper `install(settings: Record<string, unknown>)` makes
`tempOrchDir("orch-project-install-")`, pushes it, calls `writeSettingsFixture(orchDir, settings)`,
and returns `fileSettingsManager(orchDir)`. A helper `project()` makes
`tempOrchDir("orch-project-dir-")`, pushes it, and returns it as a string. Tests, one `test` each,
inside `describe("projectSettings", ...)`:
1. "an absent file gives the install's settings": `projectSettings(dir, manager)` has
   `state` `{ kind: "none" }`, `values` null, `file` `path.join(dir, ".orch", "settings.json")`,
   and `settings` equal to `manager.current()`.
2. "a project key overrides the install's and leaves its siblings": install
   `{ workers: { verify_commands: ["go vet"], inherit_mcp: true } }`, project
   `{ workers: { verify_commands: ["bunx oxlint"] } }` gives `settings.workers.verify_commands`
   `["bunx oxlint"]`, `settings.workers.inherit_mcp` true, `state.kind` "ok".
3. "a list replaces the whole list": install `{ locked_commands: { commands: ["go test", "go vet"] } }`,
   project `{ locked_commands: { commands: ["bun test"] } }` gives `["bun test"]`.
4. "an explicit empty list empties the locks": same install, project
   `{ locked_commands: { commands: [] } }` gives `[]`.
5. "bad JSON is invalid and leaves the install's settings": `writeProjectSettingsText(dir, "{ nope")`
   gives `state.kind` "invalid", the message contains the file path and "expected valid JSON",
   and `settings` equals `manager.current()`.
6. "an install-only key is refused by name": for each of
   `['{"runtime":"node"}', "runtime"]`, `['{"daemon":{"tcp_port":9}}', "daemon"]`,
   `['{"fleet":{"max_agents_total":3}}', "fleet.max_agents_total"]`: write the text in a fresh
   `project()` directory; the state is invalid and its message contains the key and "install-only".
7. "a project's models.allowed and workers.allow_tools take effect": project
   `{ models: { allowed: { pi: ["openai-codex/gpt-6-luna"] } }, workers: { allow_tools: ["read"] } }`
   gives those two values in `settings`.
8. "two directories read their own files": two `project()` directories with verify commands
   `["a"]` and `["b"]` give `["a"]` and `["b"]` from the same manager.
9. "a subdirectory does not read its parent's file": project file in `dir` with verify
   `["a"]`; `const sub = path.join(dir, "packages", "web"); mkdirSync(sub, { recursive: true })`;
   `projectSettings(sub, manager).state` is `{ kind: "none" }`.
10. "the install's own directory has no project file": `const home = project()`;
   `const orchDir = orchDirAt(path.join(home, ".orch"))` with `orchDirAt` imported from
   `../src/orch-dir.ts`; `writeSettingsFixture(orchDir, {})`;
   `projectSettings(home, fileSettingsManager(orchDir))`
   gives `file` null and `state` `{ kind: "none" }`.
11. "the project schema's sections are the ones the merge handles":
   `Object.keys(PROJECT_SETTINGS_FILE_SCHEMA.shape).sort()` equals
   `["agents", "council", "defaults", "denied_commands", "fleet", "gated_commands", "locked_commands", "models", "schemaVersion", "workers", "worktrees"]`.
Verify: packages/orch/test/helpers/settings.ts packages/orch/test/project-settings.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
