## T2

1. `packages/orch/src/pty/node-pipes.ts:23`
   Breaks the process-exit contract. A child `error` can report a failed kill after a successful start. Resolving `exited` here makes `holdPipes` forget a process that is still running.
   Exact edit: remove `resolve({ code: null, signal: null });` from the child `error` handler. Keep forwarding its message to stderr listeners. Resolve `exited` only in the child `exit` handler; retain the failed-start throw when `child.pid` is undefined.

2. `packages/orch/src/pty/node-pipes.ts:16`
   Breaks "Nothing in node-pipes.ts leaves an unhandled error event." The stderr readable has a `data` listener but no `error` listener. Stream errors are not handled by the child's `error` listener.
   Exact edit: extract the existing listener fan-out into a local `emitStderr(text: string): void` function. Use it for stderr `data` and child `error`, and add `child.stderr.on("error", (error) => { emitStderr(error.message); });`. Do not resolve `exited` for a stream error.

3. `packages/orch/src/types/pipes.ts:19`
   Breaks the requirement that stderr listeners registered before and after the first chunk receive equivalent text, or that the difference is documented. Both providers discard text emitted before registration, but the interface does not state this.
   Exact edit: add `/** Receives future stderr text only; earlier chunks are not replayed. */` immediately above `onStderr`.

Verification pending: `bun check` failed in files outside this review's edit scope. Failures include the capability check in `src/daemon/server/spawn/plan.ts:75`, type and lint errors in `src/acp/session.ts`, missing `form` and `optionId` fixture fields, missing link `takes`, and unresolved `services` in `src/daemon/server/spawn/index.ts:356`. No test files were edited, so no tests were run.

T2: 3 findings
