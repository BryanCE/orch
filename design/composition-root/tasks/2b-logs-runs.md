# 2b-logs-runs

Model: luna:low
Owns: `src/commands/logs.ts`, `src/commands/runs.ts`. Follow `2b-README.md`.

Sites:
- `logs.ts:70` `records(orchDir())` → `records(services.orchDir)`
- `runs.ts:91` `selectRuns(orchDir(), ...)`
- `runs.ts:101` `selectRuns(orchDir(), { agentKey: key, limit: 1 })[0]` — if this is inside an exported non-`cmd*` helper, it takes `orchDir: string` and you report it under `CALLERS:`

Tests: `grep -l "commands/logs\|commands/runs" test/*.ts`.
