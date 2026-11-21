# W16: what the council verbs stand on

Context for every section. orch is getting a council: agents on different models that review
one subject and score it, round by round. Each member is a read-only agent: it has the tools
that read files and no shell, and it writes only in its own output directory. The four
sections touch different files and run at the same time. Paths are from the repo root
`/home/bryan/orch`. Code style: TypeScript, `node:` builtins only, no `as` casts, no `any`,
double quotes, a `/** ... */` doc comment on every export.

Never run `bun check`, a build, `bun db:gen`, `bun db:mig`, an `orch` command or a git command
that writes. Each section names what to run.

## T1 The `council` settings section
Add one settings section, `council`, with two keys. Mirror the `counts` section in every place
it appears; find them with
`grep -rn "counts" packages/orch/src/settings packages/orch/src/types/settings.ts`.
- `packages/orch/src/types/settings.ts`: after the `counts` member (L81) add
  `council: { directory: string; scale: number };`.
- `packages/orch/src/settings/schema.ts`: in `SETTINGS_DEFAULTS` after the `counts` line (L126)
  add `council: { directory: ".orch/councils", scale: 10 },`. In the zod schema after the
  `counts` block (L375-378) add
  ```ts
    /** Where a council keeps its files, and what its members score out of. */
    council: z.strictObject({
      directory: <the same schema `worktrees.directory` uses>.optional(),
      scale: PositiveInt.optional(),
    }).optional(),
  ```
- `packages/orch/src/settings/read.ts`: after the `counts` extractor (L265-268) add a `council`
  extractor of the same shape for `directory` and `scale`, and after
  `counts: settingsValueExtractors.counts(root),` (L309) add
  `council: settingsValueExtractors.council(root),`.
- `packages/orch/src/settings/registry.ts`: after the `"counts.peek"` line (L295) add
  ```ts
    "council.directory": "Where councils keep their files, under the directory a council is convened from. Each council has a directory there named for it.",
    "council.scale": "What a council member scores out of. A score is a whole number from 0 to this.",
  ```
- If `counts.tail` appears in any other file under `packages/orch/src` (a list of keys, a type
  table), add `council.directory` as a string and `council.scale` as a positive whole number
  beside it in the same way. Check with `grep -rn "counts.tail\|counts\.peek" packages/orch/src`.
- Every test file that holds a whole settings literal: run
  `grep -rln "counts: {" packages/orch/test`, and in each file add
  `council: { directory: ".orch/councils", scale: 10 },` on the line after the `counts: {...},` line.
Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test packages/orch/test/settings.test.ts packages/orch/test/settings-registry.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Tests for the council store rows
The tables `councils`, `council_members` and `council_reviews` are in
`packages/orch/src/db/schema.ts`, and `packages/orch/src/store/council-rows.ts` reads and
writes them. Read both, and `packages/orch/src/types/council.ts`. Edit neither.
Create `packages/orch/test/store-council-rows.test.ts`. Copy the imports, `dirs`, `afterEach`
and the shape of `fixture` from `packages/orch/test/store-read-only-rows.test.ts`. The fixture
inserts three agents with ids and names `lead`, `ada`, `bea`, each with its `agentHosts` row.
Use
```ts
const council: CouncilRecord = { id: "c1", name: "plan", directory: "/repo/.orch/councils/plan", convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null };
const ask = (dispatchId: string, member: string, round: number) => ({ dispatchId, councilId: "c1", round, member, askedAt: 2 });
```
Cases, in one `describe("council rows", ...)`. Each starts from a fresh `fixture()`.
- After `insertCouncil(dir, council, ["ada", "bea"])`: `councilAt(dir, council.directory)`
  equals `council`; `councilAt(dir, "/other")` is `undefined`; `councilMemberIds(dir, "c1").sort()`
  equals `["ada", "bea"]`.
- A second council in the same directory is refused:
  `insertCouncil(dir, { ...council, id: "c2" }, [])` throws.
- A member with no agent row stores nothing: `insertCouncil(dir, council, ["ghost"])` throws,
  and then `councilAt(dir, council.directory)` is `undefined`.
- `lastRound(dir, "c1")` is `0` before any review, and `2` after
  `askReview(dir, ask("d1", "ada", 1))` and `askReview(dir, ask("d2", "ada", 2))`.
- After `askReview(dir, ask("d1", "ada", 1))`: `waitingReview(dir, "d1")` equals
  `{ review: { ...ask("d1", "ada", 1), score: null, problem: null, scoredAt: null }, council }`,
  and `waitingReview(dir, "nope")` is `undefined`.
