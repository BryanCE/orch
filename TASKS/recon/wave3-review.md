# Wave 3 verification

Read-only verification of the landed wave-3 diffs against `TASKS/01-agent-model.md`, `TASKS/02-scope.md`, and `TASKS/06-schema.md`. No gates were run.

## Slice A — worker-park: PASS

`src/worker-prompt.ts:30-57` composes the no-reachable-spawner finish/write-result/END instruction, and the reachable path limits reporting to `orch_send target "spawner"` and forbids sibling relaying. Capability composition remains adapter-gated (`pi` gets the inbox clause; `codex` does not). `test/worker-prompt.test.ts:41-61` pins both variants and the no-relay text.

## Slice B — retention windows: ISSUES

1. **Stale removed fields remain in the work-loop renderer.** `src/daemon/work-loop.ts:202` still interpolates `counts.identities` and `counts.agent_dirs`, but `SweepCounts` now has only `ended_agents`. This is a type/check failure and produces undefined labels at runtime. **Smallest fix:** render `ended_agents=${counts.ended_agents}` and remove the two old fields.
2. **Existing config tests still assert the retired shape.** `test/config.test.ts:78-100,181` still writes/expects `identities_days` and `agent_dirs_days`; those strict settings files now reject the test input and the expected default object is wrong. **Smallest fix:** replace both keys with `ended_agents_days` and update the expected normalized object.
3. **The ended-agent count double-counts one logical agent.** `src/daemon/retention.ts:38-45` adds deleted agent rows to deleted presence directories. When one ended agent has both, `ended_agents` reports `2` for one agent. **Smallest fix:** count unique ended-agent keys (or define the count as one row per logical agent) while deleting both artifacts.

The defaults/schema and individual fallback test are otherwise correct (`src/config.ts:60-63,125-138,334-341`; `test/retention.test.ts:53-65`), and queue deletion remains settled-only (`src/store/queue-rows.ts:123-126`), preserving Cq10.

## Slice C — retention result-instant fix: PASS

`src/presence/store.ts:205-214` independently collects status and result timestamps, so a malformed/invalid status cannot suppress a valid `result.json` instant. `test/retention.test.ts:139-147` overwrites status with invalid data, supplies a recent result `finishedAt`, ages the directory mtime, and asserts retention.

## Slice D — close-killpath: ISSUES

1. **Live production statuses do not carry the token close now requires.** `src/commands/lifecycle.ts:397-400,409-412,423-430` only obtains `startToken` from status JSON and refuses a live target without it. The shared presence state built in `src/agent/presence.ts:145-174` never writes `startToken`; normal live headless/pane agents therefore cannot be directly killed and are left unreaped. **Smallest fix:** persist the launch `(pid,start_token)` in the current process/agent record and have close read that authoritative pair (or stamp it in the current presence writer), then call `processInstanceMatches` before SIGTERM.
2. **`--force` is still accepted by close.** `src/commands/lifecycle.ts:370-374` includes `--force` in `splitOptionFlags`, silently accepting a retired close option. The usage text omits it, but the parser still gives it close semantics. **Smallest fix:** remove `--force` from close's accepted flags and keep the close usage/tests free of it (or explicitly test it as invalid, not ignored).
3. **Failed-kill behavior lacks a regression test.** The implementation reports and skips reaping at `src/commands/lifecycle.ts:440-442`, but `test/close-always.test.ts` and `test/owner-scoping.test.ts` do not force `process.kill` failure and assert the registry/presence remain. **Smallest fix:** add a command-seam case with a live matching pid and injected/known failing kill, asserting nonzero/report and no reap.

The owner-gate regression matrix is present at `test/owner-scoping.test.ts:160-180`, and close/abort foreign-owner success coverage is present in `test/close-always.test.ts:92-116`.

## Slice E — schema-tests strengthening: ISSUES

