# 2b-daemon

Owns: `src/commands/daemon.ts`. Follow `2b-README.md`.

Sites:
- `:46` `rpcCall(orchDir(), "daemon-status", undefined, timeoutMs)`
- `:91` `const directory = orchDir();` and `:93` `loadSettings(directory)` → `services.orchDir`, `services.settings.current()`
- `:127`, `:163` `const directory = orchDir();`
- `:192` `unreachableRefusal(orchDir())`
- `:200` `rpcCall(orchDir(), "reload")`
- `:241` `ensureDaemon(orchDir())`
- every `commandLogger()`

Tests: `grep -l "commands/daemon" test/*.ts`.
