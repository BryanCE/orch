## Why

The `config.toml` → `settings.json` storage migration has **already landed** in source. `src/config.ts` now reads `$ORCH_DIR/settings.json` through a zod `SettingsFileSchema` stamped with a single `SETTINGS_SCHEMA = 1` constant, resolves the path through `settingsPath(orchDir)`, and writes through a whole-file JSON round-trip (`writeSettingsDefault`). Every downstream reader already targets `settings.json`: `src/notify.ts` reads `loadConfig(orchDir).notify`, `src/daemon/configwatch.ts` watches `settings.json`, and `src/doctor.ts` validates it. The hand-rolled TOML parsers, both `Bun.TOML` probes, `writeDefaultEntry`/`tableBodyRange`, and the `HostConfig.ssh` alias are all gone (verified: zero matches in `src/` and `extensions/`).

What remains is two-fold. First, **verify** the landed storage against the spec's behavioral scenarios so the requirements are proven, not assumed. Second, **build** the parts the spec asserts that source does not yet satisfy: the `orch settings` provenance surface, load-time adapter/backend **id** rejection, the legacy-`config.toml`-present error, and an actionable `schemaVersion`-mismatch message. These are the real deliverables of this change; the storage swap is history.

## What Changes

### Already landed (this change verifies, does not re-implement)

- `$ORCH_DIR/settings.json` is the single user-facing settings file, hand-editable, written by setup and `writeSettingsDefault` through a whole-file JSON read-modify-write (`JSON.parse` → mutate → `JSON.stringify` at 2-space indent + trailing newline). No textual surgery remains.
- Settings carry a `schemaVersion` validated against one shared `SETTINGS_SCHEMA` constant via `z.literal`. Per repo Rule 8 there is exactly ONE current schema.
- `SettingsFileSchema.safeParse` runs loud validation on every load: unknown keys and wrong value types fail with the file path and a prettified reason, exit 1. No migration, no dual-read, no legacy fallback.
- The `hosts.<name>.ssh` alias is gone; `HostSchema` accepts `dest`/`orch_dir`/`timeout_ms` only, and an `ssh` key is rejected as unknown by `z.strictObject`.
- `src/daemon/configwatch.ts`, `src/config.ts` `watchConfig`, and the `orch events`/`orch work` live-reload path already watch `settings.json`.

### Remaining deliverables (this change builds)

- **New `orch settings` provenance command**: prints each resolvable setting's effective value with its winning source (flag > env > `settings.json` > built-in default) and supports `--json`. Entirely unbuilt — no `cmdSettings` and no `settings` dispatch entry exist today.
- **`resolveWithSource` twin of `resolveSetting`**: returns `{ value, source }` sharing one precedence order with `resolveSetting` so they cannot drift. `resolveSetting` (bare `T`) stays untouched on the hot dispatch path.
- **Installed provider sets + active-selection membership**: setup is multi-select per axis — a user installs a SET of adapters (e.g. `pi` and `claude`) and a SET of backends, then switches the active one anytime with a plain `settings.json` edit, no reinstall. The schema gains an `installed: { adapters: string[], backends: string[] }` section (zod strict). Validation requires each installed id to be registry-known AND requires `defaults.adapter ∈ installed.adapters` and `defaults.backend ∈ installed.backends`. Entirely unbuilt — no `installed` key exists in `SettingsFileSchema` today.
- **Load-time adapter/backend id rejection**: the spec asserts an unknown `defaults.adapter`/`defaults.backend` id fails at load. Today `SettingsFileSchema` accepts any string (`z.string().optional()`), so this is asserted-but-unbuilt. Validate ids at load against the adapter/backend registries and the installed sets (boundary decision recorded in design).
- **Legacy `config.toml`-present error**: `loadConfig` must error when `settings.json` is absent but `config.toml` is present. Today `readSettingsFile` returns `null` on `ENOENT` and `loadConfig` silently defaults, so a populated legacy file is dropped without a word. Add the probe.
- **Actionable `schemaVersion`-mismatch message**: a wrong/missing `schemaVersion` currently surfaces a generic zod `prettifyError` string (`config.ts:74`). It must instead direct the user to re-run `orch setup`.

## Capabilities

### New Capabilities
- (none — the settings surface already exists as a capability; see Modified.)

### Modified Capabilities
- `doctor-config`: the "Config file" requirement is verified against the landed `settings.json` storage (stamped `schemaVersion`, loud validation, `ssh` rejected) and extended with the still-unbuilt behaviors — load-time adapter/backend id rejection, the legacy-`config.toml`-present error, and the actionable `schemaVersion`-mismatch message; a new "Installed provider sets" requirement adds the `installed.adapters`/`installed.backends` sets and the `defaults ∈ installed` membership check plus the plain-edit active-switch behavior; a new "Settings inspection" requirement adds the `orch settings` provenance read surface.
- `live-reload`: the `orch events`/`orch work` live-reload requirement watches `settings.json` (already landed; verified here).
- `orchd-daemon`: the daemon reload trigger watches `settings.json` (already landed; verified here).

## Impact

- Code (remaining work only): `src/config.ts` (add the `installed` schema section; add `resolveWithSource`; add the `config.toml`-present probe to `loadConfig`; make the `schemaVersion`-mismatch error direct to `orch setup`; validate adapter/backend ids at load against the registries and require `defaults ∈ installed`), an importable adapter-id registry source (see design D-ids), `src/commands.ts` (add `cmdSettings` + register `settings` in dispatch and help).
- Code (already landed, verify only): `src/notify.ts`, `src/daemon/configwatch.ts`, `src/daemon/orchd.ts`, `src/doctor.ts`, `extensions/orchestrator-bridge.ts`.
- Data: existing user `config.toml` files stop being read; the new probe turns a leftover `config.toml` into a loud error directing re-`setup`. No migration path, by design (Rule 8).
- Cross-change coordination: `provider-driven-setup-doctor` owns the setup-wizard flow and doctor's provider-verification hooks; this change only exposes the validated load, whole-file writer, and provenance API those hooks consume.

## Non-goals

- No setup-wizard flow changes (question order, provider discovery, the multi-select onboarding UX that populates `installed`) — owned by `provider-driven-setup-doctor`. This change owns only the `installed` schema slot, its validation, and its provenance surface.
- No adapter/backend behavior changes — only how their selection is stored and validated.
- No migration or backward-compatible reading of `config.toml` — a present `config.toml` is an error, by design.
- No new settings keys or schema shape beyond today's landed `SettingsFileSchema` plus the `installed` provider-sets section this change adds.
- No `notifier-adapters` spec delta — that wording already carries `settings.json` in the main spec (`openspec/specs/notifier-adapters/spec.md`), resolved externally.
