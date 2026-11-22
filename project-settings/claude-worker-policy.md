# Every launch takes its project's worker policy

## The rules this plan holds to

- **Harness-neutral and plexer-neutral.** This is Bryan's ruling. Parts A and B change core,
  and they name no harness and no plexer. They branch on no adapter id and no backend id.
  Only Part D knows Claude, and it lives in `adapters/claude.ts`.
- **The form does not matter.** This is also Bryan's ruling. Every launch is an agent starting
  in a project, whether it goes into a pane or runs headless, held or on a linked host, and
  whether it is a spawn, a form switch or a restart. So one function on the agent's host builds
  every launch's policy from that launch's project. No path resolves its own policy.

## The problem

orch resolves a worker policy from a project's settings: the project file's keys over the
install's, with the install's where the project sets none. `workerPolicyFrom(settings)`
(`policy/workers.ts`) builds a `WorkerPolicy` (`types/policy.ts`), the launch carries it as
`SpawnOpts.workers`, and each adapter maps it onto its harness. Today each launch path builds
that policy its own way, and five gaps follow.

- **G1. Claude puts two policy values in a shared file.**
  - The two values are the plugin exclusions, `workers.exclude_extensions.claude`, which
    become `enabledPlugins`, and the claude.ai connector switch, `workers.inherit_mcp`,
    which becomes `ENABLE_CLAUDEAI_MCP_SERVERS=false` in `env`.
  - Both are synced from a whole `OrchSettings` into one file, `$ORCH_DIR/claude/settings.json`
    (`claudeSettingsPath`), and every Claude worker launches with `--settings <that file>`.
  - Since commit `d104213` that file holds the install's values only.
  - Only these two values are in scope. Claude's other fields, `allowTools` and
    `inheritExtensions`, are not.
- **G2. A form switch launches with no policy.** `relaunchPolicy` (`daemon/server/agent-policy.ts`)
  returns `undefined` for every agent that is not read-only. So `restartOpts` (`handlers/restart-form.ts`)
  and `restartAttached` (`handlers/relaunch.ts`) launch with no `workers`.
- **G3. A restart in place builds its command with no `orchDir`.** `planRelaunch` builds it with
  `adapterCommand` and `policyCommand` (`spawn/models.ts`), which pass no `orchDir`. A restarted
  Claude pane gets no `--settings`, and with it no hooks.
- **G4. A linked host launches on the asking host's policy.**
  - `executeHeadlessSpawn` (`spawn/index.ts:150-152`) sends `workers`, `tools`,
    `env: policyEnv(...)` and `preferredModels`, all resolved on the asking host.
  - `spawnOnHost` forwards them, and the far `spawnHeadless` launches with them.
  - An overlay would not fix this: a key the far project leaves unset would survive from the
    asking host.
- **G5. Some launch paths never refresh the harness shim.** `refreshStaleShims` runs in
  `admitSpawn`, in `reloadHere`, and in a restart only when `request.harness !== null`. It does
  not run for:
  - a linked host's `spawnHeadless`;
  - `tileAgent`;
  - `restartInForm`, `restartAttached`, or a restart that keeps its harness.

## Part A: one launch policy, built on the agent's host

A new module, `daemon/server/launch-policy.ts`:

```ts
/** What one launch runs under, from its project's settings on this host. */
export interface LaunchPolicy {
  readonly workers: WorkerPolicy;          // with compaction points keyed to the models on offer
  readonly tools: string | undefined;      // policyTools(workers)
  readonly env: Readonly<Record<string, string>>; // policyEnv(adapter, model, workers)
  readonly preferredModels: readonly string[];    // settings.models.preferred[adapter.id] ?? []
}

/** What a launch states for itself; everything else comes from its project. */
export interface LaunchRequest {
  readonly adapter: AgentAdapter;
  readonly project: string;
  readonly model: string | undefined;
  /** The agent's name, for the refusal message. */
  readonly name: string;
  /** Set for a read-only agent: a spawn's request, or `readOnlyOf` the store for a relaunch. */
  readonly readOnly: ReadOnly | null;
}

/** Refresh the harness's shim from the install's settings, then build the launch's policy
 *  from `request.project`'s settings. Every launch on this host calls it once, whatever its
 *  form or path. A harness that cannot refuse a tool call cannot launch read-only:
 *  `refusal(message)` builds the error the caller throws, and the message is the same for
 *  every caller: "<harness> cannot run <name> read-only: orch has no way to refuse its tool
 *  calls. Launch it on one of: <harnesses that can>". */
export async function prepareLaunch(state: DaemonState, request: LaunchRequest, refusal: (message: string) => Error): Promise<LaunchPolicy>;

/** The same policy with no write, for a preview or a plan. It reads the project file and the
 *  model catalogue, so it is not pure; it changes nothing. */
export function launchPolicy(services: Pick<DaemonServices, "settingsFor" | "models">, request: LaunchRequest, refusal: (message: string) => Error): LaunchPolicy;
```

