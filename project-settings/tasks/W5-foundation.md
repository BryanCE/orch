# W5: the project file's schema, the reader, the sources

Context for every section. orch is gaining a second settings file per project directory,
`<project directory>/.orch/settings.json`, whose keys override the install file
`$ORCH_DIR/settings.json`. This wave lays the shared pieces. Paths are from the repo root
`/home/bryan/orch`. No `as` casts, no `any`. Code is TypeScript under `packages/orch/`.

Shapes other sections build against:
- `packages/orch/src/settings/schema.ts` exports `INSTALL_ONLY_KEYS: readonly string[]`,
  `isInstallOnlyKey(key: string): boolean`, `PROJECT_SETTINGS_FILE_SCHEMA`,
  `type ProjectSettingsFile`, `type InstallOnlySection`, `type InstallOnlyFleetKey`, and a new
  settings section `project: { file }` with default `SETTINGS_DEFAULTS.project.file` =
  `".orch/settings.json"`.
- `packages/orch/src/types/settings.ts`: `OrchSettings` gains `project: { file: string }`.
  `SettingSource` is `"flag" | "project" | "install" | "default"`. `SettingSpec` gains
  `readonly scope: "project" | "install"`. New `InstallSettings` type.
- `resolveWithSource` in `packages/orch/src/settings/read.ts` takes
  `{ flag?: T; project?: unknown; install?: unknown; fallback: T }`.

## T1 The schema: install-only keys and the project file's schema
Edit `packages/orch/src/settings/schema.ts`:
- Move the `fleet: z.strictObject({ ... })` value out of `SETTINGS_FILE_SCHEMA` into a new
  `const FLEET_SCHEMA = z.strictObject({ ...same fields and comments... });` declared directly
  above `export const SETTINGS_FILE_SCHEMA`. In `SETTINGS_FILE_SCHEMA` the line becomes
  `fleet: FLEET_SCHEMA.optional(),`.
- In `SETTINGS_DEFAULTS`, after the `settings_file: { typo_max_edits: 2 },` line, add
  `project: { file: ".orch/settings.json" },`.
- Directly above `const FLEET_SCHEMA`, add:
  ```ts
  /** Where a project's settings file sits, relative to the project directory. */
  const ProjectFile = z.string().min(1).refine(
    (value) => !path.isAbsolute(value) && !value.split(/[\\/]/).includes(".."),
    "must be a relative path with no .. segment",
  );
  ```
- In `SETTINGS_FILE_SCHEMA`, directly after the `settings_file: z.strictObject({ ... }).optional(),`
  entry, add:
  ```ts
  /** Where a project keeps its own settings, relative to its directory. */
  project: z.strictObject({
    file: ProjectFile.optional(),
  }).optional(),
  ```
- Directly after `export type SettingsFile = z.infer<typeof SETTINGS_FILE_SCHEMA>;`, add:
  ```ts
  /** The sections that describe the machine, the install or orchd itself. One orchd reads them
   *  for every project at once, so a project value could not mean anything. */
  const INSTALL_ONLY_SECTIONS = {
    runtime: true, enabled: true, skills: true, project: true, settings_file: true,
    daemon: true, links: true, hosts: true, servers: true, lock: true, retention: true,
    logging: true, doctor: true, timeouts: true, queue: true,
    pty: true, attach: true, notify: true, notification: true, monitor: true, monitor_tool: true,
    counts: true, tiling: true,
    spaces: true, mail: true, questions: true,
  } as const;

  /** The fleet caps that span projects. The rest of `fleet` is a project's. */
  const INSTALL_ONLY_FLEET = {
    max_agents_total: true, max_agents_per_space: true, min_free_memory_mb: true, cross_space: true, orch_peers: true,
  } as const;

  export type InstallOnlySection = keyof typeof INSTALL_ONLY_SECTIONS;
  export type InstallOnlyFleetKey = keyof typeof INSTALL_ONLY_FLEET;

  /** The one list of install-only settings: a section, or one key of `fleet`. A key under one
   *  of these is install-only too. */
  export const INSTALL_ONLY_KEYS: readonly string[] = [
    ...Object.keys(INSTALL_ONLY_SECTIONS),
    ...Object.keys(INSTALL_ONLY_FLEET).map((key) => `fleet.${key}`),
  ];

  /** True when `key`, a dotted settings path, may live only in the install file. */
  export function isInstallOnlyKey(key: string): boolean {
    return INSTALL_ONLY_KEYS.some((entry) => key === entry || key.startsWith(`${entry}.`));
  }

  /** A project file: the install file's schema without its install-only keys, every key
   *  optional. Strict at each level, so an install-only key fails by name. */
  export const PROJECT_SETTINGS_FILE_SCHEMA = SETTINGS_FILE_SCHEMA.omit(INSTALL_ONLY_SECTIONS).extend({
    schemaVersion: z.literal(SETTINGS_SCHEMA).optional(),
    fleet: FLEET_SCHEMA.omit(INSTALL_ONLY_FLEET).optional(),
  });

  export type ProjectSettingsFile = z.infer<typeof PROJECT_SETTINGS_FILE_SCHEMA>;
  ```
