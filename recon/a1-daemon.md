# A1 — daemon slice: `spawned` + `ownership` out of `src/daemon/`

Scope: `src/daemon/events.ts`, `src/daemon/orchd.ts`, `src/daemon/retention.ts` and their
tests. Every read repointed onto `src/store/agent-view.ts`; every ownership read/write
repointed onto `src/store/lease-rows.ts`. `src/store/spawned-rows.ts`,
`src/store/ownership-rows.ts` and `src/db/schema.ts` were NOT touched.

## Proof: no `spawned`/`ownership` import remains

```
$ grep -rn "spawned-rows\|ownership-rows" src/daemon/ test/daemon-events.test.ts \
    test/retention.test.ts test/dispatch-correlation.test.ts test/answer-dispatch.test.ts \
    test/routing-hardening.test.ts test/broker-governance.test.ts test/broker-ownership.test.ts \
    test/notify-events-format.test.ts test/commands-runs.test.ts test/commands-results.test.ts
(no matches)
```

Import blocks after the change:

| file | store imports (line) |
|---|---|
| `src/daemon/events.ts` | `agent-view.ts:10`, `run-rows.ts:12` — no `spawned-rows`, no `ownership-rows`, no `agent/registry.ts` |
| `src/daemon/orchd.ts` | `lease-rows.ts:21`, `outbox-rows.ts:22`, `agent-view.ts:33` — no `spawned-rows`, no `ownership-rows` |
| `src/daemon/retention.ts` | `event-rows.ts:6`, `outbox-rows.ts:7`, `task-rows.ts:8`, `run-rows.ts:9`, `connection.ts:10` — no `spawned-rows` |

## Per file

### `src/daemon/events.ts`
* `identityFields` — was `placementOf(orchDir, key)?.space` + `agentById(...)?.name`, i.e. two
  lookups, one of them through the wide `spawned` row. Now **one** composer read:
  `tryParseIdentity(key)?.id` → `agentView(orchDir, id)`, taking `name` and
  `environment.space` off the same view. A key that is not a minted id names no agent, so it
  composes no name and no space — an answer, not a second lookup under another id.
* `runRecordForTransition` — `selectSpawnedRecord(...).adapter` → `agentView(...).harnessId`.
* **Normalization defect fixed (the one named in the brief).** `if (spawned?.space !== undefined)
  run.space = spawned.space;` is **deleted**. A run no longer keeps its own copy of the agent's
  space; `runs.space` is a column of a mutable environment fact on a second table, which A1
  forbids. Test `daemon-events.test.ts` now asserts `run.space` is `undefined`.

### `src/daemon/orchd.ts`
* `governWrite` — the two `ownership` gates are gone:
  * `getOwner(directory, target)` (the anonymous-actor refusal) — deleted. An anonymous caller
    holds nothing, so it is already excluded by the lease branch when a live holder exists, and
    Rule 11 says a dead holder is not a collision. One rule, stated once, on the lease.
  * `checkOwnerWrite(directory, target, actor, { steal })` — deleted. The open lease is now the
    only mutual-exclusion record.
  * `operatorControls` moved **inside** the live-foreign-lease branch: the space's human operator
    keeps control of a fleet keyed into their space, and supremacy is control, not theft — the
    holder keeps its holding.
* `metadataFor` (presence watch) — was `selectSpawnedRecord` for `spawnedBy` / `spawnedByLabel`.
  Now `agentView` for the agent and a second `agentView` for its spawner: **the spawner's label is
  READ from the spawner, never copied onto the agent it spawned** (a copy goes stale the moment
  the spawner is renamed).
* `deriveLeasePayload` — comment corrected; it no longer claims presence keys carry an
  environment prefix.

### `src/daemon/retention.ts`
* `removeExpiredAgentRecords` — the whole `selectSpawnedRecords` scan is gone. It existed only
  because `spawned`'s primary key was the pane, so one agent could be filed under several keys.
  An agent is now reaped by its **identity**: `reapSpawnedRecord(row.agent_id, orchDir,
  { agentId: row.agent_id })`, and the hub delete cascades every satellite (environment, lease,
  worktree, ending).
* Rule 13: the pre-existing `... .all(cutoff) as { agent_id: string }[]` cast is replaced with a
  real type guard, `isEndedAgentRow`.

