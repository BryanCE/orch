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

1. A project file, `.orch/settings.json` by default, in a project's directory.
2. One reader that every use of a project key goes through. Its order is flag, then project,
   then install, then default.
3. `orch settings` that shows and edits the project's settings beside the install's.
4. A write to a project key lands in the project's file.

The model is pi's, which has a global `~/.pi/agent/settings.json` and a project
`.pi/settings.json` in the directory pi was started in, with no walk up and no git
(`findings/L6-pi-settings.md`).

## The project directory

A project is a directory. Git plays no part, and nothing walks up to a parent.

- **A lead orch, or the human at a terminal.** The directory it runs in.
- **An agent an orch spawned.** Its spawner's project directory, whatever directory the agent
  itself launches in. A worker in a worktree, or one spawned with `--dir`, uses its fleet's
  project file.
- **A subdirectory is its own project.** An orch started in `repo/packages/web` uses
  `repo/packages/web/.orch/settings.json` and never the one in `repo`. That is intended:
  the web package can have its own framework, its own checks and its own locks.
- **The install's own directory has no project file.** When `<project directory>/<project.file>`
  is the install file, which happens when orch runs from the directory that holds `$ORCH_DIR`,
  such as the home directory with the default `~/.orch`, the install file is the only file.

orch records the project directory per agent, and one value serves every reader:

- **orchd decides it at each launch.** `projectDirectory`
  (`packages/orch/src/daemon/server/spawn/project.ts`) gives the spawner's recorded project
  when the spawner is an agent, and the directory the spawn was asked from otherwise. It is
  required on every launch as `BackendSpawnOpts.project`, and `agentLaunchEnv`
  (`packages/orch/src/policy/spawner.ts`) hands it to the process as `ORCH_PROJECT`. A
  relaunch asks with the agent itself. This part is built: it fixed a bug where every agent
  orchd launched was given orchd's own directory.
- **The agent reports it back.** Its presence writes `projectRoot()`
  (`packages/orch/src/util.ts:249`), which is `ORCH_PROJECT`, into `agent_status.project`
  (`packages/orch/src/db/schema.ts:264`). `orch orchs` prints it.
- **A lead orch** is a harness session the human started. Nothing hands it `ORCH_PROJECT`, so
  its `projectRoot()` is its working directory, which is right.
- **Still to build:** orchd writes the decided value into the new agent's
  `agent_status.project` at spawn, so a header composed before the agent's first report
  already has it.

## The project file

- **Where.** `<project directory>/<project.file>`. `project.file` is a new install-only
  setting with the default `.orch/settings.json`: schema entry, `SETTINGS_DEFAULTS` value,
  registry help line, required type. Its validator takes a relative path with no `..` segment.
- **Shape.** `PROJECT_SETTINGS_FILE_SCHEMA` in `packages/orch/src/settings/schema.ts`: the
  install file's schema with every install-only key removed, `schemaVersion` kept, and every
  remaining key optional. It stays a `z.strictObject` at each level, so an install-only key
  in a project file fails on read and on write, by name. It is derived from the install
  schema and `INSTALL_ONLY_KEYS`, so the two cannot drift. The install schema itself cannot
  serve, because it requires `runtime` (`packages/orch/src/settings/schema.ts:134-139`).
- **Project keys.** Any setting may live in a project file unless it is install-only. That is
  pi's rule, where one setting is global-only. `SettingSpec`
  (`packages/orch/src/types/settings.ts`) gains `scope: "project" | "install"`, which
  `setting(...)` (`packages/orch/src/settings/registry.ts:150`) fills: `install` for a key in
  `INSTALL_ONLY_KEYS`, `project` for every other key. So the worker rules, the command lists,
  the defaults, the allowed models, the worktree settings, the council and the per-fleet caps
  are all a project's to set.
- **Install-only keys.** `INSTALL_ONLY_KEYS` in `packages/orch/src/settings/schema.ts` is the
  one list. A key is on it when it describes the machine, the install or orchd itself, which
  one daemon reads for every project at once, so a project value could not mean anything:
  - the install: `runtime`, `enabled.*`, `skills.*`, `project.file`, `settings_file.*`;
  - orchd and its links: `daemon.*`, `links.*`, `hosts`, `servers.*`, `lock.*`,
    `retention.*`, `logging.*`, `doctor.*`, `timeouts.*`, `queue.*`;
  - the terminal and the human's own view: `pty.*`, `attach.*`, `notify`, `notification.*`,
    `monitor.*`, `monitor_tool.*`, `counts.*`, `tiling.*`;
  - what spans projects: `spaces`, `fleet.max_agents_total`, `fleet.max_agents_per_space`,
    `fleet.min_free_memory_mb`, `fleet.cross_space`, `fleet.orch_peers`, `mail.*`,
    `questions.*`.
