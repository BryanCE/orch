# W7: the pi and omp bridge refuses by the write root

Context for every section. An agent launched with a write root may change files only inside
that one directory. `packages/orch/src/policy/write-root.ts` decides it: `writeRootOf(env)`
reads the root, `toolReach(vocabulary, toolName, input)` classifies a tool call, and
`writeRootRefusal(root, cwd, reach)` returns the refusal text or `undefined`. Each pi-shaped
harness names its tools in `identity.tools`, a `ToolVocabulary`
(`{ reads: string[]; writes: string[]; pathField: string }`), and a `HarnessEventHandler` may
now return a value. pi and omp block a tool call when its `tool_call` handler returns
`{ block: true, reason: "<text>" }`.
Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript, `node:` builtins
only, no `as` casts, no `any`, double quotes, a `/** ... */` doc comment on every export.

Verify for every section: run exactly these from the repo root, once, after the edits. Ignore
any other verify command your header names; it belongs to another project.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test <the test files the section names>
```

## T6 The bridge's tool_call listener refuses by the write root
Edit `packages/orch/src/policy/workers.ts`: after the `ORCH_PEER_TOOLS` constant add
```ts
/** Every tool orch itself registers in a worker. None of them changes a file. */
export const ORCH_TOOLS: readonly string[] = [...ORCH_BASE_TOOLS, ...ORCH_PEER_TOOLS];
```
Edit `packages/orch/src/agent/tools.ts`:
- Add the imports
  `import { ORCH_TOOLS } from "../policy/workers.ts";` and
  `import { toolReach, writeRootOf, writeRootRefusal, type ToolVocabulary } from "../policy/write-root.ts";`.
- Replace the `tool_call` listener and the two comment lines above it (L294-306, from
  `// tool_call is the one hook` to the closing `});`) with:
  ```ts
  // A write-root agent keeps its harness's read tools and orch's own, and writes inside the root.
  const rootTools: ToolVocabulary = { ...options.identity.tools, reads: [...options.identity.tools.reads, ...ORCH_TOOLS] };

  // tool_call is the one hook that can still stop or change a call before it runs. An agent
  // with a write root is refused every call that is not a read or a write inside the root. A
  // locked or gated command runs only through `orch lock`, which asks orchd first.
  harness.on("tool_call", (event: unknown) => {
    if (!isToolCallEvent(event)) return undefined;
    const writeRoot = writeRootOf(process.env);
    if (writeRoot !== null) {
      const refusal = writeRootRefusal(writeRoot, process.cwd(), toolReach(rootTools, event.toolName, event.input));
      if (refusal !== undefined) return { block: true, reason: refusal };
    }
    if (event.toolName !== "bash" || !isRecord(event.input)) return undefined;
    const current = settings.currentOrNull();
    if (current === null || typeof event.input.command !== "string") return undefined;
    const wrapped = lockedCommandLine(event.input.command, gatedPatterns(current));
    if (wrapped === undefined) return undefined;
    event.input.command = wrapped;
    // The host's bash timeout is in seconds and absent means none; the lock wait must not eat it.
    if (typeof event.input.timeout === "number") event.input.timeout += Math.ceil(current.timeouts.lock_wait_ms / 1000);
    return undefined;
  });
  ```
  The parameter that holds `identity` in `registerAgentTools` is named `options`. If it has
  another name, use that name.
Create `packages/orch/test/bridge-write-root.test.ts`. Copy the imports, `roots`, `afterEach`
and `harnessContext` from `packages/orch/test/bridge-command-gate.test.ts`, and add
`import * as path from "node:path";` and
`import { WRITE_ROOT_ENV } from "../src/policy/write-root.ts";`. Write one helper:
```ts
/** Fire one tool_call at a bridge launched under `writeRoot`; returns what the listener answered and the input the tool would run with. */
function fire(writeRoot: string | null, toolName: string, input: Record<string, unknown>): { answer: unknown; input: Record<string, unknown> }
```
It builds the harness, daemon, presence and settings exactly as `toolInput` does in
`bridge-command-gate.test.ts` (settings lock `bun test`, identity is `PI_IDENTITY`). Before it
fires the event it sets `process.env[WRITE_ROOT_ENV] = writeRoot` when `writeRoot` is not null,
and deletes `process.env[WRITE_ROOT_ENV]` otherwise. It calls each `tool_call` handler with the
event and `harnessContext()` and keeps the first return value that is not `undefined` as
`answer`. In a `finally` it deletes `process.env[WRITE_ROOT_ENV]` and calls
`presence.stopPresence()`.
Use `const root = path.join(process.cwd(), ".orch", "councils", "plan", "ada");`,
`const other = { block: true, reason: `orch refused this tool: this agent only reads files, and writes only inside ${root}.` };`
Cases, in one `describe("bridge write root", ...)`:
- `fire(null, "write", { path: "src/a.ts", content: "x" }).answer` is `undefined`.
- `fire(root, "write", { path: path.join(root, "round-1.md"), content: "x" }).answer` is `undefined`.
- `fire(root, "read", { path: "src/a.ts" }).answer` is `undefined`.
- `fire(root, "orch_ask", { question: "?" }).answer` is `undefined`.
- `fire(root, "edit", { path: "src/a.ts" }).answer` equals
  `{ block: true, reason: `orch refused this write: ${path.resolve("src/a.ts")} is outside ${root}, the only directory this agent may write in.` }`.
- `fire(root, "bash", { command: "ls" }).answer` equals `other`.
- `fire(root, "mcp__files__write", { path: path.join(root, "x.md") }).answer` equals `other`.
- A locked command under a write root is refused and not rewritten:
  `const fired = fire(root, "bash", { command: "bun test" });` then `fired.answer` equals
  `other` and `fired.input.command` is `"bun test"`.
- With no write root a locked command is still rewritten:
  `fire(null, "bash", { command: "bun test" }).input.command` matches `/ lock -- 'bun test'$/`.
Test files to run: `packages/orch/test/bridge-write-root.test.ts packages/orch/test/bridge-command-gate.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
