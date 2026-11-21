## 1. Adapter `commandGate`
- Type: `readonly commandGate: boolean;`; comment: “True when this harness's integration rewrites a locked or gated shell command through `orch lock` before it runs.” `packages/orch/src/types/adapter.ts:333-334`
- Values: pi `true` (`packages/orch/src/adapters/pi.ts:372`); omp `true`, inherited: `OmpAdapter` extends `PiBridgeAdapter`, which declares it (`packages/orch/src/adapters/omp.ts:65`, `packages/orch/src/adapters/pi.ts:351,372`); claude `true` (`packages/orch/src/adapters/claude.ts:254`); codex `false` (`packages/orch/src/adapters/codex.ts:129`); opencode `false` (`packages/orch/src/adapters/opencode.ts:76`).

## 2. Pi and OMP interception
- Shared `registerAgentTools` listens to `tool_call`; it acts only on tool name `bash`, and rewrites `event.input.command` through `lockedCommandLine` if it matches locked, gated, or denied patterns. It does not refuse directly. `packages/orch/src/agent/tools.ts:294-306`
- OMP receives the same shared tool layer through the harness bridge; no separate OMP interception implementation found in `packages/orch/extensions/omp/`.

## 3. Claude hooks
- `CLAUDE_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop", "StopFailure", "Notification", "PreToolUse"]`. `packages/orch/src/adapters/claude-hooks.ts:12`
- `CLAUDE_HOOK_MATCHERS` sets `PreToolUse: "Bash"` and `Notification: "permission_prompt|elicitation_dialog|elicitation_url_dialog"`; all other events have no matcher. `packages/orch/src/adapters/claude-hooks.ts:16-19`
- PreToolUse rewrites matching Bash command input through `orch lock`; no permission decision is made. It sees no file path for edit/write. `packages/orch/extensions/claude/index.ts:92-101`

## 4. Codex and OpenCode
- Codex: no pre-run tool-call interception found. Search: `rg -n 'PreToolUse|tool_call|before_tool|commandGate' packages/orch/extensions/codex packages/orch/src/adapters/codex.ts`; only the adapter's `commandGate = false` declaration matches. `packages/orch/src/adapters/codex.ts:129`
- OpenCode: no pre-run tool-call interception found. Search: `rg -n 'PreToolUse|tool_call|before_tool|commandGate' packages/orch/extensions/opencode packages/orch/src/adapters/opencode.ts`; only the adapter's `commandGate = false` declaration matches. `packages/orch/src/adapters/opencode.ts:76`

## 5. Command matching
- `matchedPatterns(command, patterns)` returns all pattern matches within a command line; `wholeCommandMatch` returns the first whole-command match; `lockedCommandLine` returns undefined if there is no match or the command is already wrapped, otherwise the quoted `orch lock -- ...` command. `gatedPatterns` combines locked, gated, and denied settings. `packages/orch/src/policy/command-gate.ts:32-72`
- orchd's `lockCommand` uses `wholeCommandMatch` to recognize denied commands and `matchedPatterns` for gated and locked commands, returning `denied`, `refused`, `wait`/`gave-up`, or `run`. `packages/orch/src/daemon/server/handlers/command-lock.ts:80-122`

## 6. File-path policy
- Not found. Search: `rg -n 'file path|hasFixedPath|currentFile|toolInput|args.path'` over `src/policy/command-gate.ts`, `src/policy/command-paths.ts`, `src/agent/tools.ts`, and the five listed harness extension directories. `hasFixedPath` only checks fixed paths in configured shell-command patterns; it does not gate a tool's destination path. `packages/orch/src/policy/command-paths.ts:8-17`

## 7. Refusal result text
- Pi: `orch lock: this command is in gated_commands and needs the human's approval. Ask the human to run: orch grant ${verdict.requestId}\nThen run the exact same command again.` `packages/orch/src/commands/lock.ts:23-24`
- Claude: same text from the `orch lock` child; Claude's PreToolUse hook rewrites the Bash command and does not itself refuse. `packages/orch/src/commands/lock.ts:23-24`; `packages/orch/extensions/claude/index.ts:92-101`
