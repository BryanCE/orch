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

1. A project file at a repository's root, `.orch/settings.json` by default.
2. One resolver, in orchd, that every reader of a project key goes through. Its order is flag,
   then project, then install, then default.
3. `orch settings` that shows and edits a project's settings when it runs inside a repository.
4. A write to a project key from inside a repository lands in that repository's file.

## Words

- **Install file.** `$ORCH_DIR/settings.json`, as today.
- **Project file.** The file this job adds, one per repository.
- **Repository root.** What `repositoryRootOf` returns for a directory
  (`packages/orch/src/worktrees/repository.ts:33`): it walks up to `.git` and reads files only,
  with no git process. A linked worktree answers with the main checkout's root. Outside a
  repository it returns null, and there is no project file. New code names this root
  `repositoryRoot`. `projectRoot()` (`packages/orch/src/util.ts:249`) is a different thing,
  the fleet's identity for presence, and this job leaves it and `ORCH_PROJECT` alone.
- **Project key.** A setting that may live in a project file.

## The project file

- **Where.** `<repository root>/<project.file>`. `project.file` is a new install-only setting
  with the default `.orch/settings.json`: schema entry, `SETTINGS_DEFAULTS` value, registry
  help line, required type. Its validator takes a relative path with no `..` segment.
- **Worktrees.** An agent in a worktree reads and writes the main checkout's project file,
  because a worktree's repository root is the main root. A copy inside a worktree is never
  read.
- **Shape.** `PROJECT_SETTINGS_FILE_SCHEMA` in `packages/orch/src/settings/schema.ts`: a
  `z.strictObject` with `schemaVersion: z.literal(SETTINGS_SCHEMA)` and the project keys, each
  optional. The file nests as the install file does, `{"workers": {"verify_commands": [...]}}`,
  and each group is its own `z.strictObject` holding only that group's project keys, so
  `workers.allow_tools` and `locked_commands.applies_to` fail on read and on write. It is
  built from `PROJECT_KEYS`, so the schema and the registry cannot drift. The install schema
  cannot serve, because it requires `runtime`
  (`packages/orch/src/settings/schema.ts:134-139`).
- **Project keys.** `PROJECT_KEYS` in `packages/orch/src/settings/schema.ts` is the one list.
  `SettingSpec` (`packages/orch/src/types/settings.ts`) gains `scope: "project" | "install"`,
  which `setting(...)` (`packages/orch/src/settings/registry.ts:150`) fills from that list. A
  key not in the list is `install`. The list for this job:
  - `workers.verify_commands`
  - `locked_commands.commands`
  - `council.models`
  - `council.rounds`
- **Install-only keys.** Every other key. The ones worth a reason:
  - What decides what an agent may do: `agents.writable_settings`, `gated_commands`,
    `denied_commands`, `locked_commands.applies_to`, `models.allowed`, `workers.allow_tools`,
    `workers.builtin_tools`. A project file cannot hold one, so no repository can loosen what
    the human gated.
  - `council.directory`, because it decides the one directory a council member may write in
    (`packages/orch/src/council/layout.ts:10-12`), and `council.scale`.
  - `worktrees.*`, `defaults.worktree`, `defaults.models`, `workers.exclude_extensions` and
    `workers.inherit_mcp` stay install-only in this job. Making one a project key later is one
    line in `PROJECT_KEYS` plus its readers.
- **Who answers for its content.** The repository's owner. A project file is read as it is
  found, like the repository's own scripts: orch keeps no approval of it. Bryan ruled this.
  What orch guarantees is narrower and is the two rules above and below: a project file holds
  no gate key, and a project's locks only add.

## The merge

The resolver merges at the registry key, never at a parent object. A key the project file
omits takes the install value, then the default. An explicit empty list is a value.

