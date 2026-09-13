# 2b-lifecycle-close

Owns: `src/commands/lifecycle/close.ts`. Follow `2b-README.md`.

Sites:
- `:23` `currentProcess(orchDir(), key)` inside `recordedProcess()` → takes `orchDir: string`
- `:54` `const root = orchDir();`
- `:67` `rpcCall(orchDir(), "agent-closed", closed)`
- `:119` `liveAgentViews(orchDir())`
- `:121` `getBackend(...)` stays
- `:324`, `:327` `refuseClose(orchDir(), authority, target.key)`
- every `commandLogger()` / lifecycle-index logger helper (see "2a signatures")

`cmdClose` and `cmdAbort` take `services` first. `describeHandle` is pure; leave it.

Tests: `grep -l "lifecycle/close" test/*.ts`.