- A score settles a review once: after `scoreReview(dir, "d1", 9, { score: 7 })`,
  `councilReviewsOf(dir, "c1")` equals
  `[{ ...ask("d1", "ada", 1), score: 7, problem: null, scoredAt: 9 }]` and
  `waitingReview(dir, "d1")` is `undefined`. After `scoreReview(dir, "d1", 10, { problem: "x" })`
  the list is unchanged.
- A problem settles a review with no score: after `scoreReview(dir, "d1", 9, { problem: "the file has no Score line" })`
  the one review has `score: null`, `problem: "the file has no Score line"`, `scoredAt: 9`.
- One review per member per round: a second `askReview(dir, ask("d9", "ada", 1))` after
  `askReview(dir, ask("d1", "ada", 1))` throws.
- Reviews come back by round, then member: ask `("d1", "bea", 1)`, `("d2", "ada", 2)`,
  `("d3", "ada", 1)`; `councilReviewsOf(dir, "c1").map((review) => review.dispatchId)` equals
  `["d3", "d1", "d2"]`.
- A council closes once: after `closeCouncil(dir, "c1", 5)` and `closeCouncil(dir, "c1", 8)`,
  `councilAt(dir, council.directory)?.closedAt` is `5`.
Edit `packages/orch/test/store-rebuild-schema.test.ts`: in the table list (L23), after
`"agent_read_only"` add `"councils", "council_members", "council_reviews"`. In the index list
(L24), after `"one_agent_per_session"` add
`"one_council_per_directory", "members_by_council", "one_review_per_round"`.
Run no test: these need a migration only the owner generates. Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json packages/orch/test/store-council-rows.test.ts packages/orch/test/store-rebuild-schema.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 A read-only worker's header
The worker header tells an agent to run verify commands. A read-only agent has no shell, so
its header says what it is instead.
Edit `packages/orch/src/types/core.ts`: add `import type { ReadOnly } from "../policy/read-only.ts";`
and, in `WorkerHeaderContext` after `spawnerRepliable`, add
```ts
  /** Set for a read-only agent: it has no shell, so its header names no verify command. */
  readOnly?: ReadOnly;
```
Edit `packages/orch/src/worker-prompt.ts`:
- Add `import type { ReadOnly } from "./policy/read-only.ts";`.
- Replace the `WORKER_HEADER_BASE` constant and its doc comment's last line as follows. Keep
  the doc comment, and replace the constant with three:
  ```ts
  const WORKER_HEADER_LEAD = "[orch worker] No human watches you.";

  /** What a worker with a shell is told about verifying its own work. */
  const WORKER_HEADER_VERIFY = " Verify the files you edited before you report; a task that edits no file runs no verify command.";

  /** What every worker is told about orch's verbs and the size of its slice. */
  const WORKER_HEADER_RULES =
    " Every orch verb (spawn, dispatch, steer, close, reset, status) stays forbidden." +
    " Do the work yourself. A slice too big for one agent is reported back, not split by you.";
  ```
- After `verifyCommandsClause` add
  ```ts
  /** What a read-only worker is told in place of the verify rules: it has no shell to run them. */
  function readOnlyClause(readOnly: ReadOnly): string {
    return " You are read-only: you have the tools that read files, and no shell."
      + (readOnly.out === null ? " You change no file. Your final reply is your result." : ` You write files only inside ${readOnly.out}.`);
  }
  ```
- Replace the `return` statement of `workerHeaderFor` with
  ```ts
    if (context.readOnly !== undefined) {
      return WORKER_HEADER_LEAD + readOnlyClause(context.readOnly) + WORKER_HEADER_RULES + workerSpawnClause(false) + ask + spawner;
    }
    return WORKER_HEADER_LEAD + WORKER_HEADER_VERIFY + WORKER_HEADER_RULES
      + verifyCommandsClause(context.verifyCommands ?? [], context.cwd)
      + worktreeClause(context.worktreeBranch)
      + workerSpawnClause(context.maySpawn === true)
      + ask + spawner + gatedCommandsClause(context.gatedCommands ?? []);
  ```
