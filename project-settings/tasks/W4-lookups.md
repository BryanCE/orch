# W4: lookups for the implementation

Context for every section. `project-settings/README.md` is a plan to give orch a second
settings file per project directory. These tasks only read code and write one report file
each. Edit no source file. Run no command. Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: Markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or a type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with what you searched for.

The install-only settings, used to classify reads below. A key is install-only when it is one
of these, or starts with one of these followed by a dot:
`runtime`, `enabled`, `skills`, `project`, `settings_file`, `daemon`, `links`, `hosts`,
`servers`, `lock`, `retention`, `logging`, `doctor`, `timeouts`, `queue`, `pty`, `attach`,
`notify`, `notification`, `monitor`, `monitor_tool`, `counts`, `tiling`, `spaces`, `mail`,
`questions`, `fleet.max_agents_total`, `fleet.max_agents_per_space`,
`fleet.min_free_memory_mb`, `fleet.cross_space`, `fleet.orch_peers`.
Every other key is a project key: `defaults.*`, `models.*`, `workers.*`, `agents.*`,
`locked_commands.*`, `gated_commands`, `denied_commands.*`, `worktrees.*`, `council.*`,
`fleet.max_agents_per_pack`, `fleet.max_agents_per_tab`, `fleet.max_depth`,
`fleet.worker_peer_tools`.

## T1 The write chain
Write `project-settings/findings/L7-write-chain.md` answering:
1. Every exported and internal function in `packages/orch/src/settings/write.ts`: one bullet
   each with its signature in a code block, and which of `SETTINGS_FILE_SCHEMA`,
   `parseSettingsText`, `parseSettingsRoot`, `serializeSettingsRoot`, `updateSettingsFile`,
   `requireEnabledComposition`, `requireCouncilModelsAllowed` it calls, with line numbers.
2. Every call outside `write.ts`, in `packages/orch/src/` and `packages/orch/extensions/`, of
   any function exported by `write.ts`: file:line and the calling function.
3. Every call of `SettingsManager.update(` (a `.update(` on a value typed `SettingsManager`)
   outside `write.ts`: file:line and the calling function.
4. Every call of `fileSettingsManager(` and `inMemorySettingsManager(` in
   `packages/orch/src/`, `packages/orch/extensions/` and `packages/orch/test/helpers/`:
   file:line.

## T2 orchd readers in handlers
Write `project-settings/findings/L8-handler-readers.md` answering, for every file under
`packages/orch/src/daemon/server/handlers/`:
1. Each read of settings: a `.settings.current()`, `.settings.currentOrNull()`, or a function
   parameter typed `OrchSettings` that the function reads. One bullet per read: file:line, the
   enclosing function, and every settings key read from that value there or in the same
   function (for example `fleet.max_agents_per_pack`, `models.preferred`), each marked
   `install` or `project` by the list above.
2. For each bullet with a project key: what in that function's scope names the agent or the
   directory the read is for. Name the variable and its type: an agent key or name, an
   `AgentRow`, `params.cwd`, `params.dir`, a launch plan. Write "none" when nothing does.
3. Every function in these files that takes an `OrchSettings` parameter: its signature and
   every caller, file:line.

## T3 orchd readers outside handlers
Write `project-settings/findings/L9-server-readers.md` answering the same three questions as
T2, for every file in these directories and files, excluding
`packages/orch/src/daemon/server/handlers/`:
`packages/orch/src/daemon/server/`, `packages/orch/src/store/`, `packages/orch/src/presence/`,
`packages/orch/src/backends/`, `packages/orch/src/adapters/`, `packages/orch/src/acp/`,
`packages/orch/src/control/`, `packages/orch/src/pty/`, `packages/orch/src/hosts/`,
`packages/orch/src/worktrees/`, `packages/orch/src/entities/`, `packages/orch/src/notify/`.
Add question 4: every function in `packages/orch/src/policy/`, `packages/orch/src/settings/`,
`packages/orch/src/worker-prompt.ts` and `packages/orch/src/util.ts` that takes an
`OrchSettings` or a `Services` or a `SettingsManager` parameter and is called from one of the
directories above: its signature, the keys it reads, and each server caller file:line.

## T4 Sources, the table and the editor
Write `project-settings/findings/L10-sources-editor.md` answering:
1. Every occurrence of the string literal `"settings.json"` used as a `SettingSource` value or
   compared against a source, in `packages/orch/src/`, `packages/orch/extensions/`,
   `packages/web/src/` and `packages/orch/test/`: file:line and the line's text.
2. In `packages/orch/src/settings/shell/state.ts`: quote the signatures of `sourceFor`,
   `loadEntries` (or whatever builds the editor rows), `commitAndFlush`, `resetFocused`, and
   every exported function. Which take a `SettingsManager`, and where it comes from.
3. In `packages/orch/src/commands/settings.ts`: quote the signatures of `cmdSettings`,
   `runSettingsVerb`, `settingsRoot`, `setSingleSetting`, `writableSpec`,
   `refuseUngrantedAgentWrite`, `rawSetting`, `collectSettingsProvenance`,
   `printSettingsOutput`, `runSettingsEditor`. For each, where its `SettingsManager` or
   `OrchSettings` comes from. Quote how `--harness` and `--plexer` flags reach the verb.
4. In `packages/orch/src/settings/shell/edit.ts` and `packages/orch/src/settings/shell/index.ts`:
   the key handler (`browseOnce` or its caller), which keys it binds today, and whether `Tab`
   is bound. Quote the switch or map of keys.
5. In `packages/orch/src/commands/registry.ts`: quote the whole `settings` command entry, its
   flags and its subcommands.
