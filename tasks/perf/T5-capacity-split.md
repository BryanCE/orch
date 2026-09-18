# T5. Split `computeFleetCapacity` into a whole-fleet compute and an O(roots) scope

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, comments two lines max.

Goal: orchd will hold the whole fleet's capacity once and scope it per caller without touching views or presence. `computeFleetCapacity` keeps its signature and becomes the composition of the two new functions, so every caller and test stays as is.

Edit `src/policy/capacity.ts` only.

1. Below `FleetCapacity` (L23-28) add:
   ```ts
   /** The whole fleet's capacity plus each pack's live members by space (null = no space). */
   export interface HeldCapacity extends FleetCapacity {
     readonly membersBySpace: ReadonlyMap<string, ReadonlyMap<string | null, number>>;
   }
   ```
2. Delete `selectedPack` (L75-86).
3. Replace `computeFleetCapacity` (L89-117) with three functions:
   ```ts
   /** Every pack on the machine, from views and presence, without process or filesystem reads. */
   export function fleetCapacity(
     views: ReadonlyMap<string, AgentView>,
     presence: ReadonlyMap<string, PresenceEntry>,
     settings: CapacitySettings,
   ): HeldCapacity {
     const live = presenceAliveViews(views, presence);
     const cap = settings.fleet.max_agents_per_pack;
     const packsByRoot = new Map<string, CapacityPack>();
     const membersBySpace = new Map<string, Map<string | null, number>>();
     for (const view of live) {
       const root = rootAgent(view, views);
       const used = (packsByRoot.get(root.id)?.used ?? 0) + 1;
       packsByRoot.set(root.id, { root, used, cap });
       const bySpace = membersBySpace.get(root.id) ?? new Map<string | null, number>();
       bySpace.set(view.environment.space, (bySpace.get(view.environment.space) ?? 0) + 1);
       membersBySpace.set(root.id, bySpace);
     }
     const spaces = [...liveSpawnCounts(views, presence).entries()]
       .sort(([left], [right]) => left.localeCompare(right))
       .map(([id, used]) => ({
         name: spaceName(id, settings.spaces ?? {}) ?? id,
         used,
         cap: settings.fleet.max_agents_per_space[id] ?? null,
       }));
     const packs = [...packsByRoot.values()].sort((left, right) => left.root.id.localeCompare(right.root.id));
     return { packs, spaces, total: { used: live.length, cap: settings.fleet.max_agents_total ?? null }, membersBySpace };
   }

   export interface CapacityScope {
     readonly packRootId?: string | null;
     readonly packSpace?: string | null;
   }

   /** The packs in scope: one root, the roots with members in one space, or every root. Spaces and total are fleet-wide. */
   export function scopeCapacity(held: HeldCapacity, scope: CapacityScope): FleetCapacity {
     const { packs, spaces, total } = held;
     if (scope.packRootId !== undefined && scope.packRootId !== null) {
       return { packs: packs.filter((pack) => pack.root.id === scope.packRootId), spaces, total };
     }
     if (scope.packSpace === undefined) return { packs, spaces, total };
     const inSpace = packs.flatMap((pack) => {
       const used = held.membersBySpace.get(pack.root.id)?.get(scope.packSpace ?? null) ?? 0;
       return used === 0 ? [] : [{ ...pack, used }];
     });
     return { packs: inSpace, spaces, total };
   }

   /** Compute fleet usage without reading process or filesystem state. */
   export function computeFleetCapacity(
     views: ReadonlyMap<string, AgentView>,
     presence: ReadonlyMap<string, PresenceEntry>,
     settings: CapacitySettings,
     options: CapacityScope = {},
   ): FleetCapacity {
     return scopeCapacity(fleetCapacity(views, presence, settings), options);
   }
   ```
   `scope.packSpace ?? null` maps an explicit `null` (agents in no space) to the `null` key; `undefined` never reaches that line. The old behaviour for `packSpace: null` was "agents whose space is null"; keep it.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/capacity.test.ts test/commands-status.test.ts test/commands-spawn.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: capacity.ts, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
