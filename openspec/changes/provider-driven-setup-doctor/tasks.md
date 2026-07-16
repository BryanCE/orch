## 0. Cross-change dependency gate (hard)

- [ ] 0.1 GATE: `adapter-presence-writers` MUST land its per-adapter `installShim()` bodies (pi/claude/codex) before task 2 (setup composes the pair). This change calls `installShim?.()`; without the bodies, the multi-select install has nothing to run. Do not start task 2 until the shim bodies exist on the shipped adapters.
- [x] 0.2 GATE: `settings-json-config` owns the specced `installed: { adapters: string[], backends: string[] }` shape and the whole-file writer; coordinate so the nested shape lands once. The live flat `harnesses` field is pre-spec drift this change migrates (task 6) — no dual-read.

## 1. Port: `diagnoseShim()` and prerequisite probing scoped to selected providers

- [ ] 1.1 Add `diagnoseShim?(): CheckResult | Promise<CheckResult>` to the `AgentAdapter` port (`src/adapters/adapter.ts`) — the read-side twin of `installShim()`. Document it as mirroring `installShim` per adapter (diagnose verifies what install writes).
- [ ] 1.2 Relocate the three provider-specific check bodies onto the adapters: `checkExtensions` (`doctor.ts:527`) → `piAdapter.diagnoseShim()`; `checkClaudeHooks` (`doctor.ts:297`) → `claudeAdapter.diagnoseShim()`; the codex notify-shim verification → `codexAdapter.diagnoseShim()`. Coordinate with `adapter-presence-writers` so each diagnose targets the same artifacts its `installShim` writes.
- [ ] 1.3 Change `binaryStatus()` (`doctor.ts:99-102`) to `binaryStatus(ids: readonly string[]): BinaryStatus`, probing exactly the passed ids under the id-is-binary invariant (`onPath(id)`). Update its two setup call sites in lockstep: `commands.ts:1650` (`const bins = binaryStatus()`) passes the selected providers' ids; `commands.ts:1751` (`await checkExtensions(binaryStatus())`) is removed — setup's post-install validation runs `diagnoseShim()` per installed adapter instead (see 2.5).
- [x] 1.4 Re-key `DEP_INSTALLERS` (`src/commands.ts:1458`) by real provider id; each entry carries exactly one of `install` (real command) or `docsUrl`, plus optional `needs: string[]` (ordered prerequisite ids). Set pi `needs: ["bun"]`; add a `codex` entry (real command or docs URL); herdr/tmux use `docsUrl`. Delete any placeholder / `example.invalid` entry. `bun` stays present only as pi's `needs` target, never probed on its own.
- [x] 1.5 Rewrite the setup prerequisite loop (`commands.ts:1652-1662`) to probe only the selected providers' ids (id-is-binary), resolving each install action and its `needs` (installed first, in declared order) by provider id.
- [ ] 1.6 Gate: `bun run check` and `bun run check:bridge` clean.

## 2. Setup is the multi-select Builder (no identity branches)