`LaunchPolicy` and `LaunchRequest` are shared types and live in `types/policy.ts`, so
`TabSpawnSpec` in `types/command.ts` imports no server code. Only the functions live in
`daemon/server/launch-policy.ts`.

How the module is built:
- `launchPolicy` takes over the bodies of `agentPolicy` (`spawn/plan.ts:102`) and
  `relaunchPolicy`. Both are deleted.
- Its settings are `services.settingsFor(request.project).settings`, and its models on offer
  are `offeredModels(services.models)`.
- The shim refresh is its own export, `refreshShim(state, adapter)`. It calls
  `refreshStaleShims(directory, logger, [adapter.id], installSettings(state))`.
- `prepareLaunch` is `refreshShim`, followed by `launchPolicy`.
- `reloadHere` (`relaunch.ts:91`) keeps its refresh, through `refreshShim`. A reload sends text
  to a running agent to pick up new code, and it is not a launch.
- A fleet of N agents on one harness refreshes that shim N times. Each refresh is a diagnosis of
  one small file, and this is accepted.
- The module sits in `daemon/server`, so it may import the adapter registry for the list of
  able harnesses. `policy/workers.ts` gains no import, so no cycle forms with `claude.ts`.

Every launch calls `prepareLaunch` on the host where the agent's process starts, before it opens
any place for the agent, and builds its env and its `BackendSpawnOpts` from the result. A
launch that only forwards to a linked host calls nothing: the host that starts the process does.

| Launch | Today | After |
| --- | --- | --- |
| A spawn into a new tab (`prepareAgents`, `spawn/index.ts:175`) | `prepareAgents` builds `env = spawnEnv(..., plan.workers)`. That env opens the group (`:198`) and each place (`:217`), then reaches `spawnOneIntoTab` as `spec.env`. | `prepareAgents` becomes async and calls `prepareLaunch` once per agent, before any group or place opens. `PreparedAgent` carries `launch: LaunchPolicy`, and `env` is built from it. A refusal there goes through the existing `catch`, which discards the worktrees of every agent prepared so far. |
| A spawn into an existing tab (`growFleetIntoGroup`, `spawn/index.ts:385`) | the plan's `workers` | `spawnAgents` calls `prepareLaunch` once per agent before `growFleetIntoGroup`, and passes `launches: ReadonlyMap<string, LaunchPolicy>`, keyed by agent name. `growFleetIntoGroup` and `placeAgent` put the entry in `spec.launch`. A refusal for one agent costs that agent, as a placement failure does. |
| `tileAgent` (`spawn/index.ts:406`) | its own `withLaunchPoints(workerPolicyFrom(settingsFile), ...)` | `tileAgent` calls `prepareLaunch` before it opens the place, and uses that one result for the spec and for its command. |
| Every `TabSpawnSpec` | `workers`, `tools` and `preferredModels` | It carries `launch: LaunchPolicy` in their place. `spawnOneIntoTab`, `tileAgentIntoGroup`, `placeAgent` and `growFleetIntoGroup` keep their `DaemonContext` signature and resolve nothing. `spawnOptsOf` and the `spec.env` fallback read `spec.launch`, and `registerSpawnedTabAgent` reads `spec.launch.workers.readOnly`. |
| `spawn-headless`, held or headless, local or asked for by a linked host | `params.workers`, `params.tools`, `params.env` and `params.preferredModels` | `spawnHeadless` calls `prepareLaunch` with `params.readOnly`, after the `params.host` branch (`lifecycle.ts:75-78`) that forwards to `spawnOnHost`. Every field of the launch's `BackendSpawnOpts`, `env` included, comes from the `LaunchPolicy`, and nothing comes from the request. |
| A form switch, a restart and a relaunch | `restartOpts` and `restartAttached` each build their own opts (`relaunch.ts:159-168`), on `relaunchPolicy`, which is `undefined` unless read-only | `restartOpts(launch, tuning, ...)` takes a `LaunchPolicy` and the relaunch tuning, lives beside `prepareLaunch`, and is the one builder of a relaunch's `BackendSpawnOpts`. `restartPipes`, `switchForm`, `restartAttached` and `relaunchInPlace` call it, after `prepareLaunch` with `readOnlyOf(store)`. `restartAttached`'s hand-built opts are deleted, and it builds its opts before `endSessionAgent`, so a refusal leaves the agent running. |
| A restart in place: `planRelaunch` | `adapterCommand` or `policyCommand`, with no `orchDir` | `prepareLaunch`, then `policyCommand` with `orchDir: state.directory`. `planRelaunch` returns `launch` and the opts beside the command. |

