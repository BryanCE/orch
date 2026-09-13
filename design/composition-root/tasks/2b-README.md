# 2b: the command sweep

Every `2b-*` task has the same shape. This file is the shared instruction; each task file lists only its file, its sites, and its tests. The delegator prepends this README to every 2b prompt after WORKER.md.

## Rules for a 2b task

1. Every exported `cmd*` function in your file takes `services: Services` as its first parameter. Import `Services` from `../types/services.ts` (or `../../types/services.ts` under `spawn/` and `lifecycle/`).
2. Replace, inside your file:
   - `orchDir()` → `services.orchDir`
   - `loadSettings(orchDir())` and `loadSettings(directory)` → `services.settings.current()`
   - `loadSettingsOrNull(orchDir())` → `services.settings.currentOrNull()`
   - `commandLogger()` → `services.logger`
   - `commandLogger().forAgent(x)` → `services.logger.forAgent(x)`
3. A private helper in your file that used any of those takes what it needs from its caller: a plain `orchDir: string`, a `settings: OrchSettings`, a `logger: Logger`, or a narrowed `Pick<Services, ...>` when it needs more than one. Never the whole `services` in a private helper unless it forwards it to a command-level helper that takes `Services`.
4. Calls into `src/commands/target.ts`, `src/entities.ts`, and `src/commands/lifecycle/index.ts` changed signature in wave 2a. The three 2a results arrive piped into your session right after this task; each lists its new first parameters under `CALLERS:`. Pass `services`, `services.orchDir`, `services.settings.current().hosts`, or `services.logger` accordingly. If they have not arrived when you reach such a call, read the current signature from the helper file itself; it is already changed.
5. Calls into leaves that already take a directory (`spaceOf(orchDir(), key)`, `currentLease(orchDir(), id)`, `rpcCall(orchDir(), ...)`, `agentById(orchDir(), id)`, `selectRuns(orchDir(), ...)`, and so on) just get `services.orchDir` instead of `orchDir()`.
6. A parameter with a default of `orchDir()` (`root = orchDir()`, `directory: string = orchDir()`) loses the default and becomes required.
7. Remove the `orchDir`, `loadSettings`, `loadSettingsOrNull`, `commandLogger` imports once unused.
8. Do not touch `src/commands/index.ts`. The tree is red until task 2c lands; your file's own lint and tc must be green.

## Report

Standard format. Under `CALLERS:` list any exported non-`cmd*` function in your file whose signature you changed, as `<symbol> now takes <param>`, so the delegator can check other 2b tasks that call it.
