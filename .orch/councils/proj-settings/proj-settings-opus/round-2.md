Score: 7/10

The rewrite fixes most of what all three of us raised in round 1:
- the resolver sits in orchd, behind RPCs;
- a Trust section;
- a merge rule per key, with `locked_commands.commands` as a union;
- a strict project schema built from `PROJECT_KEYS`;
- a complete reader list with the directory each reader resolves against;
- the linked-host header;
- `project.file` as a setting;
- the citations corrected.

Where I disagree with the other reviews:
- **Sonnet's item 9 asks for the resolver in the shared layer.** I side with the plan. `repositoryRootOf` is in `src/worktrees/`, which `check-layers` treats as server code, so a shared resolver would break Rule 21.
- **GPT's item 1 asks that an agent's write stay pending until the human approves it.** I side with the plan. `agents.writable_settings` is already the human's gate on that write.
- **GPT's item 5 asks that every council key stay install-only.** I accept `council.models` and `council.rounds` as project keys. Models stay held to the install's `models.allowed`, and a cloned value takes effect only after approval.
- **Sonnet's approved-roots list in the install file.** The plan's store table is the better place under Rule 18.

What still costs points is below.

## Improvements

1. **Trust, "What approves": stop a write from approving content nobody approved.**
   - The hole: "A write through orchd … records the new file's hash in the same step" hashes the whole file. A granted agent can edit `.orch/settings.json` with its file tool, or a clone can bring one, and then one `orch settings workers.verify_commands …` through orchd approves everything else in the file. That includes a cloned `council.models`, extra `locked_commands.commands`, or the agent's own hand-edited values. The same happens to the human's own write into a cloned file. This is the last criterion-4 gap.
   - The section should say: `project-setting-write` reads the file once. If the file exists and its sha256 does not match the recorded approval, the write is refused for every caller with `unapproved project file at <path>; run orch settings approve`. A write builds the new file from the approved content only.
   - `orch settings approve` prints every project key and value it is about to approve, then hashes the exact bytes it validated and printed. It reads the file once, so nothing can change between the check and the hash.

2. **Trust, "An approved file that fails its schema": the "only when a build changes the schema" claim is false. Decide the other case.**
   - `requireCouncilModelsAllowed` (`packages/orch/src/settings/read.ts:136`) checks project `council.models` against the install's `models.allowed`. So the human narrowing `models.allowed`, or changing `defaults.models`, invalidates an approved project file with no build involved.
   - As written, that would refuse every spawn and dispatch in the repository over a council lineup.
   - Decide it per key: a `council.models` that fails the cross-file check refuses only `council convene` in that repository, naming the model and the install key. Every other reader takes the rest of the file.
   - Or state plainly that the whole repository is refused, and that doctor says so.

3. **"`orch settings` inside a repository": fix the `--clear` and editor write paths.**
   - The contradiction: the bullet says `--clear` "calls `clearRegisteredSetting` (`registry.ts:329`)" on "the file the write would land in". But `clearRegisteredSetting(settings: SettingsManager, key)` only ever writes the install file. And the plan's own Rule 21 design says the CLI never writes the project file; `project-setting-write { clear: true }` does.
   - Say: on a project key inside a repository, `--clear` and the editor's Project-view reset send `project-setting-write { cwd, key, clear: true }`. `clearRegisteredSetting` stays for the install file and the Install view.
   - Say the same for an ordinary editor save in the Project view. Today the editor saves through `writeRegisteredSetting` on the install `SettingsManager`, and the plan names only the lineup picker's Project-view write.

4. **RPCs: make the directory rule and the RPC shapes agree.**
   - "Which directory each reader resolves against" says an agent's own directory is never taken from what it sends. But `project-setting-write` takes `{ cwd, key, value }` from any caller.
   - Say: for a caller with an agent row, orchd ignores `cwd` and uses `repoRootFor` on the caller's stored directory. Only a caller with no agent row uses `cwd`.
   - Also state the caller of `project-settings { agent }`. The bridge sends its own launch key, and orchd checks it against the caller credential.
   - Also decide what an agent's write of a project key does outside any repository. Today it "writes the install file as it does today", which brings back the cross-project bleed the job exists to stop. Refuse it, just as `--install` is refused for an agent.

5. **"The pattern list an agent's process wraps with": settle the per-call RPC.**
   - The pi/omp `tool_call` handler (`packages/orch/src/agent/tools.ts:298`) is synchronous today and edits `event.input.command` in place. Asking `project-settings` "at each bash call" makes it async.
   - Say that the handler becomes `async`, and that the harness awaits a returned promise before it runs the call. If it does not await, the plan needs another route, for example the list resolved at `session_start` and refreshed after `project-setting-write`.
   - Name the timeout setting the call uses (Rule 17), for example `daemon.report_timeout_ms`, for both the bridge and the claude hook.
   - Say that the resolver hashes the file on every resolve. That cost now lands on every bash call.

6. **"A dispatch" and "Linked hosts": name the wire-shape change (Rule 8, one shape).**
   - `workerRules` leaves `workerHeaderContextOf`, so the `worker.context` schema in `dispatch` (`packages/orch/src/daemon/client/protocol.ts`) loses `gatedCommands` and `verifyCommands`. Name the type that changes, `WorkerHeaderContext` in `src/types/core.ts`, and every caller: `control.ts:344` and `council.ts:159`.
   - Say that `dispatch` (`packages/orch/src/daemon/server/handlers/write.ts:327-333`) composes the header only in `writeText`'s `here` branch (`write.ts:310`). The `there` branch sends `PEER_DRIVE`'s dispatch action (`protocol.ts:470`) with a new `worker: { harness, context }` in place of finished text.
   - Name the request a linked spawn's first prompt travels in. "Changes the same way" is not enough to build from.

7. **"Words": either finish the `fleetRoot()` rename or drop its purpose clause.**
   - Renaming only the function leaves the word "project" on the `ORCH_PROJECT` env var, on the presence `project` field (`packages/orch/src/agent/presence.ts:91`, `extensions/claude/index.ts:74`, `extensions/codex/index.ts:44`), and on `peer-view`'s `projectRoot` parameter (`packages/orch/src/agent/peers.ts:29,35`). So "project means one thing" does not hold.
   - Rule 8 allows renaming them all in the same change. Decide whether to.
   - There are 6 calls and one doc comment (`spawner.ts:33`), not 7 call sites.

8. **Tests: add the cases the new design creates.**
   - A write into an unapproved file is refused.
   - Approve prints the values it approves and hashes those bytes.
   - An agent's `cwd` is ignored on `project-setting-write`.
   - Narrowing `models.allowed` after an approval.
   - `dispatch` composes `verify_commands` for the target's repository, not the caller's.
   - `peer-drive`'s dispatch carries `worker` and no finished text.

   Name the files: the `write.ts` dispatch test, the peer-drive test, and the council test files by name rather than "the council tests".
