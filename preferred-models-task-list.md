# Preferred Models Per Harness — Implementation Task List

This is a standalone implementation checklist, not an OpenSpec change. Work through it in order and check each item only after its acceptance condition is observed.

## Goal

Give every installed harness three independent model concepts:

1. `defaults.models.<harness>` — the model a new agent launches on.
2. `models.preferred.<harness>` — an optional quicklist passed to that harness's native model cycle/picker.
3. `models.allowed.<harness>` — an optional security/launch gate. Empty means every model offered by the harness is allowed.

Also add `orch models` so all models offered by a harness remain discoverable even when they are not in the preferred quicklist.

## Non-negotiable behavior

- `models.preferred` MUST NOT be reused as or merged into `models.allowed`.
- A model outside `models.preferred` MUST remain directly launchable when it is offered by the harness and permitted by `models.allowed`.
- A preferred quicklist MUST only affect the harness's native cycle/picker through its native `--models` option.
- `adapter.listModels()` MUST continue returning the harness's complete offered/authenticated catalogue. Never filter the registry by preferred or allowed entries.
- Pi and OMP own their CLI syntax and catalogue parsing inside `src/adapters/pi.ts` and `src/adapters/omp.ts`. Harness-neutral code must not import either harness's registry implementation.
- Keep `--model` and `--models` distinct: `--model` selects the launch default; `--models` supplies the cycle/picker quicklist.
- Empty or absent preferred arrays MUST omit `--models` cleanly.
- Preserve all existing `models.allowed` enforcement in `src/policy/model.ts`.
- Make a clean cutover. Do not leave aliases, duplicate config paths, compatibility shims, TODOs, or unused fields.
- Do not overwrite unexpected user changes and do not commit unless Bryan explicitly asks.

## Known starting state

The current branch contains a partial implementation at commit `f22d503`:

- Pi catalogue discovery through `pi --list-models` is implemented.
- Searchable setup autocomplete for large catalogues is implemented.
- `models.preferred` exists in `SettingsFileSchema`, normalized `OrchConfig`, `writeSettingsFullTree()`, and `writeSettingsPreferredModels()`.
- `preferredModels` exists in `SpawnOpts` and `BackendSpawnOpts`.
- Those preferred fields are not connected to setup, settings, spawn, daemon, headless, Pi, or OMP behavior.
- `writeSettingsPreferredModels()` has no callers.
- `bunx tsc --noEmit` currently fails because two test fixtures lack `preferred`.
- The focused config tests currently have one expected-shape failure because normalized config now includes `preferred: {}`.

Do not trust line numbers in this document. Re-read each named symbol before editing.

---

## Phase 1 — Restore a clean baseline

- [ ] **1.1 Re-read the partial implementation.** Inspect these symbols before changing anything:
  - `SettingsFileSchema`, `OrchConfig`, `loadConfig()`, `writeSettingsAllowedModels()`, `writeSettingsPreferredModels()`, and `writeSettingsFullTree()` in `src/config.ts`.
  - `SpawnOpts` in `src/adapters/adapter.ts`.
  - `BackendSpawnOpts` in `src/backends/backend.ts`.
  - `resolveHarnessModels()`, `HarnessModelChoices`, and `recordComposition()` in `src/commands/setup.ts`.
  - `cmdSettingsModels()` and `cmdSettings()` in `src/commands/settings.ts`.
  - `resolveSpawnSettings()`, `adapterCommand()`, `executeDetachedSpawn()`, `createSpawnRoot()`, `TabSpawnSpec`, `spawnOneIntoTab()`, and tile construction in `src/commands/spawn.ts`.
  - `spawnDetached()` in `src/daemon/orchd.ts`.
  - `HeadlessBackend.spawn()` in `src/backends/headless/index.ts`.
  - All four Pi/OMP command builders: interactive, restricted interactive, headless, and restricted headless.

- [ ] **1.2 Record the current failures without broadening scope.** Run:
  - `bunx tsc --noEmit`
  - `bun test test/config.test.ts test/worker-tools.test.ts test/adapter-pi.test.ts test/setup-wizard.test.ts`
  Confirm the known failures are the missing normalized `preferred` expectations/fixtures. If different failures appear, investigate before continuing.

