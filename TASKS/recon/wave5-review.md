# Wave 5 Review

## 1. Retention — ISSUES

- **Ended-agent retention can orphan the spawn registry.** `src/daemon/retention.ts:12-17` deletes expired rows from `agents`, then `reapDeadPresenceDirs()` only removes `spawned`/ownership rows when a presence directory exists (`src/presence/store.ts:216-224`). An ended agent with no `agents/<key>/` directory leaves its `spawned` row/name reservation behind. **Smallest fix:** when deleting an expired agent row, also remove its spawned/owner registry through the owning reap path (or explicitly delete those rows via `reapSpawnedRecord`). Add a no-presence regression test.
- The positive retention tests do prove one logical agent is counted once (`test/retention.test.ts:118-135`), but they do not cover the no-presence orphan case above.

## 2. Bridge lock — ISSUES

- **The required broken-settings behavior is failing.** `test-results.md:552-555` records `test/cmd-lock-bridge.test.ts` resolving instead of rejecting for malformed `settings.json`; the test expects the settings path at `test/cmd-lock-bridge.test.ts:137-142`. `src/agent/tools.ts:374-387` should propagate a present settings parse error through the interception handler. **Smallest fix:** make the bridge's locked-command lookup call the throwing settings loader for an existing file (only a missing file may mean no patterns), then retain the regression test.
- The acquire/release and non-match tests themselves are substantive (`test/cmd-lock-bridge.test.ts:84-131`).

## 3. Store reopen / schema — ISSUES

- **The store still creates two schemas.** `src/store/schema.ts:9-39` keeps legacy `ownership`, `outbox`, `spawned`, `catalogues`, `events`, and `runs` DDL alongside the normalized rebuild DDL at `src/store/schema.ts:45-74`. `test/store-rebuild-schema.test.ts:29-37` explicitly excludes those legacy names, so the test is tautological and cannot catch the Rule 8 violation. **Smallest fix:** remove superseded DDL (or make the current shape explicit) and assert the complete sqlite_master inventory without a legacy exclusion.
- `test/store-events.test.ts:37-47` does provide real close/reopen sequence coverage, and `src/store/connection.ts:107-125` correctly avoids replaying non-idempotent DDL on a cached/current connection.
- **Reference docs carry the wrong schema stamp and retired queue model.** `docs/reference/store.md:100-113` says `STORE_SCHEMA` is 5 while `src/store/schema.ts:6` is 6, and documents `queue`/`queue-rows.ts` even though the current normalized table is `tasks` and no `src/store/queue-rows.ts` exists. **Smallest fix:** update the reference to the implemented schema and table owners in the same change.

## 4. Herdr tests / launch — ISSUES

- **The herdr test suite has a broken named import.** `test-results.md:434-440` reports `Export named 'herdrVersion' not found in .../src/backends/herdr/cli.ts`; `src/backends/herdr/index.ts:9-11` imports `herdrVersion`, while `src/backends/herdr/cli.ts:103-113` exports `version`. **Smallest fix:** use one exported name at the import boundary and rerun the backend-herdr tests.
- **A failed `agent start` leaks the newly opened pane.** `src/backends/herdr/index.ts:157-173` closes the pane only when rename throws; errors from `agent start` or `reseatIntoGroup` escape without cleanup. **Smallest fix:** wrap all post-open operations in one try/catch and close the handle on every failure.
- The argv assertions in `test/herdr-notify-hardening.test.ts:85-105` do verify the canonical `agent start ... --kind ... --pane ...` shape and blank-id fallback, but they use mocked command responses and cannot catch the real export mismatch.

## 5. Gate-mechanical / pack cap — ISSUES

- **The boundary tests are arithmetic tautologies, not gate tests.** `test/spawn-limits.test.ts:67-92` proves expressions such as `5 + 2 > 6` and `3 + 2 < 12`; none invokes `spawnPolicyError`, `assertSpawnCapacity`, or `cmdSpawn`. **Smallest fix:** drive the policy/cap function with fixtures and assert refusal/acceptance plus no backend/name/worktree/queue mutation.
- **The current recorded gate run is red on the pack-cap shape.** `test-results.md:796-829` shows `test/spawn-limits.test.ts` expected objects missing `pack_cap`/`max_agents`, while `loadConfig()` returned them. **Smallest fix:** make every expected normalized fleet object include `pack_cap: 10` and explicitly-undefined `max_agents` where applicable.
- `test/config.test.ts:87-100,173-181,374` is similarly reported failing in `test-results.md:961-1095`; synchronize those expectations with the same current fleet shape rather than weakening the assertions.

