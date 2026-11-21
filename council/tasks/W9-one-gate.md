# W9: the two callers move onto the one-gate interface

Context for every section. `packages/orch/src/policy/write-root.ts` now has a smaller
interface. A process builds one gate when it starts and asks it before each tool call:
```ts
export interface WriteRootGate { readonly root: string; readonly cwd: string; readonly tools: ToolVocabulary }
/** The gate a process launched under a write root runs behind, or null when its launch set none. */
export function writeRootGate(env: NodeJS.ProcessEnv, cwd: string, tools: ToolVocabulary): WriteRootGate | null
/** What the model is told when a tool call is refused, or undefined when the call may run. */
export function writeRootRefusal(gate: WriteRootGate, toolName: unknown, input: unknown): string | undefined
```
`writeRootOf`, `toolReach`, `ToolReach` and `insideWriteRoot` no longer exist. The two
sections touch different files and run at the same time. Paths are from the repo root
`/home/bryan/orch`. Code style: TypeScript, no `as` casts, no `any`, double quotes.

Verify for every section: run exactly these from the repo root, once, after the edits. Ignore
any other verify command your header names; it belongs to another project. Run no typecheck.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test <the test files the section names>
```

## T9 The pi and omp bridge takes its gate from the composition root
Edit `packages/orch/src/types/agent.ts`:
- The type import from `"../policy/write-root.ts"` becomes
  `import type { ToolVocabulary, WriteRootGate } from "../policy/write-root.ts";`.
- `AgentToolsOptions` gains a last member:
  ```ts
    /** The write root this session was launched under, or null when its launch set none. */
    writeRoot: WriteRootGate | null;
  ```
Edit `packages/orch/src/agent/harness-bridge.ts`:
- Add `import { ORCH_TOOLS } from "../policy/workers.ts";` and
  `import { writeRootGate } from "../policy/write-root.ts";`.
- In the options object passed to `registerAgentTools`, after `refreshLabels,` add:
  ```ts
      // A write-root agent keeps its harness's read tools and orch's own, and writes inside the root.
      writeRoot: writeRootGate(process.env, process.cwd(), { ...identity.tools, reads: [...identity.tools.reads, ...ORCH_TOOLS] }),
  ```
Edit `packages/orch/src/agent/tools.ts`:
- Delete `import { ORCH_TOOLS } from "../policy/workers.ts";`.
- The write-root import becomes `import { writeRootRefusal } from "../policy/write-root.ts";`.
- Delete the `rootTools` constant and the comment line above it (L296-297).
- In the `tool_call` listener, replace the five lines from
  `const writeRoot = writeRootOf(process.env);` through the closing `}` of
  `if (writeRoot !== null) {` with:
  ```ts
      if (options.writeRoot !== null) {
        const refusal = writeRootRefusal(options.writeRoot, event.toolName, event.input);
        if (refusal !== undefined) return { block: true, reason: refusal };
      }
  ```
Edit `packages/orch/test/bridge-write-root.test.ts`:
- Delete the `WRITE_ROOT_ENV` import. Add
  `import type { WriteRootGate } from "../src/policy/write-root.ts";`.
- In `fire`, before `registerAgentTools`, add
  `const gate: WriteRootGate | null = writeRoot === null ? null : { root: writeRoot, cwd: process.cwd(), tools: { ...PI_IDENTITY.tools, reads: [...PI_IDENTITY.tools.reads, "orch_ask"] } };`
  and pass `writeRoot: gate` in the options object of `registerAgentTools`.
- Delete every line that sets or deletes `process.env[WRITE_ROOT_ENV]`. Keep the `try` and
  its `finally` with `presence.stopPresence()`.
Edit three more test files: in the options object passed to `registerAgentTools`, add
`writeRoot: null` after the `refreshLabels` member:
- `packages/orch/test/bridge-command-gate.test.ts` (L52)
- `packages/orch/test/bridge-terminal.test.ts` (L124)
- `packages/orch/test/bridge-reasserts-pin.test.ts` (L158)
Test files to run: `packages/orch/test/bridge-write-root.test.ts packages/orch/test/bridge-command-gate.test.ts`.
Run neither of the other two test files.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T10 The claude hook builds its gate in the shim
Edit `packages/orch/extensions/claude/tool-gate.ts`:
- The write-root import becomes
  `import { writeRootRefusal, type WriteRootGate } from "orch/core/policy/write-root.ts";`.
- Delete `import { CLAUDE_TOOLS } from "./vocabulary.ts";`.
- `preToolUse` becomes:
  ```ts
  export function preToolUse(input: JsonRecord, settings: GateSettings, writeRoot: WriteRootGate | null): JsonRecord | undefined {
    if (writeRoot !== null) {
      const refusal = writeRootRefusal(writeRoot, input.tool_name, input.tool_input);
      if (refusal !== undefined) return hookOutput({ permissionDecision: "deny", permissionDecisionReason: refusal });
    }
    return lockedBash(input, settings);
  }
  ```
  Keep its doc comment.
Edit `packages/orch/extensions/claude/index.ts`:
- `import { writeRootOf } from "orch/core/policy/write-root.ts";` becomes
  `import { writeRootGate } from "orch/core/policy/write-root.ts";`.
- Add `import { CLAUDE_TOOLS } from "./vocabulary.ts";`.
- In `gateToolCall`, the `preToolUse` call becomes
  `preToolUse(input, settings, writeRootGate(process.env, textValue(input.cwd) ?? process.cwd(), CLAUDE_TOOLS))`.
Edit `packages/orch/test/claude-tool-gate.test.ts`:
- Add `import { CLAUDE_TOOLS } from "../extensions/claude/vocabulary.ts";` and
  `import type { WriteRootGate } from "../src/policy/write-root.ts";`.
- After the `cwd` constant add `const gate: WriteRootGate = { root, cwd, tools: CLAUDE_TOOLS };`.
- Every call `preToolUse(<input>, settings, null, cwd)` becomes `preToolUse(<input>, settings, null)`.
- Every call `preToolUse(<input>, settings, root, cwd)` becomes `preToolUse(<input>, settings, gate)`.
Test file to run: `packages/orch/test/claude-tool-gate.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