- **Who answers for its content.** The project's owner. A project file is read as it is
  found, like the project's own scripts, and that covers the command lists and the allowed
  models too. orch keeps no approval of it, where pi asks once per folder. Bryan ruled this.

## The merge

A setting set in the project file overrides the install value. There is no exception.

- The merge is at the registry key, never at a parent object: a project file that sets
  `workers.verify_commands` leaves the other `workers` keys to the install file.
- A key the project file omits takes the install value, then the default.
- A list replaces the whole list. An explicit empty list is a value, so a project that sets
  `locked_commands.commands` to `[]` has no locks.

That is pi's rule. Each key keeps the validator it has in the install file, so the `{cwd}`
rule on `workers.verify_commands` holds for a project value too.

### A project file that is absent or wrong

An absent file gives no project value. A file is `invalid` when it cannot be read, is bad
JSON, holds an install-only key, or holds a value of the wrong type. What each
path does with an invalid file:

| Path | With an invalid project file |
| --- | --- |
| A spawn with a prompt | Refused before launch, with the file's path and the key. |
| A spawn with no prompt | Launches. No header is composed. |
| A dispatch with a worker header | Refused, with the file's path and the key. |
| A raw dispatch | Sent as written. No header is composed. |
| A queued task | The attempt fails with that message, through the work loop's own failure path. |
| A council round | That member's send is refused and listed under `refused`, as any refused member is. |
| A lock ruling, an agent's command lists | The install file's lists apply, as today. |
| `orch council round`, `scores`, `close` | They use the install `council.rounds`, so an open council can be scored and closed. |
| `orch settings` | Shows the install settings and the file's error. A write to the file is refused until it is fixed. |

A `council.models` that names a model outside the merged `models.allowed` does not make
the file invalid. `orch council convene` refuses, naming the model and the install key, with
the check `requireCouncilModelsAllowed` (`packages/orch/src/settings/read.ts:136`) already
makes for the install file. A write of such a value to the project file is refused the same
way the install write is (`packages/orch/src/settings/write.ts:57`). Every other reader
takes the rest of the file.

## The reader

One module, `packages/orch/src/settings/project.ts`, shared code beside the install file's
reader. It has no git and no server import, so the CLI, an agent's process and orchd all call
it and `packages/orch/layers-baseline.json` gains no line.

- `projectSettings(directory, install)` reads `<directory>/<project.file>`, validates it, and
  returns the merged `OrchSettings`, the state `"none" | "ok" | "invalid"` with its message,
  and the project file's own values.
- It reads the file each time it is called. It keeps no cache and no watch, so a change is
  seen by the next spawn, header, ruling or bash call. The install file's watcher
  (`packages/orch/src/settings/watch.ts`) is unchanged.
- `resolveWithSource` (`packages/orch/src/settings/read.ts:370`) is the one precedence order
  today: flag, then `settings.json`, then default. It gains a `project` input between the
  flag and the install value, and its `"settings.json"` source is renamed `"install"`. Every
  consumer and fixture of that word changes with it.

### How every reader is reached

With most keys a project's, the readers are too many to list by hand, so the types find them.

- **The CLI and an agent's own process** each act for one project. Their
  `services.settings.current()` returns the merged settings of `projectRoot()`, so no reader
  in them changes.
- **orchd** serves every project, so it has no one merged value. Its
  `services.settings.current()` is retyped to `InstallSettings`, the install-only keys alone.
  A read of a project key through it no longer compiles. Each such reader takes
  `settingsFor(directory)` instead, which is `projectSettings` over the install value, with
  the directory from the rule below. The type error list from `bun check` is the list of
  readers, and the job is done when it is empty.
- `findings/L2-readers.md` maps the readers of the keys that mattered first. It is a guide,
  and the compiler is the authority.

### Which directory each reader passes

- **The CLI.** `projectRoot()`: the working directory for the human or a lead orch, and the
  handed-down `ORCH_PROJECT` for a spawned agent's shell.
- **An agent's own process.** `projectRoot()`, the same value.
- **orchd, for an agent.** That agent's `agent_status.project`
  (`selectAgentStatus`, `packages/orch/src/store/status-rows.ts:9`).
