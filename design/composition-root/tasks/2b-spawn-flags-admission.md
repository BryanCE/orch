# 2b-spawn-flags-admission

Owns: `src/commands/spawn/flags.ts`, `src/commands/spawn/admission.ts`. Follow `2b-README.md`.

Sites:
- `flags.ts:142` `const settingsFile = loadSettings(orchDir());` → the enclosing function takes `settings: OrchSettings` (plain value; flag parsing is a leaf)
- `admission.ts:111` `spendGrant(orchDir(), action, callerAgentId)`
- `admission.ts:112` `recordGrantRequest(orchDir(), action, callerAgentId)`
- `admission.ts:127` `refreshStaleShims(orchDir(), [settings.adapter])`
  The enclosing functions take `orchDir: string`.

Report every changed exported signature under `CALLERS:`; `spawn/index.ts` is being rewritten in parallel and needs them.

Tests: `grep -l "spawn/flags\|spawn/admission" test/*.ts`.