1. **The sqlite_master inventory is not exact.** `test/store-rebuild-schema.test.ts:29-37` deliberately excludes the legacy `queue`, `ownership`, `outbox`, `spawned`, `catalogues`, `events`, and `runs` objects before comparing sets. Those objects are still created by `src/store/schema.ts:98-110`, so the test cannot catch the dual legacy/rebuild schema. **Smallest fix:** assert the complete table/index/view/trigger inventories with no legacy exclusion, and remove superseded DDL from `CORE_TABLE_DDL`.
2. **Per-table literals are only checked for four of twenty tables.** `test/store-rebuild-schema.test.ts:46-56` covers `agents`, `agent_leases`, `tasks`, and `task_attempts`; wrong columns/types/nullability in the other sixteen tables pass. **Smallest fix:** add spec-literal `PRAGMA table_info` expectations for all twenty tables.
3. **CHECK coverage is not the remaining full family.** `test/store-rebuild-schema.test.ts:119-133` checks a subset (host OS, one interval, lease, task scope/attempt), but not every interval/table CHECK and does not assert every documented family. **Smallest fix:** parameterize each documented CHECK family from `TASKS/06-schema.md`, including all interval `until > since`, lease consistency, task exactly-one scope, and attempt outcome/result/error constraints.
4. **The implementation is not spec-literal for the fencing key.** `src/store/schema.ts:85` declares `agent_leases.id ... PRIMARY KEY AUTOINCREMENT`, while `TASKS/06-schema.md` specifies `INTEGER NOT NULL PRIMARY KEY`; the current tests' `table_info` assertion cannot detect this SQL difference. **Smallest fix:** reconcile the DDL/spec decision and assert the exact sqlite_master SQL (or document/update the authoritative spec if AUTOINCREMENT is now intended).

The all-ten trigger/index parameterized loops and `user_version = 6`/`foreign_keys = 1` checks are present (`test/store-rebuild-schema.test.ts:58-88,40-44`).

## Slice F — status truth: ISSUES

1. **`backendAnswered` still is not based on inventory attempts.** `src/commands/status.ts:189-205` derives it from `rows.some(row.backend != null)`. Empty successful inventory is indistinguishable from no attempt, while a presence-only row gets `backend` from the registry in `src/entities.ts:129-145` and can falsely report “yes.” The merged remote path repeats the same row heuristic at `src/commands/status.ts:483-487`. **Smallest fix:** carry an explicit per-backend inventory-attempt/answered bit (including successful empty responses) through local/daemon/remote status snapshots; do not infer it from row content.
2. **The required command-seam coverage is absent.** `test/commands-status.test.ts:19-35` tests formatting helpers only; no `cmdStatus` invocation controls backend/RPC inventory outcomes, checks the no-row message, or exercises a dead stale row through both JSON and table output. **Smallest fix:** add command-seam tests for backend answered/not-answered (including empty inventory) and a dead `alive:false,state:"working"` row in `--json` and table modes.
3. **Boundary normalization marks no-presence backend rows exited.** `src/commands/status.ts:367-377` passes `presence?.alive ?? false` into `displayStatusState`, so a live backend inventory row with no bridge presence is normalized to `exited` rather than retaining its backend/session fallback state. **Smallest fix:** distinguish unknown/no-presence liveness from a known dead presence before forcing `state: "exited"`.

The shared row normalization itself is wired into local and remote JSON/table paths (`src/commands/status.ts:174-180,238-240,458-462`).

## OVERALL — must-fix list

- Update `work-loop.ts` and all config tests for the removed retention keys; avoid double-counting one ended agent.
- Persist/read a real process start token for close, remove `--force` from close parsing, and add failed-kill/no-reap coverage.
- Remove the legacy schema from the current DDL and make schema tests truly exact across all inventories, all table columns, and all CHECK families; reconcile the AUTOINCREMENT mismatch.
- Track backend inventory response metadata explicitly and add command-seam status tests; preserve unknown/no-presence backend state instead of displaying it as exited.
