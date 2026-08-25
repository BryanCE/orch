## Context

`cmdSetup` (`src/commands.ts:1611-1758`) and `runDoctor` (`src/doctor.ts:840-865`) are the two user-facing surfaces that assemble and validate an orch installation. Both predate the settled harness × plexer architecture and hardcode the pi+herdr happy path:

- Setup records a **single** selected adapter+backend to config, then **ignores the selection**: it probes a fixed `DEP_INSTALLERS` list (`bun`/`pi`/`claude`), builds pi extensions only when `harness === "pi"` (`commands.ts:1680-1694`), installs claude hooks only when `harness === "claude"` (`commands.ts:1718`), and never touches codex. The `plexer` installer entry was a placeholder; the current table (`commands.ts:1458-1462`) is `bun`/`pi`/`claude` and carries **no codex entry**, so selecting codex on a codex-less machine has no install action to resolve. The notifier wizard in `src/setup/notifiers.ts` is fully written and tested but never called — setup writes zero notify entries.
- Doctor runs a fixed check list. `binaryStatus()` (`doctor.ts:99-102`) hardcodes `{bun, pi}`; `checkBins` (`doctor.ts:104-114`) fails when pi is absent; `checkClaudeHooks` (`doctor.ts:848`) always runs; `checkExtensions` (`doctor.ts:527-529`) gates only on `bins.pi`. A claude+tmux user gets `pi MISSING` failures and no tmux/claude-specific validation.

