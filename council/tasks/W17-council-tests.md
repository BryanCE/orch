# W17: tests for the council's scores

Context for every section. A council is several agents that review one subject and score it,
round by round. Each member writes `round-<n>.md` in its own directory under the council's
directory. orchd reads the score from that file when the member's run finishes
(`scoreFinishedRun` in `packages/orch/src/daemon/server/council.ts`), and `orch council scores`
prints a table (`renderScores` in `packages/orch/src/commands/council.ts`). The two sections
touch different files and run at the same time. Paths are from the repo root
`/home/bryan/orch`. Code style: TypeScript, `node:` builtins only, no `as` casts, no `any`,
double quotes.

Never run `bun check`, a build, `bun db:gen`, `bun db:mig`, an `orch` command or a git command
that writes. Edit no file under `packages/orch/src`. Each section names what to run.

## T1 The score table, and the help map
Read `packages/orch/src/commands/council.ts` and `packages/orch/src/table.ts`.
Create `packages/orch/test/council-scores-render.test.ts`. Import `renderScores` from
`../src/commands/council.ts` and `type ResultOf` from `../src/daemon/client/protocol.ts`. Use
```ts
type Scores = ResultOf<"council-scores">;
const review = (round: number, member: string, over: Partial<Scores["reviews"][number]> = {}): Scores["reviews"][number] => ({ round, member, score: null, problem: null, scoredAt: null, model: null, cost: null, ...over });
const scores = (reviews: Scores["reviews"], over: Partial<Scores> = {}): Scores => ({ name: "plan", directory: "/c/plan", scale: 10, closedAt: null, members: ["ada", "bea"], reviews, ...over });
```
Cases, in one `describe("council scores table", ...)`. Split each rendered string into lines
with `.split("\n")` and compare cells after `line.trim().split(/\s{2,}/)`.
- No round: `renderScores(scores([]))` is
  `"Council plan, open. Scores are out of 10.\nNo round has run."`.
- A closed council's first line is `"Council plan, closed. Scores are out of 10."`
  (`scores([], { closedAt: 5 })`).
- Two rounds: reviews
  `review(1, "ada", { score: 6, scoredAt: 2, model: "gpt-6-sol", cost: 0.1 })`,
  `review(1, "bea", { score: 8, scoredAt: 2, model: "opus", cost: 0.25 })`,
  `review(2, "ada", { score: 9, scoredAt: 4, model: "gpt-6-sol", cost: 0.2 })`,
  `review(2, "bea")`. Line 1 (the header) has cells `["MEMBER", "MODEL", "R1", "R2", "COST"]`.
  Line 3 has cells `["ada", "gpt-6-sol", "6", "9", "$0.30"]`. Line 4 has cells
  `["bea", "opus", "8", "running", "$0.25"]`. Line 5 has cells `["mean", "7.0", "9.0", "$0.55"]`.
  There are 6 lines.
- A file with no score: reviews
  `review(1, "ada", { problem: "the file has no `Score: <n>/10` line", scoredAt: 2 })` and
  `review(1, "bea", { score: 8, scoredAt: 2 })`. ada's row has cells `["ada", "-", "?", "-"]`,
  the mean row has cells `["mean", "8.0", "-"]`, and the last line is
  ``"Round 1, ada: the file has no `Score: <n>/10` line."``.
- A member with no review in a round shows a dash: reviews `review(1, "ada", { score: 5, scoredAt: 2 })`
  only; bea's row has cells `["bea", "-", "-", "-"]`.
