# Provenance depth

Who may spawn, how deep the tree may go, and what every fleet limit is called. Companion to
`01-launch-credential.md` and `TASKS/01-agent-model.md` §2 (provenance is immutable).

## 1. Vocabulary

The provenance tree: parent, child, ancestor, descendant, root, depth, subtree. No kinship
words. Provenance never changes shape once written. Ownership (the lease) is a separate
overlay and says nothing about depth.

| term | definition | stored as |
| --- | --- | --- |
| parent | the agent that spawned this one | `agents.spawned_by` |
| root | the top of the chain; has no parent | `agents.root_agent_id`, set at insert from the parent's root, CHECK `agents_root_is_self` |
| depth | hops from this agent up to its root; a root is 0, its children 1 | derived by the one walk (§2) |
| subtree | an agent and every descendant | `WHERE root_agent_id = ?` for a root; the walk for anyone else |
| pack | the subtree of a root | `packMembers(root)` |

## 2. One walker

`src/policy/provenance.ts` is the only loop over `spawned_by` in `src/`.

```ts
ancestorsOf(lookup, id)            // parent-first, root last; cycle-safe; unknown parent ends the chain
depthOf(lookup, id)                // ancestorsOf(...).length
isDescendantOf(lookup, id, anc)    // ancestorsOf(id).includes(anc); never true of self
```

`lookup: (id) => { spawnedBy } | null | undefined`. `AgentView` satisfies it, so the spawn
policy passes `(id) => views.get(id)` and close authority passes `(id) => agentView(orchDir, id)`.

The pack root is read off the row (`root_agent_id`), never re-walked. A spawner with no row
of its own is its own root at depth 0.

## 3. Depth

`fleet.max_depth`, default 1. An agent at depth `d` may spawn iff `d < max_depth`. At 1 only
a root spawns; a slave calling `orch spawn` is refused with
`maximum spawn depth is 1 (this spawner is at depth 1; fleet.max_depth)`, the standing offer
(`orch dispatch <name>` / `orch queue add`), and `orch settings`.

There is no per-spawn depth grant. The model calls `orch spawn`; the setting decides.

| verb | rule |
| --- | --- |
| `spawn` | refused when caller depth ≥ `fleet.max_depth`; the only depth gate |
| `close` / `abort` / `reap` | human always; an agent may end anything in its subtree |
| `dispatch` / `steer` / `model` / `reset` | the lease; depth is never authorization |
| pack count | live members of the root's subtree, one row read |
| visibility / fleet wall | a root (depth 0) sees every fleet; anyone else sees its own subtree |

Losing a mid-tree spawner changes nothing: work survives its spawner, the grandchild keeps
`root_agent_id`, its lease transfers or goes stale.

## 4. Worker prompt

The worker header follows `fleet.max_depth`. `WorkerHeaderContext.maySpawn` is computed once
at compose time as `depthOf(spawner) + 1 < fleet.max_depth`. When false the header says
"never spawn subagents". When true it says "you may `orch spawn`; your children may not" (or
the remaining depth). The clause sits after `WORKER_HEADER_BASE`, never inside it, so
`stripWorkerHeader` strips both variants. Compose sites: `spawn.ts`, `control.ts`,
`lifecycle.ts`.

## 5. Fleet limits

Every fleet limit says what it counts. Three count agents; one counts levels.

| key | help line in `orch settings` |
| --- | --- |
| `fleet.max_depth` | How many levels deep spawning may go. 1 = only a root spawns. Counts levels, not agents. |
| `fleet.max_agents_per_pack` | Most live agents under one root, root included. Counts agents at every depth. |
| `fleet.max_agents_per_space` | Most live agents in one space, keyed by space name. |
| `fleet.max_agents_total` | Most live agents on this machine across every space and pack. |

There is no `spawn_cap`, no `ORCH_SPAWN_CAP`, no `--spawn-cap`. There is no per-spawner
count. Each is declared in the zod schema, `SETTINGS_DEFAULTS`, the registry help roster, and
typed required on `OrchConfig`. No `?? <literal>` on any settings read. A `settings.json`
carrying an old key fails `strictObject` naming the key. Refusal messages quote the key.

## 6. Invariants

| # | invariant | enforced by |
| --- | --- | --- |
| 1 | Depth, ancestry, descent are computed by one function. | `ancestorsOf` is the only loop over `spawnedBy` in `src/` |
| 2 | The pack root is read from `root_agent_id`, never re-derived. | `spawnPolicyError` has no root walk; CHECK `agents_root_is_self` |
| 3 | Spawn depth is `fleet.max_depth` and nothing else. | `test/spawn-policy.test.ts` asserts the default and an override |
| 4 | Depth never gates a driving or ending verb. | `refuseClose` consults the subtree; the lease gates driving |
| 5 | Every fleet limit name says what it counts. | `test/settings-registry.test.ts`: each help line contains "agents" or "levels" |

## 7. Tasks

The tasks for this document are in `01-launch-credential.md` §8: 9 (fleet wall), 16 through
22 (limits, prompt, doctor). `src/policy/provenance.ts` and `fleet.max_depth` are in the
working tree, uncommitted, scoped tests green, gate not run.
