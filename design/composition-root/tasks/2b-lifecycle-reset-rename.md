# 2b-lifecycle-reset-rename

Model: luna:low
Owns: `src/commands/lifecycle/reset.ts`, `src/commands/lifecycle/rename.ts`. Follow `2b-README.md`.

Sites:
- `reset.ts:45` `reclaimAgent(orchDir(), ent.key)`
- `reset.ts:62` `loadSettings(orchDir())`
- `rename.ts:44` `renameNormalizedAgent(orchDir(), key, name)`

`cmdNew` (reset) and `cmdRename` take `services` first.

Tests: `grep -l "lifecycle/reset\|lifecycle/rename" test/*.ts`.
