# T6. Hold the fleet's capacity in orchd; recompute only after a change

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, no `?? <literal>` on a settings read, comments two lines max. Runtime code targets `node:` builtins only.

Another agent (T5) adds `fleetCapacity(views, presence, settings): HeldCapacity` and `HeldCapacity` to `src/policy/capacity.ts` at the same time. Import them by those names. If `bun check` says they do not exist yet, report `pending: src/policy/capacity.ts`.

The mechanism is the one the fleet (`src/store/agent-view.ts:173` `fleets`) and presence (`src/presence/store.ts:208` `held`) use: a module-level `Map<OrchDir, …>`, `registerMemoReset` to clear it for tests, and a patch point per mutation. Capacity changes when a view appears, disappears or moves space (every one of those runs `refreshAgent`, which calls the `onAgentRefreshed` listeners), when a process's liveness flips (the liveness tick's `probeAllProcesses`), or when settings reload.

1. Create `src/daemon/server/capacity.ts`:
   ```ts
   import { fleetCapacity, type HeldCapacity } from "../../policy/capacity.ts";
   import { loadPresence } from "../../presence/store.ts";
   import { agentViewIndex, onAgentRefreshed } from "../../store/agent-view.ts";
   import { registerMemoReset } from "../../store/connection.ts";
   import type { OrchDir } from "../../types/core.ts";
   import type { OrchSettings } from "../../types/settings.ts";

   const held = new Map<OrchDir, HeldCapacity>();
   registerMemoReset(() => held.clear());
   onAgentRefreshed((orchDir) => forgetCapacity(orchDir));

   /** The fleet's capacity as orchd holds it: computed after a change, served as is until the next. */
   export function heldCapacity(orchDir: OrchDir, settings: OrchSettings): HeldCapacity {
     const current = held.get(orchDir);
     if (current !== undefined) return current;
     const computed = fleetCapacity(agentViewIndex(orchDir), loadPresence(orchDir), settings);
     held.set(orchDir, computed);
     return computed;
   }

   export function forgetCapacity(orchDir: OrchDir): void {
     held.delete(orchDir);
   }
   ```
2. Edit `src/presence/store.ts` `probeAllProcesses` (L295-300): return `boolean`, true when any `alive` value changed.
   ```ts
   /** Re-ask the OS about every held process. True when any agent's liveness flipped. */
   export function probeAllProcesses(root: OrchDir): boolean {
     const current = held.get(root);
     if (!current) return false;
     let changed = false;
     for (const [agentId, process] of current.processes) {
       const alive = recordedInstanceIsLive(process.pid, process.startToken);
       if (current.alive.get(agentId) !== alive) changed = true;
       current.alive.set(agentId, alive);
     }
     return changed;
   }
   ```
3. Edit `src/daemon/server/status-report.ts` `startLivenessTick` (L100-128): L111 `probeAllProcesses(orchDir);` becomes
   `if (probeAllProcesses(orchDir)) forgetCapacity(orchDir);`
   Add `import { forgetCapacity } from "./capacity.ts";`.
4. Edit `src/daemon/server/orchd.ts`: in the `watchSettings` `onChange` callback (L150), first line of the body: `forgetCapacity(directory);`. Add the import from `./capacity.ts`.
5. Create `test/daemon-capacity-hold.test.ts`:
   ```ts
   import { afterAll, describe, expect, test } from "bun:test";
   import { forgetCapacity, heldCapacity } from "../src/daemon/server/capacity.ts";
   import { closeAllStores } from "../src/store/connection.ts";
   import { seedAgent, seedLiveProcess, seedOrch } from "./helpers/agent.ts";
   import { testServices } from "./helpers/services.ts";
   import { tempOrchDir } from "./helpers/tempdir.ts";
   import { mintAgentId } from "../src/backends/identity.ts";

   afterAll(() => closeAllStores());

   describe("orchd holds the fleet capacity", () => {
     test("serves the held value until a view changes, then recomputes", () => {
       const orchDir = tempOrchDir("orch-capacity-hold-");
       const settings = testServices({ orchDir, settings: {} }).settings.current();
       const root = mintAgentId();
       seedOrch(orchDir, root);
       const first = heldCapacity(orchDir, settings);
       expect(heldCapacity(orchDir, settings)).toBe(first);
       const worker = mintAgentId();
       seedAgent(worker, { spawnedBy: root }, orchDir);
       seedLiveProcess(orchDir, worker);
       const second = heldCapacity(orchDir, settings);
       expect(second).not.toBe(first);
       expect(second.total.used).toBe(first.total.used + 1);
     });

     test("forgetCapacity drops the held value", () => {
       const orchDir = tempOrchDir("orch-capacity-forget-");
       const settings = testServices({ orchDir, settings: {} }).settings.current();
       const first = heldCapacity(orchDir, settings);
       forgetCapacity(orchDir);
       expect(heldCapacity(orchDir, settings)).not.toBe(first);
     });
   });
   ```
   `seedAgent(key, facts, directory)` is `test/helpers/agent.ts:44`; if its `facts` shape names the spawner differently, use that name. `seedLiveProcess(directory, agentId, now?)` is `:75`. If `seedAgent` or `seedLiveProcess` already runs `refreshAgent` through `registerSpawnedAgent`, the first test holds as written; if `seedLiveProcess` does not (liveness lands without a refresh), call `forgetCapacity(orchDir)` is NOT the fix: the fix is that `seedLiveProcess` goes through `recordProcess` (`store/interval-rows.ts:46`), which does refresh. Read the helper before you assume.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/daemon-capacity-hold.test.ts test/daemon-events.test.ts test/work-notify.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: <files>, check clean, tests <n> pass`, `pending: <files>`, or `blocked: <exact error>`.
