# 2c-01a-cli-root-handlers

Owns: `src/commands/index.ts`. Chain: this, then `2c-01b`, same agent, context kept.

Requires every `2a-*` and `2b-*` task DONE. Every `cmd*` now takes `services: Services` first.

Goal: the handler table and `runCommand` pass one `Services`. Mechanical.

Do:
1. Import `createServices` from `../services.ts` and `Services` from `../types/services.ts`.
2. `type Handler` becomes `(services: Services, args: string[]) => void`.
3. Every entry in `commandHandlers` (lines 312-372) changes from `(args) => ...cmdX(args)` to `(services, args) => ...cmdX(services, args)`. The `dispatchAsync(...)` wrapper stays exactly where it is for now; it changes in `2c-01b`. The three `--version` entries and `help` entries take `(_services, _args)` or `()`; keep them typechecking.
4. In `runCommand`, immediately after the `try { ... } catch` setup-gate block and before `if (cmd === undefined)`, add `const services = createServices();`. Pass `services` into `handler(services, rest)` and into both `cmdStatusVerb` fallbacks.
5. `runFirstTimeSetup(argv, runCommand)` unchanged.

Check: lint, tc on this file. Tests: none yet; `2c-01b` runs them.