| Key | Rule |
| --- | --- |
| `workers.verify_commands` | The project value replaces the install value. |
| `council.models` | The project value replaces the install value. |
| `council.rounds` | The project value replaces the install value. |
| `locked_commands.commands` | The union: the install patterns in their order, then each project pattern not already there. A project adds locks and removes none. |

Each key keeps the validator it has in the install file, so the `{cwd}` rule on
`workers.verify_commands` holds for a project value too.

### A project file that is absent or wrong

An absent file gives no project value. A file is `invalid` when it cannot be read, is bad
JSON, holds a key that is not a project key, holds a value of the wrong type, or sits at a
path orchd refuses to follow. What each path does with an invalid file:

| Path | With an invalid project file |
| --- | --- |
| A spawn with a prompt | Refused before launch, with the file's path and the key. |
| A spawn with no prompt | Launches. No header is composed. |
| A dispatch with a worker header | Refused, with the file's path and the key. |
| A raw dispatch | Sent as written. No header is composed. |
| A queued task | The attempt fails with that message, through the work loop's own failure path. |
| A council round | That member's send is refused and listed under `refused`, as any refused member is. |
| A lock ruling, an agent's lock list | The project adds no lock. The install locks and gates are read and applied as today. |
| `orch council round`, `scores`, `close` | They use the install `council.rounds`, so an open council can be scored and closed. |

A `council.models` that names a model outside the install's `models.allowed` does not make
the file invalid. The resolver sets that row's `problem` to the message
`requireCouncilModelsAllowed` (`packages/orch/src/settings/read.ts:136`) gives, naming the
model and the install key. `orch council convene` refuses with that message, doctor reports
it, and every other reader takes the rest of the file. `project-setting-write` refuses to
write such a value, as the install write does (`packages/orch/src/settings/write.ts:57`). The
row's `problem` covers a value that went wrong later, when the human narrowed
`models.allowed`.

## The resolver

One resolver, in orchd, takes a directory or none and returns the merged settings and, for
each project key, where its value came from. It lives in
`packages/orch/src/daemon/server/project-settings.ts`. It finds the repository root, reads the
project file, and merges it over `services.settings.current()`. The schema, the merge and
`PROJECT_KEYS` are shared code in `packages/orch/src/settings/`, with no disk read.

Only orchd calls it. `repositoryRootOf` is server code: `src/worktrees/` is in `SERVER` in
`packages/orch/scripts/check-layers.ts`, so the CLI and an agent's bridge cannot import it,
and `packages/orch/layers-baseline.json` gains no line.

orchd reads the project file each time it resolves. It keeps no cache and no watch, so a
change is seen by the next spawn, header or ruling. The install file's watcher
(`packages/orch/src/settings/watch.ts`) is unchanged.

`resolveWithSource` (`packages/orch/src/settings/read.ts:370`) is the one precedence order
today: flag, then `settings.json`, then default. It gains a `project` input between the flag
and the install value, and its `"settings.json"` source is renamed `"install"`. Every consumer
and fixture of that word changes with it.

### Which directory a request resolves against

What governs an agent never comes from a directory that agent sends.

- **A header or a lock ruling for an agent**: a dispatch, a queued task, a council round, a
  `command-lock` whose `agent` names a known agent. orchd uses the agent's stored directory:
  `hereAgentIfAny` (`packages/orch/src/process-place.ts`), then `agentLocation(...).cwd`, then
  `repositoryRootOf`. Those are the first two steps of `repoRootFor`
  (`packages/orch/src/policy/space.ts:44`), moved into one exported function both call.
  `repoRootOf` itself is not used, because it answers a plain directory outside a repository.
- **A spawn.** The directory each agent launches in.
- **A write.** By caller, as `callerKindOf` (`packages/orch/src/policy/caller.ts:12`) and
  `selfIdentityOf` (`packages/orch/src/identity/self.ts:16`) resolve the request's `caller`:
  - `operator`: the `cwd` the request carries.
  - Any caller with a row and a stored location on this host, which covers a spawned agent, a
    harness session, and a shell started inside an agent's tree: that stored location. Its
    `cwd` is ignored.
  - Any other caller, and a request with no `caller`: refused, saying the caller is not
    registered with a directory. It never becomes an operator write.