- [ ] **1.3 Fix the partial schema fallout first.** Update existing `OrchConfig` literals and config expectations so normalized `models` always has both `allowed` and `preferred`. At minimum inspect:
  - `test/config.test.ts`
  - `test/worker-tools.test.ts`
  Do not make `OrchConfig.models.preferred` optional just to silence the compiler; normalized config deliberately supplies `{}`.

- [ ] **1.4 Correct misleading comments.** The current `models.allowed` schema comment claims concrete selections are forwarded to the native picker. Remove that claim. Document `allowed` only as the launch gate and `preferred` only as the native quicklist.

- [ ] **1.5 Baseline gate.** Re-run `bunx tsc --noEmit` and the focused tests from 1.2. They must pass before wiring new behavior.

---

## Phase 2 — Finish independent preferred-model persistence

- [ ] **2.1 Add config persistence tests.** In `test/config.test.ts`, cover all of these observable contracts:
  - `loadConfig()` parses `models.preferred` per harness.
  - Missing `models.preferred` normalizes to `{}`.
  - `writeSettingsPreferredModels()` writes the requested per-harness arrays.
  - Writing preferred models preserves `models.allowed` byte-for-value.
  - Writing allowed models preserves `models.preferred` byte-for-value.
  - `writeSettingsFullTree()` seeds both maps when absent and preserves both when present.

- [ ] **2.2 Keep storage concrete and per harness.** Preferred values selected by setup are full model specs in that harness's vocabulary. Do not create a shared cross-harness model list.

- [ ] **2.3 Verify no policy code reads preferred models.** `allowedModelPatterns()`, `isAllowedModel()`, and `assertModelAllowed()` must continue reading only `models.allowed`.

- [ ] **2.4 Persistence gate.** Run the config tests and `bunx tsc --noEmit`. Confirm preferred and allowed can be changed independently.

---

## Phase 3 — Add preferred selection to setup and settings

- [ ] **3.1 Add a separate preferred picker.** In `src/setup/wizard.ts`, add `selectPreferredModels()` using the existing bounded searchable multiselect behavior:
  - Prompt copy must say it controls the harness's native cycle/picker quicklist.
  - Prompt copy must not imply that unselected models are forbidden.
  - Empty selection means no preferred quicklist and therefore no native `--models` flag.
  - Pre-check the existing `config.models.preferred[harness]` values.
  - Use the same 15-item bounded autocomplete path for large catalogues.
  - If the harness offers no catalogue, skip this prompt rather than inventing choices.

- [ ] **3.2 Keep the allowed picker separate.** Do not rename `selectAllowedModels()` into the preferred picker. The setup flow may present both because they have different semantics:
  - preferred = convenience/cycling;
  - allowed = launch restriction/security.

- [ ] **3.3 Extend `HarnessModelChoices`.** Add:
  - `preferred: Partial<Record<AdapterId, string[]>>`
  Initialize it in `resolveHarnessModels()` alongside `defaults` and `allowed`.

- [ ] **3.4 Populate preferred choices per harness.** In interactive setup/settings flows:
  - Resolve the default model first.
  - Read the complete offered catalogue from `adapter.listModels()`.
  - Prompt for preferred models using the existing stored preferred list as initial state.
  - Prompt for allowed models independently using the existing stored allowed list.
  - Preserve thinking suffix behavior on the default model.
  - Cancellation of either prompt must cancel the model-selection operation without partial writes.

- [ ] **3.5 Persist setup choices atomically at the operation level.** Update `recordComposition()` to call `writeSettingsPreferredModels()` in addition to the existing defaults and allowed writers before `writeSettingsFullTree()`.

- [ ] **3.6 Persist `orch settings models` choices.** Update `cmdSettingsModels()` to merge and write preferred values for only the targeted harnesses, just as it currently merges defaults and allowed values. Changing one harness must preserve every other harness's preferred list.

- [ ] **3.7 Report all three concepts clearly.** Update setup completion text, `orch settings models` output, and `orch settings` output so each installed harness can show:
  - default model;
  - preferred quicklist count/specs or `(none)`;
  - allowed restriction count/specs or `(all offered)`.
  Do not label preferred entries as “allowed.”

