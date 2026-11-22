# W9: every orchd reader takes the settings of its project, or the install's alone

Context for every section. orch now has a project settings file per project directory, whose
keys override the install file `$ORCH_DIR/settings.json`. orchd serves every project, so its
`state.services.settings.current()` is now typed `InstallSettings`
(`packages/orch/src/types/settings.ts`): the install-only keys alone. Every orchd read of a
project key, and every hand-off of orchd's settings to a function typed `OrchSettings`, no
longer compiles. This wave fixes each one. Paths are from the repo root `/home/bryan/orch`;
`<server>` is `packages/orch/src/daemon/server`. No `as` casts, no `any`.

Built and ready to import:
- `<server>/project-settings.ts`:
  - `agentSettings(state: DaemonState, agentId: string): OrchSettings`: the merged settings
    of that agent's project (an agent key is its id).
  - `agentProjectSettings(state, agentId): ProjectSettings`: the same with its `state`.
  - `installSettings(state: DaemonState): OrchSettings`: every key of the install file alone,
    for a read that serves no one project.
- `state.services.settingsFor(directory: string | null): ProjectSettings`. `ProjectSettings`
  is `{ file; state: { kind: "none" } | { kind: "ok" } | { kind: "invalid"; message: string }; settings: OrchSettings; values }`.
- `validProjectSettings(project: ProjectSettings): OrchSettings` in
  `packages/orch/src/settings/project.ts`: the merged settings, or throws the invalid file's
  message.
- `packages/orch/src/types/services.ts`: `InstallSettingsManager` (a `SettingsManager` whose
  reads give `InstallSettings`) and `DaemonContext = Pick<DaemonServices, "orchDir" | "settings" | "logger">`.

Three rules, used by every section:
- **R1, a read for an agent.** Replace the `state.services.settings.current()` with
  `agentSettings(state, <the agent's key>)`.
- **R2, a read with no project in view.** Replace the `state.services.settings.current()`
  (or `services.settings.current()`, or `settings.current()` where `settings` is
  `state.services.settings`) with `installSettings(state)`. The value is the full
  `OrchSettings`, so the call it feeds compiles unchanged.
- **R3, a manager or services parameter on server code.** A server function parameter typed
  `DaemonClient` or `Pick<Services, "orchDir" | "settings" | "logger">` becomes `DaemonContext`;
  one typed `SettingsManager` that only reads install-only keys becomes
  `InstallSettingsManager`; one typed `OrchSettings | null` that only reads install-only keys
  becomes `InstallSettings | null`. Import the types from `packages/orch/src/types/services.ts`
  and `packages/orch/src/types/settings.ts`.
Each section lists its error lines as `file:line` (line numbers as of now) with the rule.
After the edits, the typecheck of your files must show none of these errors. A new error in a
file outside your section is another section's; report it, do not fix it.

## T1 Spawn and the headless spawn
Edit `<server>/spawn/index.ts`:
- `spawnAgents` (about L327): replace `const settingsFile = services.settings.current();` with
  these lines, placed after `const self = spawner(state, params.caller);`:
  ```ts
  // The spawn reads its project's settings: the spawner's project, else the directory asked from.
  // A spawn that sends work refuses an invalid project file; one with none launches on the install's.
  const project = services.settingsFor(projectDirectory(state.directory, self.id, params.cwd));
  const settingsFile = params.agents.some((agent) => agent.prompt?.trim()) ? validProjectSettings(project) : project.settings;
  ```
  If `agent.prompt` is not a field of a spawn agent, report it and stop.
- `tileAgent` (about L406): replace `const settingsFile: OrchSettings = services.settings.current();`
  with `const settingsFile = services.settingsFor(projectDirectory(state.directory, spawner(state, params.caller).id, params.cwd)).settings;`.
- `executeHeadlessSpawn` (about L106): its `const settingsFile = services.settings.current();`
  becomes `const settingsFile = services.settingsFor(projectDirectory(state.directory, self.id, settings.cwd)).settings;`.
