## 1. Settings paths
- Global path is the agent directory plus `settings.json`. `packages/coding-agent/src/config.ts:549`
```ts
export function getSettingsPath(): string {
	return join(getAgentDir(), "settings.json");
}
```
- Project path is resolved cwd plus `.pi/settings.json`. `packages/coding-agent/src/core/settings-manager.ts:212-218`
```ts
constructor(cwd: string, agentDir: string) {
	const resolvedCwd = resolvePath(cwd);
	const resolvedAgentDir = resolvePath(agentDir);
	this.globalSettingsPath = join(resolvedAgentDir, "settings.json");
	this.projectSettingsPath = join(resolvedCwd, CONFIG_DIR_NAME, "settings.json");
}
```

## 2. Project directory
- Settings use the given cwd directly; no marker walk chooses the directory. From a subdirectory pi checks that directory's `.pi/settings.json`, not the top-level project's. `packages/coding-agent/src/core/settings-manager.ts:212-218`
```ts
const resolvedCwd = resolvePath(cwd);
this.projectSettingsPath = join(resolvedCwd, CONFIG_DIR_NAME, "settings.json");
```

## 3. Git
- Git does not participate in locating the project settings file; the path is assembled directly from cwd. `packages/coding-agent/src/core/settings-manager.ts:217`
```ts
this.projectSettingsPath = join(resolvedCwd, CONFIG_DIR_NAME, "settings.json");
```

## 4. Merging
- Project overrides global. Nested plain objects merge recursively; arrays and other values are replaced. `packages/coding-agent/src/core/settings-manager.ts:164-184`
```ts
function isMergeableObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deepMergeObjects(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
	const result = { ...base };
	for (const key of Object.keys(overrides)) {
		const overrideValue = overrides[key];
		if (overrideValue === undefined) continue;
		const baseValue = base[key];
		result[key] = isMergeableObject(baseValue) && isMergeableObject(overrideValue)
			? deepMergeObjects(baseValue, overrideValue)
			: overrideValue;
	}
	return result;
}
function deepMergeSettings(base: Settings, overrides: Settings): Settings {
	return deepMergeObjects(base as Record<string, unknown>, overrides as Record<string, unknown>) as Settings;
}
```

## 5. Project settings eligibility
- `defaultProjectTrust` is explicitly global-only. `packages/coding-agent/src/core/settings-manager.ts:88-90`
```ts
defaultProjectTrust?: DefaultProjectTrust; // default: "ask"; global setting only
```

## 6. Writing settings
- `SettingsScope` selects global or project; storage selects the corresponding path. `packages/coding-agent/src/core/settings-manager.ts:186,247-249`
```ts
export type SettingsScope = "global" | "project";
withLock(scope: SettingsScope, fn: (current: string | undefined) => string | undefined): void {
	const path = scope === "global" ? this.globalSettingsPath : this.projectSettingsPath;
```
- The manager's setting update APIs are not yet quoted here.

## 7. Trust
- Trust store records decisions keyed by canonical project paths; the nearest ancestor decision applies. It gates project settings and project resources. `packages/coding-agent/src/core/trust-manager.ts:14-44`
```ts
export interface ProjectTrustStoreEntry {
	path: string;
	decision: boolean;
}
type TrustFile = Record<string, boolean | null | undefined>;
const TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES = [
	"settings.json", "extensions", "skills", "prompts", "themes", "SYSTEM.md", "APPEND_SYSTEM.md",
] as const;
function findNearestTrustEntry(data: TrustFile, cwd: string): ProjectTrustStoreEntry | null {
	let currentDir = normalizeCwd(cwd);
	while (true) {
		const value = data[currentDir];
		if (value === true || value === false) return { path: currentDir, decision: value };
		const parentDir = dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}
```
- Untrusted project settings load as empty. `packages/coding-agent/src/core/settings-manager.ts:389-392`
```ts
private static loadFromStorage(storage: SettingsStorage, scope: SettingsScope, projectTrusted = true): Settings {
	if (scope === "project" && !projectTrusted) return {};
```
- README explains trust prompts and consequences. `packages/coding-agent/README.md:297`
```md
On interactive startup, pi asks before trusting a project folder that contains project-local settings, resources, or project `.agents/skills` and has no saved decision for the folder or a parent folder in `~/.pi/agent/trust.json`. Trusting a project allows pi to load `.pi/settings.json` and `.pi` resources, install missing project packages, and execute project extensions.
```

## 8. Other per-project resources
- Context files are loaded from cwd and every ancestor up to filesystem root; global context comes from agent directory. `packages/coding-agent/src/core/resource-loader.ts:72-74,132-153`
```ts
const candidates = ["AGENTS.override.md", "AGENTS.md", "AGENTS.MD", "CLAUDE.md", "CLAUDE.MD"];
let currentDir = resolvedCwd;
while (true) {
	const contextFile = loadContextFileFromDir(currentDir);
	...
	const parentDir = dirname(currentDir);
	if (parentDir === currentDir) break;
	currentDir = parentDir;
}
```
- Skills include `.pi/skills` at cwd; directories do not walk ancestors. `packages/coding-agent/src/core/skills.ts:452-456`
```ts
addSkills(loadSkillsFromDirInternal(resolve(resolvedCwd, CONFIG_DIR_NAME, "skills"), "project", true));
const projectSkillsDir = resolve(resolvedCwd, CONFIG_DIR_NAME, "skills");
```
- Extensions, prompts, and themes: not found. Searched resource-loader for project/cwd path discovery; need inspect its specific loading functions.

## 9. User documentation
- README describes global and project settings and precedence. `packages/coding-agent/README.md:290-291`
```md
| `~/.pi/agent/settings.json` | Global (all projects) |
| `.pi/settings.json` | Project (overrides global) |
```
