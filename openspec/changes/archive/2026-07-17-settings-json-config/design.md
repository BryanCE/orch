## Context

The `config.toml` → `settings.json` migration **already landed** in `src/config.ts` (verified in the working tree, 2026-07-16). The current source:

- Reads `$ORCH_DIR/settings.json` via `node:fs` in `readSettingsFile(file)` (returns the typed file or `null` on `ENOENT`), path resolved by `settingsPath(orchDir)`.
- Validates with a zod `SettingsFileSchema` (`z.strictObject`, so unknown keys are rejected structurally). `schemaVersion` is `z.literal(SETTINGS_SCHEMA)` with `SETTINGS_SCHEMA = 1` the single exported constant.
- Exposes `loadConfig(orchDir) → OrchConfig` (unchanged consumer shape: `defaults`, `queue`, `notify`, `hosts`, `workspaces`), `watchConfig` (already watching `settings.json`), and `writeSettingsDefault(orchDir, key, value)` — a whole-file JSON round-trip that reads, merges one `defaults` key, re-validates with `SettingsFileSchema.parse`, and writes `JSON.stringify(next, null, 2) + "\n"`.
- `HostSchema` is `dest`/`orch_dir`/`timeout_ms` — no `ssh`.

The hand-rolled TOML parsers, both `Bun.TOML` probes, `writeDefaultEntry`/`tableBodyRange`, `parseFallbackToml`/`parseToml`, and `HostConfig.ssh` **no longer exist** (grep across `src/` + `extensions/` returns zero matches). Downstream readers are already retargeted: `src/notify.ts` reads `loadConfig(orchDir).notify`, `src/daemon/configwatch.ts` has `CONFIG_FILE = "settings.json"`, `src/doctor.ts` config-validity check uses `settingsPath(orchDir)`, and `extensions/orchestrator-bridge.ts` `allowedModelPatterns` consumes `loadConfig` unchanged.

Precedence (flag > env > config > default) lives in `resolveSetting(opts)` (`config.ts:188`) and stays untouched. `SettingsFileSchema.safeParse` is the validator — there is no separate `validateSettings`/`table`/`knownKeys` helper layer; zod does the unknown-key/type work.

**So this change is not the storage swap.** It is (a) verification of the landed storage against the spec scenarios, and (b) four unbuilt behaviors the spec asserts: `orch settings` provenance, load-time adapter/backend id rejection, the legacy-`config.toml`-present error, and an actionable `schemaVersion`-mismatch message.

## Goals / Non-Goals

**Goals:**
- Verify the landed `settings.json` storage against the doctor-config / live-reload / orchd-daemon scenarios (they are the acceptance gates).
- Add an `installed: { adapters: string[], backends: string[] }` schema section — the multi-select set of providers a user installed, from which `defaults` picks the active one.
- Add load-time rejection of unknown adapter/backend **ids** against the registries, and require `defaults.adapter ∈ installed.adapters` / `defaults.backend ∈ installed.backends`.
- Add the legacy-`config.toml`-present probe to `loadConfig`.
- Make the `schemaVersion`-mismatch error direct the user to re-run `orch setup`.
- Add `orch settings` printing effective values with provenance and `--json`, backed by a `resolveWithSource` twin of `resolveSetting`.

**Non-Goals:**
- Re-implementing the storage swap (done). No task may delete symbols that no longer exist.
- Setup-wizard flow, provider discovery, the multi-select onboarding UX that *populates* `installed`, doctor's provider-verification hooks (`provider-driven-setup-doctor`). This change owns the `installed` schema slot + its validation + its provenance surface only.
- Any new schema key or shape change beyond the landed `SettingsFileSchema` plus the `installed` provider-sets section.
- Reading or migrating `config.toml` values — its presence is an error.

## Decisions

### D1 — One schema constant, stamped and required (LANDED — verify)
`SETTINGS_SCHEMA = 1` is the single exported constant in `config.ts`. `writeSettingsDefault` stamps it (via `SettingsFileSchema.parse` on a shape carrying `schemaVersion: SETTINGS_SCHEMA`); every load requires `schemaVersion === SETTINGS_SCHEMA` through `z.literal`. Nothing to build here — the scenario "Wrong schema version is rejected" is the verification gate. **Note:** the exported symbol is `SETTINGS_SCHEMA`, not `SETTINGS_SCHEMA_VERSION`; the file constant `settingsPath()` replaces the earlier notion of a `SETTINGS_FILE` string.

