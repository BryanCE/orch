# 03-tool-exec

Model: `luna:low`.

Owns: `src/backends/tool-exec.ts`, `test/tool-exec-retry.test.ts`

Do:
- Delete `let executor` and `setToolExecutor`.
- `runTool` and `runToolBestEffort` gain a trailing parameter `executor: ToolExecutor = realExecutor` (after `options`) and call it instead of the module variable. `realExecutor` stays a module const: it is a pure function, not state.
- In the test: delete the `afterEach` that reset the executor and its comment, and pass `scripted.executor` as the last argument of every `runTool(...)` call, supplying the existing `options` default explicitly where needed (export `DEFAULT_OPTIONS` as a named const if you must).
- Callers in `src/backends/tmux/cli.ts` and `src/backends/herdr/cli.ts` are untouched; they take the default.

Check: `bun check`. Tests: `test/tool-exec-retry.test.ts`.
