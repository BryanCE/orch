# Bugs found while running orch on itself

Found 2026-09-16 while orchestrating the store handover (`docs/orchd-owns-the-store.md`).
Each entry: what was seen, the cause read from the code, the fix. Fixed entries move to
the bottom with the commit that fixed them.

## 1. The `status` RPC throws when any row's key does not resolve

Seen: `orch spawn` of four agents printed `STALLED ... bridge never attached` for all four
after 60 s, then `not pinned: <name> never registered` and `not dispatched: <name> never
registered`. The four bridges were attached the whole time: a manual `orch dispatch` to
each was acked in 3 ms. `orch status --json` showed `bridgeAttached: null` on every row and
took 3.9 s. A direct call of the `status` RPC answered in 1.8 s with
`RpcError: control target wF:pN3 does not resolve to a presence identity`.

Cause: `fleetStatus` (`src/daemon/server/state.ts:137`) stamps every row with
`bridgeAttached(directory, row.key)`. `bridgeAttached` (`src/control/bridge-links.ts:38`)
calls `normalizeControlTarget`, which throws for a key that is not an agent id and not a
name or handle of a known agent. `wF:pN3` was `writer-totals`, an agent in another
orchestrator's fleet with no registered identity behind its handle. The throw leaves the
`rows.map(...)` in `fleetStatus`, so one such row fails the whole RPC. The CLI's `readFleetRows`
(`src/commands/status/fetch.ts:45`) catches the error and falls back to the file path, which
sets `bridgeAttached: null` on every row. `awaitBridgeAttach`
(`src/commands/spawn/report.ts:36`) polls that same RPC for `bridgeAttached === true`, never
sees it, and reports every spawn as stalled. Spawn then skips the pin and the initial
`--file` dispatch.

Cost: every spawn from a workspace with a non-orch pane waits 60 s, exits 1, and delivers
no prompt. Every `orch status` takes the slow file path.

Fix: the row key IS the agent id (Rule 11, A1). `bridgeAttached` reads `links.has(key)`
and never resolves a name. A row whose key is not an agent id is `bridgeAttached: false`.
`normalizeControlTarget` stays for control verbs, which take a user-typed target.

## 2. `bridgeAttached` resolves the fleet once per row

Seen: the `status` RPC took 1.8 s before it threw (entry 1).

Cause: `normalizeControlTarget` (`src/control/normalize-target.ts:28-35`) calls
`agentView`, `agentViews` and `loadPresence` per call, and `fleetStatus` calls it once per
row. For N rows that is N fleet rebuilds and N presence loads.

Fix: same as entry 1. With the key used directly the per-row cost is one `Set.has`.

## 3. The attach wait and its poll interval are literals

Seen: `awaitBridgeAttach` (`src/commands/spawn/report.ts:38,58`) waits `60_000` ms and
polls every `500` ms.

Cause: two literals in command code. Rule 17: every timeout is a setting.

Fix: `timeouts.spawn_attach_ms` and `timeouts.spawn_attach_poll_ms` in `settings.json`
(schema, `SETTINGS_DEFAULTS`, registry help line).

## 4. The CLI hides an RPC failure behind the file fallback

Seen: `orch status` printed a fleet with no error while the daemon was refusing the RPC
(entry 1).

Cause: `readFleetRows` (`src/commands/status/fetch.ts:45-51`) catches every error from the
`status` RPC and reads the store directly. Nothing prints. The plan
(`docs/orchd-owns-the-store.md`) rules that the CLI never reads the store while a daemon is
up.

Fix: `status` reads through `readRpc` and dies with the daemon's refusal text. The file
path exists only behind `--offline`.

## 5. A status report after the result wipes the run

Seen: `orch runs <agent>` shows every finished dispatch as DURATION `running`, STATE
`idle`, `$0.00`, `0/0` tokens. `orch result <agent>` on a finished agent died with
`Dispatch ... has not settled (done)`.

Cause: `report-result` writes the run with `state: "done"`, `result`, `finishedAt`, cost
and tokens (`daemon/server/status-report.ts:85-103`). The bridge's next status report
(`idle`, counters reset for the next dispatch, `finishedAt: null`) carries the same
`dispatchId`; `runFromRow` builds a run with those nulls and `upsertRun`
(`store/run-rows.ts:56`) overwrites every mutable column with them. The result, the finish
time, the cost and the tokens are gone.

Fix: a run with a `result` is settled; a status report never touches a settled run. In
`acceptStatusReport`, skip the `upsertRun` when `selectRun(dispatchId)?.result` exists. A
run's state is never `idle`: `runFromRow` returns nothing for an `idle` row.

## 6. A refused spawn test writes a worktree into the checkout

Seen: `test/spawn-policy.test.ts` "a refused cmdSpawn makes no name, worktree, registry,
or queue mutation" left `.orch-worktrees/capped` and the branch `orch/capped` in the real
repo (`git worktree list` shows it as prunable).

Cause: the test runs `cmdSpawn --worktree` with the test process's cwd, which is the
checkout. When the pack cap is not the one the served daemon reads (the test wrote one
settings body to disk and served another), the refusal comes after
`createAgentWorktree`, which runs `git worktree add` in the checkout.

Fix: no test under `test/` passes `--worktree` or runs git. The worktree module and the
refused `--worktree` spawn are covered in `test-git/worktree.gittest.ts`, which runs only
under `bun run test:git` (Bryan-only) and only inside a throwaway repository under the
temp dir. `.orch-worktrees/` is ignored. Ruling in CLAUDE.md rule 0.1.

## 7. A spawn spends its one-use grant before the home opens

Seen 2026-09-17: `orch spawn write-queue --backend herdr` from outside a pane asked for
`orch grant 21cphcmh`. Bryan granted it. The retry printed `could not open a home for this
fleet: orchd pid 32908 did not answer within 2000ms` (the daemon was serving another
session's ten agents). The next retry asked for a NEW grant, `u315q5un`. The first grant
was gone and nothing had opened. Bryan approved twice for one spawn.

Cause: `placement.ts:74` calls `grantNewHome()`, which spends the grant
(`grant-rows.ts` `spendGrant`, one `grant_spends` row), and only then opens the home
through the daemon. The spend and the open are two steps with no link. A failure in the
open leaves the spend on record.

Fix: spend the grant in the same daemon call that opens the home, after the home opened,
so a home that did not open costs no grant. The CLI-side spend goes; the `open-home`
handler takes the request id and records the spend on success.
