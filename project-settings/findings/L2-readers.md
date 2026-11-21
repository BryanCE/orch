## workers.verify_commands
- `workerRules` reads `settings.workers.verify_commands` (shared); working directory/id/key: `place` is passed through to `workerPlaceContext`, no direct cwd/id/key access. `packages/orch/src/worker-prompt.ts:15`

## workers.allow_tools
- `workerRules` reads `workers.allow_tools` via local `workers` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:29`

## workers.builtin_tools
- `workerRules` reads `workers.builtin_tools` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:27`

## workers.inherit_extensions
- `workerRules` reads `workers.inherit_extensions` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:24`

## workers.inherit_mcp
- `workerRules` reads `workers.inherit_mcp` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:25`
- `claudeWorkerPlugins` reads `settings.workers.inherit_mcp` (shared); working directory/id/key: none. `packages/orch/src/adapters/claude.ts:87`

## workers.exclude_extensions
- `workerRules` reads `workers.exclude_extensions` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:26`
- `claudeWorkerPlugins` reads `settings.workers.exclude_extensions.claude` (shared); working directory/id/key: none. `packages/orch/src/adapters/claude.ts:79`

## workers.compact_at_tokens
- `workerRules` reads `workers.compact_at_tokens` (shared); working directory/id/key: none. `packages/orch/src/policy/workers.ts:30`
- `compactionPoint` reads current settings’ `workers.compact_at_tokens` (bridge); working directory/id/key: none. `packages/orch/src/agent/compaction.ts:11`
- Compaction shell/settings path reads `manager.current().workers.compact_at_tokens` (shared); working directory/id/key: none. `packages/orch/src/settings/shell/compaction.ts:61`

## locked_commands
- `gatedPatterns` reads `locked_commands.commands` (shared); working directory/id/key: none. `packages/orch/src/policy/command-gate.ts:57`
- `wantedPatterns` reads `locked_commands` (orchd); working directory/id/key: `directory`, `agent` arguments. `packages/orch/src/daemon/server/handlers/command-lock.ts:75`
- `commandLock` reads `settings.locked_commands` (orchd); working directory/id/key: `directory`, `params`, `agent` in scope. `packages/orch/src/daemon/server/handlers/command-lock.ts:94`
- `settingsFileCheck` counts locked command entries (orchd). `packages/orch/src/daemon/server/doctor/settings-file.ts:36`

## gated_commands
- `gatedPatterns` reads `gated_commands` (shared); working directory/id/key: none. `packages/orch/src/policy/command-gate.ts:57`
- `workerRules` includes `settings.gated_commands` in the worker prompt (shared); working directory/id/key: `place` passed to helper, no direct agent key/id. `packages/orch/src/worker-prompt.ts:15`
- `commandLock` matches `settings.gated_commands` (orchd); working directory/id/key: `directory`, `params`, `agent` in scope. `packages/orch/src/daemon/server/handlers/command-lock.ts:91`
- `settingsFileCheck` counts gated command entries (orchd). `packages/orch/src/daemon/server/doctor/settings-file.ts:36`

## denied_commands
- `gatedPatterns` reads `denied_commands.commands` (shared); working directory/id/key: none. `packages/orch/src/policy/command-gate.ts:57`
- `deniedPattern` reads denied configuration (orchd); working directory/id/key: `directory`, `agent` arguments. `packages/orch/src/daemon/server/handlers/command-lock.ts:81`
- `commandLock` reads `settings.denied_commands` (orchd); working directory/id/key: `directory`, `params`, `agent` in scope. `packages/orch/src/daemon/server/handlers/command-lock.ts:88`

## worktrees.provider
- `worktreeIntent` reads provider config (CLI); working directory/id/key: none. `packages/orch/src/commands/spawn/flags.ts:69`
- `planWorktree` reads provider (orchd); working directory/id/key: agent is passed to plan. `packages/orch/src/daemon/server/spawn/plan.ts:108`
- `checkWorktreeProvider` reads `settings.worktrees` (orchd); working directory/id/key: none. `packages/orch/src/daemon/server/doctor/settings-file.ts:106`
- `checkWorktreeGitignore` reads provider and repository directory (orchd); working directory/id/key: `process.cwd()` is used, no agent identity. `packages/orch/src/daemon/server/doctor/settings-file.ts:115`

## worktrees.branch_prefix
- `planWorktree` passes the full worktree config (orchd); working directory/id/key: agent in launch plan. `packages/orch/src/daemon/server/spawn/plan.ts:108`
- Worktree review reads branch prefix from settings (orchd); working directory/id/key: review state includes agent key. `packages/orch/src/daemon/server/handlers/review.ts:73`
- Worktree cleanup reads branch prefix from config (orchd); working directory/id/key: repository directory supplied as `from`. `packages/orch/src/daemon/server/handlers/clean.ts:69`

## worktrees.directory
- `worktreeIntent` uses `settings.worktrees.provider` to select launch config (CLI); directory itself is consumed by worktree provider via the config passed from `planWorktree` (orchd). `packages/orch/src/daemon/server/spawn/plan.ts:108`
- `checkWorktreeGitignore` reads provider repository directory (orchd); working directory/id/key: `process.cwd()`. `packages/orch/src/daemon/server/doctor/settings-file.ts:115`

## worktrees.worktrunk_commands
- Worktrunk provider uses the configured command list (orchd); working directory/id/key: worktree/repository path is provided to provider. `packages/orch/src/worktrees/worktrunk.ts:36`

## worktrees.copy_ignored
- Worktree creation reads this config through the worktree provider (orchd); working directory/id/key: launch repository and agent worktree context. `packages/orch/src/worktrees/agent.ts:7`

## worktrees.timeout_ms
- Spawn timeout calculation reads `settings.worktrees.timeout_ms` (CLI); working directory/id/key: none. `packages/orch/src/commands/spawn/index.ts:26`

## defaults.models
- `resolveAllowedModels` reads default model (shared); working directory/id/key: harness argument, no cwd/agent identity. `packages/orch/src/settings/read.ts:369`
- `resolveTuning` reads requested model default (shared); working directory/id/key: `request.harness`; `request` may include agent key/context. `packages/orch/src/policy/tuning.ts:51`
- `setupModels` reads recorded defaults (shared); working directory/id/key: none. `packages/orch/src/setup/composition.ts:99`
- `showModels` reads per-harness default (CLI); working directory/id/key: harness. `packages/orch/src/commands/models.ts:58`
- Settings display reads model defaults (CLI); working directory/id/key: harness. `packages/orch/src/commands/settings.ts:376`
- `settingsFingerprint` reads defaults (orchd); working directory/id/key: none. `packages/orch/src/daemon/server/orchd.ts:79`
- `doctorModels` reads recorded default (orchd); working directory/id/key: harness. `packages/orch/src/daemon/server/doctor/models.ts:21`

## defaults.thinking
- `resolveThinking` returns default thinking (shared); working directory/id/key: none. `packages/orch/src/policy/thinking.ts:48`
- Settings thinking display reads default (CLI); working directory/id/key: none. `packages/orch/src/commands/settings.ts:511`

## defaults.thinking_by_harness
- `resolveThinking` enumerates harness overrides (shared); working directory/id/key: `input` includes harness. `packages/orch/src/policy/thinking.ts:45`
- Settings thinking display enumerates overrides (CLI); working directory/id/key: none. `packages/orch/src/commands/settings.ts:512`

## defaults.worktree
- `worktreeIntent` checks launch default (CLI); working directory/id/key: none. `packages/orch/src/commands/spawn/flags.ts:68`

## defaults.adapter
- Setup decides whether adapter needs selection (shared); working directory/id/key: none. `packages/orch/src/setup/composition.ts:286`
- `selectAdapter` resolves configured adapter (CLI); working directory/id/key: none. `packages/orch/src/commands/selection.ts:40`
- Setup handler reads configured adapter (orchd); working directory/id/key: none. `packages/orch/src/daemon/server/setup.ts:321`

## defaults.forms
- Spawn plan selects form from defaults (orchd); working directory/id/key: agent in launch plan. `packages/orch/src/daemon/server/spawn/plan.ts:121`
- Spawn entry selects default form (orchd); working directory/id/key: agent in spawn context. `packages/orch/src/daemon/server/spawn/index.ts:411`
- Lifecycle handler selects form for peer (orchd); working directory/id/key: `peer` agent. `packages/orch/src/daemon/server/handlers/lifecycle.ts:78`

## models.allowed
- `resolveAllowedModels` reads allowlist for harness (shared); working directory/id/key: harness. `packages/orch/src/settings/read.ts:369`
- Setup selects allowed models (shared); working directory/id/key: harness id. `packages/orch/src/setup/composition.ts:109`
- `settingsFingerprint` reads model config (orchd); working directory/id/key: none. `packages/orch/src/daemon/server/orchd.ts:79`

## models.preferred
- Setup writes/merges preferred models using current settings (shared); working directory/id/key: none. `packages/orch/src/setup/composition.ts:184`
- `showModels` reads preferred list (CLI); working directory/id/key: harness id. `packages/orch/src/commands/models.ts:57`
- Settings display reads picker list (CLI); working directory/id/key: harness. `packages/orch/src/commands/settings.ts:430`
- Spawn planner reads preferred list (orchd); working directory/id/key: agent harness. `packages/orch/src/daemon/server/spawn/plan.ts:117`
- Relaunch handler reads preferred list (orchd); working directory/id/key: agent adapter. `packages/orch/src/daemon/server/handlers/relaunch.ts:101`
- Restart-form handler reads preferred list (orchd); working directory/id/key: agent adapter. `packages/orch/src/daemon/server/handlers/restart-form.ts:70`
- Spawn handler reads preferred list (orchd); working directory/id/key: agent harness. `packages/orch/src/daemon/server/spawn/index.ts:404`

## spaces
- `computeFleetCapacity` maps space IDs to display names (shared); working directory/id/key: space ID, not cwd/agent key. `packages/orch/src/policy/capacity.ts:106`
- Fleet status resolves names from settings (orchd); working directory/id/key: rows identify agents, no cwd argument. `packages/orch/src/daemon/server/fleet-status.ts:59`
- Settings display reads configured space names/count (CLI); working directory/id/key: none. `packages/orch/src/commands/settings.ts:434`

## fleet.max_agents_per_space
- `computeFleetCapacity` reads per-space cap (shared); working directory/id/key: `id` is a space id. `packages/orch/src/policy/capacity.ts:108`
- `admitSpaceCapacity` reads cap for launch space (orchd); working directory/id/key: `space` is the launch’s space. `packages/orch/src/daemon/server/spawn/admission.ts:125`
- Fleet capacity doctor checks caps against total (orchd); working directory/id/key: space name. `packages/orch/src/daemon/server/doctor/settings-file.ts:22`

### Q2 working-directory / agent-scope note
- Variables named above are the direct scope evidence. Functions not noted with a cwd, id, key, agent, space, or harness variable have `none` for that scope. Worktree operations receive repository/worktree context; they do not inherently derive a project settings path.

### Q3 orchd settings access
- `services.settings` has type `SettingsManager`; its interface exposes `current(): OrchSettings`, `currentOrNull(): OrchSettings | null`, and `reload(): OrchSettings | null`. `packages/orch/src/types/services.ts:26-29`
- Typical orchd call: `state.services.settings.current().worktrees`. `packages/orch/src/daemon/server/handlers/table.ts:207`
- Typical read: `state.services.settings.current().worktrees` — `packages/orch/src/daemon/server/handlers/table.ts:207`.

### Q4 shared `settings: OrchSettings` functions
- `workerRules(settings: OrchSettings)` is called in multiple files: `packages/orch/src/policy/spawner.ts`, `packages/orch/src/daemon/server/spawn/index.ts`, `packages/orch/src/commands/spawn/report.ts`, and `packages/orch/src/daemon/server/work-loop.ts`. Definition: `packages/orch/src/worker-prompt.ts:14`.
- `workerTools(settings: OrchSettings)` and `workerPolicyFrom(settings: OrchSettings)` are exported helpers in `packages/orch/src/policy/workers.ts:14,20`; callers are internal to that module's `workerRules` (`packages/orch/src/worker-prompt.ts:14`).
- No other cross-file call sites for functions taking exactly `settings: OrchSettings` were found by searching declarations and calls (`rg -n 'settings: OrchSettings|workerRules\\(|workerTools\\(|workerPolicyFrom\\(' packages/orch/src packages/orch/extensions`).