- [ ] **3.8 Add setup/settings tests.** Cover:
  - large preferred catalogues use bounded searchable multiselect;
  - existing preferred values start checked;
  - preferred selection does not alter allowed selection;
  - cancellation produces no partial persisted change;
  - targeting one harness preserves other harnesses' defaults, preferred lists, and allowed lists;
  - noninteractive/default-only paths do not accidentally clear stored preferred lists.

- [ ] **3.9 Setup gate.** Run the setup wizard, settings command, config, and TypeScript checks before continuing.

---

## Phase 4 — Carry preferred models through every launch path

- [ ] **4.1 Add preferred models to resolved spawn state.** Extend `SpawnSettings` with a readonly preferred-model array and set it from `config.models.preferred[adapter.id] ?? []` inside `resolveSpawnSettings()`.

- [ ] **4.2 Update command preview construction.** `adapterCommand()` currently builds a preview/options object without preferred models. Pass both the selected default model and the adapter's preferred quicklist so previews match real launches.

- [ ] **4.3 Forward pane-root launches.** In `createSpawnRoot()`, pass `preferredModels: settings.preferredModels` to `backend.spawn()`.

- [ ] **4.4 Forward additional pane and tile launches.** Add preferred models to `TabSpawnSpec`, populate it in every caller, and pass it through `spawnOneIntoTab()` to `backend.spawn()`. Confirm both normal multi-spawn and `orch tile` use the selected adapter's preferred list.

- [ ] **4.5 Forward detached CLI-to-daemon requests.** In `executeDetachedSpawn()`:
  - Include the selected adapter's preferred model array in the daemon RPC request.
  - Do not serialize it as a comma-concatenated string at the RPC boundary; keep it a JSON string array.

- [ ] **4.6 Validate and forward inside orchd.** In `spawnDetached()`:
  - Accept only an absent value or an array of non-empty strings.
  - Reject malformed RPC values with a useful error.
  - Pass the validated array to `detachedBackend.spawn()`.
  - Continue validating the selected launch model with `assertModelAllowed()`; do not validate the preferred list as an allowed-list replacement.

- [ ] **4.7 Forward through headless.** `HeadlessBackend.spawn()` reconstructs an adapter `SpawnOpts` object and currently drops preferred models. Add `preferredModels: opts.preferredModels` there.

- [ ] **4.8 Confirm pane backends do not drop the field.** Herdr and tmux pass `BackendSpawnOpts` directly to adapter command builders. Verify this remains true; do not add duplicate backend-specific transformations.

- [ ] **4.9 Respect `--cmd`.** An explicit `orch spawn --cmd ...` remains verbatim. Do not inject `--models` into a caller-supplied command string. Preferred forwarding applies only when the adapter builds the command.

- [ ] **4.10 Add forwarding tests.** Use capturing fake backends/adapters to prove the exact preferred array reaches:
  - first pane/root spawn;
  - additional pane spawn;
  - tile spawn;
  - detached daemon RPC and daemon-owned spawn;
  - headless adapter options;
  - command preview construction.
  Add negative assertions that absent/empty preferred config remains absent or produces no flag.

- [ ] **4.11 Launch-path gate.** Run the spawn, tile, headless, daemon RPC, and TypeScript tests. Every route must carry the same per-adapter value.

---

## Phase 5 — Map generic preferred models to Pi and OMP `--models`

- [ ] **5.1 Verify native syntax instead of guessing.** Inspect the installed `pi --help` and `omp --help` output or their authoritative local source to determine exactly how each native `--models` option accepts multiple model specs. Keep any Pi-specific and OMP-specific formatting inside their respective adapter files.

- [ ] **5.2 Update every Pi command builder.** In `src/adapters/pi.ts`, emit Pi's native `--models` form when `opts.preferredModels` is non-empty in:
  - `interactiveCmd()`;
  - `restrictedInteractiveCmd()`;
  - `headlessCmd()`;
  - `restrictedHeadlessCmd()`.
  Preserve the existing `--model` argument and all worker tools/extensions. Omit `--models` entirely for absent/empty input.

- [ ] **5.3 Update every OMP command builder.** Apply the same behavior, using OMP's own supported syntax, in all four OMP builders in `src/adapters/omp.ts`.

