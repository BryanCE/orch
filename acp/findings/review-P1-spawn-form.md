# Review: T5 spawn takes a form (uncommitted)

## Findings

1. `packages/orch/src/daemon/server/spawn/plan.ts:92` breaks Rule 17 (no `?? <literal>` on a settings read) and duplicates the default lookup that `selectSpawnForm` already does (plan.ts:66, `requested ?? defaults[adapter.id]`).
   Edit: replace the line with `    const requestedForm = params.form;`. `selectSpawnForm` applies `defaults.forms` for local spawns, and the far path sends only the flag, so `requestedForm` is the flag in both cases.

2. `packages/orch/src/daemon/server/spawn/index.ts:318-320` recomputes the backend choice that `planSpawn` already makes (`selectBackend(params.plexer, settingsFile)` and the `backendChosen` expression `(params.plexer ?? settingsFile.defaults.backend ?? null) !== null`, which is also at plan.ts return block). It also uses `?? null` on a settings read (Rule 17) and duplicates code (Rule 16).
   Edit: move the chosen-backend computation into one exported function in plan.ts that returns the `Backend` and `backendChosen`. Call it from `spawnAgents` and from `planSpawn`. Delete the inline `{ backend: selectBackend(...).id, space, backendChosen: ... }` object in index.ts:318-320.

3. The pipes refusal (`no backend here runs the <form> form` for stdio `pipes`) is written twice on the local path: `packages/orch/src/daemon/server/spawn/index.ts:324` (before any spawn, in the loop) and `packages/orch/src/daemon/server/handlers/lifecycle.ts:77`. lifecycle.ts:77 runs again for local calls, after `selectSpawnForm` has already resolved the agent in plan.ts.
   Edit: keep index.ts:324 as the local guard that refuses before anything is created. In lifecycle.ts:77 change the line to `  if (peer !== undefined && FORM_STDIO[selected.form] === "pipes") throw new SpawnRefusalError(...)`, so only the far orchd repeats it.

4. `packages/orch/src/daemon/server/handlers/lifecycle.ts:76` resolves the form a second time for local calls. Decision 2 says the resolving function runs once per agent, and plan.ts already resolved it. The second call also picks the backend from `peer` (`headlessBackend` for local calls) instead of the plan's backend, so the two resolutions can disagree.
   Edit: resolve only for far calls. Replace lines 76-77 with: `const selected = peer === undefined ? localForm(params) : selectSpawnForm(params.form, state.services.settings.current().defaults.forms, adapter, heldBackend, heldBackend);`, where `localForm` returns `{ form, backend: headlessBackend }` from `params.form` and refuses when it is null with a non-spec-free message such as `cannot spawn ${key}: no form resolved`. Keep `FORM_STDIO[selected.form] === "pipes"` as in finding 3.

5. The native-form fallback is written three times, and two of the copies throw messages the spec does not name. Decision 2 and Rule 8 (one shape, no special-casing) apply.
   - `packages/orch/src/daemon/server/spawn/placement.ts:154-155`: `const form = spec.form ?? nativeForm(spec.backend.offers);` and `if (form === null) throw new SpawnRefusalError(\`backend ... has no native form\`)`.
   - `packages/orch/src/backends/registration.ts:15-16`: `const form = opts.form ?? nativeForm(backend.offers);` and `if (form === null) throw new Error(...)`.
   - `packages/orch/src/daemon/server/spawn/plan.ts:68-69`: the unset branch throws `no backend here runs a native form`, which is not one of the two spec messages. Step 2 gives no refusal for this case.
   - `packages/orch/src/daemon/server/spawn/index.ts:220` and `placement.ts:220`: `form: plan.form ?? undefined` converts a null the plan already decided into an absent field.
   Edit: make `BackendSpawnOpts.form` required (`packages/orch/src/types/backend.ts:284`, drop the `?`) and make `TabSpawnSpec.form` required. Then `placement.ts:134` passes `form: spec.form`, `placement.ts:154-155` becomes `  const form = spec.form;` with its throw deleted, and `registration.ts:15-16` becomes `  const form = opts.form;` with its throw deleted. Give `SpawnAgentPlan` a non-null local form (split the far form from the local form in its type), so `placement.ts:220` becomes `form: plan.form`. For plan.ts:68-69, type `offers` so `nativeForm` cannot return null, or name the refusal in the spec. Do not invent a third message.

