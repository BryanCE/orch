## 1. Loading, current value, and disk changes
- CLI: `fileSettingsManager(orchDir)` constructs a `SettingsManager`; its `current()` delegates to `currentOrNull()`, which lazily reads `storage.read()` and holds `{ value: OrchSettings | null }` in closure variable `held`. `createServices` owns it as `services.settings`. `packages/orch/src/settings/manager.ts:11`
- orchd: same manager supplied in services; server startup watches it. `watchSettings(settings, opts)` loads via `opts.load`, and `reload()` clears the manager cache; watcher invokes `onChange` after changes. `packages/orch/src/settings/watch.ts:24`
```ts
export function fileSettingsManager(orchDir: OrchDir): SettingsManager
export function watchSettings(settings: Pick<SettingsManager, "file">, opts: SettingsWatchOptions): SettingsWatch
```
- The watcher watches the directory (atomic rename-safe), debounces events and polls file stat as backstop. Invalid edits preserve the last-good value. `packages/orch/src/settings/watch.ts:40`

## 2. `orch settings <key> <value>`
- Call order: `cmdSettings` → `runSettingsVerb` → `settingsRoot` → `setSingleSetting` → `writableSpec`, `refuseUngrantedAgentWrite`, `parseSettingValue` → `writeRegisteredSetting` → registered writer → `SettingsManager.update` → storage write. `packages/orch/src/commands/settings.ts:96`
- The CLI initiates and performs the manager write; it does not RPC the setting change to orchd. `writeRegisteredSetting` invokes the setting's writer. `packages/orch/src/settings/registry.ts:316`
```ts
export function writeRegisteredSetting(settings: SettingsManager, key: string, value: unknown): void
```
- `SettingsManager.update` reads current text, runs the mutation under storage lock, then clears cached settings. `packages/orch/src/settings/manager.ts:35`

## 3. Bare `orch settings`
- On a TTY, no args launch the interactive editor (`runSettingsEditor`); otherwise it collects registry rows and prints a text table or JSON. `packages/orch/src/commands/settings.ts:58`
- `settingsRoot` → `collectSettingsProvenance` → `printSettingsOutput`; editor path uses `loadEntries`, `screenOf`, and shell render functions. `packages/orch/src/commands/settings.ts:401`
- Table rows show key, formatted value, source, and optional agent-writable column; source is determined by whether raw key exists in `settings.json`, otherwise `default`. `packages/orch/src/commands/settings.ts:350`
- Source type permits `flag`, `settings.json`, or `default`; settings table uses `settings.json` and `default` (flag is available to general resolution). `packages/orch/src/types/settings.ts:102`
- The column word is chosen by `AGENT_COLUMN = "agent"` and emitted only when `agentWritable` is true. `packages/orch/src/commands/settings.ts:389`

## 4. Agent writes, grants, and refusals
- `agentMayWriteSetting` rejects self-grant key and otherwise checks `settings.agents.writable_settings`. `grantAgentSetting`/`revokeAgentSetting` compute the list; CLI grant/revoke writes it through `writeRegisteredSetting`. `packages/orch/src/policy/agent-settings.ts:9`
- Operator bypasses the check. A non-operator may write only a granted key; refusal text: `“${key} is operator-only for an agent. An agent may set: ${may}. The human widens that with: orch settings grant ${key}”`. `packages/orch/src/commands/settings.ts:76`; `packages/orch/src/policy/agent-settings.ts:31`
- Caller identity is checked with `whoAmI(services)` before writing. The settings write path stores the new value in settings.json; it does not attach or persist an agent identity as per-write attribution. `packages/orch/src/commands/settings.ts:76`; `packages/orch/src/settings/manager.ts:35`

