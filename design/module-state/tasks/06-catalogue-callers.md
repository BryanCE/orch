# 06-catalogue-callers

Owns: `src/doctor/models.ts`, `src/doctor/runner.ts`, `src/commands/doctor.ts`, `src/commands/setup.ts`, `src/commands/settings.ts`, `src/commands/models.ts`, `src/setup/composition.ts`, `src/policy/model.ts`, `src/daemon/orchd.ts`, `src/control/dispatch.ts`, `src/commands/spawn/models.ts`, `src/commands/spawn/index.ts`, `src/commands/spawn/admission.ts`, `src/commands/control.ts`, `src/commands/lifecycle/*.ts`, `src/daemon/work-loop.ts`, `test/helpers/doctor.ts`, `test/commands-setup.test.ts`, `test/launch-model-gate.test.ts`, and the test files that call the functions whose signatures change.

Codes against the API in `05-catalogue.md`. The catalogue is a REQUIRED parameter wherever it is threaded: no optional catalogue parameter, no default that reaches for a global. A command passes `services.models`; a helper takes the narrowest `Pick<Services, "models" | ...>` it needs or a plain `catalogue: ModelCatalogue`; a test passes `testServices({ orchDir }).models`.

Do:
1. doctor/models.ts: `checkHarnessModels(settings, harness, catalogue: ModelCatalogue)` and `adapter.models.listModels(catalogue)`.
2. doctor/runner.ts: `runDoctor` takes `services: Pick<Services, "orchDir" | "logger" | "models">` in place of its `(orchDir, logger)` pair, reads `services.orchDir` / `services.logger` where it used them, and passes `services.models` to `checkHarnessModels`. Update its callers: commands/setup.ts (~142, ~144), commands/doctor.ts (~30, ~40, ~48; `runInteractiveDoctor` takes the same Pick instead of `orchDirectory` + `servicesLogger`), and test/helpers/doctor.ts (`runDoctor(testServices({ orchDir }), options)`).
3. policy/model.ts: `assertModelOffered(adapter, catalogue: ModelCatalogue, model)` and `assertModelAllowed(settings, adapter, catalogue: ModelCatalogue, model)`; the two `listModels()` calls pass `catalogue`. Thread the catalogue through every caller: daemon/orchd.ts (~388) passes `state.services.models`; control/dispatch.ts (~135) and commands/spawn/models.ts (~88) and whatever calls them take it from the `Services` in scope or add the required parameter and thread it to their own callers.
4. setup/composition.ts: `readHarnessCatalogue(harness, catalogue: ModelCatalogue, interactive)`; its caller (~95) passes the catalogue from the `Services` in scope.
5. commands/models.ts: `readAdapterCatalogue(id, services: Pick<Services, "logger" | "models">)` calls `listModels(services.models)`.
6. commands/setup.ts (~99-100) and commands/settings.ts (~124): `refreshAdapterCatalogues(services.models)` / `warmAdapterCatalogues(services.models)`. daemon/orchd.ts (~766): `warmAdapterCatalogues(state.services.models)`.
7. test/launch-model-gate.test.ts: every `assertModelOffered(x, model)` becomes `assertModelOffered(x, catalogue, model)` and every `assertModelAllowed(settings, x, model)` becomes `assertModelAllowed(settings, x, catalogue, model)`, with `catalogue` from `testServices({ orchDir: dir }).models`. test/commands-setup.test.ts (~83): the fake `warmModels` may keep ignoring its parameter; change it only if it no longer typechecks.

Only a caller you truly cannot reach goes under `CALLERS:`. tc is red on the `ModelCatalogue` import until `05-catalogue` lands: wait once and re-run.

Check: `bun check`. Tests: `test/launch-model-gate.test.ts`, `test/commands-setup.test.ts`, plus the test files that import any other file you changed.