- L121, L248, L274, L303, L385, L448: `DaemonServices` is not assignable to `DaemonClient`.
  Apply R3 to the callee's parameter: `planViewers`'s options type `services` field
  (`<server>/spawn/viewers.ts` L39), every `services: DaemonClient` parameter in
  `<server>/spawn/placement.ts` (L156, L175, L202, L227, L262), `openFleetHome` and `openHome`
  and `listedHomeHandle` in `<server>/home.ts`, and any other `DaemonClient` the compiler then
  names under `<server>/spawn/` or `<server>/home.ts`.
- Import `validProjectSettings` from `../../../settings/project.ts` and `projectDirectory`
  from `./project.ts` where missing. Drop the `OrchSettings` type import if it becomes unused.
Edit `<server>/spawn/models.ts` `admitModelFor` (L98-103): replace
`const current = settings.current();` with
`const current = params.agent === null ? installSettings(state) : agentSettings(state, params.agent);`
and drop `settings` from the destructuring if unused.
Edit `<server>/handlers/lifecycle.ts`:
- `spawnHeadless` (L61): after `const directory = state.directory;` add
  `const settings = state.services.settingsFor(params.project).settings;`. L70
  `admitModel(state.services.settings.current(), ...)` takes `settings`; L78
  `state.services.settings.current().defaults.forms` becomes `settings.defaults.forms`; L101
  `assertHostAdmits(directory, state.services.settings.current(), 1)` takes `settings`.
- L163 and L258: `deliverControl(state.directory, state.services.settings.current(), ...)`:
  R2.
Verify: packages/orch/src/daemon/server/spawn/index.ts packages/orch/src/daemon/server/spawn/models.ts packages/orch/src/daemon/server/spawn/viewers.ts packages/orch/src/daemon/server/spawn/placement.ts packages/orch/src/daemon/server/home.ts packages/orch/src/daemon/server/handlers/lifecycle.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Relaunch, restart, writes and drive
Edit `<server>/handlers/relaunch.ts`:
- `planRelaunch` L98: `const settings = state.services.settings.current();` becomes
  `const settings = agentSettings(state, key);` (R1). That fixes L103-L108.
- L157: `relaunchPolicy(state.directory, state.services.settings.current(), recorded, key)`:
  R1 with `key`.
- L90 and L210: `refreshStaleShims(..., state.services.settings.current())`: R2.
Edit `<server>/handlers/restart-form.ts`:
- `restartOpts` L63: `const settings = state.services.settings.current();` becomes
  `const settings = agentSettings(state, view.id);` (R1). That fixes L65 and L76.
- L83: `driver.reopens(state.pipes, state.services.settings.current())`: R2.
Edit `<server>/handlers/write.ts`:
- L137 and L398: `deliverControl(directory, state.services.settings.current() | settings.current(), ...)`: R2.
- L364: `acceptMail(directory, settings.currentOrNull(), ...)`: apply R3 to `acceptMail`'s
  settings parameter in `<server>/mail.ts` (L65): `OrchSettings | null` becomes
  `InstallSettings | null`. If `acceptMail` passes that value on to a function typed
  `OrchSettings`, retype that function's parameter the same way when it reads only
  install-only keys (`mail.*`, `timeouts.*`, `daemon.*`), else report it.
Edit `<server>/handlers/drive.ts` L28: `deliverControl(state.directory, state.services.settings.current(), ...)`: R2.
Verify: packages/orch/src/daemon/server/handlers/relaunch.ts packages/orch/src/daemon/server/handlers/restart-form.ts packages/orch/src/daemon/server/handlers/write.ts packages/orch/src/daemon/server/mail.ts packages/orch/src/daemon/server/handlers/drive.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 The other handlers
Edit `<server>/handlers/review.ts`:
- `actOnWorktree` L58: `state.services.settings.current().worktrees` becomes
  `agentSettings(state, key).worktrees` (R1).