- [ ] **5.4 Handle shell/argv forms correctly.** Interactive builders return command strings while headless builders return argv arrays. Use the repository's existing quoting conventions for strings and separate argv entries for arrays. Do not join an argv payload into an unsafe shell fragment.

- [ ] **5.5 Do not alter catalogue discovery.** Leave Pi's `pi --list-models` query and OMP's `omp models --json` query complete and unfiltered.

- [ ] **5.6 Add adapter contract tests.** Extend `test/adapter-model-flag.test.ts` and the relevant headless/adapter tests to assert for both Pi and OMP:
  - `--model` still selects the launch model;
  - a non-empty preferred list produces the exact native `--models` syntax;
  - multiple preferred entries retain order;
  - empty/absent preferred input omits `--models` cleanly;
  - restricted and unrestricted interactive/headless builders behave consistently;
  - preferred values containing normal provider/model punctuation are passed without corruption.

- [ ] **5.7 Prove preferred is not a gate.** Add a regression where the selected model is offered and allowed but not preferred. `assertModelAllowed()` and command construction must accept it while the native quicklist still contains only the preferred entries.

- [ ] **5.8 Adapter gate.** Run the adapter model-flag, Pi catalogue, OMP catalogue, headless, and TypeScript checks.

---

## Phase 6 — Add harness-neutral `orch models` discovery

- [ ] **6.1 Run the required fallow preflight before creating a new command module.** Read `skill://fallow` and follow it before adding `src/commands/models.ts`. Reuse an existing command/listing helper if one already fits; do not create a generic abstraction solely for this command.

- [ ] **6.2 Implement this command shape:**
  - `orch models`
  - `orch models --agent=<id>` (also accept the existing `--harness=<id>` synonym)
  - `orch models --preferred`
  - `orch models --search=<text>`
  - `orch models --json`
  - `orch models --pick=<index|spec>`

- [ ] **6.3 Define target resolution deterministically.**
  - With `--agent`/`--harness`, target that installed adapter only.
  - Without it, list every installed adapter in configured order.
  - If no adapters are installed, fail with `run: orch setup` guidance.
  - Reject unknown/uninstalled adapter ids using existing validation conventions.

- [ ] **6.4 Discover from adapters only.** For each target, call `adapter.listModels()` and use its returned `HarnessModel[]`. Do not read Pi/OMP files or registries from the command module. If an adapter cannot enumerate models, show an empty/unavailable result for that adapter without inventing entries.

- [ ] **6.5 Default output must show the full catalogue.** Do not filter by either `models.preferred` or `models.allowed`. Each row should expose:
  - stable 1-based display index within its harness section;
  - full model `spec`;
  - optional label;
  - whether it equals that harness's configured default after removing any thinking suffix;
  - whether it appears in that harness's preferred quicklist.

- [ ] **6.6 Implement filters without mutating configuration.**
  - `--preferred` shows only rows in the configured preferred quicklist.
  - `--search=<text>` performs case-insensitive substring matching against both spec and label.
  - Filters may be combined.
  - An empty match is a successful empty result, not a fallback to the full list.

- [ ] **6.7 Implement machine-readable JSON.** Use one stable object shape, for example:
  - top-level `harnesses` array;
  - each harness object contains `id`, `default`, `preferred`, and `models`;
  - each model object contains `index`, `spec`, optional `label`, `default`, and `preferred`.
  Pin the final shape in tests. JSON must contain no prose on stdout.

- [ ] **6.8 Implement `--pick` as output selection, not configuration mutation.**
  - A numeric pick uses the displayed 1-based index and requires exactly one targeted harness.
  - A spec pick requires an exact match after all filters.
  - Ambiguous, missing, zero, negative, or out-of-range picks fail clearly.
  - Successful pick writes only the selected full spec plus newline so another command/orchestrator can consume it.
  - `--pick` must not change defaults, preferred, or allowed settings and must not spawn an agent.
  - Reject an incoherent `--pick` plus `--json` combination rather than producing mixed output.

- [ ] **6.9 Wire CLI dispatch and help.** Add the command to `src/commands/index.ts`, import its handler, document every supported flag in the main help text, and reject unexpected positional/flag combinations using existing CLI error style.

