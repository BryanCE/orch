# 3a-agent

Owns: `src/agent/tools.ts`, `src/agent/harness-bridge.ts`, `src/agent/daemon-client.ts`, `src/agent/drive-state.ts`. Follow `3a-README.md`.

Sites:
- `tools.ts:317` `loadSettingsOrNull(orchDir())?.locked_commands ?? []` → `settings: SettingsManager` parameter, `settings.currentOrNull()?.locked_commands ?? []` (the `?? []` is an absent-file fallback to an empty list, not a settings literal; keep it)
- `tools.ts:338`, `:368`, `:381`, `:510` `acquireCommandLock(orchDir(), ...)` / `releaseCommandLock(orchDir(), ...)` → `orchDir: string`
- `harness-bridge.ts:35` `createDaemonClient(orchDir())`
- `harness-bridge.ts:74` `registerFleetMonitor(harness, orchDir(), ...)`
  `registerHarnessBridge(harness, identity, hash, options)` gains `orchDir` in its options object; `extensions/pi/index.ts` and `extensions/omp/index.ts` are the callers (task 5-02 fixes them; list them anyway).
- `daemon-client.ts:149` `loadSettingsOrNull(orchDir)?.daemon.bridge_reconnect_ms ?? SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms` → this is a reconnect loop; it takes `settings: SettingsManager` and reads `settings.currentOrNull()?.daemon.bridge_reconnect_ms ?? SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms` per use
- `drive-state.ts:33` `options.directory ?? orchDir()` → `options.directory` required, remove the `??`
