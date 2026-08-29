# A1 — commands layer off `spawned` / `ownership`

Scope: `src/commands/{clean,lifecycle,panes,review,spawn,status,target}.ts` and their tests.
Every read repointed onto `src/store/agent-view.ts` (the four-facts composer); every
ownership read/write onto `src/store/lease-rows.ts`. `src/store/spawned-rows.ts` and
`src/store/ownership-rows.ts` were left in place for the worker who deletes them last;
`src/db/schema.ts` untouched.

## Proof: no `spawned`/`ownership` import remains in any of the seven files

```
$ grep -n "spawned-rows\|ownership-rows" src/commands/{clean,lifecycle,panes,review,spawn,status,target}.ts
NONE
```

Store imports that replaced them:

| file | line | import |
|---|---|---|
| `src/commands/clean.ts` | 3 | `import type { AgentView } from "../store/agent-view.ts"` |
| `src/commands/lifecycle.ts` | 10 | `import { liveAgentViews, type AgentView } from "../store/agent-view.ts"` |
| `src/commands/panes.ts` | 12 | `import { setHandle } from "../store/interval-rows.ts"` |
| `src/commands/review.ts` | 2 | (no store import; composes through `./target.ts`) |
| `src/commands/spawn.ts` | 3 | `import type { AgentView } from "../store/agent-view.ts"` |
| `src/commands/status.ts` | 16 | `import type { AgentView } from "../store/agent-view.ts"` |
| `src/commands/target.ts` | 11–12 | `agent-view.ts` (`environmentOf`, `AgentView`) + `lease-rows.ts` (`currentLease`) |

## Per file

### `src/commands/target.ts` — the shared composer seam
New exports the other six read through, all keyed by the **minted id**, never a key:
- `agentIdOfKey(key)` — the one key→identity join.
- `agentViewIndex(root)` — delegates to `spawnedRecords(root)` in `src/presence/store.ts`
  (now itself an `AgentView` composer, no table behind it). Deliberately a one-line
  alias so there is exactly one implementation of the index.
- `presenceById(presence)` — presence re-indexed by id so a view joins to it.
- `viewForKey`, `agentAddress`, `leaseHolderOf` (lease-rows read).
- `ownsAgent(agent: Pick<AgentView,"id"|"heldBy">)` — ownership is the open lease.
- `assertAgentOwned(..., views?)` — gate reads `heldBy` / `currentLease`, never `ownership`.
- `backendTarget` — plexer now comes from `view.environment.plexer`, not `parseIdentity(key).backend`.
- `LifecycleTarget` lost `record: SpawnedRecord`; it now carries `key: string` and
  `view: AgentView | null`. `registryTargetMatches`/`resolveRegistryRecord` became
  `agentTargetMatches`/`resolveAgentView` (match on id, name, handle).
- `callerSpace()`/`actorSpace()` read the space off `environmentOf`, no longer off a key segment.

### `src/commands/status.ts`
`deriveView(ent, views, staleHashes)` takes an id-keyed `AgentView` map.
`viewProvenance` now reads the four facts apart: `owner` = `view.heldBy.orchId`,
`spawnedBy` = `view.spawnedBy`, `spawnedByLabel` = the **spawner agent's own name**
looked up in the same map, `worktree`/`branch` = environment axes, `cwd` = the agent's.
`entityAdapter` reads `view.harnessId`. `fleetStatusRows` builds the index once.

### `src/commands/clean.ts`
`liveWorktreeOwner` is now exported and takes `(worktreePath, views, presenceById)`;
it finds the agent whose `environment.worktree` matches and checks presence **by id**.

### `src/commands/review.ts`
`reviewItems()` iterates `agentViewIndex()`, reads `environment.worktree/branch` and
`harnessId`, joins presence by id. `ReviewItem.pane` → `ReviewItem.key`.
`reviewTarget(record: SpawnedRecord)` → `reviewTarget({ key, branch })`.

### `src/commands/spawn.ts`
`liveSpawnCounts(views, presence)` and `spawnPolicyError(..., views, presence, spawnerId)`
are both id-keyed; the pack/depth walk follows `view.spawnedBy` (immutable provenance)
instead of a `spawnedBy` key column. `assertSpawnCapacity` defaults to
`agentViewIndex()` / `presenceById()`.

### `src/commands/lifecycle.ts`
`ownedAgentKeys()` filters on the open lease. `renameAgent` reads
`view.environment.space` for `assertNameFree`. `cmdClose --all` iterates
`liveAgentViews(orchDir())` and addresses each agent via `agentAddress`.
`resolved.record.pane` → `resolved.key`.

### `src/commands/panes.ts`
`writeSpawnedHandle` → `setHandle(orchDir(), id, Date.now(), handle)` on `agent_handles`,
so a move closes one interval and opens the next instead of rewriting a pane-keyed row.
`assertGroupAgentsOwned` matches on `environment.handle` and refuses on `heldBy`.
`resolveTab` compares `view.environment.plexer` instead of `parseIdentity(key).backend`.

## Tests (all written/adjusted first, seen red, then green)
`commands-target`, `lifecycle-targets`, `commands-clean` (new `liveWorktreeOwner` case),
`commands-review`, `commands-lifecycle` (new lease-release case), `commands-panes`,
`commands-spawn`, `commands-status`, `spawn-limits`, `spawn-policy`, `review`.
**65 pass, 0 fail.** Fixtures build complete `AgentView` values through typed factories —
no `as`, no `as unknown as`, no `any`, no schema constant touched.

## Not done — blocked on other workers

1. `src/commands/panes.ts:147` and `:205` — `backend.identity?.current()?.workspace`.
   `Identity` was reduced to `{ id }` by the identity refactor, so
   `EnvironmentIdentityRole.current()` (`src/backends/backend.ts:149-152`) no longer
   carries a workspace. `src/entities.ts:139` and `src/commands/events.ts:77` have the
   identical error. Needs the backend-port owner to decide the new role shape; guessing
   one here would fork the contract. These are the only two `tsc` errors left in my files.
2. `test/command-space-fields.test.ts`, `test/space-policy.test.ts`,
   `test/commands-results.test.ts`, `test/commands-runs.test.ts` still import
   `insertSpawnedRecord`. Each seeds fixtures for a module I do not own
   (`src/entities.ts`, `src/policy/space.ts`, `src/agent/registry.ts`,
   `src/commands/results.ts`, `src/commands/runs.ts`); they also use legacy
   `<plexer>~<space>~<handle>` keys that are no longer valid identities. They belong with
   whoever migrates those modules.
