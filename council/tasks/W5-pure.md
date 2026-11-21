# W5: the two pure modules

Context for every section. A council member is an agent that reviews a subject and writes one
Markdown file per round inside one directory of its own. `council/README.md` describes it.
These two tasks each add one new module with no I/O and its test. Nothing imports them yet.
Paths are from the repo root `/home/bryan/orch`. Code style: TypeScript, `node:` builtins
only, no `as` casts, no `any`, double quotes, a `/** ... */` doc comment on every export.
A message a function returns never contains parentheses.

Verify for every section: run exactly these from the repo root, once, after the edits. Ignore
any other verify command your header names; it belongs to another project.
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you wrote>
bun test <the test file you wrote>
```

## T1 The write root
Create `packages/orch/src/policy/write-root.ts` with exactly these exports:

```ts
// An agent launched with a write root may change files only inside that one directory, and
// has no tool that reaches the disk another way. Each harness integration says what a tool
// call would touch; this module is the one place that decides whether it runs.
import * as path from "node:path";

/** Env var orchd sets on an agent it launches with a write root: the directory's absolute path. */
export const WRITE_ROOT_ENV = "ORCH_WRITE_ROOT";

/** The write root this process was launched under, or null when it has none. */
export function writeRootOf(env: NodeJS.ProcessEnv): string | null

/** What one tool call would touch, in the words of the harness that names the tool. */
export type ToolReach =
  | { readonly kind: "reads" }
  | { readonly kind: "writes"; readonly path: string }
  | { readonly kind: "other" };

/** Whether the path a tool named, taken from the agent's directory, is inside `root`. The root itself is not inside. */
export function insideWriteRoot(root: string, cwd: string, target: string): boolean

/** What the model is told when the call is refused, or undefined when the call may run. */
export function writeRootRefusal(root: string, cwd: string, reach: ToolReach): string | undefined
```

Behaviour:
- `writeRootOf`: returns `env[WRITE_ROOT_ENV]`, or `null` when it is undefined or `""`.
- `insideWriteRoot`: `const relative = path.relative(path.resolve(root), path.resolve(cwd, target));`
  then true only when `relative` is not `""`, is not `".."`, does not start with
  `".." + path.sep`, and `path.isAbsolute(relative)` is false.
- `writeRootRefusal`:
  - `reads`: returns `undefined`.
  - `writes` with the path inside the root: returns `undefined`.
  - `writes` otherwise: returns
    `` `orch refused this write: ${path.resolve(cwd, reach.path)} is outside ${path.resolve(root)}, the only directory this agent may write in.` ``
  - `other`: returns
    `` `orch refused this tool: this agent only reads files, and writes only inside ${path.resolve(root)}.` ``

Create `packages/orch/test/write-root.test.ts` using `import { describe, expect, test } from "bun:test";`
and importing from `"../src/policy/write-root.ts"`. Use `const root = "/repo/.orch/councils/plan/ada";`
and `const cwd = "/repo";`. Cases:
- `writeRootOf({})` is `null`; `writeRootOf({ ORCH_WRITE_ROOT: "" })` is `null`;
  `writeRootOf({ ORCH_WRITE_ROOT: root })` is `root`.
- `insideWriteRoot(root, cwd, target)` is `true` for each of:
  `".orch/councils/plan/ada/round-1.md"`, `"/repo/.orch/councils/plan/ada/round-1.md"`,
  `".orch/councils/plan/ada/notes/deep/x.md"`, `"/repo/.orch/councils/plan/ada/..draft.md"`,
  `"src/../.orch/councils/plan/ada/round-2.md"`.
- `insideWriteRoot(root, cwd, target)` is `false` for each of:
  `".orch/councils/plan/ada"`, `".orch/councils/plan/ada/"`,
  `".orch/councils/plan/bob/round-1.md"`, `".orch/councils/plan/ada/../bob/round-1.md"`,
  `"/repo/.orch/councils/plan/ada-2/round-1.md"`, `"src/a.ts"`, `"/etc/passwd"`,
  `"~/.bashrc"`, `"round-1.md"`.
- `insideWriteRoot("/repo/.orch/councils/plan/ada/", cwd, ".orch/councils/plan/ada/round-1.md")`
  is `true` (a root written with a trailing slash).
- `writeRootRefusal(root, cwd, { kind: "reads" })` is `undefined`.
- `writeRootRefusal(root, cwd, { kind: "writes", path: ".orch/councils/plan/ada/round-1.md" })`
  is `undefined`.
- `writeRootRefusal(root, cwd, { kind: "writes", path: "src/a.ts" })` equals
  `"orch refused this write: /repo/src/a.ts is outside /repo/.orch/councils/plan/ada, the only directory this agent may write in."`
- `writeRootRefusal(root, cwd, { kind: "other" })` equals
  `"orch refused this tool: this agent only reads files, and writes only inside /repo/.orch/councils/plan/ada."`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 The round file
Create `packages/orch/src/council/round-file.ts` with exactly these exports:

```ts
// A council member writes one file per round. This module is the one place that knows the
// file's name and layout: the member's prompt quotes `roundFileLayout`, and orchd reads the
// file back with `parseRoundFile` when the member's run finishes.