### D2 — Load outcomes (three LANDED, one TO BUILD)
`loadConfig(orchDir)` must resolve to exactly one of:
1. `settings.json` present and valid → typed `OrchConfig`. **(LANDED)**
2. `settings.json` present but invalid (bad JSON, unknown key, wrong type, wrong `schemaVersion`, **or unknown adapter/backend id**) → throw with file path + reason, caller exits 1. **(PARTLY LANDED — id rejection is D-ids below; the message tweak is D-schemaversion.)**
3. `settings.json` absent but `config.toml` present → throw: legacy TOML detected, settings now live in `settings.json`, re-run `orch setup`. **(TO BUILD — `readSettingsFile` currently returns `null` on `ENOENT` and `loadConfig` silently defaults, so a populated `config.toml` is dropped without a word.)**
4. Both absent → built-in defaults, silent (fresh install). **(LANDED — `loadConfig` returns defaults when `readSettingsFile` yields `null`.)**

**Why build outcome 3:** a silent "defaults" on a machine that still has a populated `config.toml` drops the user's real settings without a word. The explicit error is the loud-failure guarantee. Implementation: in `loadConfig`, when `readSettingsFile` returns `null`, probe `path.join(orchDir, "config.toml")` with `filesystem.existsSync`; if present, throw the actionable error; else return built-in defaults.

### D3 — Validation is zod, not a hand-rolled helper layer (LANDED — supersedes prior D3)
The prior design prescribed a pure `validateSettings(parsed, file)` splitting IO from a `table`/`knownKeys`/`fail`/`rejectUnknown` helper set. **That layer never landed and is not needed:** `SettingsFileSchema.safeParse` already does structural validation (unknown keys via `z.strictObject`, types via field schemas) as a pure function over a plain object, exactly as testable — call `SettingsFileSchema.safeParse({...})` with a literal. `readSettingsFile` is the thin IO wrapper (read + `JSON.parse` + `safeParse`). Do **not** introduce a parallel `validateSettings`/`knownKeys` API; extend the existing schema + load path instead.

### D-installed — Installed provider sets, and `defaults ∈ installed` membership (TO BUILD)
Setup is **multi-select per axis**: a user installs a SET of adapters (e.g. `pi` and `claude`) and a SET of backends, and the active one is whichever `defaults.adapter`/`defaults.backend` names. Switching the active provider is then a plain `settings.json` edit that takes effect for new spawns — no reinstall. This requires two things in the schema this change owns:

- **New `installed` section:** add `installed: z.strictObject({ adapters: z.array(z.string()), backends: z.array(z.string()) }).optional()` to `SettingsFileSchema`. `OrchConfig` gains `installed: { adapters: string[]; backends: string[] }` (defaulted to empty arrays in `loadConfig`) so consumers and `orch settings` can read the installed set.
- **Membership validation (post-parse):** every id in `installed.adapters`/`installed.backends` must be registry-known (you cannot install a provider the binary does not ship), AND when `defaults.adapter` is set it must be a member of `installed.adapters`, likewise `defaults.backend ∈ installed.backends`. A `defaults` naming a non-installed provider is a loud load error that names the offending key AND lists the installed set.
- **Scope boundary (recorded per team-lead):** the wizard multi-select UX that *populates* `installed` (how the user picks the set, install-time verification) is `provider-driven-setup-doctor`'s scope. This change owns only the `installed` schema slot, its validation, and its provenance surface.

### D-ids — Adapter/backend id rejection at load, against the registries (TO BUILD)
The spec asserts an unknown `defaults.adapter`/`defaults.backend` id fails at load; `SettingsFileSchema` accepts any string. **Boundary decision (recorded per team-lead):** validate ids at load against the adapter and backend **registries** — the registries are the sanctioned composition root, and core config code may import them. With D-installed, `installed` is the source of truth: registry-known ids gate the installed set, and `defaults` must pick from `installed` (so `defaults` is transitively registry-known).

- **Backend ids:** `config.ts` imports `allBackends()` from `src/backends/registry.ts` and rejects any `installed.backends` id (and, by membership, `defaults.backend`) not in `allBackends().map(b => b.id)`. Verified no import cycle — `src/backends/**` does not import `config.ts`.
- **Adapter ids:** the runtime adapter list is today a **private** `adapters` const in `src/commands.ts` (`[piAdapter, codexAdapter, claudeAdapter]`), and `commands.ts` imports `config.ts` — so `config.ts` cannot import that list without a cycle. `AdapterId` in `adapters/adapter.ts` is a **type**, not a runtime value. **Therefore the adapter id list must move to / be exposed by an importable registry module** (mirroring `backends/registry.ts`, e.g. `src/adapters/registry.ts` exporting `allAdapters()`/adapter ids) that both `commands.ts` and `config.ts` import. This registry extraction is part of the D-ids task.
- **Where the check runs:** keep `SettingsFileSchema` free of registry imports so it stays a pure data contract. Do the id + membership checks as one post-parse pass in the load path (after `safeParse` succeeds), throwing the file-path + offending-key + (supported-ids | installed-set) error shape. This keeps structural validation (zod) and composition validation (registries + installed membership) separate.