- **orchd, for a spawn.** The project directory it decides for the new agent, above.
- **orchd, for the human's own `orch lock`.** The request's `cwd`.
- **A council.** The directory it is convened from: `--dir`, else the caller's working
  directory (`councilCwd`, `packages/orch/src/commands/council.ts:24`).

### Readers that change shape

Most readers only swap where their settings come from. These also change what travels.

`workers.verify_commands` reaches a worker through `workerRules`
(`packages/orch/src/worker-prompt.ts:15`), which also returns the install-only
`gated_commands`. Its four callers, and the council:

- **A dispatch.** Today the CLI builds the header context from its own settings
  (`workerHeaderContextOf`, `packages/orch/src/policy/spawner.ts:24-25`, called at
  `packages/orch/src/commands/control.ts:344`). `workerRules` leaves `workerHeaderContextOf`.
  The `worker.context` a `dispatch` request carries
  (`packages/orch/src/daemon/client/protocol.ts:671`) loses `gatedCommands` and
  `verifyCommands`: `WORKER_HEADER_CONTEXT` is `WorkerHeaderContext`
  (`packages/orch/src/types/core.ts:201`) without `WorkerRules`. orchd's `dispatch`
  (`packages/orch/src/daemon/server/handlers/write.ts:327`) adds the rules of the target's
  project, and the `storedHeaderContext` it adds today (`write.ts:331`), in the `here` branch
  of `writeText` (`write.ts:310`). So an agent of another project gets its own project's
  commands, whoever dispatches. A read-only agent's header still names no verify command.
- **A spawn's launch prompt sent by the CLI**
  (`packages/orch/src/commands/spawn/report.ts:161`). It goes through the same `dispatch`, so
  the CLI sends no rules.
- **A spawn's first prompt in orchd.** Today `executeHeadlessSpawn` composes it
  (`packages/orch/src/daemon/server/spawn/index.ts:146`) and hands finished text to
  `spawnHeadless`. It now sends the raw prompt and a `worker: { harness, context }` field on
  `spawn-headless`. `spawnHeadless`
  (`packages/orch/src/daemon/server/handlers/lifecycle.ts:61`) composes the header once,
  before it builds `opts` at `lifecycle.ts:83`. Both launches it can make, the held one and
  the detached one, take the composed prompt.
- **A queued task's header** (`packages/orch/src/daemon/server/work-loop.ts:105`). The
  runner's project.
- **A council round** (`packages/orch/src/daemon/server/council.ts:159`). It calls
  `workerHeaderContextOf` and then `dispatch`, so it changes with the first bullet.

`locked_commands.commands`:

- **The ruling.** `lockCommand` (`packages/orch/src/daemon/server/handlers/command-lock.ts:86`,
  called from `packages/orch/src/daemon/server/handlers/table.ts:127`) takes the merged
  settings of the agent's project when its `agent` names a known agent, and of `params.cwd`
  otherwise, which is the human's own `orch lock`
  (`packages/orch/src/commands/lock.ts:62`). The same merged settings give it `gated_commands`
  and `denied_commands`.
- **The list an agent's process wraps with.** Both processes call `gatedPatterns`
  (`packages/orch/src/policy/command-gate.ts:57`) on the install settings today. Each now
  passes the merged settings of `projectRoot()`, read at that bash call:
  - the claude hook in `gateToolCall`
    (`packages/orch/extensions/claude/index.ts:87`), a process that runs once per tool call;
  - the pi and omp bridge in its `tool_call` handler
    (`packages/orch/src/agent/tools.ts:298-313`), which stays synchronous: the read is one
    small file.
- **Doctor's count** (`packages/orch/src/daemon/server/doctor/settings-file.ts:36`). See
  Doctor below.

`gated_commands` and `denied_commands.commands` ride with the locks: the ruling and the two
wrap lists take them from the same merged settings.

The council:

- **The lineup** (`packages/orch/src/commands/council.ts:50`). `convene` reads
  `council.models` from the merged settings of the council's directory.
- **The round limit** in `councilRound` and `councilScores`
  (`packages/orch/src/daemon/server/council.ts`). Both use the request's `cwd`, so a council's
  lineup and its limit come from one project file. The limit is read when a round is sent, as
  today.
- **The lineup picker** (`resolveCouncilModels`, `packages/orch/src/setup/composition.ts`). In
  the Project view it opens the project's value and saves to the project file.