Then the help map. `packages/orch/test/golden/help.txt` lists every command, and
`packages/orch/test/cli-help.test.ts` compares it to the registry. A `council` command was
added after `tile`. Run `bun test packages/orch/test/cli-help.test.ts`, read the line the
diff says is missing, and add exactly that line to `help.txt` directly after the `orch tile`
line (L44). Edit nothing else in that file.
Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json packages/orch/test/council-scores-render.test.ts
bun test packages/orch/test/council-scores-render.test.ts packages/orch/test/cli-help.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Scoring a finished run
Read `packages/orch/src/daemon/server/council.ts` (the functions `reviewOutcome` and
`scoreFinishedRun`), `packages/orch/src/store/council-rows.ts`,
`packages/orch/src/presence/history.ts` and `packages/orch/test/store-council-rows.test.ts`.
Create `packages/orch/test/council-score-run.test.ts`. Copy the imports, `dirs`, `afterEach`
and `fixture` from `packages/orch/test/store-council-rows.test.ts`. Add
`import * as fs from "node:fs";`, `import * as path from "node:path";`,
`import { scoreFinishedRun } from "../src/daemon/server/council.ts";`,
`import { flushPresenceHistory } from "../src/presence/history.ts";` and
`import type { RunRecord } from "../src/types/store.ts";`.
Write one helper:
```ts
/** A council under the temp dir with ada on it, round 1 asked for by dispatch d1. `file` is what ada wrote, or null for no file. Returns the orch dir and the round file's path. */
function asked(file: string | null): { dir: OrchDir; roundFile: string }
```
It calls `fixture()`, takes `const directory = path.join(dir, "councils", "plan")`, calls
`insertCouncil(dir, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, [{ agentId: "ada", name: "ada" }])`
and `askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 })`.
The round file is `path.join(directory, "ada", "round-1.md")`; when `file` is not null it makes
the directory with `fs.mkdirSync(..., { recursive: true })` and writes the file.
Use `const done: RunRecord = { dispatchId: "d1", agentKey: "ada", state: "done", startedAt: 3 };`,
`const good = "Score: 7/10\n\n## Improvements\n\n1. Tighten the intro.\n";` and
`const only = (dir: OrchDir) => councilReviewsOf(dir, "c1")[0];`.
Cases, in one `describe("scoring a finished council run", ...)`:
- A finished run stores the score in its file: after `scoreFinishedRun(dir, done, 9)` on
  `asked(good)`, `only(dir)` has `score: 7`, `problem: null`, `scoredAt: 9`.
- A member that wrote no file: on `asked(null)`, `only(dir)` has `score: null`,
  `problem: `the member wrote no ${roundFile}``, `scoredAt: 9`.
- A file with no score line: on `asked("no score here")`, `only(dir)?.problem` is
  ``"the file has no `Score: <n>/10` line"``.
- A run still going is left waiting: `scoreFinishedRun(dir, { ...done, state: "working" }, 9)`
  on `asked(good)` leaves `only(dir)?.scoredAt` `null`.
- A run that ended another way: `scoreFinishedRun(dir, { ...done, state: "error", finishedAt: 5 }, 9)`
  on `asked(good)` gives `score: null` and `problem: "the member's run ended error"`.
- A run that is no council round changes nothing and does not throw:
  `scoreFinishedRun(dir, { ...done, dispatchId: "other" }, 9)` on `asked(good)` leaves
  `only(dir)?.scoredAt` `null`.
- A review is scored once: after `scoreFinishedRun(dir, done, 9)` on `asked(good)`, write
  `"Score: 9/10\n\n## Improvements\n"` to `roundFile`, call `scoreFinishedRun(dir, done, 12)`,
  and `only(dir)` still has `score: 7` and `scoredAt: 9`.
- The score goes to the member's history: after `scoreFinishedRun(dir, done, 9)` on
  `asked(good)`, call `flushPresenceHistory()`, read
  `path.join(dir, "agents", "ada", "scores.jsonl")`, and `JSON.parse` of its one line equals
  `{ ts: 9, key: "ada", dispatchId: "d1", council: "plan", round: 1, member: "ada", score: 7 }`.
  Type the parsed value as `unknown`.
Run no test: these need a migration only the owner generates. Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json packages/orch/test/council-score-run.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
