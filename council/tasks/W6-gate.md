# W6: each harness's tool names, and the claude gate

Context for every section. An agent launched with a write root may change files only inside
that one directory. `packages/orch/src/policy/write-root.ts` already decides that from a
`ToolReach`. This wave gives each harness one list of its own tool names, and makes the claude
hook refuse a call by it. The three sections touch different files and run at the same time.
Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript, `node:` builtins
only, no `as` casts, no `any`, double quotes, a `/** ... */` doc comment on every export.
A message a function returns never contains parentheses.

Verify for every section: run exactly these from the repo root, once, after the edits. Ignore
any other verify command your header names; it belongs to another project. Do not run a
typecheck: another section's half-finished edit would fail it.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test <the test files the section names>
```

The shape all three sections build against, added by T3 to `write-root.ts`:
```ts
/** A harness's own names for the tools a write-root agent keeps. */
export interface ToolVocabulary {
  /** Tools that change no file. */
  readonly reads: readonly string[];
  /** Tools that change the one file their input names. */
  readonly writes: readonly string[];
  /** The input field of a writing tool that holds its path. */
  readonly pathField: string;
}
export function toolReach(vocabulary: ToolVocabulary, toolName: unknown, input: unknown): ToolReach
export function writeRootTools(vocabulary: ToolVocabulary): string[]
```

## T3 The tool vocabulary
Edit `packages/orch/src/policy/write-root.ts`:
- Add `import { isRecord } from "../util.ts";` under the `node:path` import.
- After the `ToolReach` type, add the `ToolVocabulary` interface exactly as written above.
- After `writeRootRefusal`, add:
  ```ts
  /** What a tool call would touch, by its harness's vocabulary. A tool the vocabulary does not list is `other`. */
  export function toolReach(vocabulary: ToolVocabulary, toolName: unknown, input: unknown): ToolReach {
    if (typeof toolName !== "string") return { kind: "other" };
    if (vocabulary.reads.includes(toolName)) return { kind: "reads" };
    if (!vocabulary.writes.includes(toolName) || !isRecord(input)) return { kind: "other" };
    const target = input[vocabulary.pathField];
    return typeof target === "string" ? { kind: "writes", path: target } : { kind: "other" };
  }

  /** The tools a write-root agent launches with, in its harness's names. */
  export function writeRootTools(vocabulary: ToolVocabulary): string[] {
    return [...vocabulary.reads, ...vocabulary.writes];
  }
  ```
Edit `packages/orch/test/write-root.test.ts`: import `toolReach`, `writeRootTools` and the
type `ToolVocabulary`, and add one `test("classifies a tool call by its harness's vocabulary", ...)`
inside the existing `describe`, with
`const tools: ToolVocabulary = { reads: ["read", "grep"], writes: ["edit", "write"], pathField: "path" };`
and these cases:
- `toolReach(tools, "read", { path: "a.ts" })` equals `{ kind: "reads" }`.
- `toolReach(tools, "write", { path: "a.ts", content: "x" })` equals `{ kind: "writes", path: "a.ts" }`.
- `toolReach(tools, "edit", { file_path: "a.ts" })` equals `{ kind: "other" }` (the path field is missing).
- `toolReach(tools, "edit", "a.ts")` equals `{ kind: "other" }`.
- `toolReach(tools, "bash", { command: "ls" })` equals `{ kind: "other" }`.
- `toolReach(tools, 7, {})` equals `{ kind: "other" }`.
- `writeRootTools(tools)` equals `["read", "grep", "edit", "write"]`.
Test file: `packages/orch/test/write-root.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Each pi-shaped harness names its tools
Edit `packages/orch/src/types/agent.ts`:
- Add `import type { ToolVocabulary } from "../policy/write-root.ts";` with the other type imports.
- `HarnessEventHandler` (L83) becomes
  `export type HarnessEventHandler = (event: unknown, ctx: HarnessContext) => unknown;`
  and its doc comment becomes
  `/** A handler bound to one harness event; the event payload is validated by its reader. What it returns goes back to the harness, which reads it for the events it lets a handler answer. */`
- `HarnessIdentity` gains a third member after `settleEvent`:
  ```ts
    /** The harness's own names for the tools a write-root agent keeps. */
    readonly tools: ToolVocabulary;
  ```
