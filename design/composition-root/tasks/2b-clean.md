# 2b-clean

Owns: `src/commands/clean.ts`. Follow `2b-README.md`.

Sites:
- `:58` `commandLogger().error("clean.worktree-failed", ...)`
- `:94` `function removeMalformedAgentDirs(json = false, root = orchDir())` → `root: string` required
- `:105` `function closeDeadAgentWrites(json = false, root = orchDir())` → `root: string` required
- `:130` `reapDeadPresenceDirs(options.root ?? orchDir(), ...)` → `options.root` becomes required or the call passes `services.orchDir`; pick one, remove the `??`
- `:133` `commandLogger().forAgent(...)` / `commandLogger()`
- `:140` `nothingToReapMessage(options.root ?? orchDir())` → same as `:130`

Tests: `grep -l "commands/clean" test/*.ts`.
