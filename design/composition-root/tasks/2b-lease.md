# 2b-lease

Owns: `src/commands/lease.ts`. Follow `2b-README.md`.

Sites:
- `:21` `launchCredential() ?? (await rpcRegisterSession(orchDir())).id` → `services.orchDir`. `launchCredential()` stays.
- `:183` `detachAgent(orchDir(), target, ...)`
- `:200` `liveAgents(orchDir())`
- `:202`, `:208` `adoptAgent(orchDir(), ...)`
- `:328` `const directory = orchDir();`
- `:336` `reapInteractive(orchDir(), ...)`
- `:341` `reapAgent(orchDir(), target)`
- every `commandLogger()`

Tests: `grep -l "commands/lease" test/*.ts`.