Create `packages/orch/extensions/pi/vocabulary.ts`:
```ts
// pi's own vocabulary: what it calls itself, its settle signal, and its built-in tools. The
// composition root and pi's adapter both read it here, so neither keeps a second list.
import type { HarnessIdentity } from "orch/core/types/agent.ts";
import type { ToolVocabulary } from "orch/core/policy/write-root.ts";

/** pi's built-in tools a write-root agent keeps: four that read, and `edit` and `write`, which change the file at `path`. */
export const PI_TOOLS: ToolVocabulary = { reads: ["read", "grep", "find", "ls"], writes: ["edit", "write"], pathField: "path" };

/** pi calls itself `pi`, and fires `agent_settled` when a run will not auto-continue. */
export const PI_IDENTITY: HarnessIdentity = { agentId: "pi", settleEvent: "agent_settled", tools: PI_TOOLS };
```
Create `packages/orch/extensions/omp/vocabulary.ts` the same way, with the header comment
saying omp, and:
```ts
/** omp's built-in tools a write-root agent keeps: three that read, and `edit` and `write`, which change the file at `path`. */
export const OMP_TOOLS: ToolVocabulary = { reads: ["read", "grep", "glob"], writes: ["edit", "write"], pathField: "path" };

/** omp calls itself `omp`, and fires `session_stop` when a run will not auto-continue. */
export const OMP_IDENTITY: HarnessIdentity = { agentId: "omp", settleEvent: "session_stop", tools: OMP_TOOLS };
```
Edit `packages/orch/extensions/pi/index.ts`: delete the `PI_IDENTITY` constant and its doc
comment (L12-13), import `PI_IDENTITY` from `"./vocabulary.ts"`, and drop `HarnessIdentity`
from the type import. Edit `packages/orch/extensions/omp/index.ts` the same way for
`OMP_IDENTITY` (L19-20).
Edit these test files: replace every literal `{ agentId: "pi", settleEvent: "agent_settled" }`
with `PI_IDENTITY`, and add `import { PI_IDENTITY } from "../extensions/pi/vocabulary.ts";`
to each:
- `packages/orch/test/bridge-apply.test.ts` (L102)
- `packages/orch/test/agent-key-is-minted-id.test.ts` (L101)
- `packages/orch/test/bridge-terminal.test.ts` (L114, L121)
- `packages/orch/test/bridge-command-gate.test.ts` (L48)
- `packages/orch/test/bridge-reasserts-pin.test.ts` (L143, L155)
- `packages/orch/test/peer-tools-registration.test.ts` (L40)
- `packages/orch/test/bridge-compaction.test.ts` (L37)
Test files to run: `packages/orch/test/bridge-command-gate.test.ts packages/orch/test/bridge-compaction.test.ts packages/orch/test/peer-tools-registration.test.ts`.
Run none of the other four test files.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T5 The claude hook refuses by the write root
Create `packages/orch/extensions/claude/vocabulary.ts`:
```ts
// Claude's own names for its built-in tools. The hook and claude's adapter both read them
// here, so neither keeps a second list.
import type { ToolVocabulary } from "orch/core/policy/write-root.ts";

/** Claude's built-in tools a write-root agent keeps: three that read, and `Edit` and `Write`, which change the file at `file_path`. */
export const CLAUDE_TOOLS: ToolVocabulary = { reads: ["Read", "Grep", "Glob"], writes: ["Edit", "Write"], pathField: "file_path" };
```
Create `packages/orch/extensions/claude/tool-gate.ts`:
```ts
// What orch's PreToolUse hook does to one Claude tool call. It lives apart from the shim so a
// test can call it: the shim reads stdin and prints what this returns.
import { gatedPatterns, lockedCommandLine } from "orch/core/policy/command-gate.ts";
import { toolReach, writeRootRefusal } from "orch/core/policy/write-root.ts";
import { isRecord } from "orch/core/util.ts";
import { CLAUDE_TOOLS } from "./vocabulary.ts";
import type { JsonRecord } from "orch/core/types/core.ts";

/** Claude's Bash tool: its timeout is in ms, 2 minutes when unset, 10 minutes at most. */
const BASH_DEFAULT_TIMEOUT_MS = 120_000;
const BASH_MAX_TIMEOUT_MS = 600_000;

/** The settings the gate reads: the command rules and the lock wait. */
export type GateSettings = Parameters<typeof gatedPatterns>[0] & { readonly timeouts: { readonly lock_wait_ms: number } };

/** The Bash timeout with the lock wait added, so waiting for the lock never eats the command's own time. */
function bashTimeoutWithWait(timeout: unknown, lockWaitMs: number): number {
  const own = typeof timeout === "number" ? timeout : BASH_DEFAULT_TIMEOUT_MS;
  return Math.min(BASH_MAX_TIMEOUT_MS, own + lockWaitMs);
}

function hookOutput(decision: JsonRecord): JsonRecord {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", ...decision } };
}

/** A locked or gated Bash command rewritten through `orch lock`. No permissionDecision: the
 *  user's own rules still judge the rewritten command. */
function lockedBash(input: JsonRecord, settings: GateSettings): JsonRecord | undefined {
  const toolInput = input.tool_input;
  if (input.tool_name !== "Bash" || !isRecord(toolInput) || typeof toolInput.command !== "string") return undefined;
  const wrapped = lockedCommandLine(toolInput.command, gatedPatterns(settings));
  if (wrapped === undefined) return undefined;
  const timeout = bashTimeoutWithWait(toolInput.timeout, settings.timeouts.lock_wait_ms);
  return hookOutput({ updatedInput: { ...toolInput, command: wrapped, timeout } });
}

/** What the hook prints for one tool call, or undefined to let the call run as it is. An agent
 *  with a write root is refused every call that is not a read or a write inside the root. */
export function preToolUse(input: JsonRecord, settings: GateSettings, writeRoot: string | null, cwd: string): JsonRecord | undefined {
  if (writeRoot !== null) {
    const refusal = writeRootRefusal(writeRoot, cwd, toolReach(CLAUDE_TOOLS, input.tool_name, input.tool_input));
    if (refusal !== undefined) return hookOutput({ permissionDecision: "deny", permissionDecisionReason: refusal });
  }
  return lockedBash(input, settings);
}
```
Edit `packages/orch/extensions/claude/index.ts`:
- Delete `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS`, their comment, and
  `bashTimeoutWithWait` (L27-35).
