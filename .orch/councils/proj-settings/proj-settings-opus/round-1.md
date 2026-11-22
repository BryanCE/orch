Score: 4/10

## Improvements

1. **"How a reader gets the project's value": move the resolver into orchd. The CLI and the bridge must not resolve the project file themselves.** As written, the plan breaks Rule 21. `repositoryRootOf` lives in `src/worktrees/repository.ts`, which imports `node:child_process`. `src/worktrees/` is in `SERVER` in `scripts/check-layers.ts:44`. The CLI (`src/commands/`) and the bridge (`src/agent/`, `extensions/`) are client code per `docs/rules/layers.md`, so neither may import it, and the baseline cannot grow. The section should say:
   - The one resolver is server code. It takes a directory, finds the root with `repositoryRootOf`, and merges the project file over the install file. Only orchd calls it.
   - The CLI gets a project's settings, with sources, over a new RPC that carries the caller's `cwd`. Name the RPC.
   - The bridge's `tool_call` wrap (`src/agent/tools.ts:305-307`) and the claude hook's `preToolUse` (`extensions/claude/index.ts:87`) need the project's locked list. They get it from orchd: on attach, or by sending every bash command to `command-lock`. Pick one.
   - The CLI's dispatch header is built at `src/commands/control.ts:344` from the caller's settings. That is wrong once settings belong to a project: a dispatch from repository A to an agent in repository B would carry A's verify commands. Either the header is built in orchd from the target agent's stored directory, or the CLI asks orchd for the target's resolved rules. `report.ts:161` changes the same way, keyed on `agent.cwd`.

2. **"The project file" plus a new "Trust" section: a project file that arrives with a clone is inert until the human approves it.** Criterion 4 is not met today. Gates are install-only, but `workers.verify_commands` from a cloned file still makes every worker run whatever commands the repository names. And any worker with write tools can edit `.orch/settings.json` directly, which bypasses `agents.writable_settings` and `refuseUngrantedAgentWrite` (`src/commands/settings.ts:82`) entirely. The plan should say:
   - orchd keeps a store row per repository root holding the sha256 of the approved file.
   - A file whose hash does not match an approval is ignored: the install value wins. `orch settings` and `orch doctor` report it as "unapproved project file at <path>".
   - The operator approves with one verb. Name it, and route it through the existing grant machinery. `requestGrant`/`grantIsApproved` already do this for `command.run` at `command-lock.ts:90-92`.
   - A write by a granted agent through `orch settings` re-stamps the hash. A direct file edit does not.
   - With this in place, the "checked in or ignored" open question stops being a security question.

3. **"The project file / Shape": define the project file's own schema and say what happens when a read finds something wrong.** "The same JSON shape as the install file" cannot hold. `SETTINGS_FILE_SCHEMA` (`src/settings/schema.ts:134-139`) requires `runtime` and `schemaVersion`, and `runtime` is install-only. The section should say:
   - There is a `PROJECT_SETTINGS_FILE_SCHEMA`: a `z.strictObject` with `schemaVersion: z.literal(SETTINGS_SCHEMA)` and only the project keys, all optional, derived from the registry's project flag so the two cannot drift.
   - On read, a file holding a non-project key such as `gated_commands` or `agents.writable_settings` is an error that names the file and the key. It is never merged and never silently dropped. "Refused" today only covers the write path.
   - A malformed project file refuses every spawn, dispatch and council in that repository with that message, per Rule 8's "validated loudly".
   - The same per-key validators run on project values. That covers the `{cwd}` fixed-path refusal on `verify_commands`, and the cross-key check at `src/settings/read.ts:140-143` that holds project `council.models` against the install's `models.allowed`.

4. **"What this job delivers §2" and "How a reader…": state the merge rule per key.** "Project over install" leaves lists undecided. Replacing `locked_commands.commands` would let a repository drop a machine-wide lock the human set, which loosens it. The section should say:
   - Every project key is replaced whole, except `locked_commands.commands`. That key is the union of install and project, so a project can only add locks.
   - `locked_commands.applies_to` (`registry.ts:243`) is named install-only.

