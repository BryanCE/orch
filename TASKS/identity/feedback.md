# Feedback from running the methodology

- 2026-08-30 pass 1. methodology.md "One orch per file" cannot be taken literally: task 16 touches ~8
  source files plus 10 fixtures for one rename, and a per-file orch can never go green on its own.
  Ran it as one orch per task (task = one owned file set). Suggest the line read "one orch per task;
  never two orchs on one file".
- 2026-08-30 pass 1. Task 0 as written deletes `launchKey`, which two task-3 files import, so pass 1
  would fail the whole-tree `bun check` gate by design. Kept the wrapper and noted why in the row.
  Suggest: when computing a pass, also check that no task in it removes a symbol a later task's file
  still imports.
- 2026-08-30 pass 1. Task 10 stays red until Bryan runs `bun db:gen`, but "nothing commits red" and
  "never dispatch on uncommitted work" together mean its files sit uncommitted while the next pass
  runs. The doc should say which one gives: commit 10's code red-but-typechecked, or hold 10 out of
  every pass until the migration exists.
- 2026-08-30. "`done` gets the short hash ... in the same commit" is impossible: the hash depends on
  the tree, and the tree would contain the hash. The doc row is marked in the next commit instead.
- 2026-08-30. Pass boundaries dissolved once "keep moving" allowed dispatch on uncommitted work: a
  whole-tree `bun check` is always red with a pane mid-TDD, so commits are per finished task set
  (files nobody else holds), with tc/lint judged outside in-flight files. Works, but the doc
  should say so.
- 2026-08-30. A test that reads `selfId()` with no launch credential falls through to the real
  `~/.orch` store when ORCH_DIR is not isolated and passes in a pane but fails in the delegator's
  Claude session (which is registered). `isolateOrchEnv` should also point ORCH_DIR at an empty
  temp dir, or every such test must (test/lock-holder.test.ts now does).

- 2026-08-30. `timeout 6 orch events --all --since-seq 0 --status done` printed nothing (26 agent
  records, none alive). The skill says a silent replay means the scope is wrong; here it seems to
  mean the old records carry no transitions. Either the skill's smoke test needs a caveat or replay
  should say "0 events" instead of nothing.

- 2026-08-30. orch. Workers under a Claude Code spawner still call `orch_send` and get the L6
  paragraph ("no live presence inbox ... do NOT route through another agent"). The spawner's
  unreachability is known at compose time (`spawnerRepliable: false`), so the fix is upstream:
  do not register `orch_send` for that worker at all, or refuse in one line. A paragraph the
  worker cannot act on is context spent on a dead end.
- 2026-08-30. Task 13's row named only `spawn.ts` and `lifecycle.ts` as `rpcHello` callers;
  `events.ts`, `lease.ts`, `queue.ts` also imported it. A task that renames an export should
  say "every importer (grep)" rather than list files, or the list is stale the day it's written.

GIT COMMIT IS NOT BEING RUN OFTEN ENOUGH 
