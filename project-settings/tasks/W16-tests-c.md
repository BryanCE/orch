# W16: the header's rules come from the agent's host and project

Context. orch now has a project settings file per project directory, `<dir>/.orch/settings.json`,
whose keys override the install file. The worker header's verify and gated commands are the
target agent's project's: the CLI sends a header context with no rules
(`workerHeaderContextOf` in `packages/orch/src/policy/spawner.ts` returns no `verifyCommands`
or `gatedCommands`), and orchd composes the header where the agent runs. For an agent on a
linked host, this orchd sends `peer-drive` a dispatch with the raw text and a `worker` field,
and the far orchd composes with its own project rules. Paths are from the repo root
`/home/bryan/orch`; tests are in `packages/orch/test/`. No `as` casts, no `any`. A test writes
only inside temp directories it made.

## T1 The far host composes; the CLI sends no rules
Edit `packages/orch/test/hosts-link.test.ts`. Read its `farAgent(...)` and `nearDriving(...)`
helpers and `./helpers/far-orchd.ts` first, to learn the far agent's working directory (the
`cwd` it is registered with). Add a test beside
"a dispatch to an agent on a linked host is delivered by that host's orchd, and nothing is queued here":
"a worker dispatch to a linked agent is composed there, with that host's project rules":
- Start the far orchd and its agent as that test does. Write
  `writeProjectSettingsFixture(<the far agent's cwd>, { workers: { verify_commands: ["far-check"] } })`
  (import it from `./helpers/settings.ts`). If the far agent's cwd is not a temp directory the
  test owns, register the far agent with a fresh `tempOrchDir("orch-far-project-")` as its cwd
  (pushed onto `otherDirs`), the way `farAgent` registers one, and use that.
- `const answer = await dispatch(near.state, { target: key, text: "do the far thing", worker: { harness: "pi", context: { maySpawn: false } } });`
- `selectOutboxMessage(far.orchDir, answer.id)`'s `payload.text` contains `far-check`, contains
  `[orch worker]`, and ends with `do the far thing`. If the payload's type needs narrowing to
  read `text`, narrow it with `payload.action === "dispatch"` (or the field the existing test
  matches), not a cast.
Edit `packages/orch/test/worker-prompt.test.ts`: add a test
"the context a caller sends carries no rules": build a `CallerSelf`-shaped value the way any
existing test in `packages/orch/test/` that calls `workerHeaderContextOf` does (grep for it;
if none does, use `{ id: "caller", depth: 0 }` plus whatever fields the `self` result type in
`packages/orch/src/daemon/client/protocol.ts` requires, built in full), and a settings value
from `testServices({ orchDir, settings: { workers: { verify_commands: ["bunx oxlint"] } } }).settings.current()`
over a fresh `tempOrchDir`. `const context = workerHeaderContextOf(self, settings, undefined)`:
`"verifyCommands" in context` is false and `"gatedCommands" in context` is false.
Verify: packages/orch/test/hosts-link.test.ts packages/orch/test/worker-prompt.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
