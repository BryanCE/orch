## src/daemon/server/events.ts(97,106)
**Called**: `emitAndNotify`, defined `packages/orch/src/daemon/server/events.ts:63`; parameter `settings: SettingsManager`.
**Reads**: `notify` install, `packages/orch/src/daemon/server/events.ts:97`; settings is forwarded to `deliverEvent`, which reads `currentOrNull()` at line 90 and passes the settings to `notify` in `packages/orch/src/notify/router.ts`.
**Other callers**: `packages/orch/src/daemon/server/work-loop.ts:315` (server).
**For whom**: event key, an agent key; notification is for that event.

## src/daemon/server/events.ts(104,105)
same as `src/daemon/server/events.ts(97,106)`; `deliverEvent` receives sinks and settings directly and reads notification settings for the event.

## src/daemon/server/orchd.ts(111,23)
**Called**: `DaemonState.services`, declared `packages/orch/src/daemon/server/state.ts:29` as `DaemonServices`; settings are provided by `createServices` (`packages/orch/src/services.ts`) and project settings by `projectSettings` (`packages/orch/src/settings/project.ts`).
**Reads**: No project keys at this assignment; subsequent daemon reads include `pty`, `links.receipt_ttl_ms`, `daemon.tcp_port`, `daemon.subscriber_queue_bytes`, `logging.slow_tool_ms`, `notify`, `daemon.liveness_poll_ms`, `logging.stall_ms`, `logging.stall_poll_ms`, and `daemon.work_tick_ms` (all install); project model values `defaults.models` and `models` are read by `modelChoicesOf` at `packages/orch/src/daemon/server/orchd.ts:49`.
**Other callers**: none; this is the services construction.
**For whom**: none.

## src/daemon/server/orchd.ts(158,42)
**Called**: `logLevelFor`, defined `packages/orch/src/settings/read.ts`; parameter is `OrchSettings`.
**Reads**: install logging configuration, via `logLevelFor` (`packages/orch/src/settings/read.ts`).
**Other callers**: `packages/orch/src/daemon/server/orchd.ts:185` (server), `packages/orch/src/daemon/server/orchd.ts:164` (server).
**For whom**: none.

## src/daemon/server/orchd.ts(191,37)
**Called**: `modelChoicesOf`, defined `packages/orch/src/daemon/server/orchd.ts:49`; parameter `OrchSettings | null`.
**Reads**: `defaults.models` and `models` (project), `packages/orch/src/daemon/server/orchd.ts:50`.
**Other callers**: `packages/orch/src/daemon/server/orchd.ts:148` (server).
**For whom**: none.

## src/daemon/server/orchd.ts(193,5)
**Called**: `watchSettings`, defined `packages/orch/src/settings/watch.ts`; settings callback receives `OrchSettings`.
**Reads**: callback invokes `modelChoicesOf` (project: `defaults.models`, `models`; `packages/orch/src/daemon/server/orchd.ts:49-50`) and `logLevelFor` (install logging; `packages/orch/src/settings/read.ts`).
**Other callers**: `packages/orch/src/daemon/server/orchd.ts:193` only.
**For whom**: none.

## src/daemon/server/orchd.ts(255,5)
**Called**: `runWorkLoop`, defined `packages/orch/src/daemon/server/work-loop.ts`; `settings` option is `SettingsManager`.
**Reads**: `notify` (install), `packages/orch/src/daemon/server/work-loop.ts:315`; settings manager also flows to work-loop dispatch/spawn functions, which read project settings for launch configuration.
**Other callers**: `packages/orch/src/daemon/server/orchd.ts:255` only (server).
**For whom**: launch plan/work-loop work; individual plan identifies its agent.

## src/daemon/server/session-agents.ts(162,57)
**Called**: `SessionOpenContext.settings`, defined in `packages/orch/src/daemon/server/session-agents.ts`; value from `state.services.settings.current()`.
**Reads**: none in `openContext`; forwarded to `role.attach` at lines 179 and 292. Session role uses settings for agent session configuration (project settings).
**Other callers**: `packages/orch/src/daemon/server/session-agents.ts:179`, `packages/orch/src/daemon/server/session-agents.ts:292` (server).
**For whom**: `key: string`, held agent key.