/** What a member's round file says. */
export interface RoundReview {
  /** The member's score: a whole number from 0 to the council's scale. */
  readonly score: number;
  /** What would improve the subject, the most important first. */
  readonly improvements: readonly string[];
}

/** A round file read back: the review, or what is wrong with the file. */
export type RoundFileParse =
  | { readonly ok: true; readonly review: RoundReview }
  | { readonly ok: false; readonly problem: string };

/** The name of a member's file for one round, inside the member's directory. */
export function roundFileName(round: number): string

/** The layout a member is told to write, for a council that scores out of `scale`. */
export function roundFileLayout(scale: number): string

/** Read a round file's text back, for a council that scores out of `scale`. */
export function parseRoundFile(text: string, scale: number): RoundFileParse
```

Behaviour:
- `roundFileName(3)` returns `"round-3.md"`.
- `roundFileLayout(10)` returns exactly this text, lines joined with `"\n"`, no trailing newline,
  with `10` replaced by the scale in both places:
  ```
  Score: <a whole number from 0 to 10>/10

  ## Improvements

  1. <the change that would raise the score most>
  2. <the next one>
  ```
- `parseRoundFile` splits `text` on `/\r?\n/` and works on each line with trailing whitespace
  removed (`line.trimEnd()`).
  - The score line is the first line that matches `/^Score:\s*(\d+)\s*\/\s*(\d+)$/`.
    - No such line: `{ ok: false, problem: "the file has no `Score: <n>/" + scale + "` line" }`.
    - The second number is not `scale`:
      `` { ok: false, problem: `the score is out of ${second}, and this council scores out of ${scale}` } ``.
    - The first number is above `scale`:
      `` { ok: false, problem: `the score ${first} is above ${scale}` } ``.
  - The improvements section starts after the first line that equals `## Improvements` and
    ends before the next line that matches `/^#{1,6}\s/`, or at the end of the text.
    - No `## Improvements` line: `{ ok: false, problem: "the file has no `## Improvements` heading" }`.
    - Inside the section, a line that matches `/^\d+\.\s+(.*)$/` starts a new improvement whose
      text is the captured group. Any other non-blank line after the first improvement is a
      continuation: append `" " + line.trim()` to the current improvement. Blank lines and
      lines before the first improvement are skipped.
    - A section with no numbered line gives `improvements: []`.
  - The score problems are checked before the improvements problem.
  - Success: `{ ok: true, review: { score: <first number>, improvements } }`.

Create `packages/orch/test/council-round-file.test.ts` using
`import { describe, expect, test } from "bun:test";` and importing from
`"../src/council/round-file.ts"`. Cases:
- `roundFileName(1)` is `"round-1.md"` and `roundFileName(12)` is `"round-12.md"`.
- `roundFileLayout(10)` equals
  `"Score: <a whole number from 0 to 10>/10\n\n## Improvements\n\n1. <the change that would raise the score most>\n2. <the next one>"`,
  and `roundFileLayout(5)` contains `"from 0 to 5>/5"`.
- `parseRoundFile("# Review\n\nScore: 7/10\n\n## Improvements\n\n1. Name the owner of each step.\n2. Cut the second table.\n", 10)`
  equals `{ ok: true, review: { score: 7, improvements: ["Name the owner of each step.", "Cut the second table."] } }`.
- A continuation and a blank line inside an item:
  `"Score: 3/5\n## Improvements\n1. First line\n   second line\n\n2. Next\n"` with scale 5 gives
  improvements `["First line second line", "Next"]` and score 3.
- CRLF line ends and loose spacing: `"Score:  9 / 10  \r\n## Improvements\r\n1. One\r\n"` with
  scale 10 gives score 9 and improvements `["One"]`.
- A later heading ends the section:
  `"Score: 10/10\n## Improvements\n\n## Notes\n1. Not an improvement\n"` with scale 10 gives
  score 10 and improvements `[]`.
- `parseRoundFile("## Improvements\n1. One\n", 10)` equals
  `{ ok: false, problem: "the file has no `Score: <n>/10` line" }`.
- `parseRoundFile("Score: 7/5\n## Improvements\n", 10)` equals
  `{ ok: false, problem: "the score is out of 5, and this council scores out of 10" }`.
- `parseRoundFile("Score: 11/10\n## Improvements\n", 10)` equals
  `{ ok: false, problem: "the score 11 is above 10" }`.
- `parseRoundFile("Score: 7/10\n", 10)` equals
  `{ ok: false, problem: "the file has no `## Improvements` heading" }`.
- A score written as `7.5/10` or `seven/10` gives the "no `Score: <n>/10` line" problem.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