- **The `project-settings` read.** The `cwd` the request carries, for every caller. It shows
  what a directory's settings are and governs no agent.
- **A council.** The `cwd` its request carries, which is also what finds the council. The
  lineup, the round limit and the lineup's check all use it, whoever the caller is.

### RPCs

- **`project-settings`**, a read, takes `{ cwd }`. It returns `{ file, state, rows }`: the
  project file's path, or null outside a repository; `state` as `"none" | "ok" | "invalid"`
  with the message when invalid; and one row per project key:
  `{ key, value, source, project, install, installSource, problem }`.
  - `value` is the merged value. `project` is the project file's own value or undefined.
    `install` is the value without the project file.
  - `installSource` is `"install"` or `"default"`. orchd decides it with `rawValue` on the
    install file's JSON. `rawValue` (`packages/orch/src/settings/shell/state.ts:11`) moves to
    `packages/orch/src/settings/raw.ts`, so orchd and the editor's `sourceFor`
    (`state.ts:20`) both import it.
  - `source` is one `SettingSource`. For a key that replaces, it is `project` when the project
    file holds the key, and `installSource` otherwise. For `locked_commands.commands` it is
    `project` when the project list holds a pattern, and `installSource` otherwise.
  - `problem` is null, or the message of the `council.models` check above.
- **`project-locks`**, a read, takes `{ key }`, the calling agent's own key, which both
  bridges hold. It returns `{ commands }`: the project file's own `locked_commands.commands`
  for that agent's stored directory, and an empty list when the key names no agent here, the
  directory is in no repository, or the file is absent or invalid. A caller that names
  another agent learns only that agent's project's locks.
- **`project-setting-write`** extends `GOVERNANCE`, as every governed write does
  (`packages/orch/src/daemon/client/protocol.ts:92-99`). It takes `{ cwd, key, value }` or
  `{ cwd, key, clear: true }` and returns `{ outcome: "written", file }` or
  `{ outcome: "no-repository" }`. In order:
  1. A key whose `scope` is `install` is refused, whatever the caller holds.
  2. The directory is found by the write rule above.
  3. A caller that is not the operator must hold the key in `agents.writable_settings`, with
     the refusal text of `agentSettingRefusal`
     (`packages/orch/src/policy/agent-settings.ts:31`).
  4. A directory in no repository: the operator gets `no-repository`, and any other caller is
     refused with `<key> is a project setting and <directory> is in no repository`. This is
     what stops an agent in a scratch directory from setting a machine-wide value.
  5. orchd builds the new file and validates all of it, the `council.models` check included.
     A `clear` removes the key and always validates.
  6. The target path. orchd creates a missing directory of `project.file` one level at a
     time and refuses a level that is a link. It then refuses when the real path of the
     target's directory is outside the real repository root, or when the target is the
     install file, which can happen when `$ORCH_DIR` sits inside the repository.
  7. It writes a new temporary file in that directory and renames it over the target. Writes
     to one repository root run one at a time inside orchd.

### Every reader of a project key

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
  (`packages/orch/src/daemon/server/handlers/write.ts:327`) adds the rules it resolves for the
  target, and the `storedHeaderContext` it adds today (`write.ts:331`), in the `here` branch
  of `writeText` (`write.ts:310`). A read-only agent's header still names no verify command.
- **A spawn's launch prompt sent by the CLI**
  (`packages/orch/src/commands/spawn/report.ts:161`). It goes through the same `dispatch`, so
  the CLI sends no rules.
