## 1. Functions in `packages/orch/src/settings/write.ts`

- `withoutEmptyLists(lists: Partial<Record<AdapterId, string[]>>): Partial<Record<AdapterId, string[]>>` — no listed calls. `packages/orch/src/settings/write.ts:17`
- `writeSettingsAllowedModels(settings: SettingsManager, allowed: Partial<Record<AdapterId, string[]>>): void` — calls `updateSettingsFile` at `:29`. `packages/orch/src/settings/write.ts:28`
- `writeSettingsPreferredModels(settings: SettingsManager, preferred: Partial<Record<AdapterId, string[]>>): void` — calls `updateSettingsFile` at `:34`. `packages/orch/src/settings/write.ts:33`
- `withDefaultsAllowed(root: SettingsFile): SettingsFile` — calls none of the listed functions. `packages/orch/src/settings/write.ts:39`
- `serializeSettingsRoot(file: string, candidate: unknown): string` — calls `parseSettingsRoot` at `:64`, `requireEnabledComposition` at `:66`, and `requireCouncilModelsAllowed` at `:67`. It does not call the other listed functions. `packages/orch/src/settings/write.ts:62`
- `updateSettingsFile(settings: SettingsManager, mutate: (root: Partial<SettingsFile>) => Partial<SettingsFile>): void` — calls `parseSettingsText` at `:64` and `serializeSettingsRoot` at `:66`; `settings.update` at `:63`. `packages/orch/src/settings/write.ts:62`
- `copyRecord(root: object): Record<string, unknown>` — no listed calls. `packages/orch/src/settings/write.ts:70`
- `copySettingsPath(root: object, segments: readonly string[], createMissing: boolean): CopiedSettingsPath` — no listed calls. `packages/orch/src/settings/write.ts:78`
- `setSettingsPathRecord(root: object, segments: readonly string[], value: unknown): Record<string, unknown>` — calls `copySettingsPath` at `:98`. `packages/orch/src/settings/write.ts:95`
- `setSettingsPath(root: Partial<SettingsFile>, segments: readonly string[], value: unknown): Partial<SettingsFile>` — calls `SETTINGS_FILE_SCHEMA.parse` at `:107`. `packages/orch/src/settings/write.ts:106`
- `writeSettingsValue(settings: SettingsManager, key: string, value: unknown): void` — calls `updateSettingsFile` at `:113`. `packages/orch/src/settings/write.ts:111`
- `deleteSettingsPathRecord(root: object, segments: readonly string[]): Record<string, unknown>` — calls `copySettingsPath` at `:119`. `packages/orch/src/settings/write.ts:118`
- `deleteSettingsPath(root: Partial<SettingsFile>, segments: readonly string[]): Partial<SettingsFile>` — calls `SETTINGS_FILE_SCHEMA.parse` at `:129`. `packages/orch/src/settings/write.ts:128`
- `settingsPathValue(root: unknown, segments: readonly string[]): SettingsPathValue` — no listed calls. `packages/orch/src/settings/write.ts:136`
- `applySettingsRepairs(settings: SettingsManager, repairs: readonly SettingsRepair[]): void` — calls `settings.update` at `:148`, `settingsPathValue` at `:155-156`, `deleteSettingsPathRecord` at `:163,167`, `setSettingsPathRecord` at `:164,168`, and `serializeSettingsRoot` at `:179`. `packages/orch/src/settings/write.ts:144`
- `clearSettingsValue(settings: SettingsManager, key: string): void` — calls `updateSettingsFile` at `:188`. `packages/orch/src/settings/write.ts:186`
- `writeSettingsRuntime(settings: SettingsManager, runtime: OrchRuntime): void` — calls `updateSettingsFile` at `:195`. `packages/orch/src/settings/write.ts:194`
- `writeSettingsDefault(settings: SettingsManager, key: "adapter", value: AdapterId): void` and overload `writeSettingsDefault(settings: SettingsManager, key: "backend", value: BackendId): void` — implementation `writeSettingsDefault(settings: SettingsManager, key: "adapter" | "backend", value: string): void` calls `updateSettingsFile` at `:202`. `packages/orch/src/settings/write.ts:199-202`
- `writeSettingsModels(settings: SettingsManager, models: Partial<Record<AdapterId, string>>): void` — calls `updateSettingsFile` at `:207`. `packages/orch/src/settings/write.ts:206`
- `writeSettingsThinking(settings: SettingsManager, update: { thinking?: ThinkingLevel; byHarness?: Partial<Record<AdapterId, ThinkingLevel | null>> }): void` — calls `updateSettingsFile` at `:222`. `packages/orch/src/settings/write.ts:218-222`
- `writeSettingsSkills(settings: SettingsManager, skills: { install: boolean; store?: string; link?: readonly string[] }): void` — calls `updateSettingsFile` at `:246`. `packages/orch/src/settings/write.ts:242-246`
- `writeSettingsEnabled(settings: SettingsManager, enabled: { adapters: readonly AdapterId[]; backends: readonly BackendId[] }): void` — calls `updateSettingsFile` at `:258`. `packages/orch/src/settings/write.ts:257`
- `writeSettingsFullTree(settings: SettingsManager): void` — calls `updateSettingsFile` at `:263`; its callback calls `settingsValues` at `:264`. `packages/orch/src/settings/write.ts:262-263`
- `writeSettingsNotify(settings: SettingsManager, entries: readonly NotifyEntry[]): void` — calls `updateSettingsFile` at `:281`. `packages/orch/src/settings/write.ts:280`