- `reviewsOf` L73: delete `const prefix = state.services.settings.current().worktrees.branch_prefix;`.
  Inside the `for (const view of agentViews(state.directory))` loop, where `prefix` is used,
  use `agentSettings(state, view.id).worktrees.branch_prefix` (bind it to a `const prefix` at
  the top of the loop body).
- `peerWorktreeHandler` L125: `state.services.settings.current().worktrees` becomes
  `agentSettings(state, params.key).worktrees` (R1).
Edit `<server>/handlers/table.ts`:
- L127, the `"command-lock"` handler, becomes:
  ```ts
  "command-lock": ({ pid, ...params }) => lockCommand(directory, lockSettingsFor(state, params.agent, params.cwd), { ...params, process: hostedPid(pid) }, publish),
  ```
  and add above the function that builds this table:
  ```ts
  /** A lock ruling reads the lists of the asking agent's project, and of the directory asked
   *  from when no known agent asks: the human's own `orch lock`. An invalid project file leaves
   *  the install's lists. */
  function lockSettingsFor(state: DaemonState, agent: string | null, cwd: string): OrchSettings {
    const project = agent === null ? undefined : selectAgentStatus(state.directory, agent)?.project;
    return state.services.settingsFor(project ?? cwd).settings;
  }
  ```
  importing `selectAgentStatus` from `../../../store/status-rows.ts` and `type OrchSettings`
  where missing. `lockCommand`'s `LockSettings` parameter accepts an `OrchSettings`.
- L213 `clean`: `services.settings.current().worktrees` becomes `installSettings(state).worktrees` (R2).
- L226 `orchs`: `peerOrchs(directory, services.settings.current(), params.caller)`: R2.
Edit `<server>/handlers/fleet.ts` L26 (the `settings` passed to `buildEntities`, set at about
L20), L40 and L48: R2 for each.
Edit `<server>/handlers/resolve.ts` L20 (the `settings` set above it) and L50: R2.
Edit `<server>/handlers/close.ts` L8: R2.
Edit `<server>/handlers/owned.ts` L13: R2.
Edit `<server>/handlers/harness.ts` L43: R2.
Edit `<server>/handlers/space.ts` L28: R2. L52: `openHome({ services: state.services, ... })`
compiles once T1 retypes `openHome`; leave it.
Edit `<server>/handlers/machine.ts`:
- L48: `deliver(orchDir, settings, sink, event, logger)` and the `settings.notify.map`: find
  where that `settings` is set in the enclosing function. If it comes from
  `state.services.settings.current()`, apply R3 to `deliver` in
  `packages/orch/src/notify/router.ts` L107: its settings parameter becomes `InstallSettings`
  (or `InstallSettings | null`, matching what it was). If `deliver` passes it on to another
  function typed `OrchSettings`, retype that one the same way when it reads only install-only
  keys, else report it.
- L60: `probeNotifiers(state.services.settings.currentOrNull())`: R3 on `probeNotifiers` in
  `<server>/notifier-probe.ts` L12 (`OrchSettings | null` becomes `InstallSettings | null`).
- L59: `setupIntegrate(state.services, params)`. In `<server>/setup.ts` L329, change
  `setupIntegrate`'s first parameter to
  `services: Pick<DaemonServices, "orchDir" | "settings" | "settingsFor" | "logger">`, and its
  body's
  ```ts
  const settings = services.settings.reload();
  if (settings === null) throw new Error(`setup recorded no settings in ${services.settings.file}`);
  ```
  becomes
  ```ts
  if (services.settings.reload() === null) throw new Error(`setup recorded no settings in ${services.settings.file}`);
  const settings = services.settingsFor(null).settings;
  ```
  Import `type DaemonServices` from `../../types/services.ts`.