The architecture (design-patterns.md L4/L4b, learnings law #7) makes both surfaces provider-derived: setup is the **Builder** that composes each selected provider by asking it to install its own integration; doctor **derives its checks from the resolved providers** and validates declared settings against reality.

**New user requirement (binding, from Bryan): setup is MULTI-SELECT per axis.** The wizard lets the operator select a *set* of adapters (e.g. pi **and** claude) and a *set* of backends. Setup installs every selected provider's integration, then asks which of each installed set is the **active default** for that axis, and writes both the installed sets and the active defaults to `settings.json`. Switching the active provider later is a settings edit (or a setup re-run) with **no reinstall** — every installed provider's shim is already present. Doctor verifies **every installed provider**, not only the active pair.

The settings shape for the installed sets is `installed: { adapters: string[], backends: string[] }` — symmetric across both axes and matching repo vocabulary (adapter, `resolveAdapter`) — with `defaults.adapter`/`defaults.backend` as the active default per axis. That shape is owned and specified by `settings-json-config`. This change consumes it — installed sets (`installed.adapters`, `installed.backends`) plus the active default per axis — and never re-specifies its serialization.

**Note on live drift:** a concurrent implementer landed a flat `harnesses: string[]` field (`config.ts:24`) plus `writeSettingsHarnesses` for the adapter axis only — pre-spec drift, not a shipped format. The specced `installed.{adapters,backends}` shape wins (Rule 8: pre-publish, one schema, rename freely). This change migrates the live code to it (see D11 and task 6); there is **no** dual-read and no compat for `harnesses`.

This change is one of a coordinated set. Surfaces it consumes but does **not** own:
- `installShim()` **bodies** per adapter — owned by `adapter-presence-writers`. This change calls `resolveAdapter(id).installShim?.()`; the method already exists on the `AgentAdapter` port (`src/adapters/adapter.ts:125`). Its per-adapter bodies (pi extension link, claude hooks, codex notify shim) land in that change.
- The settings file format/schema/writer, including the installed-sets shape — owned by `settings-json-config`. This change reads the installed sets + active defaults and writes notify entries through that writer; it references "the settings file" and never re-specifies its format.
- The physical split of `commands.ts`/`doctor.ts` into smaller modules — owned by `monolith-file-breakdown`. This change edits setup/doctor logic in place.

This change **does** own one new port surface: the read-side `diagnoseShim()` method (D7), the diagnose twin of `installShim()`.

## Goals / Non-Goals

**Goals:**
- Setup multi-selects a *set* of adapters and a *set* of backends, installs every selected provider's integration through the provider ports, then records the installed sets plus one active default per axis. No `harness ===`/`backend ===` branch remains at the call site.
- Prerequisite probing is scoped to the selected providers' binaries only, discovered from the provider id (the id-is-binary invariant, D4), never a fixed `bun/pi/claude` list.
- `DEP_INSTALLERS` is keyed by real provider id with a declared dependency shape (`needs[]`, D5) and a codex entry; providers with no automatic installer print a docs URL.
- The notifier wizard runs as a real setup step and persists selections through the settings writer — specified as a MODIFIED delta of the existing `notifier-adapters` "Notifier setup and doctor validation" requirement, not a new parallel requirement.
- Doctor's check set is derived from the **installed** adapters and backends (each installed provider self-diagnoses via `diagnoseShim()`) plus a live-fleet-pair verification, with the active default identified; no hardcoded pi/claude/herdr checks remain, and doctor never dies when the settings load throws.
- Switching the active provider (settings edit or setup re-run) never reinstalls a shim; installing a provider's integration is idempotent and additive.

**Non-Goals:**
- Implementing `installShim()` bodies (adapter-presence-writers).
- Defining the settings file format, schema version, installed-sets shape, or round-trip writer (settings-json-config).
- Splitting `commands.ts`/`doctor.ts` into `commands/`/`doctor/` directories (monolith-file-breakdown).
- Auto-probing tmux in `resolveBackend`, or tmux's optional port surface (tmux-backend-completion).
- The control-plane dispatcher / `installShim` call from the daemon (adapter-control-authority).

## Decisions

### D1 — Setup multi-selects a set per axis, installs every selection, then picks the active default
The wizard collects a *set* of adapters and a *set* of backends (multiselect, not a single pick). Setup then, for **every** selected adapter, probes its binary and calls its `installShim?.()`; for **every** selected backend, probes its binary and prints its docs-URL hint if absent. Only after every selected provider's integration is installed does setup ask which installed adapter is the **active default** and which installed backend is the active default. Setup writes both: the installed sets (`installed.adapters`, `installed.backends` — the shape owned by settings-json-config) and the two active defaults (`defaults.adapter`, `defaults.backend`).

*Consequence:* "which provider is active" and "which providers are installed" are separate axes of state. Spawning can use any installed provider; the active default is just the one used when a command omits `--agent`/`--backend`.

*Alternative considered:* single-select per axis (the prior design). Rejected per the binding user requirement — a machine routinely runs pi **and** claude, and forcing a reinstall to switch between them is the defect.

### D2 — Setup asks each selected adapter to install its own integration; no identity branches
For each selected adapter, setup calls `resolveAdapter(id).installShim?.()`. The pi-extension block (`commands.ts:1680-1694`), the `installClaudeHooks(pkgRoot)` call (`commands.ts:1718`), and any future codex block collapse into one port call per selected adapter. This is the L4 Builder: the adapter encodes which integration it needs; the call site never enumerates providers.

`resolveAdapter` takes a bare id — its signature is `resolveAdapter(id: string): AgentAdapter` (`commands.ts:1856`), **not** `resolveAdapter({ configured })`. Every reference in this change's artifacts uses the bare-id form.

*Alternative considered:* keep an `if`/`switch` on the selected id in setup and call the right installer. Rejected — that is exactly the `commands.ts:1680-1718` anti-pattern; adding harness N+1 would edit the call site again (violates law #1: zero call-site edits for a new provider).

### D3 — Idempotent additive install; switching the active default never reinstalls
`installShim()` is idempotent and additive by contract (design-patterns L4b): safe to run repeatedly, never removes another provider's integration. Two consequences:
- **Re-run setup** with a changed selection installs only the newly-added providers' shims; providers already in the installed set are left untouched. A provider dropped from the selection keeps its dormant, self-gating shim installed (no uninstall path — Rule 8).
- **Switch the active default** — because every installed provider's shim is already present, changing `defaults.adapter` (or `defaults.backend`) is a pure settings edit. It triggers **no** `installShim()` call. A setup re-run that only changes the active default likewise reinstalls nothing; it records the new default and reports the existing shims as already current.

This is what makes "switch active adapter with no reinstall" (the user requirement) a one-line settings write, and "re-pair one axis" a settings write plus at most one idempotent shim call for a newly-added provider.

### D4 — Prerequisites are the selected providers' binaries; the id IS the binary name (invariant)
The prereq loop probes exactly the binaries of the selected providers — for each selected adapter and backend, whether its CLI is on PATH. **The adapter/backend id IS its probe binary name.** This invariant is true today (`pi`→`pi`, `claude`→`claude`, `codex`→`codex`, `herdr`→`herdr`, `tmux`→`tmux`) and is recorded as a documented invariant rather than adding a `binary` field to the port: the id, already the registry key and the presence/identity token, is the executable name. A provider whose CLI is not on PATH is reported missing by its id.

`bun` is **not** an unconditional orch prerequisite (Rule 6: orch runs on node). It is surfaced only as a selected provider's declared install dependency (D5) — pi's installer is `bun add -g …`, so `bun` is listed as `needs` of pi, installed before pi, and never probed on its own.

**`binaryStatus()` signature change.** `binaryStatus()` currently returns the fixed `{ bun, pi }` map (`doctor.ts:99-102`). It becomes `binaryStatus(ids: readonly string[]): BinaryStatus`, probing exactly the passed ids (each `onPath(id)` under the invariant). Its two setup call sites move in lockstep:
- `commands.ts:1650` (`const bins = binaryStatus()`) passes the selected providers' ids.
- `commands.ts:1751` (`await checkExtensions(binaryStatus())`) — this call disappears entirely, since `checkExtensions` is relocated into `piAdapter.diagnoseShim()` (D7); setup's post-install validation runs `diagnoseShim()` per installed adapter instead.

*Alternative considered:* add a `binary` field to the `AgentAdapter`/`Backend` port. Rejected as redundant — the id already is the binary; a second field could only ever drift from it. If a future provider's CLI name diverges from its id, that provider adds the field then; today the invariant holds and is documented.

### D5 — `DEP_INSTALLERS` keyed by provider id, with a declared dependency shape and a no-installer case
The table becomes a per-provider-id map whose entries carry an explicit shape rather than a bare command string:
- `install`: a real install command, **or** `docsUrl`: a documentation URL meaning "not installable automatically — print this URL." Exactly one of the two.
- `needs?: string[]`: prerequisite provider ids that must be installed first, **in declared order**. Ordering is the explicit `needs` array, never an implicit position in an outer array. pi declares `needs: ["bun"]`; installing pi installs `bun` first.

Entries:
- `pi` → `install: "bun add -g @earendil-works/pi-coding-agent"`, `needs: ["bun"]`.
- `claude` → `install: "curl -fsSL https://claude.ai/install.sh | bash"`.
- `codex` → its documented install (`docsUrl` to codex's install docs) so selecting codex on a codex-less machine resolves to a manual-install hint rather than a missing entry. (m5: a codex selection must have an install action.)
- `bun` → `install: "curl -fsSL https://bun.sh/install | bash"` — present only as pi's `needs` target, never probed on its own.
- Backends with no public one-line installer (herdr, tmux) use the `docsUrl` form.

Lookups key on the selected provider id, so a mismatch between installer id and provider id is impossible. No entry uses a placeholder URL or an id absent from the provider registries.

### D6 — Notifier step is a MODIFIED delta of the existing `notifier-adapters` requirement
The notifier axis is a shipped capability; its setup+doctor behavior is already specified by `notifier-adapters` "Notifier setup and doctor validation" (`openspec/specs/notifier-adapters/spec.md:39-40`: discover, pick-list, collect declared fields, persist as `notify` entries in `settings.json`; doctor validates them). This change does **not** add a second, parallel notifier-setup requirement in `provider-setup`. Instead it **modifies** that existing requirement to wire the step into the multi-select flow: the notifier step runs after the selected provider pair-set is installed, and a non-interactive / `--yes` run skips the pick-list (adds no notifiers) rather than guessing. The delta lives in this change's `specs/notifier-adapters/spec.md` under `## MODIFIED Requirements`.

Implementation: `probeNotifiers()` → pick-list of available notifiers → for each selected, `collectRequiredConfig(id, answers)` → persist through the settings writer owned by `settings-json-config`. The existing `buildSelectedNotifyEntries`/`renderNotifyEntry` helpers produce config in the parser's shape; the persistence target and its serialization are consumed from settings-json-config, not defined here.

### D7 — `diagnoseShim()`: a read-side port method, the diagnose twin of `installShim()` (fixes law-#3 identity branch)
The prior design had doctor select the adapter integration check by identity ("pi → extension bundle, claude → hooks, codex → notify"). That can only be an identity branch at the call site — there is no polymorphic surface — which violates law #3 (callers gate on capabilities/ports, never on adapter id). **Fix:** this change **adds** a read-side method to the `AgentAdapter` port:

```
diagnoseShim?(): CheckResult | Promise<CheckResult>;
```

`diagnoseShim()` is the diagnose twin of `installShim()`: it verifies that the adapter's own integration is installed and current, returning a `CheckResult` (the same ok/warn/fail shape doctor already renders). The three provider-specific check bodies **relocate onto the adapters**:
- `checkExtensions` (`doctor.ts:527`) → `piAdapter.diagnoseShim()` (the extension-bundle check).
- `checkClaudeHooks` (`doctor.ts:297`) → `claudeAdapter.diagnoseShim()` (the hooks-shim check).
- the codex notify-shim verification → `codexAdapter.diagnoseShim()`.

Doctor then calls `resolveAdapter(id).diagnoseShim?.()` **polymorphically for every installed adapter** — no identity branch. An adapter without `diagnoseShim` declares no integration to verify and contributes no adapter-integration check.

**Ownership and coordination.** This change owns `diagnoseShim` (port declaration + the three diagnose bodies). It mirrors `installShim`, whose **bodies** are owned by `adapter-presence-writers` (the install side of the same per-adapter integration). Diagnose mirrors install per adapter: pi diagnoses the extension link it installs, claude diagnoses the hooks it installs, codex diagnoses the notify shim it installs. The two changes coordinate so that for each adapter, `installShim` (adapter-presence-writers) and `diagnoseShim` (this change) target the same integration artifacts. Recorded in Impact.

*Alternative considered:* keep the check bodies in `doctor.ts` and branch on the configured id. Rejected — that is the exact law-#3 violation B1 flags; the polymorphic `diagnoseShim()` removes the branch.

### D8 — Doctor derives its check list from the installed sets plus live fleet pairs
`runDoctor` reads the installed sets + active defaults, resolves each installed provider, and asks each to self-diagnose:
- **Adapter checks**: for **every installed adapter** (not only the active default), `resolveAdapter(id).diagnoseShim?.()` — binary on PATH (id-is-binary, D4) plus its integration installed and current. A multi-adapter install (pi **and** claude) produces one adapter-integration check per installed adapter, each polymorphic.
- **Backend checks**: for every installed backend, `isAvailable()` and, for session-scoped backends, `isInsideSession()` — reuses the already-provider-generic `checkBackendCapabilities`.
- **Live-fleet-pair check**: enumerate presence/spawn records, and for every `(adapter, backend)` pair still live in the fleet (mixed fleets are a supported steady state), verify that pair's integration is current **via the same `diagnoseShim()`** (m8) — so a herdr+pi pane and a tmux+claude pane in the same fleet each get their pair validated by the pair's adapter's own diagnose method, not a per-id branch.

The provider-neutral checks (presence records, spawn registry, orchd, notify sinks, remote hosts, worktree gitignore, ORCH_DIR location) stay unconditional. Only the three provider-specific checks (`checkBins` pi requirement, `checkClaudeHooks`, `checkExtensions` gating) become provider-derived and move behind `diagnoseShim`.

*Consequence (user requirement):* doctor flags a broken integration for an installed-but-**inactive** provider — if claude is installed but not the active default and its hooks shim is missing, doctor still fails, because the check set derives from the installed set, not the active pair.

*Alternative considered:* verify only the active default pair. Rejected — the user runs multiple installed providers; a broken inactive provider is a real, spawnable defect doctor must catch.

### D9 — Doctor validates declared settings against reality and never dies on a load error
Beyond "is the binary present", doctor compares what the settings declare to what exists: every installed adapter resolvable and on PATH, its shim installed and matching the current build; every installed backend available and (if session-scoped) inside a session; the active defaults present in their installed sets. A declared provider that can't be resolved is a loud `fail` naming the settings path and the offending key.

**Doctor catches the settings load error (m7).** `settings-json-config` makes `loadConfig` **throw** on an unknown adapter/backend id, a legacy `config.toml`, or a schemaVersion mismatch. Doctor must not die before its checks run: the settings read is wrapped so that a thrown load error is rendered as a **failing check result** (id `config`/`settings`, status `fail`, the thrown message as detail), and the remaining provider-neutral checks still execute and report. Doctor reports the broken settings; it never crashes on them.

### D10 — Hard dependency on adapter-presence-writers; loud failure on an expected-but-missing shim (M3)
Setup must distinguish "this adapter declares no integration" (fine, proceed silently) from "this adapter's integration is expected but its writer hasn't landed yet" (a real gap, must be loud — law #3). The signal is the **diagnose/install symmetry**: an adapter that declares an integration exposes **both** `diagnoseShim` and `installShim`. So:
- Adapter exposes neither → declares no integration → setup proceeds silently, no adapter-side install.
- Adapter exposes `diagnoseShim` but **not** `installShim` → the integration is expected (something to diagnose) but unbuildable (nothing to install) → setup **warns loudly**, names the adapter, and reports the gap; it does not silently no-op.

The dependency is made hard two ways: (1) a **task gate** that `adapter-presence-writers` lands its `installShim` bodies before this change's compose-the-pair task, and (2) the runtime loud warning above, so a partial rollout surfaces the gap rather than silently skipping an adapter's integration.

### D11 — Migrate the live `harnesses` field to the specced `installed.{adapters,backends}` shape (no dual-read)
The live code carries a flat `harnesses: string[]` field (`config.ts:24,47,86`), a `writeSettingsHarnesses` writer (`config.ts:230-231`), and consumers in `cmdSetup` and `orch config` (`commands.ts:1588-1636,1691-1699`) plus `test/config.test.ts`. This is pre-spec implementer drift for the adapter axis only; the specced shape `installed: { adapters: string[], backends: string[] }` (owned by `settings-json-config`) wins and covers both axes symmetrically. Because the project is pre-publish (Rule 8), this is a rename, not a format to support: **no dual-read, no `harnesses` fallback, no compat alias.** In the same change that implements the multi-select flow, the migration renames the zod field `harnesses` → nested `installed.adapters` (with `installed.backends` alongside), replaces `writeSettingsHarnesses` with a writer matching the `installed` shape, updates `cmdSetup`'s write and its "Selection recorded…" echo text, retargets `OrchConfig.harnesses` and every reader (`config.harnesses` in `orch config`), and fixes `test/config.test.ts` — all in one commit. The `installed.backends` half of the schema is owned by `settings-json-config`; this change coordinates so the nested shape lands once, not twice.

## Risks / Trade-offs

- **[installShim bodies land in a sibling change]** → This change's runtime depends on `adapter-presence-writers` delivering `installShim()` for pi/claude/codex. Mitigation: the port method already exists; setup calls it defensively and the D10 diagnose/install-symmetry warning makes a missing-but-expected shim loud rather than silent. The end-to-end scenario tasks are the gate — they pass only once the shim bodies exist (intended cross-change ordering, law #7).
- **[diagnoseShim must mirror installShim per adapter]** → If diagnose and install target different artifacts, doctor could pass while the shim is broken (or vice versa). Mitigation: the two are the same per-adapter integration; this change's diagnose bodies are lifted directly from the existing `checkExtensions`/`checkClaudeHooks` logic that already matched the installers, and the cross-change coordination note pins them to `adapter-presence-writers`' install bodies.
- **[settings writer + `installed.{adapters,backends}` shape land in a sibling change]** → Notifier persistence, the `installed` shape, and doctor's "declared settings" reads consume `settings-json-config`. Mitigation: reference the writer/reader and `installed` shape by their port surface; if that change hasn't landed, the notifier-wizard, installed-shape, and declared-settings tasks block on it rather than reintroducing config.toml surgery. The `harnesses`→`installed.adapters` field migration (D11) is owned here and coordinated so the nested shape lands once.
- **[Multi-select leaves dormant shims from dropped providers]** → After dropping claude from the selection, its hooks shim remains installed. Mitigation: designed L4b behavior — dormant shims self-gate on `ORCH_AGENT_KEY` and never fire for a non-spawned provider; doctor reports an installed provider's shim as a real check (it may still be spawned), not a failure of being inactive. No uninstall path (Rule 8).
- **[Mixed-fleet pair check cost]** → Verifying every live pair walks presence records. Mitigation: the walk already exists for stale-presence/extension-staleness; the pair check reuses the enumeration, adding one `diagnoseShim()` per distinct pair (bounded by provider combinations, not agents).

## Migration Plan

No user data migration. `config.toml`→settings.json migration and the installed-sets shape are owned by `settings-json-config` (Rule 8: old files are malformed, not migrated). Deploying this change:
1. Add `diagnoseShim()` to the `AgentAdapter` port and implement its three bodies by relocating `checkExtensions`/`checkClaudeHooks`/codex-notify-verify onto the adapters.
2. Re-key `DEP_INSTALLERS` (id-keyed, `needs[]` shape, codex entry) + change `binaryStatus()` to `binaryStatus(ids)` + scope prereq probing to the selected providers (setup still single-select — safe intermediate).
3. Migrate the live `harnesses` field to `installed.{adapters,backends}` (D11): rename the zod field, replace `writeSettingsHarnesses`, fix `cmdSetup`'s write + echo, retarget every reader and `test/config.test.ts` in one commit; no dual-read.
4. Make setup multi-select: collect a set per axis, install every selected provider's `installShim()` (requires `adapter-presence-writers` shims present), ask for the active default per axis, write installed sets + defaults through the new writer.
5. Wire the notifier step (requires `settings-json-config` writer).
6. Convert doctor to installed-set-derived checks via `diagnoseShim()` per installed provider + live-pair validation, with the load-error-as-check-result guard.
7. Run the spec scenarios end-to-end (final task; the gate that was skipped last time).

Rollback: revert the change; setup/doctor return to the hardcoded list and single-select. No persisted state changes shape here, so rollback is code-only.

## Open Questions

- Does the backend port need an explicit `installShim()`/`diagnoseShim()` symmetric to the adapter's? Current read: backends need no shim install (herdr/tmux are external binaries; headless is bare processes), so setup's backend-side step is prereq-probe + docs-URL only, and doctor's backend check stays `isAvailable()`/`isInsideSession()`. If a backend later needs an installed integration, those methods are added on the `Backend` port by the owning change, and setup's/doctor's call sites already treat it as "ask the provider."
- Exact settings keys for the installed-backend set and persisted notify entries are deferred to `settings-json-config`; this change's scenarios assert *that* installed sets and defaults are written and re-read (and that switching the active default reinstalls nothing), not their on-disk serialization.
