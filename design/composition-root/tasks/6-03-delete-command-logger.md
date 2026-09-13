# 6-03-delete-command-logger

Model: luna:low
Owns: `src/commands/logging.ts`

Requires wave 2 landed.

Goal: `commandLogger()` no longer exists. Every command logs through `services.logger`.

Do: delete `src/commands/logging.ts`. Run tc over the package. Every remaining importer goes under `CALLERS:`. Do not fix them.

Check: lint, tc. Tests: none named.
