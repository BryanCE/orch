# W7b: which settings keys each function reads

Context for every section. These tasks only read code and write one report file each. Edit no
source file. Run no command. Paths are from the repo root `/home/bryan/orch`; source is under
`packages/orch/src/`.

The install-only keys: a key is install-only when it is one of these, or starts with one of
these followed by a dot: `runtime`, `enabled`, `skills`, `project`, `settings_file`, `daemon`,
`links`, `hosts`, `servers`, `lock`, `retention`, `logging`, `doctor`, `timeouts`, `queue`,
`pty`, `attach`, `notify`, `notification`, `monitor`, `monitor_tool`, `counts`, `tiling`,
`spaces`, `mail`, `questions`, `fleet.max_agents_total`, `fleet.max_agents_per_space`,
`fleet.min_free_memory_mb`, `fleet.cross_space`, `fleet.orch_peers`. Every other key is a
project key.

For each function named in your section, find its definition with grep (`function <name>`,
`const <name> =`, or a method `<name>(`). Then write, under a `## <name>` heading:
- **Defined**: `path:line` and its signature in a code block.
- **Settings parameter**: which parameter carries settings (an `OrchSettings`, a
  `SettingsManager`, a `Services`, a `DaemonClient`, or a `Pick<...>` of one).
- **Reads**: every settings key read from that parameter, in the function or in any function
  it passes the value to, followed to the read. One bullet per key: `section.key`, `install`
  or `project`, `path:line` of the read. When a whole section is read (`settings.timeouts`
  passed on), name the section and follow it one more call to name the keys.
- **Verdict**: one line: `install only` when every key is install-only, else
  `project: <the project keys>`.
Stop following a value at 4 calls deep and write "deeper: <function>" for what is left.

## T1 Control and entities
Functions: `deliverControl`, `buildEntities`, `heldCapacity`, `resolveTargetFor`,
`lifecycleResolutionFor`, `buildFleetStatus`, `peerOrchs`.
Write `project-settings/findings/L14-control.md`.

## T2 Spawn admission
Functions: `assertSpawnPolicy`, `assertSpawnCapacity`, `assertSpaceCapacity`,
`assertHostAdmits`, `admitModel`, `admitLaunchModel`, `admitAgentModel`, `admitSpawn`,
`planSpawn`, `plexerRequest`.
Write `project-settings/findings/L15-admission.md`.

## T3 Launch and relaunch
Functions: `planViewers`, `spawnOneIntoTab`, `openFleetHome`, `growFleetIntoGroup`,
`openHome`, `relaunchPolicy`, `adapterCommand`, `resolveTuningOrDie`, `refreshStaleShims`,
`selectBackend`, and the `reopens` method of a form driver (find the interface that declares
`reopens(` and every implementation).
Write `project-settings/findings/L16-launch.md`.

## T4 Notify, mail, harness files, the session context, orchd's root
Functions: `emitAndNotify`, `deliverEvent`, `deliver` (the one `handlers/machine.ts` imports),
`probeNotifiers`, `setupIntegrate`, `acceptMail`, `syncAdapterSettingsFiles`, `logLevelFor`.
Also answer, each under its own heading:
- `src/daemon/server/session-agents.ts:162` returns `{ logger, settings, pipes }`: the type of
  that object, and every reader of its `settings` field with the keys read.
- `src/daemon/server/orchd.ts:111` passes `settings: () => services.settings.current()` into
  something: what, its declared type, and every key read through it.
- `src/daemon/server/orchd.ts:255` passes `settings: services.settings`: into what, its
  declared type, and every key read through it.
- `src/daemon/server/orchd.ts:191-200`: what `watchSettings` is passed and what `onChange`
  does with the settings, with every key read.
Write `project-settings/findings/L17-notify-root.md`.