Verify: packages/orch/src/daemon/server/handlers/review.ts packages/orch/src/daemon/server/handlers/table.ts packages/orch/src/daemon/server/handlers/fleet.ts packages/orch/src/daemon/server/handlers/resolve.ts packages/orch/src/daemon/server/handlers/close.ts packages/orch/src/daemon/server/handlers/owned.ts packages/orch/src/daemon/server/handlers/harness.ts packages/orch/src/daemon/server/handlers/space.ts packages/orch/src/daemon/server/handlers/machine.ts packages/orch/src/notify/router.ts packages/orch/src/daemon/server/notifier-probe.ts packages/orch/src/daemon/server/setup.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 orchd's root, events, state, tabs, session agents, the council, the work loop
Edit `<server>/orchd.ts`:
- L111: `settings: () => services.settings.current(),` passed into `new HostLinks({...})`:
  apply R3 to the `settings` option's declared type in `HostLinks`'s options interface
  (grep `class HostLinks` under `packages/orch/src/`): `() => OrchSettings` becomes
  `() => InstallSettings`, if it reads only install-only keys (`hosts`, `links.*`,
  `timeouts.*`); else report it.
- L158 and the `onChange` `logLevelFor(settings)`: apply R3 to `logLevelFor` in
  `packages/orch/src/settings/read.ts` (L422): `settings: OrchSettings | null` becomes
  `settings: InstallSettings | null`.
- L191 and the `onChange` `modelChoicesOf(settings)`: `modelChoicesOf` reads
  `defaults.models` and `models`, the install's. Change its parameter to
  `settings: OrchSettings | null` unchanged, and call it as
  `modelChoicesOf(services.settings.currentOrNull() === null ? null : services.settingsFor(null).settings)`
  at L191, and `modelChoicesOf(services.settingsFor(null).settings)` inside `onChange`.
- L193, the `watchSettings` `load` option: in `packages/orch/src/types/settings.ts`,
  `SettingsWatchOptions`'s `onChange: (config: OrchSettings) => void` and
  `load: () => OrchSettings` become `InstallSettings` in place of `OrchSettings`. Fix any
  other `watchSettings` caller the compiler then names, if it is a test, by nothing: an
  `OrchSettings` value is an `InstallSettings`.
- L255, `runWorkLoop({ ..., settings: services.settings, ... })`: see the work loop below.
Edit `<server>/work-loop.ts`:
- Its options type (`WorkOptions`): `settings: SettingsManager` becomes
  `settings: InstallSettingsManager`, and add a field
  `settingsFor: DaemonServices["settingsFor"];` with the doc comment
  `/** The settings of a project directory, or with null the install's alone. */`.