Verify: packages/orch/src/settings/schema.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 The types, the project section and the precedence order
Edit `packages/orch/src/types/settings.ts`:
- Add `import type { InstallOnlyFleetKey, InstallOnlySection } from "../settings/schema.ts";`
  to the existing `import type { HostSchema, NotifyEntrySchema } from "../settings/schema.ts";`
  line, so it reads
  `import type { HostSchema, InstallOnlyFleetKey, InstallOnlySection, NotifyEntrySchema } from "../settings/schema.ts";`.
- In `interface OrchSettings`, after the `settings_file: { typo_max_edits: number };` line, add
  `project: { file: string };`.
- Directly after the closing `}` of `interface OrchSettings`, add:
  ```ts
  /** The install-only settings: all orchd may read with no project in view. A project key is
   *  read through the merged settings of that project's directory. */
  export type InstallSettings = Pick<OrchSettings, InstallOnlySection> & {
    fleet: Pick<OrchSettings["fleet"], InstallOnlyFleetKey>;
  };
  ```
- Replace `export type SettingSource = "flag" | "settings.json" | "default";` and its comment with:
  ```ts
  /** Where a resolved setting's winning value came from: a flag, the project file, the
   *  install file `$ORCH_DIR/settings.json`, or orch's default. Both files are named
   *  settings.json, so the source names which. */
  export type SettingSource = "flag" | "project" | "install" | "default";
  ```
- In `interface SettingSpec`, after the `readonly type: SettingKind;` line, add:
  ```ts
  /** `install` for a key only the install file may hold; `project` for every other key. */
  readonly scope: "project" | "install";
  ```
Edit `packages/orch/src/settings/read.ts`:
- In `settingsValueExtractors`, after the `settings_file: (root) => ({ ... }),` entry, add:
  ```ts
  project: (root: Partial<SettingsFile>) => ({ file: root.project?.file ?? SETTINGS_DEFAULTS.project.file }),
  ```
  and in `settingsValues`, after `settings_file: settingsValueExtractors.settings_file(root),`, add
  `project: settingsValueExtractors.project(root),`.
- Replace `resolveWithSource` and `resolveSetting` with:
  ```ts
  /** Resolve a setting with its winning source. The ONE precedence order: flag, then the project
   *  file, then the install file, then the default. `resolveSetting` delegates here so the two
   *  can never drift. A value of the wrong shape is skipped. */
  export function resolveWithSource<T>(opts: { flag?: T; project?: unknown; install?: unknown; fallback: T }): { value: T; source: SettingSource } {
    if (opts.flag !== undefined) return { value: opts.flag, source: "flag" };
    if (opts.project !== undefined && hasFallbackShape(opts.project, opts.fallback)) return { value: opts.project, source: "project" };
    if (opts.install !== undefined && hasFallbackShape(opts.install, opts.fallback)) return { value: opts.install, source: "install" };
    return { value: opts.fallback, source: "default" };
  }

  /** Resolve a setting with flag, project, install, and fallback precedence. */
  export function resolveSetting<T>(opts: { flag?: T; project?: T; install?: T; fallback: T }): T {
    return resolveWithSource(opts).value;
  }
  ```
