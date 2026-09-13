# 3a-identity-policy

Owns: `src/identity/self.ts`, `src/policy/caller.ts`, `src/policy/spawner.ts`, `src/policy/name.ts`. Follow `3a-README.md`.

Sites:
- `self.ts:23` `agentIdBySessionToken(orchDir(), token)`
- `self.ts:32` `agentIdByProcess(orchDir(), pid, startToken)`
- `self.ts:53` `registerSession(orchDir())`
- `self.ts:61` `environmentOf(orchDir(), id).space`
  `selfId()` and its siblings take `orchDir: string`. `selfId` is called from `src/entities.ts:409`, `src/commands/spawn/index.ts`, `src/commands/spawn/report.ts`, `src/policy/spawner.ts:117`; list them all.
- `caller.ts:14` `agentById(orchDir(), id)`
- `spawner.ts:35` `agentById(orchDir(), id)`
- `spawner.ts:117` `maySpawnFrom(orchDir(), selfId(), ...)`
- `name.ts:24` `spawnedRecords(orchDir())`

`launchCredential()` in `src/identity/launch.ts` reads `process.env` and stays; do not touch it.