- **A spawn's first prompt in orchd.** Today `executeHeadlessSpawn` composes it
  (`packages/orch/src/daemon/server/spawn/index.ts:146`) and hands finished text to
  `spawnHeadless`. It now sends the raw prompt and a `worker: { harness, context }` field on
  `spawn-headless`. `spawnHeadless`
  (`packages/orch/src/daemon/server/handlers/lifecycle.ts:61`) composes the header once,
  before it builds `opts` at `lifecycle.ts:83`, with the rules it resolves for `params.cwd`.
  Both launches it can make, the held one and the detached one, take the composed prompt.
- **A queued task's header** (`packages/orch/src/daemon/server/work-loop.ts:105`). It resolves
  against the runner's stored directory.
- **A council round** (`packages/orch/src/daemon/server/council.ts:159`). It calls
  `workerHeaderContextOf` and then `dispatch`, so it changes with the first bullet.

`locked_commands.commands`:

- **The ruling.** `lockCommand` (`packages/orch/src/daemon/server/handlers/command-lock.ts:86`,
  called from `packages/orch/src/daemon/server/handlers/table.ts:127`) takes the resolved
  settings: the agent's stored directory when its `agent` names a known agent, and
  `params.cwd` otherwise, which is the human's own `orch lock`
  (`packages/orch/src/commands/lock.ts:62`). A caller that picks its own `cwd` can only change
  which project locks are added. The install locks always apply.
- **The list an agent's process wraps with.** Both processes call `gatedPatterns`
  (`packages/orch/src/policy/command-gate.ts:57`) on the install file today, and both keep
  doing that. Each adds what `project-locks` returns:
  - The claude hook runs once per tool call and its handler table is already awaited
    (`packages/orch/extensions/claude/index.ts:155-163`). `gateToolCall` (`index.ts:87`)
    becomes async and asks `project-locks` at each call. `preToolUse`
    (`packages/orch/extensions/claude/tool-gate.ts:38`) stays synchronous and takes the list.
  - The pi and omp bridge has no async handler: `tool_call`
    (`packages/orch/src/agent/tools.ts:298-313`) and `before_agent_start`
    (`tools.ts:203-209`) are plain callbacks, and this job relies on no promise being awaited
    by the harness. The bridge starts a `project-locks` request in `session_start`
    (`tools.ts:171`) and in each `before_agent_start`, does not wait for it, and stores the
    answer when it lands. `tool_call` wraps with the install locks plus the list it holds:
    nothing before the first answer, and the previous answer until a newer one lands.
  - Both requests use `daemon.report_timeout_ms`. When orchd does not answer, the process
    uses the install locks alone. A project lock is then not taken for that call. A lock only
    makes a command wait its turn, so nothing gated runs ungated.
- **Doctor's count** (`packages/orch/src/daemon/server/doctor/settings-file.ts:36`). See
  Doctor below.

`council.models` and `council.rounds`:

- **The lineup** (`packages/orch/src/commands/council.ts:50`). `convene` reads the
  `council.models` row from `project-settings` for its `--dir`, and refuses with the row's
  `problem` when it has one.
- **The round limit** in `councilRound` and `councilScores`
  (`packages/orch/src/daemon/server/council.ts`). Both resolve against the request's `cwd`.
  The limit is read when a round is sent, as today. With an invalid project file they use the
  install value, so an open council can still be scored and closed.
- **The lineup picker** (`resolveCouncilModels`, `packages/orch/src/setup/composition.ts`). In
  the Project view it reads the row's value and saves through `project-setting-write`.

### Linked hosts

An agent on a linked host works in a repository on that host's disk, so that host's orchd
resolves its project file, with its own install file. Both hosts run the same build, so the
wire has one shape.

- **The ruling and the lock list** already run on the agent's host.
- **A dispatch.** Today this orchd composes the header and sends finished text: `peer-drive`'s
  `dispatch` action carries `text` only (`packages/orch/src/daemon/client/protocol.ts:476`).
  The action gains `worker: { harness, context }`, optional as it is on `dispatch`. In the
  `there` branch of `writeText` this orchd sends the raw text and that `worker`, and composes
  nothing. `peerDrive` (`packages/orch/src/daemon/server/handlers/drive.ts:84`, its dispatch
  case at `:91-95`) composes the header with the rules it resolves and its own
  `storedHeaderContext`, then calls `confirmTextWrite`. A raw dispatch carries no `worker`
  and is sent as written, as today.
