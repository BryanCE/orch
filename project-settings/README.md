# Project settings

Everything for the job of giving orch settings that belong to one project. This directory goes
when the job lands.

## The problem

orch has one settings file, `$ORCH_DIR/settings.json`, and every project on the machine reads
it. A value set while working in one project applies in all of them.

Two keys cause most of it. The orch skill tells each orch to set `workers.verify_commands` and
`locked_commands.commands` from the project's own scripts before its first wave, and those are
the two keys `agents.writable_settings` lets an agent write by default
(`packages/orch/src/settings/schema.ts:123`). So an orch in a Go project sets
`workers.verify_commands` to `["gofmt -l"]`, and every worker in a TypeScript project is then
told to run `gofmt -l` over the files it edited.

## What this job delivers

1. A project settings file, `.orch/settings.json`, at a repository's root.
2. One precedence order everywhere: flag, then project, then install, then default.
3. `orch settings` that shows and edits a project's settings when it runs inside a repository.
4. A write to a project key from inside a repository lands in that repository's file.

## The project file

- **Where.** `<repository root>/.orch/settings.json`. The root is what `repositoryRootOf`
  returns: it walks up to `.git` and reads files only, with no git process
  (`packages/orch/src/worktrees/repository.ts:33`). A directory outside any repository has no
  project file.
- **Shape.** The same JSON shape as the install file, holding project keys only. A key that is
  not a project key is refused with a message that names the install file.
- **Project keys.** Whether a key may live in a project file is declared on the setting itself
  in the registry (`packages/orch/src/settings/registry.ts`), beside its help line. The first
  set:
  - `workers.verify_commands`
  - `locked_commands.commands`
  - the council settings the `council/` job adds
- **Install-only keys.** Anything that describes the machine or the install: `runtime`,
  `enabled`, `daemon`, `hosts`, `links`, `pty`, `skills`, `notify`, `spaces`, the fleet caps.
  Also the keys that decide what an agent is allowed to do: `agents.writable_settings`,
  `gated_commands`, `denied_commands`. A file that arrives with a cloned repository must not
  be able to loosen what the human gated.
- **Install-only for now.** `workers.exclude_extensions` and `workers.inherit_mcp`. Claude
  takes them from one worker settings file per install, which orchd writes from the settings
  (`packages/orch/src/adapters/claude.ts:139,161`). They can become project keys when that
  file is written per project.

## `orch settings` inside a repository

- Bare `orch settings` on a terminal opens the editor on the project's settings. The editor
  has two views, Project and Install, and a key to switch between them. Outside a repository
  there is only the Install view.
- The Project view lists every project key. A key with no value in the project file shows the
  value it inherits and where that came from.
- Every row names its source: `project`, `settings.json` or `default`. `SettingSource`
  (`packages/orch/src/types/settings.ts:102`) gains `project`. The printed table and `--json`
  carry the same source.
- `orch settings <key> <value>` on a project key, run inside a repository, writes that
  repository's file. On any other key it writes the install file, as it does today.
- A flag on `orch settings <key> <value>` writes the install file from inside a repository, to
  set the machine-wide value of a project key.
- A project value can be removed, so the key falls back to the install value. Today only
  `orch settings thinking --clear` removes anything.
- An agent's write of a granted key follows the same rule, so an orch that sets
  `workers.verify_commands` for its project changes only that project. The skill needs no
  edit.

## How a reader gets the project's value

One resolver takes a repository root, or none, and returns the merged settings: the project
file over the install file over the defaults. Every reader of a project key calls it. No
reader merges for itself.

There are three kinds of reader, and each already knows which repository it is in:

- **The CLI.** It runs in the caller's directory. It builds the worker header for a dispatch
  (`packages/orch/src/policy/spawner.ts:25`) and for a spawn's report
  (`packages/orch/src/commands/spawn/report.ts:161`), and it draws `orch settings`.
- **The agent's own process.** The pi and omp bridge
  (`packages/orch/src/agent/tools.ts:300`) and the claude hook
  (`packages/orch/extensions/claude/index.ts:97`) read the settings to recognise a locked
  command. Both run in the agent's directory.
- **orchd.** It holds one settings object for the machine (`services.settings.current()`,
  `packages/orch/src/types/services.ts:10,29`). It reads project keys when it builds a spawned
  agent's first prompt (`packages/orch/src/daemon/server/spawn/index.ts:145`), when the work
  loop builds a queued task's header (`packages/orch/src/daemon/server/work-loop.ts:104`), and
  when it rules on a locked command
  (`packages/orch/src/daemon/server/handlers/command-lock.ts:75-94`). A spawn request carries
  its `cwd`. For an agent that already exists, orchd reads the agent's stored directory
  (`agentLocation`, `packages/orch/src/store/interval-rows.ts:69`) after it has proved the
  agent runs on this machine (`hereAgentIfAny`, `packages/orch/src/process-place.ts:66`).

An agent on a linked host is governed by that host's orchd, with that host's install file and
the repository on that host's disk. That is how the worker header and the verify commands
already behave (`packages/orch/src/daemon/server/handlers/relaunch.ts:3`).

orchd reads a project file when it resolves, at a launch, a header or a lock ruling. It keeps
no watch on project files.

## What stays the same

- The install file, its location, and every key in it.
- `SETTINGS_SCHEMA` stays 1.
- The CLI writes settings files itself and orchd picks the change up; no RPC carries a
  settings write (`packages/orch/src/settings/registry.ts:316`).

## Open questions

- Is `.orch/settings.json` checked in or ignored? Checked in, it travels with the repository
  and its verify commands run on whoever clones it. Ignored, each person sets their own.
- An agent in a worktree: does it read the main checkout's project file or the copy in its
  own worktree? `repositoryRootOf` returns the main root for a worktree.
- Which other keys become project keys: `worktrees.*`, `defaults.worktree`,
  `workers.allow_tools`, `workers.builtin_tools`, `defaults.models`, `models.allowed`?
- The name of the flag that writes the install file from inside a repository, and the name of
  the one that removes a project value.
- Does `orch doctor` check a project file, and does `orch setup` offer to create one?

## Working material

- `tasks/W1-lookups.md`. The lookup tasks that produced the findings.
- `findings/`. Maps of today's code with `path:line` for every fact:
  - `L1-load-write-edit.md`. How settings load, how a write reaches the disk, what the editor
    and the table show, how an agent's write is allowed.
  - `L2-readers.md`. Who reads each key a project might own, and from which side.
  - `L3-repo-and-place.md`. How orch finds a repository root, where an agent's directory is
    stored, what a space is, which settings govern an agent on a linked host.