6. `packages/orch/src/daemon/client/protocol.ts:559` adds `form: AGENT_VIEW.shape.form,` to `statusRow`. The spec says to touch only the spawn params in protocol.ts, and a status row is not a spawn param.
   Edit: delete line 559 from `statusRow`. If the status table needs a form column, that belongs to the status section, not T5.

## Checked

- Pure function `selectSpawnForm`, steps 1 to 6 (`packages/orch/src/daemon/server/spawn/plan.ts:65-77`): logic matches steps 1, 2, 3, 4, 5 and 6. Both refusal messages match word for word (plan.ts:70, 75, 77). Step 2 adds an unspecified message (finding 5). Refusals are thrown in `planSpawn` before any agent is created, and `index.ts` checks the pipes case before the first spawn. Exit 1 follows from `UsageError`/`SpawnRefusalError` going through the CLI refusal boundary; I did not re-read that boundary.
- No comparison against a form id, harness id or backend id in the change: none found in the added lines. `supported` in plan.ts uses `adapter.acp !== null`. `FORM_STDIO[...] === "<stdio>"` compares stdio, which is allowed. `form: "tui"` at `packages/orch/src/commands/control.ts:276` is an assignment in the adopt path, not a comparison, so it is not a finding.
- `setForm` in the same transaction: `packages/orch/src/store/spawn-registration.ts:36` (inside `registerHostedAgent`'s `withTransaction`) and `:67` (inside `writeSpawnedAgent`, called from `registerSpawnedAgent`'s `withTransaction`). Every writer goes through one of these: headless `backends/headless/index.ts:147`, held `backends/held/index.ts:168`, placement `placement.ts:156`, adopt `handlers/adopt.ts:16-17` (form required on the wire through `SPAWN_REGISTRATION`), and far `lifecycle.ts:137` (uses `launched.form`).
- `defaults.forms`: schema `settings/schema.ts:112` (SETTINGS_DEFAULTS), `:151` (`z.partialRecord(z.enum(ADAPTER_IDS), z.enum(FORM_IDS))`), registry help `settings/registry.ts:174`, required type `types/settings.ts:51`, read `settings/read.ts:180`. The read uses the same `root.defaults?.x ?? SETTINGS_DEFAULTS...` pattern as its neighbours, with no literal. No schema version constant changed (grep of added lines found none).
- `--form`: `commands/spawn/flags.ts` uses `FORM_IDS` and `isFormId` (one list, from `types/form.ts`). The refusal names the three forms. `commands/registry.ts` help line present.
- No `as` casts and no `any` in added lines (grep of `+` lines).
- Override 1 (far resolution): `plan.ts:95` sends `form: null` for far spawns; `index.ts` sends `plan.requestedForm` (flag only) to the far orchd; the far response carries `form` (`lifecycle.ts:127`, `protocol.ts` `spawn-headless` response) and `registerHostedAgent` records it. Pass.
- Override 2 (once per agent): `planSpawn` maps each agent through `selectSpawnForm`. The test `commands-spawn.test.ts:204` covers mixed harnesses. Pass, apart from finding 4.
- Override 3 (no new held machinery): `acp` on a local or far spawn is refused, not started (`index.ts:324`, `lifecycle.ts:77`). `tui` on held uses the existing `spawnHeldForPeer` path. Pass.
- Tests for the six cases: `commands-spawn.test.ts:53-54` (native tui and oneshot), `:59` (defaults.forms tui on terminal), `:65` (acp refused, adapter with no acp role), `:72` (acp fake adapter, terminal backend, held), `:66` (oneshot refused), `spawn-registry.test.ts:49-52` (one open agent_forms row). Pass. Also `commands-spawn.test.ts:46-48` covers the flag refusal, and `held-spawn.test.ts:50` covers the local held path.
- Schema versions: no change to `SETTINGS_SCHEMA`, `PRESENCE_SCHEMA` or package versions found in the diff. Pass.

T5: 6 findings