### Linked hosts

An agent on a linked host has its project directory on that host's disk, so that host's orchd
reads its project file, with its own install file. Both hosts run the same build, so the wire
has one shape.

- **The project directory.** A spawn onto a linked host names the directory there to run in
  (`spawnOnHost`, `packages/orch/src/daemon/server/handlers/lifecycle.ts:132`). That directory
  is the agent's project directory on that host.
- **The ruling and the lock list** already run on the agent's host.
- **A dispatch.** Today this orchd composes the header and sends finished text: `peer-drive`'s
  `dispatch` action carries `text` only (`packages/orch/src/daemon/client/protocol.ts:476`).
  The action gains `worker: { harness, context }`, optional as it is on `dispatch`. In the
  `there` branch of `writeText` this orchd sends the raw text and that `worker`, and composes
  nothing. `peerDrive` (`packages/orch/src/daemon/server/handlers/drive.ts:84`, its dispatch
  case at `:91-95`) composes the header with its own project's rules and its own
  `storedHeaderContext`, then calls `confirmTextWrite`. A raw dispatch carries no `worker`
  and is sent as written, as today.
- **A spawn.** `spawnOnHost` forwards a field list it names one by one
  (`lifecycle.ts:138-139`). `worker` joins that list. The receiving host's `spawnHeadless`
  composes, as it does for a local spawn.

## `orch settings`

- **The editor.** Bare `orch settings` on a terminal opens the editor with two views, Project
  and Install, and `Tab` switches between them. In the install's own directory there is only
  the Install view.
  - The Install view is today's editor: every key, its install value, saved by
    `writeRegisteredSetting` and reset by `clearRegisteredSetting`
    (`packages/orch/src/settings/registry.ts:321,329`).
  - The Project view lists every key that is not install-only. A key the project file does
    not hold shows the value it inherits. A save and a reset there write the project file. `commitAndFlush` and
    `resetFocused` (`packages/orch/src/settings/shell/state.ts`) take the view's
    `SettingsManager` in place of the install one.
- **Sources.** `SettingSource` (`packages/orch/src/types/settings.ts:103`) becomes
  `"flag" | "project" | "install" | "default"`. `settings.json` is renamed `install` because
  both files are named `settings.json`. A key is `project` when the project file holds it,
  and `--json` and the table both print that one word. `sourceFor`
  (`packages/orch/src/settings/shell/state.ts:20`) and `rawSetting`
  (`packages/orch/src/commands/settings.ts:45`) keep deciding `install` against `default`.
- **The table.** `orch settings` with no terminal prints every key with its merged value and
  source.
- **A write.** The CLI writes the project file itself, as it writes the install file today,
  through a second `SettingsManager`: `projectSettingsManager(directory)` beside
  `fileSettingsManager` (`packages/orch/src/settings/manager.ts:45`). It uses the same file
  lock and the same write, and validates with the project schema. The first write creates
  the file and its directory.
  - `orch settings <key> <value>` writes the project file of `projectRoot()`. On an
    install-only key, and in the install's own directory, it writes the install file.
  - An agent's write is held by `refuseUngrantedAgentWrite`
    (`packages/orch/src/commands/settings.ts:82`) as today, so an orch that sets
    `workers.verify_commands` changes only its own project. The skill's two commands need no
    edit.
- **`--install`** writes the install file's value of a project key, the machine-wide one that
  every project without its own value inherits. It is refused for an agent, by the same
  function.
- **`--clear`** removes a key so it falls back. It clears the project file's value. With
  `--install`, or on an install-only key, it clears the install file's. Both call
  `clearRegisteredSetting` with the right manager. `orch settings thinking --clear` is
  unchanged.
- A read-only agent, such as a council member, has no shell and writes nothing.

## Doctor and setup

- `orch doctor` checks the project file of the directory it runs in. The CLI sends its
  directory, and orchd never uses its own `process.cwd()` for this. It reports an invalid
  file, an install-only key by name, and a council lineup outside the merged `models.allowed`. Its
  locked-command count covers the merged list.
- `orch setup` creates no project file. The first write creates it.

## What stays the same

- The install file, its location, and every key in it.
- `SETTINGS_SCHEMA` stays 1.
- The store's tables. This job adds none and needs no migration: `agent_status.project` is an
  existing column.
- orch never edits a `.gitignore`. Whether a project tracks its project file is its owner's
  choice.

## Documents that change