Changes that follow from the table:
- **The `spawn-headless` request.** It drops `env`, `tools`, `workers` and
  `preferredModels`, and gains a required `readOnly`, typed with `SPAWN_AGENT.shape.readOnly`
  (`protocol.ts:220`). Rule 8 allows one shape, and the far host no longer takes policy from the
  asking host.
  - It has two senders, `executeHeadlessSpawn` and `spawnOnHost`. The only env either one sends
    is `policyEnv`, so dropping `env` drops nothing else.
  - `executeHeadlessSpawn` sends `readOnly: plan.readOnly`, and `spawnOnHost` forwards it.
  - `workerText` in `spawnHeadless` reads `params.readOnly`.
  - The `workerPolicy` zod schema is deleted if nothing else uses it.
  - Fixtures and tests that change:
    - `test/helpers/held-far.ts` and `test/helpers/rpc-handlers.ts`;
    - `acp-far.test.ts` and `held-spawn.test.ts`;
    - `spawn-preferred-models.test.ts`:
      - its `adapterCommand` calls at `:185` and `:189`;
      - its `spawn-headless` schema cases at `:224-233`. Zod strips an unknown key, so those
        rejection cases would pass silently, and they are rewritten around `readOnly`.
  - The compiler finds every remaining builder of a `TabSpawnSpec` or a `spawn-headless` request.
- **Admission.** It no longer applies `withLaunchPoints` to `agent.workers` and no longer
  calls `refreshStaleShims`. `prepareLaunch` does both, once per launch.
- **Restart.** The refresh at `relaunch.ts:211` goes. `prepareLaunch` refreshes the planned
  adapter, which `relaunchTarget` resolves from `request.harness`.
- **Previews.** The plan still needs a policy for the command it shows, and for `--cmd`.
  - `planSpawn(params, settings, chosen)` gains a fourth parameter,
    `policyOf: (agent) => WorkerPolicy`.
  - `spawnAgents` passes `(agent) => launchPolicy(services, {...}, spawnRefusal).workers`, with
    the model `admitLaunchModel` expanded. The expansion moves from `admitSpawn`
    (`admission.ts:215`) to before `planSpawn`. A preview keyed by the expanded model is the
    command the backend runs (`spawn/models.ts:32-34`).
  - `spawnAgents` runs `assertSpawnPolicy` before it expands the models, so depth and pack
    size still refuse first.
  - `SpawnAgentPlan.cmd` becomes `string | null`, and is null for a spawn on a linked host. The
    asking host neither previews a command nor admits a model for an agent it does not run, so
    `policyOf` is not called for it.
  - A harness that cannot run read-only is refused by `policyOf` at plan time for a local spawn.
    For a host spawn, the far host's `prepareLaunch` refuses it with the same message.
  - The tests that call `planSpawn` change:
  - `commands-spawn.test.ts:14`;
  - `spawn-viewers.test.ts:100` and `:201`.
- **`SpawnAgentPlan.workers`** is replaced by `readOnly`. The plan's `cmd` is a preview:
  `policyCommand` with `orchDir: null`.
- **`tileAgent`'s `launchCommand`** (`spawn/index.ts:426`) is a preview, built with
  `orchDir: null` from the same `prepareLaunch` result as its spec. `tileAgent` resolves one
  policy.
- **`adapterCommand`** has no caller left and is deleted. `commands-lifecycle.test.ts:104`
  compares against `policyCommand`.
- **`relaunchTarget`.** `restartAttached` calls `planRelaunch` only for its `relaunch`. So
  `relaunchTarget(state, key, recorded, request)` is split out: it returns
  `{ adapter, relaunch, project }` with no command and no write. It resolves `settings` once,
  from the agent's recorded project. `prepareLaunch` takes that project, and nothing in
  `planRelaunch` calls `agentSettings` a second time. `planRelaunch` is `relaunchTarget` plus
  the command.

