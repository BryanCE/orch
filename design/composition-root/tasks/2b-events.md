# 2b-events

Owns: `src/commands/events.ts`. Follow `2b-README.md`.

Sites:
- `:56` `ensureDaemon(orchDir())`
- `:60` `resolveCallerScope(options.scope, orchDir())`
- `:66` `eventWithinSpaceWall(orchDir(), agentId, callerSpace())`
- `:68` `currentLease(orchDir(), agentId ?? key)`
- `:108` `loadSettings(orchDir()).notify`
- `:110` `commandLogger().error(...)`
- `:156` `export function ownedAgentCount(scope, root = orchDir())` → `root: string` required; report under `CALLERS:`
- `:239`, `:285`, `:295`, `:328`, `:330` `orchDir()` → `services.orchDir`
- `:340` `commandLogger().warn(...)`

Leave the `process.exit(0)` calls at `:84-85`, `:336`, `:349` alone; a later plan removes them.

Tests: `grep -l "commands/events" test/*.ts`.
