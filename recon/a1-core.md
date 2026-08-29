# A1 core: `spawned` and `ownership` removed from the entity/presence/registry/headless seam

Row A1 (`TASKS/02-scope.md`): *an orch is an agent; four facts never welded —
identity, provenance, lease, environment. Lifetime is not one of them.*

The legacy `spawned` row welded all four and keyed them on the PANE, so moving an
agent minted a new identity; `ownership` was a second id space (`agent_key`)
beside `agent_leases`. Neither is reachable from any file in this slice any more.
Every read goes through `src/store/agent-view.ts`; every ownership read/write
goes through `src/store/lease-rows.ts`.

## Proof: no `spawned-rows` / `ownership-rows` import remains

```
$ grep -rn "spawned-rows\|ownership-rows" \
    src/entities.ts src/presence/store.ts src/agent/registry.ts \
    src/backends/headless/index.ts test/*.test.ts
(no output)
```

Replacement imports, per file:

| file | line | import |
|---|---|---|
| `src/entities.ts` | 11 | `import { agentView, agentViews, type AgentView } from "./store/agent-view.ts";` |
| `src/presence/store.ts` | 10 | `import { agentViews, environmentOf, holderOf, tuningOf, type AgentView } from "../store/agent-view.ts";` |
| `src/presence/store.ts` | 11 | `import { adoptLease } from "../store/lease-rows.ts";` |
| `src/agent/registry.ts` | 2 | `import { agentView } from "../store/agent-view.ts";` |
| `src/backends/headless/index.ts` | 19 | `import { agentViews } from "../../store/agent-view.ts";` |

## What moved, per file

### `src/agent/registry.ts`
`Placement` was `Pick<SpawnedRecord, …>` — a projection of the wide row, so it
inherited the row's welding. It is now its own type read off `AgentView`:
`{ key, agentId, backend, space, handle, cwd, worktree, branch }`, every axis
nullable because a missing axis is a missing satellite row, not a NULL column.
`placementOf` resolves the key to a minted id (`tryParseIdentity`) and composes
`agentView(orchDir, id).environment`. A key that carries no minted id names no
agent and returns `null` — it never invents a place.

### `src/presence/store.ts`
- `SpawnedRecord` (the wide row as a type) is gone. `AgentFacts` replaces it: the
  same facts as an ARGUMENT list, each fanned out to the table that owns it.
- `recordSpawned(key, facts)` no longer writes one row. It ensures the harness,
  then writes the environment axes (`agent_plexers`, `agent_handles`,
  `agent_spaces`, `agent_worktrees`), the tuning (`agent_tunings`), and the
  owner as a LEASE via `adoptLease`. It re-reads `environmentOf` first, so an
  axis that has not changed is never closed and reopened.
- Ownership: `setOwner`/`deleteOwner`/the `ownership` table are gone from this
  file. `holderOf` reads the open lease; `adoptLease` writes it.
- `spawnedRecords()` survives by NAME only: it is now
  `Map<string, AgentView>` indexed by minted id. Since a presence key IS the
  minted id (`src/backends/identity.ts`), one index answers both "which agent is
  this key" and "what has orch spawned", with no second id space.
- `reapSpawnedRecord` deletes the agent hub (which cascades every satellite,
  lease and ending) plus the presence dir. There is no owner row left to clean.

### `src/entities.ts`
`Map<string, SpawnedRecord>` threaded through six builders is replaced by a
`Fleet` read: `{ views (by minted id), presence, presenceById }`. Local helpers
`viewsById` / `viewForKey` / `addressOf` join a key to an agent through the id
alone. `entitiesFromRecords` became `entitiesFromStore` — an agent with no
handle is one with no SHORTCUT, still listed and still addressable.
`recipientFor` reads harness/plexer/handle off the view; `currentSpace()` reads
`agentView(...).environment.space` instead of the deleted `Identity.workspace`,
and `null` stays a real answer (no invented "local").

### `src/backends/headless/index.ts`
- `headlessHandles` no longer filters `record.backend === "headless"`. It scans
  every `AgentView` and keeps the ones whose `environment.handle` PARSES into a
  `{pid, key}` pair. The declared handle shape is the capability test; no plexer
  id, no key prefix, no `handle === null` branch.
- `spawn` dropped `insertSpawnedRecord`. It calls `registerSpawnedAgent`
  (`pane: false` — this environment shows no pane) and then records the plexer
  and the handle explicitly: **a handle is not a pane**. That is what keeps
  `list` / `close` / `handleFor` able to reach an agent with no screen.

### Tests
- `test/store-spawned.test.ts`, `test/ownership.test.ts` — **deleted**. They
  tested the two tables A1 removes (Rule 8: no back-compat, and a green test for
  a dead table keeps the dead path alive).
- `test/lease-authority.test.ts` — the `checkOwnerWrite`/`setOwner` case is gone;
  in its place, *"the composed holder IS the open lease, with nothing beside it"*.
- `test/space-walls.test.ts` — seeds through `recordSpawned` and adds
  *"an agent that moves space keeps its identity and reports the new space"*,
  which the pane-keyed row could not express.
- `test/store-instants.test.ts` — asserts `agent_leases.since` is INTEGER and
  that `agentViews` orders numerically by `createdAt`.
- `test/backend-headless.test.ts`, `test/cli-backends-herdr-headless.test.ts`,
  `test/cli-backends-tmux.test.ts`, `test/owner-scoping.test.ts` — migrated onto
  `agentView` / `recordSpawned` and onto minted ids.

## One edit outside the four files

`src/commands/spawn.ts` — `recordSpawned(...)` and `registerSpawnedAgent(...)`
were SWAPPED (statement move only, no logic change). Registration MINTS the agent
row; `recordSpawned` records facts against an agent that already exists. In the
old order the hub was inserted twice and every paned spawn threw
`UNIQUE constraint failed: agents.id`.

## Verification

- `bunx tsc --noEmit` — **0 errors, whole tree**.
- `bun test` on the seven files in this slice — **77 pass, 0 fail**
  (`owner-scoping`, `lease-authority`, `backend-headless`,
  `cli-backends-herdr-headless`, `cli-backends-tmux`, `store-instants`,
  `space-walls`).

## Left for the workers who finish A1

1. `ensureOrchAgent` (presence/store.ts) mints an agent row for an owner token
   orch has never registered — correct per Rule 11 (an orchestrator IS an agent),
   but those rows are live agents, so `close --all` now sweeps them. Registering
   orchestrators through `hello` before they can hold a lease removes the need.
2. `recordSpawned` silently records nothing when the agent does not exist and no
   harness is stated. An agent with no harness is one orch cannot run, but the
   refusal should be loud once the adopt path in `src/commands/control.ts` states
   its harness.
3. `spawnedRecords()` in presence/store.ts and `agentViewIndex()` in
   `src/commands/target.ts` are now the same function. They cannot be merged
   where they sit (target.ts imports entities.ts, which imports presence/store.ts);
   the shared index belongs in `src/store/agent-view.ts`.
4. Pre-existing module cycle, unrelated to A1 and still live:
   `src/config.ts → src/runtime.ts → src/adapters/registry.ts → src/adapters/codex.ts → src/config.ts`.
   Any entry point that loads `codex.ts` first dies with
   `ReferenceError: Cannot access 'codexAdapter' before initialization`.
   `src/config.ts`'s own header comment forbids exactly this: it must never reach
   a provider registry. `src/runtime.ts` importing `allAdapters` is the edge to cut.