## Part B: real launches pass `orchDir`, previews pass none

`policyCommand`'s `launch` gains a required `orchDir: OrchDir | null`, and it maps `null` to an
absent `SpawnOpts.orchDir`. It is `null` for the two previews, the plan's `cmd` and `tileAgent`'s
`launchCommand`. It is `state.directory` for `planRelaunch`. A type that requires the field
makes every caller choose.

The adapter rule, written on `SpawnOpts.orchDir`: an adapter may write its own launch config
under `orchDir` while it builds the argv, and a build with no `orchDir` writes nothing. Every
build that has one runs in orchd on the agent's host:
- `backends/backend.ts` `createInteractiveCommand`, which serves held, tmux and orca;
- `backends/headless/index.ts`;
- `backends/herdr/index.ts`;
- `restart-form.ts`, through `resume.argv`;
- `planRelaunch`.

The backends are listed only to show that every path is covered. None of them changes.

## Part C: a restart in place relaunches with its project's env

There are two ways to restart an agent in place:
- **A relaunching role.** `RelaunchRole.relaunch(handle, command)` (`types/backend.ts:90`) has
  one implementation, `heldRelaunch` (`backends/held/index.ts:99`). It ends the PTY's program
  and runs the command in a new PTY, and today it reuses the old PTY's environment.
- **The pane fallback.** It types the command into the old shell.

The changes:
- **`RelaunchRole.relaunch` gains the launch's opts.** The signature becomes
  `relaunch(handle, command, opts: BackendSpawnOpts)`, with `opts` from `restartOpts`.
  - `heldRelaunch` builds the PTY env with `heldLaunchEnv(opts)` (`backends/held/index.ts:170`),
    the function a held spawn uses. It passes that env to `relaunchPid`.
  - `relaunchPid` gains an `env` parameter, in its type (`types/pty.ts:77`) and in its
    implementation (`daemon/server/held.ts:135`). It uses that env in place of the old
    request's env.
  - `relaunchInPlace`, `relaunchTerminal` and `relaunchPlace` (`terminal-relaunch.ts`) pass the
    opts on.
  - A key the project no longer sets is therefore gone after the restart.
  - The role is harness-neutral and plexer-neutral: the env is whatever the launch policy
    built.
- **The pane fallback cannot set an env**, because it types into a shell that is already
  running.
  - It still refuses a harness that declares no restart text, as `recordedHarness(...,
    "restart")` does today. A command it can now render does not make restart supported there.
  - Claude declares no restart text, so a Claude agent restarts only through a relaunching role
    or a form switch. Both carry the full policy. G3 was a bug on the relaunching-role path.
  - For a harness that does restart through the pane fallback, the env-backed values stay the
    old launch's until its next spawn or form switch. This is the one launch ruling 2 cannot
    reach without retyping the shell's env, which is a plexer's job and out of scope.

## Part D: Claude maps the policy it is handed

All of this is in `adapters/claude.ts`.

### The two values

```ts
/** The two values of a worker policy Claude reads from a settings file. */
interface ClaudeWorkerKeys {
  readonly disabledPlugins: readonly string[]; // [...(policy.excludeExtensions.claude ?? [])].sort()
  readonly connectors: boolean;                // policy.inheritMcp
}
```

`withOrchKeys(current, hooks, settings)` splits in two:
- `withWorkerKeys(current, keys)` is today's logic, fed `keys`.
- `withOrchKeys` is `{ ...withWorkerKeys(current, claudeWorkerKeys(workerPolicyFrom(settings))), hooks }`.

### One parse, two contracts

`readWorkerSettings(file)` returns one of four results:
- `{ kind: "absent" }`, for ENOENT only, through `errnoCode`;
- `{ kind: "unreadable"; reason }`;
- `{ kind: "malformed"; reason }`;
- `{ kind: "ok"; value: Record<string, unknown> }`, parsed as `unknown` and checked with `isRecord`.

The callers split into two groups:
- **Setup, sync and doctor** (`expectedWorkerSettings`, `installClaudeHooks`, `syncWorkerSettings`
  and `diagnoseClaudeShim`):
  - `absent` reads as `{}`, so setup creates the first file.
  - `unreadable` and `malformed` stop with today's "fix the JSON by hand" message.