- `packages/orch/src/commands/registry.ts`: `--install` and `--clear` on `settings`, beside
  `--harness` and `--plexer` (`registry.ts:436-438`).
- `packages/orch/help/settings.md:5-11`: the two files, what a project is, and that an
  agent's write of a granted key lands in its project's file.
- `packages/orch/help/council.md`: `council.models` and `council.rounds` can be a project's.
- `packages/orch/README.md:152,235,261,263`: where `workers.verify_commands` and
  `locked_commands` live.
- `packages/orch/skills/orch/reference/fleet.md:5-16`: the two commands stay, and the text
  says the values are the project's.
- `packages/orch/skills/orch-council/SKILL.md`: the `council.models` row is in the Project
  view.

## Tests

Each runs under `bun test` with no git process, and none of the files named here drives a
real plexer. A project directory in a test is a directory under the temp dir.

- A typed factory for a project file in `packages/orch/test/helpers/settings.ts`, beside
  `writeSettingsFixture`.
- New `project-settings.test.ts`, on the reader: the merge per key, a list replacing a
  list, an explicit empty list emptying `locked_commands.commands`, bad JSON, `runtime`,
  `daemon.tcp_port` and `fleet.max_agents_total` each refused by name, a project
  `models.allowed` and `workers.allow_tools` taking effect, two directories with different
  values, a
  subdirectory that does not read its parent's file, the install's own directory having no
  project file.
- New `project-directory.test.ts`, on the spawn: an agent takes its spawner's project
  directory, also when it launches in another directory or a worktree; the human's spawn
  takes the request's `cwd`; `ORCH_PROJECT` in the launch environment is that value.
- `settings-precedence.test.ts`: `project` between flag and install, and the `install` word.
- `settings-view.test.ts`, `settings-command.test.ts`, `settings-editor.test.ts`,
  `settings-shell.test.ts`: the sources, the lock row in the table and in `--json`,
  a project write creating the file, `--install` refused for an agent, `--clear`, the two
  views, the lock row editing only the project list, a `council.models` outside
  `models.allowed` refused on write.
- `settings-registry.test.ts`: every key in `INSTALL_ONLY_KEYS` is a registered setting with
  scope `install`, and every other registered key has scope `project`.
- `command-lock.test.ts`: a project's lock list replaces the install's, an invalid project
  file leaves the install's, and an unknown agent resolves by `cwd`.
- `command-gate.test.ts` and `bridge-command-gate.test.ts`: the wrap list comes from the
  merged settings, a project list changed between two calls applies to the second, and an
  invalid project file leaves the install's lists. The bridge test drives the handlers
  directly.
- `worker-prompt.test.ts`, `commands-control.test.ts`, `commands-spawn.test.ts`: the CLI sends
  no rules, and a read-only header still names no verify command.
- `broker-governance.test.ts` and `held-drive.test.ts`: `dispatch` composes the target
  project's verify commands, not the caller's; a raw dispatch is sent as written with an
  invalid file.
- `hosts-link.test.ts` and `acp-far.test.ts`: `peer-drive`'s dispatch carries `worker` and raw
  text and the receiving side's prompt has that host's rules; a linked spawn of a held form
  and of a headless form both launch with the composed header.
- `council-command.test.ts` and `council-handlers.test.ts`: the lineup and the round limit
  take the value of the council's directory, and a lineup outside `models.allowed` refuses
  only convene.
- `doctor-settings-defects.test.ts`: an invalid project file is a finding.

The gate is `bun check`. Runs that need real git or a real plexer are Bryan's.

## Working material

- `tasks/`. The lookup tasks that produced the findings.
- `findings/`. Maps of the code as it was when each lookup ran, with `path:line` for every
  fact. Where a line number there differs from this file, this file is the checked one.
  - `L1-load-write-edit.md`. How settings load, how a write reaches the disk, what the editor
    and the table show, how an agent's write is allowed.
  - `L2-readers.md`. Who reads each key a project might own, and from which side.
  - `L3-repo-and-place.md`. How orch finds a repository root, where an agent's directory is
    stored, what a space is, which settings govern an agent on a linked host.
  - `L4-wire.md`. The worker header's shape, the linked-host dispatch and spawn, the two
    tool-call handlers, caller identity, the settings lock.
  - `L5-names-docs-tests.md`. Every use of `projectRoot`, the editor's save chain, the docs
    and tests this job touches.
  - `L6-pi-settings.md`. How pi finds, merges, writes and trusts its project settings.