- L105, `const rules = workerRules(options.settings.current());` becomes
  `const rules = workerRules(validProjectSettings(options.settingsFor(selectAgentStatus(orchDir, entry.key)?.project ?? null)));`
  where `orchDir` and `entry` are the names in that function (use what that function has for
  the orch dir and the claimed agent's key). An invalid project file throws here, and the
  attempt fails through the existing failure path.
- L143: `deliverControl(orchDir, options.settings.current(), ...)`: the value is
  `InstallSettings` now. Change to
  `deliverControl(orchDir, options.settingsFor(null).settings, ...)`.
- L315: `emitAndNotify(..., options.settings, ...)` compiles once `emitAndNotify` is retyped
  below.
- Any other error in this file: a function typed `OrchSettings` that receives
  `options.settings.current()` and reads only install-only keys (`retention.*`, `queue.*`,
  `questions.*`, `timeouts.*`, `notify`): retype its parameter to `InstallSettings`.
- In `orchd.ts` L255, add `settingsFor: services.settingsFor,` beside `settings: services.settings,`.
Edit `<server>/events.ts`: `emitAndNotify` (L63) and `deliverEvent` (L77) take a
`settings: SettingsManager` parameter: R3, it becomes `InstallSettingsManager`. If they pass
`settings.currentOrNull()` to `notify(...)`, retype `notify`'s settings parameter to
`InstallSettings | null` (find it with grep under `packages/orch/src/notify/`).
Edit `<server>/state.ts` L62: `buildFleetStatus(state.services.settings.current(), ...)`: R2.
Edit `<server>/tabs.ts` L97: `selectBackend(null, state.services.settings.current())`: R2.
Edit `<server>/session-agents.ts` L162: the `SessionOpenContext` interface's `settings` field
(grep `interface SessionOpenContext`) becomes `InstallSettings`; its readers read `pty` and
`timeouts`.
Edit `<server>/council.ts`:
- `directoryOf` L76: `state.services.settings.current().council.directory` becomes
  `state.services.settingsFor(ref.cwd).settings.council.directory`.
- `conveneCouncil` L106: `const settings = state.services.settings.current();` becomes
  `const settings = state.services.settingsFor(params.cwd).settings;`.
- The round function L162: `const settings = state.services.settings.current();` becomes
  `const settings = state.services.settingsFor(params.cwd).settings;`.
- L213 (`council-scores`): `state.services.settings.current().council.rounds` becomes
  `state.services.settingsFor(params.cwd).settings.council.rounds`.
Verify: packages/orch/src/daemon/server/orchd.ts packages/orch/src/daemon/server/work-loop.ts packages/orch/src/daemon/server/events.ts packages/orch/src/daemon/server/state.ts packages/orch/src/daemon/server/tabs.ts packages/orch/src/daemon/server/session-agents.ts packages/orch/src/daemon/server/council.ts packages/orch/src/settings/read.ts packages/orch/src/types/settings.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T1 addendum
`placeSpawn` (`<server>/spawn/index.ts` about L272) keeps
`const settingsFile = state.services.settings.current();`. It feeds only
`assertSpawnCapacity`, which reads install-only keys (`fleet.max_agents_total`,
`fleet.max_agents_per_space`, `fleet.min_free_memory_mb`). In
`<server>/spawn/admission.ts`, change the settings parameter type of `assertSpawnCapacity`,
`assertSpaceCapacity` and `assertHostAdmits` from `Pick<OrchSettings, "fleet">` (or
`OrchSettings`) to `Pick<InstallSettings, "fleet">`, importing `type InstallSettings` from
`../../../types/settings.ts`. An `OrchSettings` still passes to them. Do the rest of T1 as
written. Add `packages/orch/src/daemon/server/spawn/admission.ts` to Verify.

## T4 addendum
Every file this section names is in scope, including the ones the bullets send you to: the
file that declares `HostLinks`'s options, `packages/orch/src/settings/read.ts` for
`logLevelFor`, `packages/orch/src/types/settings.ts` for `SettingsWatchOptions`, the file under
`packages/orch/src/notify/` that declares `notify(`, and any function in `work-loop.ts`'s
own file. Edit them as the bullets say, and add each to Verify. Report a callee outside these
that reads a project key.

## T1 second addendum
`packages/orch/src/types/command.ts` now types `services` as `DaemonContext` in
`OpenHomeRequest`, `OpenFleetHomeRequest` and `SpawnPlacementRequest`. Any other type or
function under `packages/orch/src/daemon/server/` or `packages/orch/src/types/` that still says
`DaemonClient` where orchd passes `state.services` is in scope: change it to `DaemonContext`.
Make the edits; do not stop on a file this section did not name, as long as the edit is one of
the three rules.

## T4 second addendum
Any function under `packages/orch/src/daemon/server/`, `packages/orch/src/notify/` or
`packages/orch/src/types/` that the compiler names because it now receives `InstallSettings`
or an `InstallSettingsManager` (for example `deliverTaskResult` in
`<server>/result-delivery.ts`) is in scope. Read it: when every settings key it reads is
install-only, retype its parameter to `InstallSettings` (keeping `| null` if it had it). When
it reads a project key, report the function and the key and leave it. Do not stop on a file
this section did not name.
