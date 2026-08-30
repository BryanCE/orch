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
- 2026-08-30. `bun db:gen` is not idempotent: it wipes `drizzle/` and drizzle-kit stamps a new
  timestamp+name every run, schema unchanged or not. A store built from the previous tag then fails
  to open ("does not match orch's migrations"), and the only way out is another `db:reset`. Fix in
  `scripts/db/generate.ts`: diff the emitted `migration.sql` against the existing one and keep the
  old folder when they match. Until then: gen → reset, once, and never gen after reset.
- 2026-08-30. `timeout 6 orch events --all --since-seq 0 --status done` printed nothing (26 agent
  records, none alive). The skill says a silent replay means the scope is wrong; here it seems to
  mean the old records carry no transitions. Either the skill's smoke test needs a caveat or replay
  should say "0 events" instead of nothing.
