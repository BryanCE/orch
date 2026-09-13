# 2b-space

Model: luna:low
Owns: `src/commands/space.ts`. Follow `2b-README.md`.

Sites:
- `:188` `const directory = orchDir();` → `services.orchDir`
- `:189` `const settings = loadSettings(directory);` → `services.settings.current()`

Tests: `grep -l "commands/space" test/*.ts`.