- Delete `rewriteLockedBash` and its doc comment (L92-101). In its place add:
  ```ts
  /** PreToolUse prints what the tool gate decides. Printing nothing lets the call run as it is. */
  function gateToolCall(): void {
    const output = preToolUse(input, settings, writeRootOf(process.env), textValue(input.cwd) ?? process.cwd());
    if (output !== undefined) process.stdout.write(JSON.stringify(output));
  }
  ```
- In `handlers`, `pretooluse: rewriteLockedBash` becomes `pretooluse: gateToolCall`.
- Delete the `orch/core/policy/command-gate.ts` import. Add
  `import { writeRootOf } from "orch/core/policy/write-root.ts";` and
  `import { preToolUse } from "./tool-gate.ts";`. Keep the `isRecord` import: `readJsonStdin` uses it.
Edit `packages/orch/src/adapters/claude-hooks.ts`:
- Add `import { CLAUDE_TOOLS } from "../../extensions/claude/vocabulary.ts";`.
- In `CLAUDE_HOOK_MATCHERS`, `PreToolUse: "Bash",` becomes
  `PreToolUse: ["Bash", ...CLAUDE_TOOLS.writes].join("|"),`.
- In the doc comment above it, `PreToolUse rewrites only Bash` becomes
  `PreToolUse acts on Bash and on the tools that write`.
Create `packages/orch/test/claude-tool-gate.test.ts` with `bun:test`, importing `preToolUse`
from `"../extensions/claude/tool-gate.ts"` and `SETTINGS_DEFAULTS` from
`"../src/settings/schema.ts"`. Use
`const settings = { ...SETTINGS_DEFAULTS, locked_commands: { ...SETTINGS_DEFAULTS.locked_commands, commands: ["bun test"] } };`,
`const root = "/repo/.orch/councils/plan/ada";` and `const cwd = "/repo";`. A denial is
`{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: <text> } }`.
Cases:
- No write root, `{ tool_name: "Write", tool_input: { file_path: "/repo/src/a.ts", content: "x" } }`: `undefined`.
- No write root, `{ tool_name: "Bash", tool_input: { command: "ls" } }`: `undefined`.
- No write root, `{ tool_name: "Bash", tool_input: { command: "bun test", timeout: 1000 } }`:
  the result's `hookSpecificOutput.updatedInput.command` matches `/ lock -- 'bun test'$/`, and
  `hookSpecificOutput.updatedInput.timeout` is `1000 + SETTINGS_DEFAULTS.timeouts.lock_wait_ms`.
- Write root set, `{ tool_name: "Write", tool_input: { file_path: "/repo/.orch/councils/plan/ada/round-1.md", content: "x" } }`: `undefined`.
- Write root set, `{ tool_name: "Read", tool_input: { file_path: "/repo/src/a.ts" } }`: `undefined`.
- Write root set, `{ tool_name: "Edit", tool_input: { file_path: "src/a.ts" } }`: a denial whose
  reason is `"orch refused this write: /repo/src/a.ts is outside /repo/.orch/councils/plan/ada, the only directory this agent may write in."`
- Write root set, `{ tool_name: "Bash", tool_input: { command: "ls" } }`: a denial whose reason
  is `"orch refused this tool: this agent only reads files, and writes only inside /repo/.orch/councils/plan/ada."`
- Write root set, `{ tool_name: "NotebookEdit", tool_input: { notebook_path: "/repo/a.ipynb" } }`: the same denial as Bash.
Test files to run: `packages/orch/test/claude-tool-gate.test.ts packages/orch/test/doctor-claude-hooks.test.ts`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
