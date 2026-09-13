# 2b-queue

Owns: `src/commands/queue.ts`. Follow `2b-README.md`.

Sites: `:126`, `:148`, `:161`, `:178`, `:195`, `:223`, `:246` are all `const directory = orchDir();` → `const directory = services.orchDir;` or use `services.orchDir` directly.

`cmdWork` is here. It builds `WorkOptions` for `src/daemon/work-loop.ts`. Do not add a `getSettings` or `settings` field yet; task 4-01 changes `WorkOptions`. Just thread `services.orchDir` into the `orchDir` field it already sets.

Tests: `grep -l "commands/queue" test/*.ts`.
