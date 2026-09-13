# 2b-results

Owns: `src/commands/results.ts`. Follow `2b-README.md`.

Sites:
- `:23` `commandLogger().forAgent(key) : commandLogger()` — the enclosing helper takes `logger: Logger`
- `:54` `loadSettings(orchDir()).hosts[remote.host]`
- `:111` `selectRun(orchDir(), dispatchId)`
- `:158` `loadSettings(orchDir()).hosts`
- `:198` `currentLease(orchDir(), agentId)`
- `:217` `rpcCall(orchDir(), "questions", ...)`
- `:245`, `:249`, `:255`, `:280` `spaceOf(orchDir(), ...)`

Exported `cmd*` here: `cmdResult`, `cmdQuestions`, `cmdTail`, `cmdSession`. `formatAge` is pure; leave it.

Tests: `grep -l "commands/results" test/*.ts`.