**Why not a zod `.superRefine` importing the registries:** it would couple the pure schema module to the composition root and pull the registry graph into every place the schema type is referenced. A post-parse pass keeps the schema a plain data contract and localizes the registry dependency to the load path.

### D-schemaversion — Actionable schemaVersion-mismatch message (TO BUILD)
Today a wrong/missing `schemaVersion` fails inside the same `safeParse` as any other defect and surfaces a generic `z.prettifyError` string (`config.ts:74`). The scenario requires it to **direct the user to re-run `orch setup`**. Implementation: in `readSettingsFile`, when `safeParse` fails, detect a `schemaVersion` issue in `result.error` (the failing path includes `schemaVersion`) and prepend/replace with an actionable message naming the file and instructing `orch setup`; other defects keep the prettified per-key message. Small, load-path-local; no schema shape change.

### D4 — Whole-file JSON writer: bless the shipped `writeSettingsDefault` (LANDED — supersedes prior D4)
The prior design prescribed a `writeSettings(orchDir, mutate: (draft) => void)` mutator with atomic tmp+rename. **The shipped writer is `writeSettingsDefault(orchDir, key, value)`** — a whole-file read → merge one `defaults` key → `SettingsFileSchema.parse` (stamps `schemaVersion`, re-validates) → `writeFileSync(JSON.stringify(next, null, 2) + "\n")`. This **satisfies the read-modify-write intent** (law #6): it round-trips the whole file, never reasons about JSON textually, and centralizes the schema stamp in one writer. Setup calls it twice (`commands.ts:1643-1644`) for `adapter` and `backend`, which is fine — two independent single-key upserts, no shared-transaction requirement.

**Bless `writeSettingsDefault` as-is; do not refactor to a `mutate` closure.** *Optional cleanup only (not required by any scenario):* if a future writer needs to set multiple keys atomically or write outside `defaults`, generalize then — and atomic tmp+rename could be added as hardening. Neither is in scope here.

### D5 — `orch settings` reuses precedence via a `resolveWithSource` twin (TO BUILD)
`orch settings` computes each effective value the way commands do and reports the winning source. It calls a `resolveWithSource({ flag, env, config, fallback })` twin of `resolveSetting` returning `{ value, source: "flag" | "env" | "settings.json" | "default" }`. Human output is an aligned table (`adapter   claude   (settings.json)`); `--json` emits `{ key: { value, source } }`. On a load error (invalid `settings.json` or legacy `config.toml` present), it surfaces the same loud error and exits non-zero — no partial table. **Why a twin over instrumenting `resolveSetting`:** `resolveSetting` returns a bare `T` on every hot dispatch path; threading provenance through it churns every call site. The twin lives beside it and both read one shared precedence order so they cannot drift.

### D6 — `notify.ts` reads the validated load (LANDED — verify)
`loadNotifierEntries` already reads `loadConfig(orchDir).notify` (`notify.ts:114`); the private `parseConfig`/`Bun.TOML` probe is gone. The per-entry `NotifierEntry` field checks stay in `notify.ts` (notifier-adapter shape, not core settings shape). Nothing to build.

## Risks / Trade-offs

- **[Users lose settings on upgrade]** → By design (Rule 8, no migration). The loud outcome-3 error (D2) that names `settings.json` and `orch setup` is the mitigation; it is a TO-BUILD deliverable of this change.
- **[Config core now depends on the registries]** → Accepted (D-ids boundary decision). The dependency is localized to the load-path id check, not the pure `SettingsFileSchema`. The adapter registry extraction removes the one cycle that would otherwise block it.
- **[`allowedModelPatterns` swallows malformed config]** → It already catches and falls back to `DEFAULT_ALLOWED_MODELS` (`config.ts:205`). That stays: a broken settings file must not block the extension's model gate. The loud error surfaces through `loadConfig`'s other callers and `orch doctor`.
- **[configwatch mid-edit invalid JSON]** → `watchConfig`/`configwatch.ts` already publish only successfully loaded configs and warn on failure; a half-saved file warns and keeps last-good. Verified by the live-reload scenario.

## Migration Plan

No data migration. Deploy is the remaining-deliverables code change plus a re-`setup` for any user still holding a `config.toml` (now a loud error rather than a silent reset). The `SETTINGS_SCHEMA` constant stays at `1`.

## Open Questions

- None blocking. `orch settings` column set follows the resolvable settings (`adapter`, `backend`, `model`, `spawn_cap`, `worktree`, `worker_peer_tools`, `queue.max_retries`); hosts/workspaces/notify are listed as configured values without env/flag provenance (no env override exists for them), which the specs make explicit.
