# W13: the store keeps the write root, and a restart reads it back

Context. An agent launched with a write root may change files only inside that one directory.
The root travels on the agent's `WorkerPolicy` (`workers.writeRoot: string | null`). This wave
records it with the agent and has a restart read it back, so a relaunched agent is still held
to it. The two sections touch different files and run at the same time. Paths are from the
repo root `/home/bryan/orch`. Code style: TypeScript, no `as` casts, no `any`, double quotes, a
`/** ... */` doc comment on every export.

The shapes both sections build against:
```ts
// packages/orch/src/store/write-root-rows.ts, added by T15
export function setWriteRoot(orchDir: OrchDir, agentId: string, now: number, root: string): void
export function agentWriteRoot(orchDir: OrchDir, agentId: string): string | null
// packages/orch/src/policy/workers.ts, already there
export function confinedPolicy(settings: OrchSettings, root: string, tools: ToolVocabulary): WorkerPolicy
export function policyTools(policy: WorkerPolicy): string | undefined
export function policyEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>>
// packages/orch/src/daemon/server/spawn/models.ts, already there
export function policyCommand(adapter: string, workers: WorkerPolicy, launch?: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] }): string
```

Run the verify command your header names over the files you edited. Run no test and no
typecheck: the new table has no migration yet, so a store test cannot pass.

## T15 The table, its rows, and the spawn that writes one
Edit `packages/orch/src/db/schema.ts`: directly after the `agentTunings` table (it ends at
L342) add
```ts
/** The one directory an agent may write in, for an agent launched under a write root. An agent
 *  with no row writes wherever its harness lets it. Written with the spawn and never changed. */
export const agentWriteRoots = sqliteTable("agent_write_roots", {
  agentId: text("agent_id").primaryKey().references(() => agents.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  setAt: integer("set_at").notNull(),
});
```
Create `packages/orch/src/store/write-root-rows.ts`:
```ts
// The write root an agent was launched under. One row per agent that has one.
import { eq } from "drizzle-orm";
import { agentWriteRoots } from "../db/schema.ts";
import { orm } from "./connection.ts";
import type { OrchDir } from "../types/core.ts";

/** Record the one directory an agent may write in. Written once, with the agent's spawn. */
export function setWriteRoot(orchDir: OrchDir, agentId: string, now: number, root: string): void {
  orm(orchDir).insert(agentWriteRoots).values({ agentId, path: root, setAt: now }).run();
}

/** The directory an agent may write in, or null for an agent with no write root. */
export function agentWriteRoot(orchDir: OrchDir, agentId: string): string | null {
  const row = orm(orchDir).select({ path: agentWriteRoots.path }).from(agentWriteRoots).where(eq(agentWriteRoots.agentId, agentId)).get();
  return row === undefined ? null : row.path;
}
```
Edit `packages/orch/src/types/store.ts`: in `SpawnRegistration`, directly after the `worktree`
member, add
```ts
  /** The one directory the agent may write in, when it was launched under a write root. */
  writeRoot?: string;
```
Edit `packages/orch/src/backends/registration.ts`: in the object `unplacedRegistration`
returns, directly after `thinking: opts.thinking,` add
`writeRoot: opts.workers?.writeRoot ?? undefined,`.
Edit `packages/orch/src/daemon/server/spawn/placement.ts`: in `registerSpawnedTabAgent`,
directly after `worktree: spec.worktree,` add `writeRoot: spec.workers?.writeRoot ?? undefined,`.
Edit `packages/orch/src/store/spawn-registration.ts`:
- Add `import { setWriteRoot } from "./write-root-rows.ts";`.
- In `writeEnvironment`, directly after the `setTuning(...)` line, add
  `if (input.writeRoot !== undefined) setWriteRoot(directory, agentId, now, input.writeRoot);`.
- In the doc comment of `writeEnvironment`, `plexer, handle, process, space, tuning, worktree`
  becomes `plexer, handle, process, space, tuning, write root, worktree`.
