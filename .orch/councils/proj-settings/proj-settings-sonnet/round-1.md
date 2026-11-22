Score: 5/10

## Improvements

1. **Add a trust gate to "The project file", and answer criterion 4 with it.** Today the plan stops a cloned file from touching `gated_commands`, `denied_commands` and `agents.writable_settings`, and then lets the same file set `workers.verify_commands`. That key is injected into every worker header as commands to run (`worker-prompt.ts:16`, `work-loop.ts:105`). A cloned repository can therefore tell every worker to run `curl … | sh`, and no gated pattern matches it. The plan notes in Open questions that the commands "run on whoever clones it" and leaves it there. Decide it. The install file keeps a list of approved project roots, written only by the human and not agent-writable. Add that key to the install-only list. The resolver ignores a project file whose root is not on the list, and `orch settings` inside such a repository says the file is ignored and how to approve it. Say what the approval records. A hash of the file means a later `git pull` that changes it needs approval again, and that is the safer choice.

2. **Add a merge-rule section for each project key.** "The project file over the install file" does not say what happens to arrays and nested objects, and the answer matters for criterion 4. `locked_commands.commands` is merged into `gatedPatterns` (`policy/command-gate.ts:57`) next to `gated_commands` and `denied_commands`. If the project value replaces the install value, a cloned file with `"commands": []` drops every lock the human set. State it per key. `locked_commands.commands` is the union of install and project and can only add. `workers.verify_commands` is replaced by the project value, which is the point of the job. Merge nested objects at the leaf, so `locked_commands.applies_to` stays install-only while `.commands` is a project key. Name which file wins a conflict between an install value and a project value of a different type.

3. **Fix the cwd source for the lock ruling in "How a reader gets the project's value".** The plan says orchd reads the stored directory of an agent that exists. `lockCommand` also serves the human's own `orch lock` with `agent === null` (`command-lock.ts:75-77,87`), and there the only source is `params.cwd`. A caller-supplied cwd can name any repository's permissive project file. Say that a registered agent always resolves from `agentLocation` and never from a cwd it sends. Say that only a caller with no agent row resolves from `params.cwd`. Say which repository wins when the two differ.

4. **Complete the reader list.** Criterion 2 needs every reader named, and these are missing or wrong:
   - `workerHeaderContextOf` is called from `commands/control.ts:344`, the dispatch path, and from `daemon/server/council.ts:159`, which runs in orchd. The plan files `spawner.ts:25` under "The CLI" and lists no council reader at all.
   - The plan says the council settings "the `council/` job adds", but `council.directory`, `council.scale`, `council.rounds` and `council.models` are already declared at `registry.ts:297-300`. Name which of them are project keys and name each reader of those keys (`src/council/lineup.ts` and `daemon/server/council.ts`).
   - `daemon/server/doctor/settings-file.ts:36` counts `locked_commands` from the install file. Say whether doctor counts the project file as well.
   - `daemon/server/spawn/index.ts:146` builds the prompt with the worktree's cwd, which is only known after `:127`. Say that the resolver gets the cwd of the repository root and not the request `cwd`.

5. **Decide the project file's schema.** "The same JSON shape as the install file, holding project keys only" cannot be built as written. `SETTINGS_FILE_SCHEMA` is a `z.strictObject` with a required `schemaVersion` literal and a required `runtime` (`settings/schema.ts:134-139`). Under Rule 14 `SETTINGS_SCHEMA` stays 1. Say whether the project file carries `schemaVersion: 1` or none, and that it is validated by a schema derived from the project-key flag, so any non-project key is refused. Say what a malformed or invalid project file does at each reader: refuse the spawn or dispatch loudly, or fall back to the install value with a doctor finding. The install file keeps its last-good value, and the plan is silent on the project file.

