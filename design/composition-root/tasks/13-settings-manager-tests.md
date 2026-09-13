# 13-settings-manager-tests

Owns: `test/settings-manager.test.ts` (new)

Requires task 10 landed (it has). Task 12 may or may not have landed; do not import from `test/helpers/services.ts`. Use `settingsFixtureText` from `test/helpers/settings.ts` if it exists, otherwise build the JSON text inline the same way `writeSettingsFixture` does (schemaVersion from `SETTINGS_SCHEMA`, `runtime: "node"`, `enabled` derived from defaults).

Goal: prove the manager's contract from `src/types/services.ts`.

Do: write `bun:test` cases against `inMemorySettingsManager` and `fileSettingsManager` from `src/settings/manager.ts`:

1. `currentOrNull` returns null and `current` throws a message containing `does not exist` and `orch setup` when text is null. The message names the `file` label passed in.
2. Valid fixture text parses: `current().runtime === "node"` and `current().enabled.adapters` matches the fixture's defaults-derived `enabled`.
3. `current()` twice returns the same object identity (one parse until reload).
4. Malformed text (`"{not json"`) throws from `currentOrNull` with a message containing `expected valid JSON`, and throws again on a second call (failure is not cached as a value).
5. `fileSettingsManager` over a temp dir (use `test/helpers/tempdir.ts` and `writeSettingsFixture`): `current()` reads the file; rewrite the file with a different `defaults.adapter` value via `writeSettingsFixture`; `current()` still returns the old value; `reload()` returns the new one and so does `current()` after it.
6. `fileSettingsManager` over a temp dir containing only `config.toml`: `currentOrNull()` throws a message containing `legacy config.toml`.

Use `isolateOrchEnv`/`restoreOrchEnv` from `test/helpers/env.ts` in `beforeEach`/`afterEach` if the file-based cases need the env clean; the in-memory cases need nothing.

Check: lint, tc. Tests: `test/settings-manager.test.ts`.