## 6. Headless keys — ISSUES

- **The 3-segment identity contract is not applied throughout the tests.** `test/backend-headless.test.ts:95-109,112-133,135-162` passes plain keys (`fake-1`, `round-trip`, `codex-tail`, `fake-2`) into `HeadlessBackend.spawn()`. `registerSpawnedAgent()` now parses the key, and `test-results.md:390-429` records the resulting `malformed identity key: expected 3 segments` failures. **Smallest fix:** use `serializeIdentity({ backend: "headless", workspace: "test", id: ... })` for every spawned fixture; do not relax production parsing (the slice explicitly requires no production identity change).
- `src/backends/headless/index.ts:194-220` launches the child before `insertSpawnedRecord()`/`registerSpawnedAgent()`. If either registration throws, the detached process remains running and unregistered. **Smallest fix:** catch registration failure, signal/terminate the child, remove the log/partial rows, then rethrow.

## 7. Seat types — ISSUES

- The seat slice is not gate-clean. `current-errors.md:2-26` reports the bridge literal `"status.json"` outside `src/presence`, an invalid Effect API call at `src/seat/manager.ts:83`, incompatible TUI types at `src/seat/ui/takeover.ts:45,63`, unsafe possibly-undefined snapshots at `src/seat/ui/takeover.ts:251-261`, and transcript type errors at `src/seat/ui/transcript.ts:34,60`. **Smallest fix:** import `STATUS_FILE`; use the installed Effect API; align the pi-tui type/version; narrow `visible[i]` before all accesses; and narrow the transcript block before reading `thinking`.
- The same ground-truth gate output reports forbidden `ReadonlyArray` forms at `src/seat/manager.ts:54`, `src/seat/index.ts:28,40`, and `src/seat/ui/takeover.ts:85,124,232` (`current-errors.md:31-117`). Replace them with `readonly T[]`.
- `test/seat-index.test.ts:20-60` only covers pure count/format/selection helpers; it cannot detect any of the compile or bridge-enforcement failures above.

## 8. Lease hardening — ISSUES

- The live-holder adoption refusal is now genuinely covered: `test/commands-lease.test.ts:57-64` records `process.pid` plus `processStartToken`, and `src/commands/lease.ts:95-100` refuses adoption while that holder is live. Foreign-lease reap independence is also covered at `test/commands-lease.test.ts:80-89`.
- **The normalized foreign-lease abort/close regression is failing.** `test-results.md:1278-1280` shows `test/commands-lease.test.ts` expected the fake backend close count to be 1 but received 0. The fixture mutates `headlessBackend.canSendKeys` but not its `capabilities.panes`; `src/commands/lifecycle.ts:463-472` therefore correctly skips pane close for headless and performs cleanup only. **Smallest fix:** either assert headless cleanup with `closes === 0`, or set `capabilities.panes = true` when the test specifically intends to exercise a backend close call.
- **The zero-mutation spawn regression times out.** `test-results.md:1248-1249` reports `spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation` timing out. Keep this as a real end-to-end test and fix its daemon/exit seam; do not replace it with arithmetic or pure-policy assertions.

## 9. Close strictness — ISSUES

- **The close ownership regression matrix is currently red.** `test-results.md:1773-1847,2111` reports failures for close-all, explicit foreign close, and the no-force close test. The fixtures monkeypatch an in-memory backend while `runCli()` invokes a child process (`test/owner-scoping.test.ts:54-66,244-255`), so those child calls cannot observe the monkeypatch; direct command-seam tests must inject the backend in-process or assert only persisted cleanup.
- `src/commands/lifecycle.ts:392-399,455-474` does satisfy the core rule that only a recorded live `(pid,start_token)` may be signalled, while unproven identity takes the cleanup/pane path. However, a proven process whose `process.kill()` throws is still reaped at `src/commands/lifecycle.ts:461-475`; this loses the record even if the process remains alive. **Smallest fix:** retain the registry/presence on a failed signal (and report failure), unless a safe pane-close operation succeeds.
- Duplicate positional targets are deduplicated at `src/commands/lifecycle.ts:449-452` but `targetCount` remains `targets.length` at `src/commands/lifecycle.ts:479`; `close a a` can therefore perform one successful close and still exit nonzero. **Smallest fix:** compare `ok` with the deduplicated target count.
- No `--force` is accepted by the close parser (`src/commands/lifecycle.ts:404-412`), and the current test does attempt to prove that (`test/owner-scoping.test.ts:244-252`), but the command's success half is among the failures above and needs a working normalized-process fixture.