- **A spawn.** `spawnOnHost` (`packages/orch/src/daemon/server/handlers/lifecycle.ts:132`)
  forwards a field list it names one by one (`lifecycle.ts:138-139`). `worker` joins that
  list. The receiving host's `spawnHeadless` composes, as it does for a local spawn.

## `orch settings` inside a repository

- **The editor.** Bare `orch settings` on a terminal opens the editor. Inside a repository it
  has two views, Project and Install, and `Tab` switches between them. Outside one there is
  only the Install view.
  - The Install view is today's editor: every key, its install value, saved by
    `writeRegisteredSetting` and reset by `clearRegisteredSetting`
    (`packages/orch/src/settings/registry.ts:321,329`).
  - The Project view lists the project keys from `project-settings`. A key the project file
    does not hold shows the value it inherits. A save and a reset there go through
    `project-setting-write`. `commitAndFlush` and `resetFocused`
    (`packages/orch/src/settings/shell/state.ts`) take the view's writer in place of calling
    `writeRegisteredSetting` and `clearRegisteredSetting` themselves.
- **Sources.** `SettingSource` (`packages/orch/src/types/settings.ts:103`) becomes
  `"flag" | "project" | "install" | "default"`. `settings.json` is renamed `install` because
  both files are named `settings.json`. `--json` prints each row's fields as
  `project-settings` returns them. The table prints the row's `source`, with one exception
  that is display only: `project + install` for a `locked_commands.commands` row whose
  `project` and `install` lists both hold a pattern.
- **The table.** `orch settings` with no terminal prints every key with its value and source.
  The project keys' rows come from `project-settings`, and `rawSetting`
  (`packages/orch/src/commands/settings.ts:45`) decides provenance for the other keys only.
- **Inside or outside.** The CLI cannot find a repository root itself. The editor and the
  table ask `project-settings { cwd }`, and a null `file` means outside. When orchd does not
  answer, both show the install settings alone and say the project's need orchd.
- **A write.** `orch settings <key> <value>` on a project key sends `project-setting-write`.
  On `no-repository` the CLI writes the install file, which only the operator can reach. On
  any other key it writes the install file as it does today.
- **`--install`** writes the install file from inside a repository, to set the machine-wide
  value of a project key. An agent never writes the install value of a project key:
  `refuseUngrantedAgentWrite` (`packages/orch/src/commands/settings.ts:82`) refuses it on
  `--install` and on a save in the Install view.
- **`--clear`** removes a key so it falls back. On a project key it sends
  `project-setting-write` with `clear: true`. With `--install`, or on any other key, it calls
  `clearRegisteredSetting`. `orch settings thinking --clear` is unchanged.
- **The lock row in the Project view** shows the merged list and opens the `project` list for
  editing, so a save never copies install patterns into the project file.
- An orch that sets `workers.verify_commands` for its project changes only that project. A
  read-only agent, such as a council member, has no shell and writes nothing.

## Doctor and setup

- `orch doctor` checks the project file of the directory it runs in. The CLI sends its `cwd`,
  and orchd never uses its own `process.cwd()` for this. It reports an invalid file and a
  non-project key by name. Its locked-command count covers the merged list.
- `orch setup` creates no project file. The first write creates it.

## What stays the same

- The install file, its location, and every key in it.
- `SETTINGS_SCHEMA` stays 1.
- A write to the install file: the CLI writes it and orchd picks the change up.
- The store. This job adds no table and needs no migration.
- orch never edits a repository's `.gitignore`. Whether a repository tracks its project file
  is that repository's choice.

## Documents that change

