# Wave 4 verification review

Scope: read-only review of today's working tree against `TASKS/01-agent-model.md` and the cited decisions in `TASKS/02-scope.md`. No gates were run.

## 1. Lease verbs — **ISSUES**

### What passes

- **F1/D9:** `detachAgent` has one effect only: it closes the caller's open lease. It does not alter process, provenance, environment, or lifetime. An already-unleased target is a no-op.
- **F2:** `adoptAgent` accepts an unleased agent and replaces a lease whose holder has no matching live recorded process. A live holder blocks adoption. Adoption records the prior release reason as `adopted` through `adoptLease`.
- **F3/H3:** `reapAgent` recursively finds descendants, refuses when any descendant is live, deletes ended descendants leaf-first, and refuses while the target has a live recorded/presence process.
- **I3 (reap):** reap never examines the target lease before deleting. `test/commands-lease.test.ts` explicitly seeds a foreign lease and proves deletion succeeds.
- Registration/help are present in `src/commands/index.ts` and `src/commands/help.ts`.

### Issues

1. **D8 is not implemented.** `helloIdentity` in `src/daemon/rpc.ts` returns only the session identity. There is no query or response field/event that announces available unleased agents when a session starts. `cmdAdopt --all` is user-invoked discovery, not the required unprompted startup announcement.
   - Smallest fix: after `getOrCreateSessionAgent`, query live agents with no open lease (excluding self) and include/emit a startup orphan announcement through the hello path; add a real hello RPC test for it.
2. **Live-holder behavior lacks a positive test.** The adoption test represents a dead holder by giving it no process row, but no test records a live holder and proves adoption is refused.
   - Smallest fix: add a holder `agent_processes` row using `process.pid` plus `processStartToken(process.pid)` and assert `adoptAgent` throws `leased by live orch`.
3. **I3 coverage is incomplete in this slice.** Reap is covered, and existing lifecycle tests show abort/close ignore legacy owner gates, but there is no normalized-lease test for abort/close.
   - Smallest fix: seed a foreign `agent_leases` row for lifecycle targets and assert abort/close still proceed.

## 2. Spawn policy — **PASS (with coverage caveat)**

- **A9:** provenance depth is computed recursively; a depth-2 spawner is refused before creating a depth-3 child.
- **A12:** default `fleet.pack_cap` is 10 and `resolveSpawnSettings` loads it from `settings.json`; the policy uses `settings.fleet.pack_cap`.
- **A13:** `executeSpawn` calls `assertSpawnPolicy` before backend/workspace allocation, name claiming, or any queue path. A refusal is therefore blocked, not queued. Both pane and detached paths are guarded.
- Refusal text offers the two required choices: dispatch/bind the work to a live slave, or add it to the pack queue.

Coverage caveat: `test/spawn-policy.test.ts` exercises the pure policy and the settings override, but does not integration-test that a refused `cmdSpawn` performs no backend/name/worktree/queue mutation. The implementation ordering currently establishes that property. Smallest strengthening: inject a backend/name claimant and assert neither is called on refusal.

## 3. Close kill path, round 2 — **ISSUES**

### What passes

- The renamed local is correctly `recorded`; it no longer shadows the Node `process` global in the reviewed region.
- When a recorded start token exists, `cmdClose` calls `processInstanceMatches(pid, startToken)` before signalling.
- A process still alive after SIGTERM causes `continue`, so `reapSpawnedRecord` is not called on a failed kill.

### Issues

1. **The direct recorded pid+token path is still optional.** Both target-building branches use `recorded?.pid ?? presence.status.pid`; if no normalized process row exists, close kills the presence PID with no token. The comment explicitly preserves tokenless/legacy PID killing, contrary to the required recorded process-instance proof and Rule 8.
   - This is exercised by `test/owner-scoping.test.ts`: it writes `startToken` only into presence, but `cmdClose` ignores that token and kills by bare PID. The green test therefore does not prove the requested path.
   - Smallest fix: require `recordedProcess(key)` for a live kill, require its `startToken`, verify `processInstanceMatches`, and refuse/refrain from reaping when identity cannot be proven. Remove the presence-PID fallback and legacy-tokenless branch.
2. **`--force` is not gone from close.** `cmdClose` still lists `--force` in `splitOptionFlags`, silently accepting it. `test/owner-scoping.test.ts` even names the behavior “close ignores --force”.
   - Smallest fix: remove `--force` from close parsing and replace that test with an assertion that close has no force option (while remaining unconditional without it).
3. **The close tests do not seed the normalized `agents`/`agent_processes` path.** Thus they can pass while `recordedProcess` returns null.
   - Smallest fix: add a close test with an agent row and open process interval, and assert matching-token kill succeeds while mismatched-token close neither signals nor reaps.

## 4. Hello agents — **ISSUES**

### What passes

- **B1:** RPC `hello` is the registration entry point and `getOrCreateSessionAgent` mints an opaque id; the caller does not construct it.
- Same `(pid, start_token)` reuses the live agent id; a different process instance mints another id. Real RPC tests and row-level tests assert this.
- **C4e:** a newly self-registering session is named `<harness>-<first 8 of id>` and tests assert the exact value.
- **B8 runtime/schema:** `src/store/identity-rows.ts` is deleted and no source/test runtime reference to it or the old table remains.

### Issue

- **The requested repo grep is not clean.** `docs/reference/store.md:67-93` still documents `session_identities` and `src/store/identity-rows.ts` as current. (Decision/history mentions in `TASKS/` are expected specification text, not runtime compatibility.)
  - Smallest fix: update `docs/reference/store.md` to document session agents in `agents` + `agent_processes` and remove the obsolete ownership table/API entries.

## 5. Worker park / L6 wording — **PASS**

`src/worker-prompt.ts` still gives an unreachable-spawner worker the explicit instruction to finish, write its result, end the turn, rely on its session/result file, and never route a report through another agent. A reachable spawner is restricted to `orch_send target "spawner" ONLY` and explicitly forbids sibling relay. `test/worker-prompt.test.ts` asserts these clauses directly.

## 6. Spot-check of three green test files — **ISSUES**

1. **`test/commands-lease.test.ts`: mostly real assertions.** It verifies lease row transitions, descendant refusal, a genuinely live current process refusal, and foreign-lease-independent reap. Gap: no live-holder adoption refusal and no normalized-lease abort/close assertion.
2. **`test/spawn-policy.test.ts`: real policy assertions, but not end-to-end.** It verifies cap/depth messages and a loaded settings override. It does not prove the command made zero allocations/queue writes on refusal.
3. **`test/owner-scoping.test.ts` close assertion is weakened relative to the new contract.** Its live-process fixture has no normalized agent process row, so the test passes through the forbidden bare-presence-PID fallback rather than proving recorded pid+start-token matching.

## OVERALL must-fix

1. Implement D8's unprompted unleased-agent announcement at hello/session start, with an RPC test.
2. Make close require the normalized recorded pid + start token for live signalling; remove presence-PID and tokenless legacy fallbacks; test matching and mismatching instances and no reap on refusal/failure.
3. Remove `--force` from `close` parsing and replace the “ignores --force” test.
4. Remove stale `session_identities` documentation from `docs/reference/store.md` so the non-spec grep is clean.
5. Strengthen lease tests for a provably live adoption holder and normalized-lease independence of abort/close.
