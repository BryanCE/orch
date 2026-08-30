# Provenance depth — who may spawn, and how deep the tree may grow

Companion to `01-launch-credential.md` (how a spawned agent knows who it is) and
`TASKS/01-agent-model.md` §2 (provenance is the immutable "who spawned it"). This document
turns the hardcoded "depth 2" into a setting, names the tree, and reduces three copies of one
traversal to one.

---

## 1. Vocabulary

The provenance tree. **parent / child / ancestor / descendant / root / depth / subtree.**

No kinship words (father, son, grandparent): they imply gender and stop at three
generations; the tree does not. Provenance is immutable (Rule 11), so this tree never
changes shape once written. Ownership — the lease — is a separate overlay that can point
anywhere and says nothing about depth.

| term | definition | stored as |
| --- | --- | --- |
| parent | the agent that spawned this one | `agents.spawned_by` |
| root | the top of the chain; a root has no parent | `agents.root_agent_id` (set at insert from the parent's root; CHECK `agents_root_is_self`) |
| depth | hops from this agent up to its root; a root is depth 0, its children depth 1 | derived by the one walk (§3) |
| subtree | an agent and every descendant | `WHERE root_agent_id = ?` for a root; the walk for anyone else |
| pack | the subtree of a root | `packMembers(root)` — already exists |

## 2. What was true before this document

- Depth was limited to **2, hardcoded** — `spawn.ts` refused a depth-2 spawner. So a slave
  *could* spawn one level; it was the grandchild that could not. Nothing in `locked_commands`
  blocked `spawn`; the worker prompt's "never spawn subagents" line was the only thing
  telling a slave not to, and prose is not enforcement (`08` §"why prose does not hold").
- **Three walkers re-derived what the store already held.** `spawnPolicyError` walked
  `spawnedBy` for depth, then walked *every* agent again to find its root for the pack cap
  (ignoring `root_agent_id`); `close-authority.ts` had a third copy for the descendant check.

## 3. Decided; code drafted 2026-08-30 (UNCOMMITTED — built ahead of the ask; Bryan decides keep or drop)

The ask was "note this bug and put a task on the doc". The session built T1/T2 instead of
noting them. The diff is in the working tree, uncommitted: `src/policy/provenance.ts` (new),
`src/commands/spawn.ts`, `src/policy/close-authority.ts`, `src/config.ts`,
`src/types/config.ts`, `src/types/policy.ts`, `src/settings/registry.ts`, ten test fixtures,
`test/provenance.test.ts` (new), `TASKS/02-scope.md` A9. Scoped `bun test` on the eleven
touched files: 123 pass. `bun check` has NOT been run (user-only). Nothing here counts as
done until Bryan says keep.

### One walker — `src/policy/provenance.ts`

```ts
ancestorsOf(lookup, id)            // parent-first, root last; cycle-safe; unknown parent ends the chain
depthOf(lookup, id)                // ancestorsOf(...).length
isDescendantOf(lookup, id, anc)    // ancestorsOf(id).includes(anc); never true of self
```

`lookup: (id) => { spawnedBy } | null | undefined` — `AgentView` satisfies it structurally, so
the spawn policy passes `(id) => views.get(id)` and close authority passes
`(id) => agentView(orchDir, id)`. Same loop, two data sources, zero copies.

The pack root is **read off the row** (`views.get(spawnerId)?.rootAgentId`), never re-walked:
the store computed it at insert and CHECK-constrains it. A spawner with no row of its own (a
self-registered orch) is its own root at depth 0.

### One setting — `fleet.max_depth`

```json
"fleet": { "max_depth": 1 }
```

- An agent at depth `d` may spawn iff `d < max_depth`.
- **Default 1**: only a root spawns. A slave calling `orch spawn` is refused with
  `maximum spawn depth is 1 (this spawner is at depth 1; fleet.max_depth)` plus the standing
  offer (`orch dispatch <name>` / `orch queue add`).
- `2` restores the old behaviour; `N` allows sub-orchs `N-1` levels deep.
- Registered in `settings/registry.ts` (`fleet.max_depth`), typed required on
  `OrchConfig.fleet`, defaulted in `SETTINGS_DEFAULTS`. Not a schema bump (Rule 14).

### What depth gates, and what it does not

| verb | rule |
| --- | --- |
| `spawn` | refused when caller depth ≥ `fleet.max_depth` — **the only depth gate** |
| `close` / `abort` / `reap` | human always; an agent may end anything in its **subtree** (unchanged; now via the one walker) |
| `dispatch` / `steer` / `model` / `reset` | the lease, unchanged — depth is never authorization |
| pack cap (`fleet.pack_cap`) | counts live members of the root's subtree — unchanged, now one row read instead of a walk per agent |
| visibility / fleet wall | an agent sees its subtree; a root sees its pack (`peers.ts` — see T2 below) |

Losing a mid-tree spawner needs nothing new: work survives its spawner (Rule 11), the
grandchild keeps `root_agent_id`, and its lease either transfers or goes stale.

## 4. Decided, NOT yet built

### D1 — No per-spawn depth grant. The setting is the only knob.

Considered: `orch spawn --max-depth 3` so one orch could be granted a deeper subtree than the
global setting. **Rejected.** Depth is a property of the tree the *user* configured, not of a
request the *model* makes; a second knob is one more thing every orchestrator prompt has to
explain, and the model would have to know to ask for it. The model simply calls `orch spawn`;
the policy refuses past `max_depth` and the refusal text says why and what to do instead.
If a fleet genuinely needs a deeper tree, the user raises `fleet.max_depth`.

### D2 — One cap. No `fleet.subtree_cap`.

`pack_cap` bounds the whole subtree of a root. With `max_depth: 3, pack_cap: 10`, a root
that spawns three sub-orchs could see the first sub-orch take seven slots and starve the
other two. A `subtree_cap` ("each spawner may have at most N live descendants") would
prevent that. **Deferred**: it is a second cap with a second refusal message and a second
count, for a starvation nobody has hit. The root orch planning its fleet is the right place
to solve it; the refusal already tells a starved sub-orch to dispatch or queue instead.
Revisit when a real fleet blows it.

## 5. Tasks

| # | task | status |
| --- | --- | --- |
| T1 | `src/policy/provenance.ts`; `spawnPolicyError` and `refuseClose` use it; `test/provenance.test.ts` | **BUILT** |
| T2 | `fleet.max_depth` (schema, defaults, extractor, registry help, type); default 1; tests for default-refuses-slave and `max_depth: 2` | **BUILT** |
| T3 | **DECIDED: the worker prompt follows the setting.** The "never spawn subagents" clause in `WORKER_HEADER_BASE` is split out and emitted only when the *worker being launched* will sit at depth ≥ `fleet.max_depth` (i.e. it may not spawn). When it may, the clause instead states its allowance: "You may `orch spawn`; your children may not" (or the remaining depth). Mechanism: `WorkerHeaderContext.maySpawn: boolean`, computed once at compose time as `depthOf(spawner) + 1 < fleet.max_depth`, at the three composers — `spawn.ts:488` (spawner known), `control.ts:202` and `lifecycle.ts:51` (dispatch to an existing agent: read its own depth off the tree). `stripWorkerHeader` must still match both variants — it anchors on `WORKER_HEADER_BASE`, so the clause moves *after* the base, never inside it. Tests: `worker-prompt.test.ts` gains a case per variant and one proving the strip survives both. | open |
| T4 | `peers.ts` `callerMayCrossFleets` → "caller is a root" via `depthOf(...) === 0`, once `01` T2's `callerKind()` exists — replacing the env-presence guess with the tree. | open — after `01` T2 |
| T5 | `TASKS/02-scope.md` A9 row updated to point here. | **BUILT** |
| T6 | `doctor`: report an agent whose depth exceeds `fleet.max_depth` (a setting lowered after a tree was built). Not an error — the tree is history — but the user should see it. | open |
| T7 | **`orch settings` exposes `fleet.max_depth`.** The editor (`TASKS/14-settings-tui.md`) is derived from the one `HELP` roster in `settings/registry.ts`, so the row exists the moment the help line does — verify: it lists under the `fleet` group, `kindFor` reads it as `integer` with `min 1` off the zod `PositiveInt`, the write path lands `fleet.max_depth` in `settings.json` through `writeRegisteredSetting`, and a lowered value is refused below 1. Add the row to `test/settings-registry.test.ts`'s full-tree fixture and a write round-trip. No new subcommand — Q2 decided one knob, and the editor IS the knob. | open |
| T9 | **Kill the dead `?? 10`.** `spawnPolicyError` reads `settings.fleet.pack_cap ?? 10` — a second copy of `SETTINGS_DEFAULTS.fleet.pack_cap` that exists only because `OrchConfig.fleet.pack_cap` is typed `?: number` while the loader always fills it. Type it `number`, delete the literal. Then sweep `src/` for every other `?? <literal>` on a settings read — each one is the same bug (a default living in two places) and gets the same fix. | open |
| T8 | **Spawn refusal names the setting and the editor.** The `max_depth` refusal already says `fleet.max_depth`; append the one-liner `orch settings` so the human (not the model — the model never raises it, D1) knows where to change it. | open |

## 6. Invariants

| # | invariant | enforced by |
| --- | --- | --- |
| 1 | Depth, ancestry and descent are computed by one function. | `ancestorsOf` is the only loop over `spawnedBy` in `src/`; a second one is the smell `fallow` is run for |
| 2 | The pack root is read from `agents.root_agent_id`, never re-derived. | `spawnPolicyError` has no root walk; CHECK `agents_root_is_self`, FK to `agents.id` |
| 3 | Spawn depth is `fleet.max_depth` and nothing else. | the literal `2` is gone from `spawn.ts`; `test/spawn-policy.test.ts` asserts both the default and an override |
| 4 | Depth never gates a driving or ending verb. | `refuseClose` consults the subtree, not depth; the lease gates driving (`01-agent-model` §ownership) — **NONE** beyond review until T4 lands |
