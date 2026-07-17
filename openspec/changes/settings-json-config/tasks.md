## 1. Verify the landed storage migration (no deletions — these symbols are already gone)

- [x] 1.1 Confirm `src/config.ts` exposes `SETTINGS_SCHEMA = 1`, `settingsPath(orchDir)`, `SettingsFileSchema` (`z.strictObject`, `schemaVersion: z.literal(SETTINGS_SCHEMA)`), `loadConfig(orchDir) → OrchConfig`, `watchConfig`, and `writeSettingsDefault(orchDir, key, value)`. Confirm `HostSchema` is `dest`/`orch_dir`/`timeout_ms` with no `ssh`.
- [x] 1.2 Confirm the TOML era is fully removed: grep `src/` + `extensions/` for `parseFallbackToml`, `parseToml`, `Bun.TOML`, `writeDefaultEntry`, `tableBodyRange`, `HostConfig.ssh`, `config.toml` — expect zero matches in runtime code (a `config.toml` reference is allowed only where this change adds the legacy probe, §2).
- [x] 1.3 Confirm downstream readers already target `settings.json`: `src/notify.ts` reads `loadConfig(orchDir).notify`; `src/daemon/configwatch.ts` `CONFIG_FILE = "settings.json"`; `src/config.ts` `watchConfig` + `src/daemon/orchd.ts` watch `settings.json`; `src/doctor.ts` config-validity check uses `settingsPath(orchDir)`; `extensions/orchestrator-bridge.ts` `allowedModelPatterns` consumes `loadConfig` unchanged.
- [x] 1.4 Confirm the main specs already carry `settings.json` wording (including `openspec/specs/notifier-adapters/spec.md`) so no `notifier-adapters` delta is owed here.

## 2. Legacy config.toml probe + actionable schemaVersion message

- [x] 2.1 In `loadConfig(orchDir)`: when `readSettingsFile` returns `null`, probe `path.join(orchDir, "config.toml")` with `filesystem.existsSync`; if present, throw a loud error explaining settings now live in `settings.json` and to re-run `orch setup` (do NOT read the `config.toml` values); if absent, keep returning built-in defaults.
- [x] 2.2 In `readSettingsFile` (or the load path): when `SettingsFileSchema.safeParse` fails on a `schemaVersion` issue (missing / not current), replace the generic prettified message with one naming `settings.json` and directing the user to re-run `orch setup`. Other defects keep their per-key prettified message.
- [x] 2.3 `bun run check` clean; `bun test test/config.test.ts` (or targeted) green.

## 3. Installed provider sets + id/membership validation at load, against the registries

- [x] 3.1 Add the `installed` section to `SettingsFileSchema`: `installed: z.strictObject({ adapters: z.array(z.string()), backends: z.array(z.string()) }).optional()`. Add `installed: { adapters: string[]; backends: string[] }` to `OrchConfig` and default it (empty arrays) in `loadConfig`.
- [x] 3.2 Expose an importable adapter-id source: move / mirror the private `adapters` const from `src/commands.ts` into a registry module (e.g. `src/adapters/registry.ts` exporting `allAdapters()` / adapter ids), and repoint `commands.ts` (`adapters`, `resolveAdapter`, `adapterIds`) at it. `config.ts` must be able to import it without a cycle (`AdapterId` in `adapters/adapter.ts` is a type, not a runtime list).
- [x] 3.3 In `config.ts`, after `SettingsFileSchema.safeParse` succeeds, run one post-parse validation pass (keep `SettingsFileSchema` free of registry imports):
  - reject any `installed.adapters` id not in the adapter registry ids, and any `installed.backends` id not in `allBackends().map(b => b.id)` (imported from `src/backends/registry.ts`) — throw file-path + offending-id + supported-ids;
  - require `defaults.adapter ∈ installed.adapters` and `defaults.backend ∈ installed.backends` when set — throw file-path + offending-key + the installed set.
- [x] 3.4 `bun run check` clean (no import cycle); targeted config tests: installed-set id rejection, `defaults`-not-in-installed rejection, and active-switch (change `defaults.adapter` between two installed ids → loads clean, new value effective).

## 4. `orch settings` provenance command

- [x] 4.1 Add `resolveWithSource({ flag, env, config, fallback }): { value, source }` beside `resolveSetting` in `config.ts`, sharing one precedence-order source so the two cannot drift. `resolveSetting` (bare `T`) stays unchanged.
- [x] 4.2 Add `cmdSettings`: print an aligned table of each resolvable setting with value + source; support `--json` emitting `{ key: { value, source } }`; on a load error (invalid `settings.json` or legacy `config.toml` present), surface the same loud error and exit non-zero (no partial table).
- [x] 4.3 Register `settings` in the CLI dispatch (`bin/orch.ts` / `commands.ts` routing) and help text.
- [x] 4.4 `bun run check` clean; targeted `orch settings` test green (test/settings-command.test.ts).

## 5. (Optional cleanup — not required by any scenario)

- [x] 5.1 Only if a future writer needs multi-key/atomic writes: generalize `writeSettingsDefault` and add tmp+rename hardening. Not in scope otherwise — the shipped whole-file round-trip writer satisfies the read-modify-write intent (design D4). (2026-07-17: the "generalize" half was already done — all three writers (`writeSettingsDefault`/`writeSettingsInstalled`/`writeSettingsNotify`) share the single `updateSettingsFile` helper. Added tmp+rename hardening to that helper (`writeFileSync` to `<file>.<pid>.tmp` then `renameSync`), so a crash mid-write cannot truncate settings.json and the config watcher only ever reads a complete file. `renameSync` is atomic on the local `$ORCH_DIR` filesystem. Node-safe; `test/config.test.ts` writers stay green.)

## 6. Verification gate (RUN the scenarios)

- [x] 6.1 `bun run check` clean across the whole change; `bun test` passing (309 pass / 0 fail).
- [x] 6.2 Execute the doctor-config scenarios against a real `$ORCH_DIR`: valid load; unknown-key rejection; wrong-type rejection; unknown-adapter rejection (§3); non-installed `defaults` rejection naming the installed set (§3); active-switch between two installed providers is a plain edit that loads clean (§3); wrong/missing `schemaVersion` rejection with the `orch setup` message (§2.2); legacy `config.toml`-present error (§2.1); legacy `ssh` rejection; no-config defaults.
- [x] 6.3 Execute the settings-inspection scenarios (§4): provenance for settings.json / env / default; `--json` value+source shape; load error surfaced by `orch settings`.
- [x] 6.4 Execute the live-reload scenario: append a `notify` sink to `settings.json` while `orch events --notify` runs and confirm reload; save invalid JSON mid-edit and confirm last-good config is kept with one warning. (2026-07-17: executed via the config-watch suites, 39 pass / 0 fail. `test/config-watch.test.ts` — "applies a valid edit after the debounced change" (reload on append) and "keeps the last-good config and warns once for an invalid edit" (`warnings` length exactly 1, last-good retained). `test/daemon-configwatch.test.ts` — "loads initially and applies edits" and "keeps the last good config on invalid JSON and recovers" exercise the same behavior through the daemon's `onWarn` path that `orch events --notify` drives. The installed-binary live run reconfirms after the pending `bun run build:dev`.)