- In `stripWorkerHeader`, replace `WORKER_HEADER_BASE` with `WORKER_HEADER_LEAD`.
Edit `packages/orch/src/daemon/server/agent-policy.ts`: add
`import type { WorkerHeaderContext } from "../../types/core.ts";` and, at the end of the file,
```ts
/** What a worker header says about `agentId` that only the store knows. */
export function storedHeaderContext(directory: OrchDir, agentId: string): Pick<WorkerHeaderContext, "readOnly"> {
  const readOnly = readOnlyOf(directory, agentId);
  return readOnly === null ? {} : { readOnly };
}
```
Edit `packages/orch/src/daemon/server/handlers/write.ts`, function `dispatch` (L326-331): add
`import { storedHeaderContext } from "../agent-policy.ts";` and replace its last line with
```ts
  const context = { ...worker.context, ...storedHeaderContext(state.directory, placedKey(state.directory, params.target)) };
  return writeText(state, "dispatch", { ...params, text: workerPrompt(params.text, false, adapter, context) });
```
Edit `packages/orch/src/daemon/server/work-loop.ts`: give `buildTaskHeader` a fourth parameter
`runnerId: string | undefined`, add `import { storedHeaderContext } from "./agent-policy.ts";`,
and in its `workerHeaderFor(...)` call add
`...(runnerId === undefined ? {} : storedHeaderContext(orchDir, runnerId))` as the last spread
of the context object. In `prepareTaskDispatch` pass `runnerId` as that fourth argument.
Edit `packages/orch/src/daemon/server/spawn/index.ts` L144: in the context object passed to
`workerPrompt`, add as the last spread
`...(plan.workers.readOnly === null ? {} : { readOnly: plan.workers.readOnly })`.
Edit `packages/orch/test/worker-prompt.test.ts`: add three tests to the existing `describe`.
- "a read-only worker is told what it is, and no verify command":
  `const header = workerHeaderFor(getAdapter("pi"), { readOnly: { out: null }, verifyCommands: ["bun check"], gatedCommands: ["git push"], maySpawn: true, worktreeBranch: "orch/a" });`
  It contains `"You are read-only: you have the tools that read files, and no shell. You change no file. Your final reply is your result."`,
  contains `"Never spawn subagents."`, and does not contain `"Verify"`, `"bun check"`,
  `"git push"` or `"worktree"`.
- "a read-only worker with an output directory is told where it writes":
  `workerHeaderFor(getAdapter("pi"), { readOnly: { out: "/repo/out" } })` contains
  `"You write files only inside /repo/out."` and does not contain `"You change no file"`.
- "a read-only header strips like any other":
  `stripWorkerHeader(workerPrompt("task", false, getAdapter("pi"), { readOnly: { out: null } }))`
  is `"task"`. Import `stripWorkerHeader` and `workerPrompt` if the file does not already.
Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json <the files you edited>
bun test packages/orch/test/worker-prompt.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Tests for the council's paths and its member prompt
Read `packages/orch/src/council/layout.ts`, `packages/orch/src/council/prompt.ts` and
`packages/orch/src/council/round-file.ts`. Edit none of them.
Create `packages/orch/test/council-prompt.test.ts` with two `describe` blocks.
`describe("council layout", ...)`:
- `councilDirectory("/repo", ".orch/councils", "plan")` is `"/repo/.orch/councils/plan"`, and
  `councilDirectory("/repo", "/var/councils", "plan")` is `"/var/councils/plan"`.
- `memberDirectory("/c/plan", "ada")` is `"/c/plan/ada"`, and `roundFilePath("/c/plan", "ada", 2)`
  is `"/c/plan/ada/round-2.md"`.
- `COUNCIL_NAME` matches `"plan-review"`, `"ui_2"` and `"A1"`, and does not match `""`,
  `"-plan"`, `"a/b"`, `".."`, `"a b"`. Use `test.each`.
`describe("council member prompt", ...)`, with
`const round = { council: "/c/plan", member: "ada", others: ["bea", "cy"], round: 1, scale: 10, subject: "Review plan.md." };`:
- Round 1: `memberPrompt(round)` starts with `"You sit on a council that reviews one subject."`,
  contains `"Review plan.md."`, contains
  `"Write your review to /c/plan/ada/round-1.md in exactly this layout:"`, contains
  `roundFileLayout(10)`, contains `"10 means you would change nothing."`, and does not
  contain `"bea"`.
- Round 2: `memberPrompt({ ...round, round: 2 })` starts with
  `"Round 2 of the council. The subject changed after round 1."`, contains
  `"- /c/plan/bea/round-1.md\n- /c/plan/cy/round-1.md"`, contains `"/c/plan/ada/round-2.md"`,
  and does not contain `"/c/plan/ada/round-1.md"`.
- Round 2 with no other member: `memberPrompt({ ...round, round: 2, others: [] })` does not
  contain `"other members"`.
- What the prompt asks for is what the reader takes: build
  `const written = roundFileLayout(10).replace("<a whole number from 0 to 10>", "7");` and
  expect `parseRoundFile(written, 10)` to equal
  `{ ok: true, review: { score: 7, improvements: ["<the change that would raise the score most>", "<the next one>"] } }`.
Run, once, after the edits:
```
bunx oxlint -c packages/orch/.oxlintrc.json packages/orch/test/council-prompt.test.ts
bun test packages/orch/test/council-prompt.test.ts
```
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