## src/daemon/server/state.ts(62,34)
**Called**: `buildFleetStatus`, defined `packages/orch/src/daemon/server/fleet-status.ts:46`; parameter `settings: OrchSettings`.
**Reads**: fleet agent defaults/settings, project keys, within `packages/orch/src/daemon/server/fleet-status.ts`.
**Other callers**: `packages/orch/src/daemon/server/state.ts:62` only (server).
**For whom**: `directory` is the orch root; fleet rows identify agents.

## src/daemon/server/tabs.ts(97,39)
**Called**: `selectBackend`, defined in `packages/orch/src/backends/registry.ts`; settings parameter is `OrchSettings`.
**Reads**: backend configuration from settings (install backend/plexer configuration); `packages/orch/src/backends/registry.ts`.
**Other callers**: `packages/orch/src/daemon/server/tabs.ts:97` only (server).
**For whom**: caller credential identifies the caller; `action.cwd` is the requested directory for a new tab.

## test/answer-dispatch.test.ts(130,44)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/answer-dispatch.test.ts(145,44)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/answer-dispatch.test.ts(155,54)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/answer-dispatch.test.ts(170,54)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/answer-dispatch.test.ts(184,44)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/control-dispatch.test.ts(70,40)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/dispatch-channel-first.test.ts(52,53)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/dispatch-channel-first.test.ts(65,53)
The test builds `DaemonServices`; line text: `current()` settings value is typed `InstallSettings` but supplied where `OrchSettings` is expected.

## test/event-identity.test.ts(39,85)
Test builds an `InstallSettingsManager` and passes it to `emitAndNotify`; line text: manager argument does not satisfy `SettingsManager`.

## test/event-identity.test.ts(40,85)
same as `test/event-identity.test.ts(39,85)`.

## test/event-identity.test.ts(41,85)
same as `test/event-identity.test.ts(39,85)`.

## test/event-identity.test.ts(68,9)
Test builds a `DaemonServices`; line text: `settings` property is an `InstallSettingsManager`, not a `SettingsManager`.

## test/every-agent-has-a-link.test.ts(56,39)
The test builds `DaemonServices`; line text: settings value is `InstallSettings`, but the consumer expects `OrchSettings`.

## test/every-agent-has-a-link.test.ts(68,45)
The test builds `DaemonServices`; line text: settings value is `InstallSettings`, but the consumer expects `OrchSettings`.

## test/helpers/daemon-state.ts(48,9)
Test helper builds a `DaemonServices`/`DaemonState` fixture; line text: fallback services object includes `orchDir`, `settings`, `logger`, `host`, and `models`, but does not meet `DaemonServices`.

## test/helpers/daemon-state.ts(63,23)
Test helper builds a `DaemonState` fixture; line text: its settings fixture returns `InstallSettings` where `OrchSettings` is expected.

## test/helpers/held-far.ts(198,30)
Test helper builds held-agent settings fixture; line text: `InstallSettings` is supplied where `OrchSettings` is expected.

## test/helpers/services.ts(30,3)
Test helper builds `DaemonServices`; line text: object has `orchDir`, `settings`, `logger`, `host`, and `models`, but lacks required `settingsFor`.

## test/work-loop-binding.test.ts(80,7)
Test builds a work-loop settings manager; line text: `InstallSettingsManager` supplied where `SettingsManager` is expected.

## test/work-loop-binding.test.ts(102,9)
same as `test/work-loop-binding.test.ts(80,7)`.

## test/work-loop-identity.test.ts(58,9)
Test builds a work-loop settings manager; line text: `InstallSettingsManager` supplied where `SettingsManager` is expected.

## test/work-loop-identity.test.ts(82,9)
same as `test/work-loop-identity.test.ts(58,9)`.

## test/work-loop-identity.test.ts(101,9)
same as `test/work-loop-identity.test.ts(58,9)`.