Edit `packages/orch/test/settings.test.ts`:
- Every `resolveSetting(` and `resolveWithSource(` call in the file: rename the `settings:`
  property to `install:`.
- L540: the expected source `"settings.json"` becomes `"install"`.
- In the `describe("resolveWithSource", ...)` block, add a test:
  ```ts
  test("puts the project between the flag and the install", () => {
    expect(resolveWithSource({ flag: 9, project: 5, install: 3, fallback: 1 })).toEqual({ value: 9, source: "flag" });
    expect(resolveWithSource({ project: 5, install: 3, fallback: 1 })).toEqual({ value: 5, source: "project" });
    expect(resolveWithSource({ project: "wrong", install: 3, fallback: 1 })).toEqual({ value: 3, source: "install" });
  });
  ```
Verify: packages/orch/src/types/settings.ts packages/orch/src/settings/read.ts packages/orch/test/settings.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The registry's scope and the source word
Edit `packages/orch/src/settings/registry.ts`:
- Add `isInstallOnlyKey` to the existing import from `"./schema.ts"`.
- In `function setting(...)`, in the returned object after `type: kindFor(key),`, add
  `scope: isInstallOnlyKey(key) ? "install" : "project",`.
- In `HELP`, directly after the `"settings_file.typo_max_edits": ...` entry, add:
  `"project.file": "Where a project keeps its own settings, relative to the project directory. A key there overrides this file, except an install-only key, which only this file may hold.",`
Edit `packages/orch/src/settings/shell/state.ts` L21 (`sourceFor`): `"settings.json"` becomes `"install"`.
Edit `packages/orch/src/settings/view.ts` L86 (`sourceTag`): `entry.source !== "settings.json"` becomes `entry.source !== "install"`.
Edit `packages/orch/src/commands/settings.ts`:
- L376: `resolveWithSource<string>({ settings: settings.defaults.models[harness], ...` — rename
  the property `settings:` to `install:`.
