# 2a-03-lifecycle-index

Owns: `src/commands/lifecycle/index.ts`

Goal: the shared lifecycle helpers take services instead of reaching for globals.

Sites:

- `:16` `isAgentId(key) ? commandLogger().forAgent(key) : commandLogger()` → the function takes `logger: Logger` first and uses `logger.forAgent(key)` / `logger`.
- `:26` `const settings = loadSettings(orchDir());` → the function takes `services: SettingsService` and uses `services.settings.current()`.
- `:36` `loadSettings(orchDir()).timeouts.wait_ms` → same.

If one function uses both the logger and settings, it takes `services: SettingsService & LoggerService`.

Remove unused imports. Tree red until 2c is expected.

Check: lint, tc on this file. Tests: none named.

Report changed signatures under `CALLERS:`.
