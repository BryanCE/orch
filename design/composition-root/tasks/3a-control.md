# 3a-control

Owns: `src/control/dispatch.ts`, `src/control/normalize-target.ts`. Follow `3a-README.md`.

Sites:
- `dispatch.ts:39` `loadPresence().get(target)` and `agentView(orchDir(), target)`
- `dispatch.ts:48` `agentView(orchDir(), target)`
- `dispatch.ts:124` `pendingQuestion(orchDir(), target)`
- `dispatch.ts:140` `assertModelAllowed(orchDir(), adapter, model)`
- `dispatch.ts:156` `setTuning(orchDir(), target, ...)`
- `dispatch.ts:166` `agentView(orchDir(), target)`
- `dispatch.ts:197` `loadSettingsOrNull(orchDir())?.timeouts.adapter_command_ms ?? ADAPTER_COMMAND_TIMEOUT_MS` — `ADAPTER_COMMAND_TIMEOUT_MS` is a literal constant, which is a Rule 17 violation on its own. Replace with `settings.timeouts.adapter_command_ms` where `settings: OrchSettings` is a parameter; if `adapter_command_ms` is not in the schema, report BLOCKED naming the missing key.
- `normalize-target.ts:30` `agentViews(orchDir())`

The control dispatcher is called from the daemon and from commands. Its exported entry takes `orchDir: string` and `settings: OrchSettings` as separate plain parameters (it is one level above leaves, but its callers are roots or root-adjacent, so plain values keep it testable without a `Services`).