- L392 and L411: the literal `"settings.json"` becomes `"install"`.
Edit `packages/orch/src/commands/selection.ts` L40: in `resolveSetting({ flag: ..., settings: settings.defaults.adapter, ... })`
rename the property `settings:` to `install:`.
Edit `packages/orch/test/settings-editor.test.ts`: both `const spec: SettingSpec = { ... }`
literals (L15, L27) gain `scope: "project",` after the `type,` line.
Edit `packages/orch/test/settings-view.test.ts` L23: the `const spec: SettingSpec = { ... }`
literal gains `scope: "project",` after the `type: ...` line.
Verify: packages/orch/src/settings/registry.ts packages/orch/src/settings/shell/state.ts packages/orch/src/settings/view.ts packages/orch/src/commands/settings.ts packages/orch/src/commands/selection.ts packages/orch/test/settings-editor.test.ts packages/orch/test/settings-view.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 The project reader
Create `packages/orch/src/settings/project.ts` with exactly this content:
```ts
import * as filesystem from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { errnoCode, errorMessage, isRecord } from "../util.ts";
import { INSTALL_ONLY_KEYS, isInstallOnlyKey, PROJECT_SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA, type ProjectSettingsFile } from "./schema.ts";
import { requireEnabledComposition } from "./read.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { SettingsManager } from "../types/services.ts";

/** What was found at a project's settings file. `invalid` carries the message every refusal shows. */
export type ProjectSettingsState =
  | { readonly kind: "none" }
  | { readonly kind: "ok" }
  | { readonly kind: "invalid"; readonly message: string };

/** One project directory's settings, read now. */
export interface ProjectSettings {
  /** The project file's path. Null in the install's own directory, where the install file is the only file. */
  readonly file: string | null;
  readonly state: ProjectSettingsState;
  /** The project file's keys over the install's. The install's alone when the file is absent or invalid. */
  readonly settings: OrchSettings;
  /** The project file's own values. Null when it is absent or invalid. */
  readonly values: ProjectSettingsFile | null;
}

/** The project file of `directory`, or null when that path is the install file itself. */
export function projectFilePath(directory: string, install: SettingsManager): string | null {
  const file = path.resolve(directory, install.current().project.file);
  return file === path.resolve(install.file) ? null : file;
}

/** The install-only keys a raw project root holds, as dotted paths. */
function installOnlyKeysIn(root: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const [key, value] of Object.entries(root)) {
    if (isInstallOnlyKey(key)) found.push(key);
    else if (isRecord(value)) for (const inner of Object.keys(value)) if (isInstallOnlyKey(`${key}.${inner}`)) found.push(`${key}.${inner}`);
  }
  return found;
}

/** Parse and validate a project file's text. Throws a message naming the file and the key. */
export function parseProjectSettingsText(text: string, file: string, installFile: string): ProjectSettingsFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`${file}: expected valid JSON, found ${errorMessage(error)}`);
  }
  if (isRecord(raw)) {
    const installOnly = installOnlyKeysIn(raw);
    if (installOnly.length > 0) {
      throw new Error(`${file}: ${installOnly.join(", ")} ${installOnly.length === 1 ? "is" : "are"} install-only, so a project file cannot set ${installOnly.length === 1 ? "it" : "them"}. ${installOnly.length === 1 ? "It belongs" : "They belong"} in ${installFile}. The install-only keys: ${INSTALL_ONLY_KEYS.join(", ")}.`);
    }
  }
  const result = PROJECT_SETTINGS_FILE_SCHEMA.safeParse(raw);
  if (!result.success) throw new Error(`${file}: this project settings file has invalid values:\n${z.prettifyError(result.error)}`);
  return result.data;
}

/** The project's keys over the install's, at the registry key: a project value replaces the
 *  install value of that key, a list replaces the whole list, and a key the project omits keeps
 *  the install's. `defaults.adapter` and `defaults.backend` must still name an enabled one. */
export function mergeProjectSettings(file: string, install: OrchSettings, project: ProjectSettingsFile): OrchSettings {
  requireEnabledComposition(file, { schemaVersion: SETTINGS_SCHEMA, runtime: install.runtime, enabled: install.enabled, defaults: project.defaults });
  return {
    ...install,
    defaults: { ...install.defaults, ...project.defaults },
    fleet: { ...install.fleet, ...project.fleet },
    models: { ...install.models, ...project.models },
    workers: { ...install.workers, ...project.workers },
    agents: { ...install.agents, ...project.agents },
    locked_commands: { ...install.locked_commands, ...project.locked_commands },
    gated_commands: project.gated_commands ?? install.gated_commands,
    denied_commands: { ...install.denied_commands, ...project.denied_commands },
    worktrees: { ...install.worktrees, ...project.worktrees },
    council: { ...install.council, ...project.council },
  };
}

/** Read `directory`'s project file now, with no cache, and merge it over the install's settings. */
export function projectSettings(directory: string, install: SettingsManager): ProjectSettings {
  const base = install.current();
  const file = projectFilePath(directory, install);
  if (file === null) return { file, state: { kind: "none" }, settings: base, values: null };
  let text: string;
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if (errnoCode(error) === "ENOENT") return { file, state: { kind: "none" }, settings: base, values: null };
    return { file, state: { kind: "invalid", message: `${file}: ${errorMessage(error)}` }, settings: base, values: null };
  }
  try {
    const values = parseProjectSettingsText(text, file, install.file);
    return { file, state: { kind: "ok" }, settings: mergeProjectSettings(file, base, values), values };
  } catch (error: unknown) {
    return { file, state: { kind: "invalid", message: errorMessage(error) }, settings: base, values: null };
  }
}

/** The merged settings, or the invalid file's message thrown: for a path that refuses on an invalid file. */
export function validProjectSettings(project: ProjectSettings): OrchSettings {
  if (project.state.kind === "invalid") throw new Error(project.state.message);
  return project.settings;
}
```
If `isRecord` is not exported from `packages/orch/src/util.ts`, import it from where
`packages/orch/src/settings/read.ts` imports it.
Verify: packages/orch/src/settings/project.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