- `packages/orch/src/commands/registry.ts`: `--install` and `--clear` on `settings`, beside
  `--harness` and `--plexer` (`registry.ts:436-438`).
- `packages/orch/help/settings.md:5-11`: the two files, and that an agent's write of a granted
  key lands in its project's file.
- `packages/orch/help/council.md`: `council.models` and `council.rounds` can be a project's.
- `packages/orch/README.md:152,235,261,263`: where `workers.verify_commands` and
  `locked_commands` live.
- `packages/orch/skills/orch/reference/fleet.md:5-16`: the two commands stay, and the text
  says the values are the project's.
- `packages/orch/skills/orch-council/SKILL.md`: the `council.models` row is in the Project
  view inside a repository.

## Tests

Each runs under `bun test` with no git process, and none of the files named here drives a
real plexer. A test that needs a repository root makes a `.git` directory under the temp dir.
The worktree case makes a `.git` file with a `gitdir:` line and a `commondir` file there,
which is what `linkedRoot` reads (`packages/orch/src/worktrees/repository.ts:17-24`). The
link cases make their links under the temp dir.

- A typed factory for a project file in `packages/orch/test/helpers/settings.ts`, beside
  `writeSettingsFixture`.
- New `project-settings.test.ts`, on the resolver: the merge per key, the union's order, an
  explicit empty list, bad JSON, `workers.allow_tools`, `locked_commands.applies_to` and a
  top-level `gated_commands` each refused by name, two repositories with different values, a
  worktree reading the main root's file, a directory in no repository, a `council.models`
  row's `problem` after `models.allowed` narrows, each row's `source`.
- New `project-setting-write.test.ts`, on the handler: the operator's `cwd` is honoured, an
  agent's and a harness session's `cwd` is ignored, a request with no `caller` is refused, an
  install key is refused, an ungranted key is refused, an agent in no repository is refused
  and the operator gets `no-repository`, a `council.models` outside `models.allowed` is
  refused, a missing `.orch` is created, a linked `.orch` is refused, a target that is the
  install file is refused, two writes to one root both land, `clear` removes the key.
- New `project-locks.test.ts`: a key that names no agent, a directory in no repository and an
  invalid file each give an empty list.
- `settings-precedence.test.ts`: `project` between flag and install, and the `install` word.
- `settings-view.test.ts`, `settings-command.test.ts`, `settings-editor.test.ts`,
  `settings-shell.test.ts`: the sources, the union row in the table and in `--json`,
  `--install` refused for an agent, `--clear`, the two views, the lock row editing only the
  project list.
- `settings-registry.test.ts`: every key in `PROJECT_KEYS` is registered with scope `project`.
- `command-lock.test.ts`: a project lock is added to the install locks, an empty or invalid
  project list removes none, and an unknown agent resolves by `cwd`.
- `command-gate.test.ts` and `bridge-command-gate.test.ts`: the wrap list is install plus
  project; install alone before the first `project-locks` answer, after a timeout, and with
  an invalid project file. The bridge test drives the handlers directly.
- `worker-prompt.test.ts`, `commands-control.test.ts`, `commands-spawn.test.ts`: the CLI sends
  no rules, and a read-only header still names no verify command.
- `broker-governance.test.ts` and `held-drive.test.ts`: `dispatch` composes the target
  repository's verify commands, not the caller's; a raw dispatch is sent as written with an
  invalid file.
- `hosts-link.test.ts` and `acp-far.test.ts`: `peer-drive`'s dispatch carries `worker` and raw
  text and the receiving side's prompt has that host's rules; a linked spawn of a held form
  and of a headless form both launch with the composed header.
- `council-command.test.ts` and `council-handlers.test.ts`: the lineup and the round limit
  take the project's value for `--dir`, also when an agent convenes into another repository,
  and a lineup with a `problem` refuses only convene.
- `doctor-settings-defects.test.ts`: an invalid project file and a row's `problem` are
  findings.

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
