## 1. `harness.on` handler contract and return propagation
- `HarnessEventHandler = (event: unknown, ctx: HarnessContext) => void | Promise<unknown>` and `HarnessApi.on(event: string, handler: HarnessEventHandler): void`; `harness.on` in the adapter port accepts that callback (packages/orch/src/types/agent.ts:83,108).
- `registerHarnessBridge` hands the harness to `registerAgentTools` (packages/orch/src/agent/harness-bridge.ts:48-54). Its `tool_call` handler returns no value; it only mutates the input command, so no blocking return reaches the harness (packages/orch/src/agent/tools.ts:296-305).

## 2. Harness package event and blocking types
- pi's package declaration: not found. `find /home/bryan/.bun/install/global/node_modules -path '*pi-coding-agent*' -name '*.d.ts'` found no pi package declaration; the requested package is not present in the listed node_modules locations.
- omp's package declaration: installed at `/home/bryan/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`, but the package's own API declarations for `tool_call` and a blocking return were not found among its `.d.ts` files. The shared orch port only permits `void | Promise<unknown>` (packages/orch/src/types/agent.ts:83).

## 3. Built-in tool names and file path inputs
- pi/omp type definitions for built-in tool names and path input fields: not found; grep `tool_call` and `.d.ts` search found no harness API declarations. The only path candidates orch recognizes are `path`, `file_path`, and `filePath` (packages/orch/src/agent/tools.ts:256-260).

## 4. `currentFileCandidate`
```ts
function currentFileCandidate(args: unknown): string | undefined {
  if (!isRecord(args)) return undefined;
  const candidate = args.path ?? args.file_path ?? args.filePath;
  return typeof candidate === "string" ? candidate : undefined;
}
```
(packages/orch/src/agent/tools.ts:256-260)

## 5. `tool_call` listener tests
- `packages/orch/test/bridge-terminal.test.ts` defines a harness fake with `on(name, handler)` and registers the tools (packages/orch/test/bridge-terminal.test.ts:20-25,95-118).
- `packages/orch/test/bridge-reasserts-pin.test.ts` also defines a fake harness (packages/orch/test/bridge-reasserts-pin.test.ts:51-54), but neither test file fires a `tool_call` event. `rg -n 'tool_call' packages/orch/test/bridge-terminal.test.ts packages/orch/test/bridge-reasserts-pin.test.ts` found no event firing.

## 6. Claude presence session and environment reads
- `presenceSession(): PresenceSession` returns either `{ kind: "not-orch" }` or `{ kind: "ok"; key; orchDir; settings }`; it reads launch credential, orch dir, and settings (packages/orch/src/daemon/client/report-session.ts:7-19).
- Claude hook source has no `process.env` reads: `rg -n 'process\\.env' packages/orch/extensions/claude` returned no matches. It obtains identity/config via `presenceSession()` (packages/orch/extensions/claude/index.ts:71-74).

## 7. `CLAUDE_HOOK_MATCHERS` consumers and matcher tests
- Hook settings construction reads `CLAUDE_HOOK_MATCHERS[event]` and conditionally includes `matcher` (packages/orch/src/adapters/claude.ts:99-105).
- Doctor's Claude hook test imports the matcher and asserts hook config by event (packages/orch/test/doctor-claude-hooks.test.ts:6,49).
- `PreToolUse` matcher is `Bash` (packages/orch/src/adapters/claude-hooks.ts:17-19). The same test file exercises registered events/matchers (packages/orch/test/doctor-claude-hooks.test.ts:41-62).

## 8. Claude launch argv and tool flags
```ts
interactiveArgv(opts: SpawnOpts): readonly string[] {
  const argv = [...buildInteractiveArgv("claude", opts), ...settingsArgv(opts), ...mcpArgv(opts)];
  if (opts.thinking !== undefined) argv.push(...this.thinking.launchArgs(opts.thinking));
  return argv;
}
headlessCmd(prompt: string, opts: SpawnOpts): string[] {
  const flags = ["-p", ...settingsArgv(opts), ...mcpArgv(opts)];
  if (opts.thinking !== undefined) flags.push(...this.thinking.launchArgs(opts.thinking));
  return buildHeadlessArgv("claude", flags, opts, prompt);
}
```
(packages/orch/src/adapters/claude.ts:988-999)
- Neither function passes `--tools`, `--allowedTools`, nor `--disallowedTools` (packages/orch/src/adapters/claude.ts:988-999).

## 9. CLI tool-limiting flags
- `claude --help`: `--allowedTools` allowlist and `--disallowedTools` denylist (packages/orch/src/adapters/claude.ts is not the source; observed command help).
- `pi --help`: `--tools` allowlist; `--no-builtin-tools` disables built-ins while retaining extension tools (observed command help).
- `omp --help`: `--tools=<value>` controls enabled tools; `--no-tools` disables built-ins (observed command help).

## 10. Claude `PreToolUse` tests and stdin
- `packages/orch/test/doctor-claude-hooks.test.ts` is the only test found asserting Claude hook events/matchers; no test of the extension's `PreToolUse` implementation was found (`rg -n 'PreToolUse' packages/orch/test`).
- The hook itself reads its payload from stdin with `readFileSync(0, "utf8")`, parses JSON, then dispatches `PreToolUse` through `rewriteLockedBash` (packages/orch/extensions/claude/index.ts:47-55,92-101).
