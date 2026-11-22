# W18: tests and docs that finish the council

Context for every section. orch has a `council` command: `orch council convene|round|scores|close`.
orchd's handlers are in `packages/orch/src/daemon/server/council.ts`, the command is
`packages/orch/src/commands/council.ts`, the store module is
`packages/orch/src/store/council-rows.ts`. Paths are from the repo root `/home/bryan/orch`.

Rules for every section: never `cd`. Run no `orch` command, no build, no `bun db:*`, no git
command that writes. Edit only the files your section names. No `as` casts, no `any`. No
parentheses in a string a test expects from the program unless the section gives that string.
Verify means: `bun test <the test file you wrote>` once from the repo root, then
`bun check` once, and both are clean for your files.

## T1 Test the council handlers on a seeded store
Create `packages/orch/test/council-handlers.test.ts`. Model the imports and the cleanup on
`packages/orch/test/council-score-run.test.ts`, which seeds the same tables.

Fixture, one function `seeded(members: string[])` returning `{ dir, state, directory }`:
- `dir = tempOrchDir("orch-council-handlers-")`, pushed on a `dirs` array that `afterEach`
  empties with `removeTempDir` after `closeAllStores()`.
- `ensureHarness(dir, "pi", "pi", 1)` from `../src/store/agent-rows.ts`.
- For `"lead"` and each name in `members`:
  `insertAgent(dir, { host: hostIdentity(), id: name, name, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 })`.
- `directory = path.join(dir, ".orch", "councils", "plan")`.
- `insertCouncil(dir, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, members.map((name) => ({ agentId: name, name })))`.
- `state = idleDaemonState(testServices({ orchDir: dir, settings: { defaults: { adapter: "pi", backend: "headless" } } }), dir)`
  from `./helpers/daemon-state.ts` and `./helpers/services.ts`.

Every request below uses `ref = { name: "plan", cwd: dir }`.

Cases, one `test` each, in `describe("the council handlers")`:
1. "scores refuses a council that was never convened": `seeded([])`, then
   `expect(() => councilScores(state, { name: "ghost", cwd: dir })).toThrow("no council named ghost was convened here")`.
2. "scores joins each review with its run": `seeded(["ada", "bea"])`.
   `askReview(dir, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 })`, the
   same for `"d2"` and `"bea"`. `scoreReview(dir, "d1", 5, { score: 7 })`.
   `upsertRun(dir, { dispatchId: "d1", agentKey: "ada", state: "done", startedAt: 3, model: "m1", cost: 0.5 })`
   from `../src/store/run-rows.ts`. Then `councilScores(state, ref)` equals
   `{ name: "plan", directory, scale: 10, closedAt: null, members: ["ada", "bea"], reviews: [
   { round: 1, member: "ada", score: 7, problem: null, scoredAt: 5, model: "m1", cost: 0.5 },
   { round: 1, member: "bea", score: null, problem: null, scoredAt: null, model: null, cost: null } ] }`.
3. "a round waits for the one before it": `seeded(["ada"])`, `askReview` for `"d1"`, `"ada"`,
   round 1. `await expect(councilRound(state, { ...ref, subject: "go" })).rejects.toThrow("round 1 of council plan is still running. Not finished: ada")`.
4. "a closed council takes no round": `seeded(["ada"])`, `closeCouncil(dir, "c1", 9)`.
   `await expect(councilRound(state, { ...ref, subject: "go" })).rejects.toThrow("council plan is closed")`.
5. "a council with no member running takes no round": `seeded([])`.
   `await expect(councilRound(state, { ...ref, subject: "go" })).rejects.toThrow("council plan has no member still running")`.
6. "close with no member running closes the council": `seeded([])`.
   `expect(await closeCouncilNamed(state, ref)).toEqual({ closed: [] })`, then
   `expect(councilAt(dir, directory)?.closedAt).not.toBeNull()`.

Verify: packages/orch/test/council-handlers.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Test the council command against an in-process orchd
Create `packages/orch/test/council-command.test.ts`. Model the setup on the test
"runs --json" region of `packages/orch/test/commands-runs.test.ts` (L78 to L105): it sets
`process.env.ORCH_DIR` to a `tempOrchDir`, calls `writeSettingsFixture`, builds services with
`servedServices(..., servers)`, and captures output with `captureStdout` from
`./helpers/stdout.ts`. Copy its `beforeEach` and `afterEach` harness-session isolation, and in
`afterEach` also close every server, call `closeAllStores()`, restore `ORCH_DIR`, and remove
the temp dirs.

Use the settings body `{ enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } }`
for both `writeSettingsFixture(root, body)` and `servedServices({ orchDir: root, settings: body }, servers)`.