6. **Decide the worktree question and the agent-write consequence together, and remove them from Open questions.** `repositoryRootOf` returns the main root for a worktree (`repository.ts:33`). Reading the worktree's own copy only works if the file is checked in, and then a branch can carry a different file. Pick one. Recommended: read the file at the main root and keep it out of git. Then state what an agent's write of a granted key does. It lands in the main checkout's `.orch/settings.json` from a worker whose files sit in a worktree. State that this is deliberate, that it goes through the `orch settings` CLI and not the agent's file tools, and that a read-only seat such as a council member is refused by `refuseUngrantedAgentWrite` unless granted. Also say whether `.orch/` is gitignored in this repository. `.gitignore` lists only `.orch-worktrees/`.

7. **Fix the facts that do not match the code.**
   - "Today only `orch settings thinking --clear` removes anything": `clearRegisteredSetting` exists (`registry.ts:329`) and the editor uses it (`settings/shell/state.ts:125`). Rewrite "A project value can be removed" to say the editor's clear is extended to the project view and the CLI needs a flag. Name the flag.
   - `registry.ts:316` is `registeredSetting`. `writeRegisteredSetting` is at `:321`.
   - `types/settings.ts:102` is the comment. `SettingSource` is at `:103`.
   - `agent/tools.ts:300` is the read-only check. The locked-command read is at `:305-307`.
   - `extensions/claude/index.ts:97` is `reportStart`. The gate call is `:87`, `settings` comes from `session` at `:67`, and the matching is `extensions/claude/tool-gate.ts:30`.
   - `daemon/server/spawn/index.ts:145` should be `:146`.
   - The findings L1 file has a duplicated test list. The plan should not depend on it.

8. **Say how a long-lived reader sees a project change.** The pi/omp bridge holds one `SettingsManager` for its whole life, cached in `held` (`settings/manager.ts:11`). An orch writes `workers.verify_commands` and `locked_commands.commands` before its first wave. A bridge started earlier, or one that resolved before the file existed, would keep the old value. State that the resolver is called per tool call, and per header build, and re-reads the file by stat. Say how this squares with "keeps no watch on project files" and with the install-file watcher in `settings/watch.ts`.

9. **Put the new code in the right layer and keep it DRY. This is the Rule 21, 16 and 17 section.**
   - Name the directory of the resolver. The CLI, the bridge and orchd all call it, so it belongs in the shared layer, and `scripts/check-layers.ts` must pass without a new `layers-baseline.json` line.
   - Name the existing precedence code that "one precedence order everywhere" replaces, so there are not two resolvers. Rule 16 requires that.
   - `.orch/settings.json` is a hardcoded path and Rule 17 says nothing is hardcoded. Either make the project directory and file name a registered setting or an exported constant that `council.directory`'s default (`.orch/councils`) shares, and say which.
   - The editor's "Install" view must not offer project-only keys. Say how `settings/shell/state.ts` gets its second source.

10. **Say where the project-key flag lives in the registry.** `HELP` in `registry.ts` is a `Record<string, string>` and `setting(...)` builds each `SettingSpec`. "Declared on the setting itself, beside its help line" has no field to land in. Name the new field on `SettingSpec` (`types/settings.ts`) or a `PROJECT_KEYS` set, and a test that every key marked project is also readable by the resolver. Say what the default is for a key that does not say.

11. **Close the remaining open questions the plan can decide itself.** Every one of these has an obvious answer an agent would otherwise stop to ask about.
    - `worktrees.*`, `defaults.worktree`, `workers.allow_tools`, `workers.builtin_tools`, `defaults.models` and `models.allowed`: install-only for now. `models.allowed` and `workers.allow_tools` gate what an agent may run, so a cloned file must not set them.
    - The flag names. Pick them, for example `--install` and `--unset`, and check that they do not collide with the registry in `src/commands/registry.ts`.
    - `orch doctor` checks the project file, and `orch setup` does not create one. Only the human's editor and an agent's write create it.
    - Leave only the checked-in versus ignored choice as a real question for Bryan, and give a recommendation for it (ignored).