5. **"How a reader gets the project's value": list every reader, with the directory each one resolves against.** Missing from the plan:
   - The orchd council: `src/daemon/server/council.ts:55` (`council.directory`), `:86` (`scale`), `:142` (`rounds`), `:159` (worker header via `workerHeaderContextOf`) and `:182`. Each should resolve against the council's stored `cwd`.
   - The CLI's `commands/council.ts:50` (`council.models`).
   - `setup/composition.ts:135` (lineup write).
   - `settings/read.ts:140` (validation).
   - The doctor's `daemon/server/doctor/settings-file.ts:36` (`locked_commands.commands` count).
   - `policy/command-gate.ts:57` (`gatedPatterns`, the one list both the bridge and the hook use).
   - `commands/control.ts:344` (the real dispatch call site behind `spawner.ts:25`).
   - `commands/settings.ts:45` `rawSetting`, which reads the install file directly to decide provenance and needs a project counterpart through the resolver.

   Also replace "the council settings the `council/` job adds" with the four keys: `council.directory`, `council.scale`, `council.rounds`, `council.models`.

6. **"How a reader…": pin the directory for the lock ruling.** `lockCommand` (`command-lock.ts:86-90`) gets both `params.cwd` and an agent. The section should say which one picks the project: the agent's stored directory when `agent !== null`, else `params.cwd` for the human's `orch lock`. It should also say that the bridge's wrap list and orchd's ruling come from that same resolution, so they never disagree.

7. **"How a reader…": reuse what exists (Rule 16) and settle what "project" means.**
   - `repoRootFor` at `src/policy/space.ts:44-49` already does "`hereAgentIfAny`, then `agentLocation().cwd`, then the repository root". Export and call it rather than re-describing the steps.
   - orch already has a "project": `projectRoot()` at `src/util.ts:249` is `ORCH_PROJECT ?? process.cwd()`. The plan must say the project-settings root is `repositoryRootOf` of the stored directory, never `ORCH_PROJECT`, because environment is never identity (Rule 11). Rename one of the two so the word means one thing.

8. **"The project file / Where": make the path a setting (Rule 17).** `.orch/settings.json` is a hardcoded path and name. Add an install-only `project.file` setting with default `.orch/settings.json`, following the `council.directory: ".orch/councils"` pattern (`schema.ts:127`). It needs a schema entry, a `SETTINGS_DEFAULTS` value, a registry help line and the required type. Also note that `.orch/` already holds councils, so whether `.orch/` is ignored decides both.

9. **"Open questions": close what the plan or the code already decides. Leave only the user's real choices.**
   - Worktree: already decided by "Where", since `repositoryRootOf` returns the main root (`repository.ts:26-33`). Delete the question, and state the consequence: a worktree agent reads the main checkout's working copy, not its branch's.
   - Flag names: decide them. `--install` writes the install file from inside a repository. `--clear` becomes generic for any key through the existing `clearRegisteredSetting` (`registry.ts:329`), so the `thinking`-only `--clear` stops being a separate path.
   - Doctor: decide yes, per Rule 9. It takes the caller's `cwd` over RPC. Do not copy `checkWorktreeGitignore`'s use of orchd's own `process.cwd()` (`doctor/settings-file.ts:115`).
   - Setup: decide no.
   - Other keys: either name the set or mark it explicitly out of scope for this job.
   - Keep only "checked in or ignored" for the user, framed with the trust model from item 2.

10. **"`orch settings` inside a repository": fix the source label and move the grant check.**
   - Both files are named `settings.json`, so the source `settings.json` is ambiguous. Use `project` and `install`, and change `SettingSource` at `src/types/settings.ts:103` (not `:102`) and every fixture with it, per Rule 8.
   - Say that an agent's project write goes through orchd, so the grant check runs server-side against the caller credential rather than in the client.
   - The "no RPC carries a settings write" line under "What stays the same" then needs rewording for project writes.

11. **Fix the citations that do not match the code (criterion 2):**
   - `registry.ts:316` is `registeredSetting`'s throw. `writeRegisteredSetting` is `:321`.
   - `agent/tools.ts:300` is the read-only check. The settings read is `:305-307`.
   - `extensions/claude/index.ts:97` is `reportStart`'s timeout. The settings use is `:87`.
   - `work-loop.ts:104` should be `:105`.
   - `spawn/index.ts:145` should be `:146`.
   - `claude.ts:139,161`: `inherit_mcp` is not only in the per-install file. `mcpArgv` (`claude.ts:145-147`) applies it per launch as `--strict-mcp-config`, and only the `ENABLE_CLAUDEAI_MCP_SERVERS` env at `:89` is in the file. Restate the reason `inherit_mcp` stays install-only accordingly.

12. **Add a "Tests" section** that names the test files that change and the typed fixture factory for a project file (Rule 13). The files are `settings-precedence.test.ts`, `settings-command.test.ts`, `settings-view.test.ts`, `settings-editor.test.ts`, `command-gate.test.ts`, `settings-registry.test.ts` and the council tests. Any test that needs a repository root uses a fake `.git` marker under the temp dir and runs no git, per Rule 0.1.