- [ ] **6.10 Add discovery tests.** Cover at least:
  - all offered models appear by default;
  - a model outside the preferred list is still discoverable;
  - `--preferred` filters to the quicklist;
  - `models.allowed` does not hide catalogue rows;
  - default and preferred markers are correct;
  - search matches specs and labels case-insensitively;
  - multiple harness sections retain configured order;
  - JSON output exactly matches the pinned schema;
  - numeric and exact-spec picks output only the spec;
  - invalid/ambiguous picks fail;
  - discovery and picking do not rewrite settings.

- [ ] **6.11 Discovery smoke test.** Run the command itself, not only its unit tests. With an installed Pi or OMP catalogue, verify:
  - `orch models --agent=<id>` prints offered models;
  - `orch models --agent=<id> --search=<known-fragment>` narrows the list;
  - a known offered model outside preferred still appears without `--preferred`;
  - `--pick` prints a reusable full model spec.

---

## Phase 7 — Documentation and cleanup

Do this only after the feature smoke test works.

- [ ] **7.1 Update user-facing documentation.** Update the existing README/reference locations that describe setup, settings, model selection, or `models.allowed`. Document:
  - the three independent settings;
  - empty `allowed` means all offered models are allowed;
  - empty `preferred` means no quicklist restriction is passed;
  - `orch models` usage and filters;
  - an explicit model outside preferred remains launchable when offered and allowed.

- [ ] **7.2 Sweep stale wording.** Search for text implying the setup multiselect both restricts launches and controls native cycling. Replace it with separate preferred/allowed explanations.

- [ ] **7.3 Remove dead scaffolding.** Confirm `writeSettingsPreferredModels()` and both `preferredModels` interface fields now have real callers/consumers. Remove any temporary helpers or duplicated argument formatting introduced during implementation.

- [ ] **7.4 Run fallow after any refactor or new module.** Follow `skill://fallow` cleanup instructions and resolve newly introduced duplication, dead code, cycles, or unjustified complexity without accepting a new baseline for this feature.

---

## Phase 8 — Final verification

- [ ] **8.1 Focused tests.** Run every changed test file plus these existing suites where applicable:
  - `test/config.test.ts`
  - `test/setup-wizard.test.ts`
  - `test/settings-command.test.ts`
  - `test/adapter-model-flag.test.ts`
  - `test/adapter-pi.test.ts`
  - Pi/OMP adapter catalogue tests
  - `test/commands-spawn.test.ts`
  - `test/backend-headless.test.ts`
  - daemon RPC/spawn tests
  - the new `orch models` command tests

- [ ] **8.2 Repository checks.** Run `bun run check`. It must pass lint, TypeScript, and bridge checks.

- [ ] **8.3 Full suite.** Run `bun test`. Report the exact pass/fail/skip counts and investigate any non-zero exit instead of describing it as successful.

- [ ] **8.4 End-to-end model contract.** Demonstrate all four cases:
  1. Preferred + allowed model launches with `--model` and appears in native `--models`.
  2. Offered + allowed but non-preferred model launches directly and is discoverable.
  3. Offered + preferred but disallowed model is rejected by `models.allowed` when selected directly; preferred never bypasses the gate.
  4. Offered model outside both lists is discoverable by `orch models`; whether it launches depends only on `models.allowed`.

- [ ] **8.5 Every launch route.** Confirm pane root, additional pane, tile, detached daemon, and headless routes all pass the correct preferred list for the selected adapter, while explicit `--cmd` remains untouched.

- [ ] **8.6 Final diff review.** Verify all callsites, tests, CLI help, and documentation are updated; no obsolete comments, unused fields, temporary files, aliases, or TODOs remain.

## Definition of done

The task is complete only when:

- `models.preferred` is independently selectable, persisted, displayed, and forwarded per harness.
- Pi and OMP receive their native `--models` arguments in every adapter-built launch mode.
- `models.allowed` remains the only optional launch restriction.
- `orch models` exposes the complete harness catalogue by default and can filter/pick without mutating configuration.
- A non-preferred but offered/allowed model is both discoverable and directly launchable.
- `bun run check`, focused tests, the full `bun test`, and the live `orch models` smoke scenario all pass with recorded output.
