# T9. Hold the pane census; drop `isAvailable()` from every hot path

Repo: /mnt/c/dev/personal/orch, package `packages/orch/`. Rules: no `as` casts, no `any`, no back-compat, no `?? <literal>` on a settings read, comments two lines max. Runtime code targets `node:` builtins only.

Two rules from Bryan:
- Environment is settled at setup and doctor. `settings.enabled.backends` is the declaration. No `isAvailable()` (a PATH scan) on a hot path. A declared backend that does not answer is an error that names the fix, never a silent skip.
- The pane census (`placementInventory.list()`, three `herdr` child processes) is listed once and trusted. It is re-listed only after an agent's record changes (`refreshAgent`, which spawn, close, tile, move and the reaper all fire) or after a listing breaks.

1. Create `src/entities/census.ts`:
   ```ts
   import { allBackends } from "../backends/registry.ts";
   import { onAgentRefreshed } from "../store/agent-view.ts";
   import { registerMemoReset } from "../store/connection.ts";
   import type { Backend, BackendTarget } from "../types/backend.ts";
   import type { OrchSettings } from "../types/settings.ts";
   import { errorMessage } from "../util.ts";

   /** What each environment answers it still holds, by handle, keyed by backend id. */
   export type Census = ReadonlyMap<string, ReadonlyMap<string, BackendTarget>>;

   const held = new Map<string, ReadonlyMap<string, BackendTarget>>();
   registerMemoReset(() => held.clear());
   onAgentRefreshed(() => held.clear());

   /** The plexers the settings enable; setup and doctor settled whether they exist. */
   export function enabledBackends(settings: OrchSettings): Backend[] {
     const enabled = new Set(settings.enabled.backends);
     return allBackends().filter((backend) => enabled.has(backend.id));
   }

   function listPanes(backend: Backend, inventory: NonNullable<Backend["placementInventory"]>): ReadonlyMap<string, BackendTarget> {
     try {
       return new Map(inventory.list().map((target) => [String(target.handle), target]));
     } catch (error) {
       throw new Error(`${backend.id} did not list its panes: ${errorMessage(error)}. Run: orch doctor`);
     }
   }

   /** The census as orch holds it: listed once per enabled plexer, trusted until an agent record changes. */
   export function heldCensus(settings: OrchSettings): Census {
     const census = new Map<string, ReadonlyMap<string, BackendTarget>>();
     for (const backend of enabledBackends(settings)) {
       const inventory = backend.placementInventory;
       if (!inventory) continue;
       const current = held.get(backend.id) ?? listPanes(backend, inventory);
       held.set(backend.id, current);
       census.set(backend.id, current);
     }
     return census;
   }

   /** Drop every held listing; the next census lists again. For a break seen outside the store. */
   export function forgetCensus(): void {
     held.clear();
   }
   ```
   If `placementInventory` is typed differently on `Backend` (read `src/types/backend.ts`), use the type it has; `NonNullable<Backend["placementInventory"]>` is the intent.

2. Edit `src/entities/inventory.ts`:
   - Delete `enabledBackends` (L25-31, with its comment), `paneCensus` (L33-42), and the `type Census` alias (L19-21, with its comment). Import `enabledBackends`, `heldCensus` and `type Census` from `./census.ts`. Delete the now-unused `allBackends` import.
   - In `buildEntities` (L182): `census: paneCensus(settings)` → `census: heldCensus(settings)`.

3. Edit `src/backends/registry.ts` `validateBackend` (L41-46): delete the line `if (!backend.isAvailable()) throw new Error(...)`. The settings declared it; the first real call fails loudly if the binary is gone.

4. Edit `src/daemon/client/registration.ts` L44: `allBackends().find((backend) => backend.isAvailable() && backend.isInsideSession())` → `allBackends().find((backend) => backend.isInsideSession())`. Being inside a plexer's session proves the plexer.

5. Tests. `test/helpers/backend.ts` is the fake backend; tests that add or remove panes on the fake between two entity reads without a store write now see the held listing. Run the test list below; for each failure of that exact kind, add `forgetCensus()` (import from `../src/entities/census.ts`) right after the pane mutation in the test. That call is the test saying "a pane moved outside orch". Do not weaken any assertion. A failure of any other kind is `blocked`.

Run, once, after the edits (Windows side owns the disk):
```
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT'; bun check"
WINROOT=$(wslpath -w "$(git rev-parse --show-toplevel)"); powershell.exe -NoProfile -Command "cd '$WINROOT\packages\orch'; bun test test/a-row-is-not-a-pane.test.ts test/command-space-fields.test.ts test/space-policy.test.ts test/close-always.test.ts test/close-is-keyed-by-agent-id.test.ts test/close-reports-every-target.test.ts test/commands-lifecycle.test.ts test/control-dispatch.test.ts test/owner-scoping.test.ts test/rename-syncs-the-pane-border.test.ts test/spawn-identity.test.ts test/spawn-placement.test.ts test/cli-backends-tmux.test.ts test/daemon-registration.test.ts"
```

Other agents edit other files at the same time. If `bun check` is red only in files you did not touch, you are done: report `pending: <those files>`.

Report: one line. `done: <files>, check clean, tests <n> pass, forgetCensus added in: <tests or none>`, `pending: <files>`, or `blocked: <exact error>`.