## 5. Subcommands
- `models`: writes `defaults.models` and `models.allowed` for chosen harnesses via `recordHarnessModels`. `packages/orch/src/commands/settings.ts:156`
- `thinking`: writes `defaults.thinking` or `defaults.thinking_by_harness`; `--clear` removes a harness override. `packages/orch/src/commands/settings.ts:484`
- `skills`: writes `skills.install`, optional `skills.store` and `skills.link`; may install skill files. `packages/orch/src/commands/settings.ts:199`
- `notify`: add/remove writes `notify`; bare notify only displays. `packages/orch/src/commands/settings.ts:321`
- `grant`: adds key to `agents.writable_settings`. `packages/orch/src/commands/settings.ts:106`
- `revoke`: removes key from `agents.writable_settings`. `packages/orch/src/commands/settings.ts:112`

## 6. `settingsPath(` call sites in `packages/orch/src/`
- `packages/orch/src/commands/setup.ts:255`
- `packages/orch/src/commands/settings.ts:47`
- `packages/orch/src/daemon/client/report-session.ts:17`
- `packages/orch/src/daemon/client/reach.ts:52`
- `packages/orch/src/settings/storage.ts:24`
- `packages/orch/src/settings/read.ts:107`
- `packages/orch/src/daemon/server/doctor/settings-file.ts:45`
- `packages/orch/src/daemon/server/doctor/runner.ts:44`
- Declaration: `packages/orch/src/settings/schema.ts:402`

## 7. Tests importing settings modules or settings command
- `allowlist-holds-default.test.ts` — model allowlist/default helpers. `packages/orch/test/allowlist-holds-default.test.ts:2`
- `opencode-terminal.test.ts`, `opencode-server.test.ts` — settings file/schema integration for OpenCode. `packages/orch/test/opencode-terminal.test.ts:5`; `packages/orch/test/opencode-server.test.ts:5`
- `spawn-policy.test.ts`, `launch-model-gate.test.ts`, `worker-tools.test.ts`, `spawn-preferred-models.test.ts`, `commands-models.test.ts`, `commands-self.test.ts`, `attach-keys.test.ts`, `commands-events.test.ts`, `worktree-providers.test.ts`, `doctor-runtime.test.ts`, `thinking-resolution.test.ts`, `retention.test.ts`, `command-gate.test.ts`, `notify-events-format.test.ts`, `hosts-serve.test.ts`, `hosts-authorize.test.ts`, `hosts-ssh.test.ts`, `held-pty.test.ts`, `herdr-notify-hardening.test.ts`, `doctor-claude-hooks.test.ts`, `doctor-checks.test.ts` — settings fixtures/defaults or settings manager behavior in the named runtime/command feature. `packages/orch/test/spawn-policy.test.ts:5`
- `command-paths.test.ts`, `notify-ding.test.ts`, `settings-repair-write.test.ts`, `settings-defects.test.ts`, `settings-manager.test.ts`, `settings-notify.test.ts`, `settings-repair-screen.test.ts`, `settings-repair.test.ts`, `settings-watch.test.ts`, `settings-thinking.test.ts`, `settings-command.test.ts`, `settings-repair-roundtrip.test.ts`, `settings-editor.test.ts`, `settings-view.test.ts`, `settings-unknown-keys.test.ts`, `settings-registry.test.ts`, `settings.test.ts`, `settings-shell.test.ts`, `settings-precedence.test.ts`, `settings-repair-roundtrip.test.ts`, `settings-editor.test.ts`, `settings-view.test.ts`, `settings-unknown-keys.test.ts`, `settings-registry.test.ts`, `settings.test.ts`, `settings-shell.test.ts`, `settings-precedence.test.ts`, `settings-repair-screen.test.ts`, `settings-repair.test.ts` — exercise settings repairs, editor/view, parsing/unknown keys, registry/writes, defaults and precedence. `packages/orch/test/settings-manager.test.ts:5`
- `settings-notify.test.ts`, `settings-thinking.test.ts`, `settings-command.test.ts`, `settings-shell.test.ts` also import `src/commands/settings.ts` and cover respective command behavior/editor launch. `packages/orch/test/settings-notify.test.ts:5`