- [x] 2.1 Make the wizard multi-select: collect a *set* of adapters and a *set* of backends (multiselect pickers), not a single pick each. Flags accept multiple ids; interactive uses multiselect.
- [x] 2.2 For every selected adapter, call `resolveAdapter(id).installShim?.()` (bare-id signature, `commands.ts:1856`). Delete the `if (harness === "pi") …`/`if (harness === "claude") …` blocks (`commands.ts:1680-1718`). No `harness ===`/`backend ===` branch remains in `cmdSetup`.
- [x] 2.3 Loud-failure guard (law #3): an adapter that exposes `diagnoseShim` but **not** `installShim` is an expected-but-unbuildable integration — warn loudly naming the adapter, do not silently skip. An adapter exposing neither declares no integration — proceed silently.
- [x] 2.4 After installing every selected provider, prompt for the active default per axis (skip the prompt when only one provider was selected on that axis) and write both the installed sets (`installed.adapters`, `installed.backends`) and the active defaults (`defaults.adapter`, `defaults.backend`) via the settings writer (the new `installed`-shape writer from task 6).
- [ ] 2.5 Replace the `checkExtensions(binaryStatus())` post-install validation with a `diagnoseShim()` call per installed adapter; keep the skills/agents copy steps provider-neutral.
- [ ] 2.6 Idempotence/additivity: adding a provider installs only the new provider's shim; already-installed providers are untouched; a dropped provider's dormant shim is left in place. Switching only the active default installs nothing.
- [ ] 2.7 Gate: `bun run check` and `bun run check:bridge` clean; `bun test test/setup*.test.ts` (targeted) green.

## 3. Notifier wizard wired into the multi-select flow

- [x] 3.1 Add the notifier step to `cmdSetup` after the provider sets are installed: `probeNotifiers()` → pick-list → `collectRequiredConfig` per selection → persist through the settings writer (settings-json-config). This satisfies the MODIFIED `notifier-adapters` "Notifier setup and doctor validation" requirement — do NOT add a parallel provider-setup notifier requirement.
- [x] 3.2 Skip the notifier pick-list on non-interactive / `--yes` runs (add no notify entries).
- [ ] 3.3 Gate: targeted `bun test test/notifiers*.test.ts` green; `bun run check` clean.

## 4. Doctor derives checks from the installed sets via `diagnoseShim()`

- [ ] 4.1 Replace `checkBins` pi hardcoding (`doctor.ts:104-114`) with per-installed-adapter binary checks (id-is-binary), driven by the installed set.
- [ ] 4.2 Run `resolveAdapter(id).diagnoseShim?.()` for **every installed adapter** (not just the active default); drop the unconditional `checkClaudeHooks` (`doctor.ts:848`) and the `bins.pi` gate on the extension check (`doctor.ts:527`).
- [ ] 4.3 Keep the backend check on the already-generic `checkBackendCapabilities`; verify session-scoped backends report inside-session, for every installed backend.
- [ ] 4.4 Live-fleet-pair check: for each distinct live `(adapter, backend)` pair, verify the pair resolves and its adapter integration is current via that adapter's `diagnoseShim()`; mixed fleets validate each pair independently.
- [ ] 4.5 Declared-settings-vs-reality: every installed adapter resolvable + on PATH + shim current; every installed backend available/inside-session; a declared-but-unresolvable provider is a loud fail naming the settings key. Wrap the settings load so a thrown load error (unknown id / legacy `config.toml` / schema mismatch) becomes a failing check result and the provider-neutral checks still run (doctor never aborts before checks).
- [ ] 4.6 Scope `orch doctor --fix` to the installed and live providers only; keep destructive fixes report-only and unselected by default.
- [ ] 4.7 Rewire `runDoctor` (`doctor.ts:840-865`) so provider-neutral checks stay unconditional and provider-specific checks are the installed-set-derived `diagnoseShim()` set.
- [ ] 4.8 Gate: `bun run check` clean; targeted `bun test test/doctor*.test.ts` green.

## 6. Migrate the live `harnesses` field to `installed.{adapters,backends}` (no dual-read)

- [x] 6.1 Rename the zod field `harnesses` (`config.ts:24`) to the nested `installed: { adapters: string[], backends: string[] }` shape (coordinated with settings-json-config, which owns the `installed` shape); update `OrchConfig.harnesses` (`config.ts:47`) and the normalizer default (`config.ts:86`). No `harnesses` fallback / dual-read / compat alias (Rule 8).
- [x] 6.2 Replace `writeSettingsHarnesses` (`config.ts:230-231`) with a writer matching the `installed` shape (writes `installed.adapters` and `installed.backends`).
- [x] 6.3 Update `cmdSetup`'s write (`commands.ts:1598`) and the "Selection recorded…" echo text (`commands.ts:1601`) to the `installed` shape and new field labels; retarget every reader — `config.harnesses` in `orch config` (`commands.ts:1691,1698-1699`) and any other consumer.
- [x] 6.4 Fix `test/config.test.ts` (`harnesses` fixtures at :29,:41,:50 and the `writeSettingsHarnesses` import) to the new shape and writer.
- [ ] 6.5 Gate: `bun run check` clean; `bun test test/config*.test.ts` green.

## 7. Verification — run the spec scenarios end-to-end

- [ ] 7.1 Run setup selecting `claude` + `tmux` on a pi-less machine; confirm no `pi MISSING`, no pi extension built, claude integration installed, exit 0 (provider-setup: claude+tmux without pi noise).
- [ ] 7.2 Run setup selecting `pi` AND `claude`; confirm both integrations install, both land in `installed.adapters`, pick `pi` active; then switch the active default to `claude` (settings edit or setup re-run) and confirm NO reinstall occurs and both shims remain (provider-setup: multi-select install + switch active with no reinstall).
- [ ] 7.3 With an installed adapter's shim removed, run `orch doctor`; confirm it flags the missing shim with a fix and non-zero exit, flags it even when that adapter is not the active default, and shows no unrelated provider's check (doctor-config: flags missing shim for installed-but-inactive provider).
- [ ] 7.4 With one live `herdr + pi` agent and one live `tmux + claude` agent, run `orch doctor`; confirm each pair's integration is validated via its own `diagnoseShim()` and neither pair fails for lacking the other's integration (doctor-config: validates live mixed fleet).
- [ ] 7.5 Put an unknown provider id in the settings file and run `orch doctor`; confirm doctor renders a failing check naming the file/id, still runs the provider-neutral checks, and does not crash (doctor-config: declared-but-unresolvable is a failing check).
- [ ] 7.6 Final gate: `bun run check` clean and `bun test` passing; record the scenario results.