## Tests (all rewritten to assert through the composer / the lease)

| file | what changed |
|---|---|
| `daemon-events.test.ts` | `seedAgent()` seeds `agents` + `spaces` + `agent_spaces`; asserts `adapter` comes from `harnessId` and `run.space` is `undefined` |
| `notify-events-format.test.ts` | "…composes the space from the agent's environment" — space seeded on the agent's own satellite; a non-identity key composes none |
| `retention.test.ts` | "reaps expired agents by identity, taking every satellite with them" — worktree, plexer and lease all go with the hub; the holder orch survives what it held |
| `broker-governance.test.ts` | rewritten onto leases: live-holder refusal, dead-holder grant, holder self-write, operator supremacy without theft, wall-before-lease ordering, and governance-is-a-decision (a refused enqueue leaves the lease untouched) |
| `broker-ownership.test.ts` | rewritten: `agentView(...).heldBy` is the one ownership record; adoption moves it and leaves a closed trail; the wall reads the composed space; moving an agent between spaces moves the wall, not its identity |
| `routing-hardening.test.ts` | ownership steal test → the store's `one_lease` index refuses a second open holding, and adoption closes the prior one in the same step |
| `answer-dispatch.test.ts` | "refuses an answer from outside the lease, naming the holder"; wall test seeds spaces normalized |
| `commands-runs.test.ts` / `commands-results.test.ts` | seed `agents` + environment satellites instead of a `spawned` row |
| `dispatch-correlation.test.ts` | target is a minted id; harness comes from the `agents` row |

Result: **80 pass, 0 fail** across the ten files. `bunx tsc --noEmit` reports **no errors in any
file in this slice**.

## Behaviour changes the reviewer must know about

1. **`--steal` on a driving verb no longer transfers control.** It used to reassign the
   `ownership` row inside `governWrite`. The lease equivalent (`adoptLease`) opens its own
   `BEGIN IMMEDIATE`, and `governWrite` runs *inside* `acceptWrite`'s transaction — SQLite refuses
   the nested begin, so a driving verb cannot take a holding atomically with its enqueue. That is
   also what C4 wants: taking an agent from a LIVE orch is deliberate and has its own verb. The
   refusal now names it:
   `agent is leased by <id>; take it deliberately with 'orch adopt <target> --steal', then drive it`.
   If dispatch-time stealing must come back, the clean fix is a non-transaction-opening
   `adoptLeaseIn(db, …)` in `src/store/lease-rows.ts` (not my file).
2. **`governWrite` is now a pure decision — it writes nothing.** The two broker-governance tests
   that asserted an ownership transfer rolls back / commits with the enqueue are replaced by one
   that asserts the lease is untouched either way.
3. **The anonymous-actor refusal message changed** from `agent is owned by <x>; anonymous writes
   are refused - set ORCH_OWNER…` to the lease message `agent is leased by <x>; only its lease
   holder may drive it`.

## Follow-ups for other workers (NOT touched here)

* **`runs.space` now has no writer in `src/`.** The only remaining setter is
  `test/store-runs.test.ts`, which passes it directly. Per the brief I did not edit
  `src/db/schema.ts` — the column (`schema.ts:73`) and `RunRecord.space` /
  `upsertRun`'s `space` handling (`src/store/run-rows.ts:5,7,8`) should be dropped by whoever
  lands the schema change.
* **`src/daemon/orchd.ts:88,96` still carry `as { id: string } | null` and
  `as LeasePayloadRow | null`** in `deriveLeasePayload`. Pre-existing, unrelated to A1, and left
  alone to avoid colliding with the lease/identity work in flight — but they are Rule 13
  violations and want type guards.
* The identity rewrite that landed mid-slice (`Identity` is now a bare minted id) leaves
  `src/backends/herdr/hud.ts`, `src/commands/panes.ts` and `src/entities.ts` failing typecheck on
  `Identity.backend` / `Identity.workspace`, and `test/owner-scoping.test.ts`,
  `test/commands-lease.test.ts`, `test/spawn-identity.test.ts`, `test/peer-identity.test.ts`,
  `test/presence-schema.test.ts`, `test/daemon-rpc.test.ts`, `test/daemon-decision-trail.test.ts`
  red. None of those are in this slice; all pre-date it.