Seeding, before `servedServices`, with `root` as the orch dir:
- `ensureHarness(root, "pi", "pi", 1)`, then `insertAgent(root, { host: hostIdentity(), id, name: id, spawnedBy: null, harnessId: "pi", cwd: root, createdAt: 1 })` for `"lead"`, `"ada"`, `"bea"`.
- `const directory = path.join(root, ".orch", "councils", "plan")`.
- A helper `council(members: string[])` that calls
  `insertCouncil(root, { id: "c1", name: "plan", directory, convenedBy: "lead", scale: 10, convenedAt: 1, closedAt: null }, members.map((name) => ({ agentId: name, name })))`.

Every command passes `--dir`, root. Cases, one `test` each, in `describe("orch council")`:
1. "scores prints a row per member and a column per round": `council(["ada", "bea"])`.
   `askReview(root, { dispatchId: "d1", councilId: "c1", round: 1, member: "ada", askedAt: 2 })`, the
   same with `"d2"` and `"bea"`. `scoreReview(root, "d1", 5, { score: 7 })`.
   `output = await captureStdout(() => cmdCouncil(services, ["scores", "plan", "--dir", root]))`.
   Expect `output` to contain `"Council plan, open. Scores are out of 10."`, to match
   `/ada\s+-\s+7\s/`, and to match `/bea\s+-\s+running\s/`.
2. "scores --json prints the reviews": same seeding. Run with `["scores", "plan", "--dir", root, "--json"]`.
   `JSON.parse(output)` matches the object `{ name: "plan", scale: 10, members: ["ada", "bea"] }`
   and its `reviews` has length 2.
3. "close with no member running says so": `council([])`.
   `output` of `["close", "plan", "--dir", root]` is exactly
   `"Closed council plan. No member was still running.\n"`.
4. "scores names a council that was never convened": `council([])`. Running
   `cmdCouncil(services, ["scores", "ghost", "--dir", root])` rejects with an error whose message
   contains `"no council named ghost was convened here"`.
5. "convene needs a subject": `council([])`.
   `await expect(cmdCouncil(services, ["convene", "next", "ada", "--model", "luna"])).rejects.toThrow("say what it is with --prompt")`.
6. "round needs its text": `council([])`.
   `await expect(cmdCouncil(services, ["round", "plan"])).rejects.toThrow("usage:")`.

If case 4, 5 or 6 does not reject and sets an exit code instead, report the exact output in
your report line and leave that case out.

Verify: packages/orch/test/council-command.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 Docs for the read-only agent and the council
Four files. Text only, no code. Do not reflow lines you do not change.

Edit `packages/orch/help/spawn.md`: after the trap that begins "- Give edits to the same files
to one agent." and its continuation lines, before the trap that begins
"- `--worktree-provider worktrunk`", insert:

```
- `--read-only` starts an agent that reads and replies: it keeps its harness's read tools and
  orch's own, with no shell, no MCP tool and no extension tool. `--out <dir>` also lets it
  write files in that one directory, one value for all or one per name in order. Reach for it
  on a lookup or a review. pi, omp and claude can run one; a harness that cannot is refused.
```

Edit `packages/orch/skills/orch/reference/commands.md`: in the table, after the row that
begins "| Fan-out where any idle agent may take any task", insert these two rows:

```
| A lookup or review that must change nothing, `--read-only`, `--out` | `orch help spawn` |
| Several models scoring one plan, UI or change, round by round | `orch help council`, the `council` skill |
```

Edit `packages/orch/README.md`:
- In the command table, change the row
  `| Queue | `queue add\|list\|history\|cancel\|edit`, `work`, `review` |` by adding one row under it:
  `| Council | `council convene\|round\|scores\|close` |`
- In the list under "Some useful ones:", after the line that begins
  "- `orch spawn <names> --worktree`", add:
  "- `orch spawn <names> --read-only`: agents that read and reply, with no shell, for lookups and reviews"
  "- `orch council convene <council> <members>`: several models score one subject, round by round"

Edit `council/README.md`:
- Replace the paragraph that begins "A council's rounds and its close belong to the agent
  that convened it" (it ends "is what the reader parses.") with:

```
Who may send a round is who may drive the members, and who may close the council is who may
close them: the agent that convened it, an agent that adopted its members, and the human. A
round that one member refuses still goes to the others, and the command says who it did not
reach and why. orch owns the member prompt and the round-file layout in `src/council/`, so
what a member is told to write is what the reader parses.
```

- Replace the whole "## Waiting on Bryan" section body (the two bullets) with the one bullet:

```
- `bun run build:orch:dev`, then a first real council to try the verbs end to end.
```

Verify: packages/orch/help/spawn.md packages/orch/skills/orch/reference/commands.md packages/orch/README.md council/README.md
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