## 2. Calls outside `write.ts` of its exported functions

- `packages/orch/src/settings/registry.ts:79` — `writeDefaultAdapter` calls `writeSettingsDefault`.
- `packages/orch/src/settings/registry.ts:84` — `writeDefaultBackend` calls `writeSettingsDefault`.
- `packages/orch/src/settings/registry.ts:117` — `writeNotifyEntries` calls `writeSettingsValue`.
- `packages/orch/src/settings/registry.ts:134` — `writeAgentWritableSettings` calls `writeSettingsValue`.
- `packages/orch/src/settings/registry.ts:157` — `setting`'s default writer callback calls `writeSettingsValue`.
- `packages/orch/src/settings/registry.ts:332` — `clearRegisteredSetting` calls `clearSettingsValue`.
- `packages/orch/src/commands/setup.ts:62` — `cmdSetup` calls `writeSettingsSkills`.
- `packages/orch/src/commands/setup.ts:244` — setup command callback calls `writeSettingsNotify`.
- `packages/orch/src/commands/host.ts:219` — `cmdHostAdd` calls `writeSettingsValue`.
- `packages/orch/src/setup/composition.ts:223-225` — `recordHarnessModels` calls `writeSettingsModels`, `writeSettingsPreferredModels`, `writeSettingsAllowedModels`.
- `packages/orch/src/setup/composition.ts:261-274` — `recordSetupComposition` calls `writeSettingsRuntime`, `writeSettingsEnabled`, `writeSettingsDefault` (adapter and backend), `writeSettingsModels`, `writeSettingsPreferredModels`, `writeSettingsAllowedModels`, and `writeSettingsFullTree`.
- No calls found in `packages/orch/extensions/` (searched for every exported writer name).

## 3. `SettingsManager.update(` calls outside `write.ts`

- None found. Searched `.update(` in `packages/orch/src/`; no `SettingsManager`-typed update calls outside `write.ts`.

## 4. Settings manager constructors

- `packages/orch/src/services.ts:33` — `fileSettingsManager(orchDir)`.
- `packages/orch/src/daemon/server/doctor/settings-file.ts:55` — `fileSettingsManager(orchDir)`.
- `packages/orch/src/daemon/server/doctor/runner.ts:96` — `fileSettingsManager(orchDir)`.
- `packages/orch/extensions/pi/compose.ts:12` — `fileSettingsManager(orchDir)`.
- `packages/orch/src/services.ts:24` — `inMemorySettingsManager(text, file)`.
- No calls found in `packages/orch/test/helpers/` (searched both constructor names).
