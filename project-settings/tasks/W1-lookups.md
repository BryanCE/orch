# W1: lookups for project-scoped settings

Context for every section. orch has one settings file today, `$ORCH_DIR/settings.json`, shared
by every project on the machine. The plan is a second file, `.orch/settings.json` at a
repository's root, that holds the settings that describe that project. These tasks only read
code and write one report file each. Edit no source file. Run no `orch` command, no build, no
test, no git command that writes. The report is Markdown: run no verify command over it.
Paths are from the repo root `/home/bryan/orch`.

Report file format for every section: markdown, one `##` heading per numbered question, each
fact as a bullet ending in `path:line`. Quote a signature or type in a code block when the
question asks for a shape. Write "not found" under a question whose answer is not in the code,
with the grep you ran.

## T1 How settings are loaded, written and edited
Read every file in `packages/orch/src/settings/`, `packages/orch/src/commands/settings.ts`,
`packages/orch/src/policy/agent-settings.ts`, `packages/orch/src/types/settings.ts`,
`packages/orch/src/services.ts`, and the settings handlers under
`packages/orch/src/daemon/server/handlers/`.
Write `project-settings/findings/L1-load-write-edit.md` answering:
1. Where the settings file is loaded in the CLI and where in orchd: the functions, the object
   that holds the current value, and how a change on disk reaches a running orchd
   (`settings/watch.ts`). Signatures quoted.
2. `orch settings <key> <value>`: the functions in call order from the command to the bytes
   on disk. Does the CLI write the file or does orchd? Quote the function that writes.
3. Bare `orch settings` in a terminal: what it draws, the functions that draw it, how a row
   shows where its value came from, and every value that source column can show. Quote the
   type and the code that picks the word `agent`.
4. `agents.writable_settings`, `orch settings grant` and `orch settings revoke`: how a write
   by an agent is allowed or refused (refusal text quoted) and how the write is recorded as
   an agent's.
5. Each subcommand of `orch settings` (`models`, `thinking`, `skills`, `notify`, `grant`,
   `revoke`): what it writes. One bullet each.
6. Every call of `settingsPath(` in `packages/orch/src/`. One bullet per call site.
7. Every test file under `packages/orch/test/` that imports from `src/settings/` or
   `src/commands/settings.ts`. One bullet per file with what it covers.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Who reads the settings a project would own
Search `packages/orch/src/` and `packages/orch/extensions/` for every read of each key below.
A read is any access of that field on a settings object, such as
`settings.workers.verify_commands`.
Keys: `workers.verify_commands`, `workers.allow_tools`, `workers.builtin_tools`,
`workers.inherit_extensions`, `workers.inherit_mcp`, `workers.exclude_extensions`,
`workers.compact_at_tokens`, `locked_commands`, `gated_commands`, `denied_commands`,
`worktrees` (every field), `defaults.models`, `defaults.thinking`,
`defaults.thinking_by_harness`, `defaults.worktree`, `defaults.adapter`, `defaults.forms`,
`models.allowed`, `models.preferred`, `spaces`, `fleet.max_agents_per_space`.
Skip `packages/orch/src/settings/` itself.
Write `project-settings/findings/L2-readers.md` answering:
1. One `###` heading per key. Under it one bullet per read: the function that reads it, and
   whether that file is CLI code (`src/commands/`, `src/cli/`, `bin/`), bridge code
   (`extensions/`, `src/agent/`), orchd code (`src/daemon/server/`, `src/backends/`,
   `src/adapters/`, `src/control/`, `src/worktrees/`) or shared code (anything else).
2. For each read in question 1: does that function have the agent's working directory, its
   agent id or its key in scope? Name the variable, or write "none".
3. How a function in orchd gets the settings object today: quote the type of
   `services.settings` and one typical call.
4. Every function that takes `settings: OrchSettings` as a parameter and is called from more
   than one file. One bullet each with its callers' files.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 How orch knows an agent's repository
Read `packages/orch/src/worktrees/`, `packages/orch/src/policy/space.ts`,
`packages/orch/src/shared/space.ts`, `packages/orch/src/store/space-rows.ts`,
`packages/orch/src/store/interval-rows.ts`, `packages/orch/src/process-place.ts`,
`packages/orch/src/commands/space.ts`, `packages/orch/src/daemon/server/handlers/space.ts`,
`packages/orch/src/daemon/client/protocol.ts`, `packages/orch/src/hosts/`.
Write `project-settings/findings/L3-repo-and-place.md` answering:
1. `repositoryRootOf` and `repoRootOf`: signatures, what each returns for a worktree, for a
   directory outside any repository, and whether either runs git or only reads files.
2. `.worktreeinclude`: the function that reads it, the directory it is read from, and whether
   that code runs in the CLI or in orchd.
3. Where an agent's working directory is stored and the function that reads it for an agent
   on this machine. Signature quoted.
4. What a space is in the store, what the `spaces` setting maps (name to what), and how a
   caller's directory becomes a space. Functions in order.
5. How the caller's working directory reaches orchd in an RPC: quote the `CALLER` and
   `GOVERNANCE` schemas and name each request that carries a `cwd`.
6. An agent on a linked host: which machine's `settings.json` governs its launch, its worker
   header and its verify commands. Quote the code that decides.
7. Any file other than `.worktreeinclude` that orch reads from inside a repository. One
   bullet each, or "not found".
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
