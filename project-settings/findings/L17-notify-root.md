## emitAndNotify
- **Defined**: `packages/orch/src/daemon/server/events.ts:63`
```ts
emitAndNotify(emit: (event: NotifyEvent) => void, sinks: NotifyEntry[], event: NotifyEvent, orchDir: OrchDir | undefined, settings: SettingsManager, now = Date.now(), logger?: Logger): void
```
- **Settings parameter**: `SettingsManager`.
- **Reads**: none directly; `deliverEvent` at `events.ts:91` calls `settings.currentOrNull()` and passes the result to `notify`. The router carries settings to notifier `available`/`deliver` callbacks; settings reads are notifier-specific and none are accessed through the manager here.
- **Verdict**: install only (no settings keys read).

## deliverEvent
- **Defined**: `packages/orch/src/daemon/server/events.ts:77`
```ts
deliverEvent(emit: (event: NotifyEvent) => void, sinks: NotifyEntry[], event: NotifyEvent, orchDir: OrchDir | undefined, settings: SettingsManager, logger?: Logger): void
```
- **Settings parameter**: `SettingsManager`.
- **Reads**: none as keys; passes nullable current settings to `notify` at `events.ts:91`.
- **Verdict**: install only (no settings keys read).

## deliver
- **Defined**: `packages/orch/src/notify/router.ts:107`
```ts
deliver(orchDir: OrchDir, settings: OrchSettings | null, entry: NotifyEntry, event: NotifyEvent, logger?: Logger): Promise<boolean>
```
- **Settings parameter**: `OrchSettings | null`.
- **Reads**: no settings keys directly. Settings are passed to notifier availability and delivery callbacks by `NotifierRegistry.deliver` at `router.ts:...`; individual providers may read them.
- **Verdict**: install only (no keys read directly).

## probeNotifiers
- **Defined**: `packages/orch/src/daemon/server/notifier-probe.ts:12`
```ts
probeNotifiers(settings: OrchSettings | null): Promise<NotifierChoice[]>
```
- **Settings parameter**: `OrchSettings | null`.
- **Reads**: none directly. Passes settings to `notifier.available`; notifier-specific settings are not read here.
- **Verdict**: install only (no settings keys read).

## setupIntegrate
- **Defined**: `packages/orch/src/daemon/server/setup.ts:329`
```ts
setupIntegrate(services: Pick<Services, "orchDir" | "settings" | "logger">, params: ParamsOf<"setup-integrate">): Promise<ResultOf<"setup-integrate">>
```
- **Settings parameter**: `Services.settings` (`SettingsManager`).
- **Reads**: reloads settings, then passes the value to `installAdapterShims`, `diagnoseAdapters`, and `smokeBlocker`. Following Claude's settings-file sync reaches `workers.exclude_extensions.claude` and `workers.inherit_mcp` (`packages/orch/src/adapters/claude.ts:81,89`), both project keys. Other adapter/setup branches are not traced here.
- **Verdict**: project: `workers.exclude_extensions.claude`, `workers.inherit_mcp`.

## acceptMail
- **Defined**: `packages/orch/src/daemon/server/mail.ts:65`
```ts
acceptMail(directory: OrchDir, settings: OrchSettings | null, from: string, target: string, text: string, logger?: Logger): { id: string }
```
- **Settings parameter**: `OrchSettings | null`.
- **Reads**: `fleet` (`mail.ts:69`), passed to `admitMail`; `fleet` is an install-only section. The branch reads fleet policy values there.
- **Verdict**: install only.

## syncAdapterSettingsFiles
- **Defined**: `packages/orch/src/adapters/registry.ts:33`
```ts
syncAdapterSettingsFiles(orchDir: OrchDir, settings: OrchSettings): string[]
```
- **Settings parameter**: `OrchSettings`.
- **Reads**: `enabled.adapters` (`registry.ts:34`, install); passed into each enabled adapter sync. Claude sync reads `workers.exclude_extensions.claude` and `workers.inherit_mcp` (`adapters/claude.ts:81,89`, project).
- **Verdict**: project: `workers.exclude_extensions.claude`, `workers.inherit_mcp`.

## logLevelFor
- **Defined**: `packages/orch/src/settings/read.ts:422`
```ts
logLevelFor(settings: OrchSettings | null): LogLevel
```
- **Settings parameter**: `OrchSettings | null`.
- **Reads**: `logging.level` (`settings/read.ts:426`, install).
- **Verdict**: install only.

## SessionOpenContext settings
- **Object**: `SessionOpenContext`, declared at `packages/orch/src/types/held-session.ts:55`; constructed at `packages/orch/src/daemon/server/session-agents.ts:162`.
- **Readers**: the session startup reads `context.settings.pty` at `packages/orch/src/daemon/server/session-agents.ts:...` (install). `context` is passed to the selected driver's `connect`; individual drivers may also read it.

## orchd settings callback at line 111
- **Passed to**: `HostLinks` constructor (`hosts: new HostLinks({...})`), whose dependency type is `HostLinkDeps`.
- **Declared type**: callback returning `OrchSettings`.
- **Reads**: `hosts` in `packages/orch/src/hosts/link.ts:677,679,699,723` (install), accessed by `link`, `processIsLive`, `follow`, and `views`.
- **Verdict**: install only.

## orchd settings at line 255
- **Passed to**: `runWorkLoop` as its `settings` option.
- **Declared type**: `SettingsManager` (the work-loop option).
- **Reads**: `notify` (`packages/orch/src/daemon/server/work-loop.ts:315`, install), passed to `emitAndNotify`. `daemon.work_tick_ms` is read at `packages/orch/src/daemon/server/orchd.ts:258` (install), and `daemon.outbox_drain_ms` at `orchd.ts:269` (install).

## orchd watchSettings at lines 191-200
- **Passed**: `services.settings` (`SettingsManager`), plus options with `load`, `onChange`, and `onWarn` callbacks.
- **onChange**: forgets capacity; passes settings to `HostLinks.reconcile` (reads `hosts`, install); resolves `logging.level` through `logLevelFor` (`packages/orch/src/settings/read.ts:426`, install); and passes settings to `modelChoicesOf`. The latter's settings reads are not followed in this report.
