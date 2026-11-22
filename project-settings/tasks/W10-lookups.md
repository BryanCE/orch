# W10 lookups

Context for every section. These tasks only read code and write one report file each. Edit no
source file. Run no command. Paths are from the repo root `/home/bryan/orch`. Report format:
Markdown, one `##` heading per numbered question, each fact as a bullet ending in `path:line`,
signatures and types quoted in code blocks.

## T1 Where a new agent's status row is first written
Write `project-settings/findings/L18-status-at-spawn.md`:
1. `agent_status` rows (`agentStatus` in `packages/orch/src/db/schema.ts`): quote the table's
   columns. List every function in `packages/orch/src/` that inserts or upserts a row into it,
   with its signature.
2. For each way orchd launches an agent (a tab spawn through
   `packages/orch/src/daemon/server/spawn/placement.ts`, a held launch through
   `spawnHeldLaunch` in `packages/orch/src/daemon/server/handlers/lifecycle.ts`, a detached
   headless launch, a spawn on a linked host through `registerHostedAgent`): the function that
   records the new agent, and whether it writes an `agent_status` row at that moment. Quote the
   call.
3. Where `BackendSpawnOpts.project` (`packages/orch/src/types/backend.ts`) is read inside
   orchd after the launch is built, if anywhere.
4. `acceptStatusReport` and `mergeAgentStatus` in `packages/orch/src/store/status-rows.ts`:
   quote their signatures, and say whether a `StatusPatch` with only `project` set writes a
   row for an agent that has none yet.

## T2 Doctor and the settings file check
Write `project-settings/findings/L19-doctor.md`:
1. `packages/orch/src/daemon/server/doctor/settings-file.ts`: quote every exported function's
   signature and the body of the function that counts locked commands (about L36). Where it
   uses `process.cwd()`, quote the line.
2. How `orch doctor` reaches it: the CLI file and function that asks orchd, the RPC method
   name, its request schema in `packages/orch/src/daemon/client/protocol.ts` (quote it), and
   the orchd handler that runs the checks, down to the call of the settings-file check.
3. The shape of one doctor finding (the type a check returns), quoted, and one existing check
   that reports an invalid value as a finding, quoted, as the model to copy.
4. `packages/orch/test/doctor-settings-defects.test.ts`: how it builds the state and calls the
   check, quoted from its first test.
