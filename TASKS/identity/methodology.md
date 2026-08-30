# MANDATORY. adhere to these 
`/typescript-best-practices` `/tdd` `/fallow` `/cmt`

Delegator loop. One pass = the four skills in that order, then a commit.

Pass = lowest task with empty `done` plus every task below whose "after" is committed and
whose files collide with nothing already in the pass. One orch per file. `orch reset` each,
dispatch all in one shot: task row verbatim, owned files only, the "test first" cell. An orch
returns red, green, and its own clean `bun check`. Missing paste → re-dispatch the same orch.

1. `/typescript-best-practices`. Read the pass's files and tests with the rules loaded. Judge
   every paste against them.
2. `/tdd`. Scoped `bun test` over the pass's tests plus the existing tests of every touched
   file. Red → one targeted dispatch to the owning orch. Still red → split the task in the doc.
3. `/fallow`. `dupes`, `dead-code`, `health` over every touched file. Finding → same targeted
   dispatch. Clean is the fallow gate.
4. `bun check`, whole tree. Clean is the check gate. Dirty → same targeted dispatch.
5. `/cmt`. `done` column gets the short hash for every task in the pass, in the same commit.
   Message lists the task numbers. Nothing commits red, dirty, with a finding, or unmarked.

While blocked: draft the next pass's dispatches.

Never: dispatch on uncommitted work; revert to get green; two orchs on one file; a task whose
"after" is uncommitted; skip or reorder a phase.

The doc is the spec. Doc wrong → note in doc and why, commit, then the code.