- **A launch** (`installSettingsForLaunch`) refuses anything but `ok`, and refuses a file whose
  `hooks` is not a record holding every event in `CLAUDE_HOOK_EVENTS`. The refusal names
  `orch setup`.
  - `refreshStaleShims` has already run in `prepareLaunch`, so its hooks are current unless
    the refresh warned. When it warned, the launch still runs on the hooks the file has.

### One writer

`writeWorkerSettings(file, text)` makes the directory, writes `settingsTemporaryPath(file)`
(`<file>.<pid>.tmp`), and renames it into place. If the write or the rename fails, it removes
the temp file and rethrows.
- The install file and the worker files share this writer.
- A write is fully synchronous, so two launches in one orchd never interleave.
- An `$ORCH_DIR` has one orchd.

### Worker files are immutable snapshots, named by their contents

```ts
/** The settings file a launch under `policy` passes Claude: the install file with this
 *  policy's two values, named by the sha256 of its text. It writes on every call. */
function workerSettingsFile(orchDir: OrchDir, policy: WorkerPolicy): string {
  const install = installSettingsForLaunch(claudeSettingsPath(orchDir));
  const text = `${JSON.stringify(withWorkerKeys(install, claudeWorkerKeys(policy)), null, 2)}\n`;
  const file = claudeWorkerSettingsPath(orchDir, createHash("sha256").update(text).digest("hex"));
  publishSnapshot(file, text);
  return file;
}
```

- The name is the full digest of the whole text: the user's keys, the hooks and the two
  values. So a file is never changed under a running Claude. A changed install file gives new
  names, and an older process keeps its own file.
- Writing the same bytes again is harmless, and nothing reads a file back to decide anything.
- **The file's path.** `claudeWorkerSettingsPath(orchDir, digest)` is added to
  `claude-hooks.ts`, beside `claudeSettingsPath`. It derives the name from the install file's:
  `claude/settings.json` becomes `claude/settings.<digest>.json`, in the same directory. No new
  directory name or root is added.
- **Publishing a snapshot never replaces a file.** `publishSnapshot(file, text)` works in
  four steps:
  1. It makes the directory and writes `settingsTemporaryPath(file)`.
  2. It publishes with `fs.linkSync(temporary, file)`. Creating a hard link is atomic and never
     replaces an existing file, on Linux and on NTFS.
  3. `EEXIST` means a snapshot with this digest is already published. The name is the digest
     of the contents, so that file holds these bytes, and this is success.
  4. It always unlinks the temp file. Any other error rethrows after the cleanup.
- Nothing is renamed onto a file Claude may hold open, so Windows' `EPERM` or `EBUSY` on such a
  rename cannot happen, and nothing is checked for existence first.
- The install file keeps `writeWorkerSettings`, which writes the temp file and renames it into
  place. Its failures always throw, so a sync never reports a write that did not happen.
- `settingsArgv(opts)` builds the argument three ways:
  - with no `orchDir`, `[]`;
  - with `workers` set, `["--settings", workerSettingsFile(opts.orchDir, opts.workers)]`;
  - with no `workers`, `["--settings", claudeSettingsPath(opts.orchDir)]`.
- After Part A every orchd launch carries `workers`, so the last branch is for an argv built
  with no policy. `mcpArgv` reads the same `workers`.
- `settingsArgv` can now throw. Every caller with an `orchDir` is a launch, and it reports a
  launch error to the request that asked for it. `restartAttached` builds its opts before it
  ends the old session.
- The doc comment on `interactiveArgv` says it may write under `orchDir`.

### Rules 17 and 18

- **Rule 17.** A worker file's path is derived from the install file's path and its own
  digest, so the plan adds no new name. `claudeSettingsPath` fixes `claude/settings.json`
  today. That layout under `$ORCH_DIR/<harness>/` belongs to the harness's adapter, and is not
  a setting.
- **Rule 18.** The files are harness launch config, as `claude/settings.json` is. Only Claude
  reads them, and orch builds each one in memory and never opens one to decide anything.

### What the file transport assumes

It assumes nothing new. Claude already reads `enabledPlugins` and `env` from the
`--settings` file orch passes today, and a worker file holds the same keys. A JSON string on
`--settings` is ruled out for two reasons: the pane command line is unquoted, and user keys
and hooks do not belong on a process command line.

## Tests