Edit `packages/orch/test/store-rebuild-schema.test.ts` (L23): in the first list of
`expectedInventory`, add `"agent_write_roots"` directly after `"agent_tunings"`.
Create `packages/orch/test/store-write-root-rows.test.ts`. Copy the imports it needs, the
`dirs` array, the `afterEach` and the `fixture` function from
`packages/orch/test/store-interval-rows.test.ts` (L1-27), keeping only the imports the new
file uses, and import `agentWriteRoot` and `setWriteRoot` from
`"../src/store/write-root-rows.ts"`. Cases, in one `describe("agent write roots", ...)`:
- An agent with no row: `agentWriteRoot(dir, "a")` is `null`.
- After `setWriteRoot(dir, "a", 5, "/repo/out")`: `agentWriteRoot(dir, "a")` is `"/repo/out"`.
- A second `setWriteRoot(dir, "a", 6, "/repo/other")` throws.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T16 A restart relaunches under the stored write root
Create `packages/orch/src/daemon/server/agent-policy.ts`:
```ts
// The policy an agent that already exists relaunches under. A spawn plans each agent's policy
// from the request. A restart has only the store, so what a relaunch must keep is read back here.
import { confinedPolicy } from "../../policy/workers.ts";
import { CommandRefusal } from "../../refusal.ts";
import { agentWriteRoot } from "../../store/write-root-rows.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { OrchDir } from "../../types/core.ts";
import type { WorkerPolicy } from "../../types/policy.ts";
import type { OrchSettings } from "../../types/settings.ts";

/** The policy `agentId` relaunches under on `adapter`: its write root's, or undefined for an
 *  agent with no write root, which relaunches as its harness's own launch. A harness that cannot
 *  refuse a tool call is refused, since the agent would come back able to write anywhere. */
export function relaunchPolicy(directory: OrchDir, settings: OrchSettings, adapter: AgentAdapter, agentId: string): WorkerPolicy | undefined {
  const root = agentWriteRoot(directory, agentId);
  if (root === null) return undefined;
  if (adapter.toolVocabulary === null) throw new CommandRefusal(`this agent may write only inside ${root}, and ${adapter.id} cannot hold it to that: orch has no way to refuse its tool calls`);
  return confinedPolicy(settings, root, adapter.toolVocabulary);
}
```
Edit `packages/orch/src/daemon/server/handlers/restart-form.ts`:
- Add `import { policyEnv, policyTools } from "../../../policy/workers.ts";` and
  `import { relaunchPolicy } from "../agent-policy.ts";`.
- `restartOpts` and its doc comment (L52-70) become:
  ```ts
  /** The spawn opts of a restart, from what the store holds about the agent: its tuning, its
   *  worktree, and the policy of its write root when it has one. */
  function restartOpts(state: DaemonState, adapter: AgentAdapter, agent: HereAgent, view: AgentView, form: FormId): BackendSpawnOpts {
    const { model, thinking } = view.tuning;
    const worktree = worktreeOf(state.directory, agent);
    const settings = state.services.settings.current();
    const workers = relaunchPolicy(state.directory, settings, adapter, view.id);
    return {
      ...(worktree === null ? {} : { worktree }),
      form,
      key: view.id,
      name: view.name,
      orchDir: state.directory,
      cwd: view.environment.cwd,
      ...(model === null ? {} : { model }),
      ...(isThinkingLevel(thinking) ? { thinking } : {}),
      preferredModels: settings.models.preferred[adapter.id] ?? [],
      ...(workers === undefined ? {} : { workers, tools: policyTools(workers), env: policyEnv(adapter, model === null ? undefined : model, workers) }),
    };
  }
  ```
Edit `packages/orch/src/daemon/server/handlers/relaunch.ts`:
- Add `import { policyEnv, policyTools } from "../../../policy/workers.ts";`,
  `import { relaunchPolicy } from "../agent-policy.ts";`, add `policyCommand` to the import from
  `"../spawn/models.ts"` (L13), and import `CommandRefusal` from `"../../../refusal.ts"` if the
  file does not import it yet.
- In `planRelaunch`, the `const command = ...` line (L101) becomes:
  ```ts
  const workers = relaunchPolicy(state.directory, settings, adapter, key);
  if (workers !== undefined && request.cmd !== null) throw new CommandRefusal("this agent has a write root, and --cmd replaces the launch that holds it there; restart it without --cmd");
  const launch = { model, thinking: tuning.thinking, preferredModels: settings.models.preferred[adapter.id] ?? [] };
  const command = request.cmd ?? (workers === undefined ? adapterCommand(adapter.id, settings, launch) : policyCommand(adapter.id, workers, launch));
  ```
- In `restartAttached`, directly above `const opts: BackendSpawnOpts = {` (L150) add
  `const workers = relaunchPolicy(state.directory, state.services.settings.current(), recorded, key);`
  and add this as the last member of that `opts` object:
  `...(workers === undefined ? {} : { workers, tools: policyTools(workers), env: policyEnv(recorded, relaunch.model === null ? undefined : relaunch.model, workers) }),`
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
