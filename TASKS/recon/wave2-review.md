# Wave 2 review

## Slice A — store row modules: ISSUES

The core shapes mostly follow the DDL: `insertAgent` copies the parent's materialized root; interval moves and lease transfers use transactions; lease acquisition/transfer inserts rows; task claims are inserts; timestamps are numeric; and statements bind values in the same `query(...).run(...)` style as `spawned-rows.ts`.

### Implementation issues

- `src/store/task-rows.ts:29-32` — `settleAttempt` invents `until` with `Date.now()` instead of accepting the event instant. This prevents spec-derived exact values at the module seam and can violate `until > since` when callers supply a future/test clock. **Smallest fix:** accept an `until` argument (default only at the outer boundary if required), bind it, and assert the stored value.
- `src/store/agent-rows.ts:47-92` — the module has no row seam for `agent_worktrees`, although §4/§5 explicitly models “no row = repo; row = worktree with path and branch.” **Smallest fix:** add insert/select functions and seam tests for absent and present worktree rows.
- `src/store/agent-rows.ts:47-83` — §6a says names are mutable and non-unique, but this module exposes neither rename nor a duplicate-name test. **Smallest fix:** add an id-keyed rename operation and prove two agents may share a name.
- `src/store/lease-rows.ts:37-42` — fencing-token monotonicity is inferred by selecting the greatest current id after insert. The test only proves increasing ids while both rows remain; it does not prove a token is never reused after the highest row is deleted/cascaded. **Smallest fix:** make the schema/allocation mechanism guarantee never-reused global tokens, then test delete/reap followed by acquire. (This may require reconciling the authoritative DDL, whose plain `INTEGER PRIMARY KEY` also permits reuse of a deleted maximum.)
- `src/store/task-rows.ts:15-16,19,51-59,69` — pervasive `any` raw rows/scopes make malformed values invisible to the module seam, unlike the explicit raw-row mapping style in `spawned-rows.ts`. **Smallest fix:** define raw task/attempt/intake interfaces and narrow the scope union without `as any`.

### Specified behavior with no adequate test

- `test/store-agent-rows.test.ts:16` — no test that an unknown `spawnedBy` is rejected; the only FK rejection test is for a harness.
- `test/store-agent-rows.test.ts:16-22` — no test for worktree absent/present shape, duplicate legal names, rename without identity change, label/null mapping, or exact integer storage for `created_at`/`ended_at`.
- `test/store-interval-rows.test.ts:14` — atomic rollback is tested only through the generic handle helper. There is no history assertion proving successful process/space/tuning moves close the predecessor at exactly the successor's `since`; current-row-only assertions can pass while history is wrong.
- `test/store-interval-rows.test.ts:14-20` — no test for closed-interval overlap rejection, process restart history, handle history, space move history, tuning history, nullable `start_token`, or SQLite integer/null storage (rather than booleans/sentinels).
- `test/store-lease-rows.test.ts:23-24` — handoff/adoption tests do not assert row count, prior row contents, or a strictly newer fencing id, so “insert, never overwrite” is only indirectly covered. No rollback test proves close+insert is one transaction when the successor insert fails.
- `test/store-lease-rows.test.ts:20-27` — no test for adoption when already unleased, wrong-holder release/handoff rejection, exact `since`/`until`, or token non-reuse after deletion.
- `test/store-task-rows.test.ts:27-31` — I7 requires **two concurrent claims** with one winner and one raised constraint error. This test performs two sequential calls, so the specified race is untested.
- `test/store-task-rows.test.ts:32-36` — I6 does not inspect attempts, so it does not prove the failed X attempt remains and retry Y is a new row with its own dispatch/id/times. It also has no outside-pack agent proving pack scope excludes unrelated agents.
- `test/store-task-rows.test.ts:38-45` — no exact settlement `until`, failed-attempt error/history read, successful null-error shape, or `attemptsOf` mapping/order test.
- `test/store-task-rows.test.ts:21-56` — no tests for queued/claimed/failed/done/cancelled view precedence as a complete state table; agent-scope and pack-scope discovery; invalid typed FK scope; JSON option round-trip; duplicate/open intake rejection; intake half-open history; or integer/null storage for task, attempt, cancellation, and intake instants.
- ADR-0002 says task text/options are editable by the enqueuer while unclaimed; `src/store/task-rows.ts` has no edit operation and `test/store-task-rows.test.ts` has no queued-vs-claimed edit test.

## Slice B — `caps` → `capabilities`: ISSUES

- `packages/web/src/server/orch.ts:56,64-65,95` — the daemon status wire reader still declares and reads `row.caps`. The producer now emits `StatusRow.capabilities`, so the web will receive `undefined` and render every agent as capless. **Smallest fix:** rename the wire field and read to `capabilities` with no compatibility fallback.
- `test/control-dispatch.test.ts:134-140` — the declaration was renamed only on the right-hand side; lines 135, 136, and 140 reference nonexistent `capabilities` instead of local `caps`. **Smallest fix:** keep the intentionally untouched local named `caps` and use `caps.steer` on all three lines.
- The required column-width locals remain untouched at `src/table.ts:3`, `src/commands/queue.ts:15`, and `src/commands/status.ts:251,471` (current line positions). No remaining `.caps` capability-object reads were found outside the missed web wire reader above.

## Slice C — M9 status scoping: ISSUES

- `src/commands/status.ts:214-219` — default status correctly no longer filters to the caller's workspace.
- `src/commands/status.ts:232` and `src/commands/status.ts:404-410` — `--workspace` is not accepted or represented in `scopeFleetRows`, so explicit workspace narrowing does not exist. `cmdStatus` likewise accepts no such option at `src/commands/status.ts:425-426`. **Smallest fix:** parse `--workspace <id>` in both local/merged paths, add an optional workspace criterion to `scopeFleetRows`, and add tests that default spans `w1/w2` while `--workspace w1` returns only `w1`.
- No status/read change loosens a write gate; the M9 edit is confined to read filtering/rendering.

## OVERALL — must fix before gates

1. Repair the broken `test/control-dispatch.test.ts` local rename and finish the web wire rename.
2. Restore explicit `status --workspace` narrowing while retaining cross-workspace default reads.
3. Make settlement time caller-controlled and close the store module gaps (especially worktrees, rename/edit seams, and fencing-token non-reuse).
4. Expand the seam tests listed above; in particular add a real concurrent I7 claim test, inspect I6 attempt history/scope, and prove transactional rollback for lease transfers.