`claude-adapter.test.ts`, over a temp `orchDir` whose install file holds `{"model": "x"}` and
orch's hooks:
1. Two launches whose policies differ in `excludeExtensions.claude` get two paths.
   - Each file's `enabledPlugins` maps its own policy's plugin ids to `false`.
   - Each file holds `"model": "x"`.
   - Each file's `hooks` deep-equals the install file's.
2. Equal policies get the same path. A launch after the install file changes gets a new path,
   and the earlier file is unchanged.
3. A `readOnlyPolicy` launch writes `env.ENABLE_CLAUDEAI_MCP_SERVERS: "false"`. A policy with
   `inheritMcp: true` writes no such key.
4. A launch never changes the install file.
5. A launch refuses each bad install file, with these messages:
   - absent: "run orch setup";
   - no hooks or missing hook events: "run orch setup";
   - malformed: "fix the JSON by hand";
   - unreadable, a directory at the path: "fix the JSON by hand".
6. `headlessCmd` and `resume.argv` with `workers` pass a worker file.
7. An argv built with no `orchDir` writes nothing.
8. Two `workerSettingsFile` calls with equal policies leave one valid file and no `.tmp`.
   A second publish of an existing snapshot succeeds and leaves it unchanged. A failed temp
   write throws and leaves neither the temp file nor the snapshot. The install file's sync
   throws on a failed rename.
9. `installShim` creates the install file from nothing.
10. The tests at `:189` and `:199-203` pass no `workers`. They keep expecting
    `claudeSettingsPath(orchDir)` and do not change.

Core tests:
- **`launchPolicy` on its own:**
  - It returns the project's policy, with compaction points, for an agent that is not read-only.
  - It returns the read-only policy for a read-only one.
  - It refuses a harness that cannot run read-only, with the one message.
- **A form switch:** a non-read-only agent's form switch, and its `restartAttached`, carry
  `workers`, `tools` and `env` from the project.
- **A restart command:** `planRelaunch`'s command holds `--settings` and a worker file for a
  Claude agent. For a pi agent it is the pi command, which shows that Part B is
  harness-neutral.
- **A linked host:** its `spawnHeadless` launches with the far project's compaction env. The
  case where the asking project sets a point and the far project sets none launches with no
  compaction env.
- **A spawn into a tab and `tileAgent`:** both launch with the project's policy. For a spawn
  into a new tab whose project sets a compaction point, the env given to `groupHome.create` and
  to `placement.open` holds that point.
- **A restart in place:** a held restart, where the project has removed a compaction point
  since the spawn, relaunches with no compaction env. It keeps `ORCH_PROJECT`, the launch key
  and `ORCH_DIR`. `reloadHere` still refreshes the shim.
- **A refused spawn:**
  - A headless spawn whose `prepareLaunch` refuses leaves no worktree.
  - A new-tab spawn whose later agent is refused discards the worktrees of the agents before it.
- **A spawn into an existing tab:** when its project sets a compaction point, it launches with
  that point.
- **The `spawn-headless` schema:** it requires `readOnly` and rejects a wrong `readOnly`.

## Choices made, and why

- **Not a file per project.** The adapter would need the project, which core does not hand a
  harness. Two projects with the same contents share a file anyway.
- **Not a JSON string on `--settings`.** See "What the file transport assumes".
- **Not making `workers.exclude_extensions` install-only.** It is one key across harnesses, and
  pi honours it per project.
- **The write is inside the argv builder.** The builder is the one point every launch path on
  the agent's host passes through. A prepare step for one harness would put a call on every
  path. The limit is the `orchDir` rule in Part B.
- **No pruning.** A file is a few hundred bytes, one per distinct pair of policy and install
  contents. The store does not record which file a live agent launched with, and deleting one
  under a running Claude is a risk.

## Out of scope

- **A path with a space in it.** A pane command is joined unquoted, so `--settings <path>`
  breaks when `$ORCH_DIR` holds a space. Today's `claude/settings.json` has the same problem,
  and so does every adapter's pane command.
  - The quoting belongs at the backend's shell boundary for every harness.
  - `createInteractiveCommand` takes the adapter's `interactiveCmd` string, so the backend
    cannot quote an argv it never sees. The fix is for backends to take every adapter's argv,
    as they take `program` today, and quote it there. That is its own change.
  - A Claude-only fix would be harness code doing a backend's job.
- **The env of a pane-fallback restart.** See Part C.
- **Claude's other policy fields**, `allowTools` and `inheritExtensions`.
