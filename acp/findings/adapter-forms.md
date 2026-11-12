# Adapter forms

## Launch methods

| Member | Signature | Declaration |
|---|---|---|
| `interactiveCmd` | `(opts: SpawnOpts): string` | `packages/orch/src/types/adapter.ts:323` |
| `interactiveArgv` | `(opts: SpawnOpts): readonly string[]` | `packages/orch/src/types/adapter.ts:332` |
| `headlessCmd` | `(prompt: string, opts: SpawnOpts): string[]` | `packages/orch/src/types/adapter.ts:334` |
| `workerLaunch.restrictedInteractiveCmd` | `(opts: SpawnOpts): string` | `packages/orch/src/types/adapter.ts:185` |
| `workerLaunch.restrictedHeadlessCmd` | `(prompt: string, opts: SpawnOpts): string[]` | `packages/orch/src/types/adapter.ts:186` |
| `steer` | `(request: SteerRequest): AdapterCommand \| undefined` | `packages/orch/src/types/adapter.ts:338` |
| `lifecycleControl.lifecycleCmd` | `(verb: LifecycleVerb): { text: string } \| undefined` | `packages/orch/src/types/adapter.ts:195` |
| `thinking.launchArgs` | `(level: ThinkingLevel): readonly string[]` | `packages/orch/src/types/adapter.ts:179` |
| `compaction.launch` | `(points: Readonly<Record<string, number>>, model: string \| undefined): CompactionLaunch` | `packages/orch/src/types/adapter.ts:257` |

## Per adapter

| Member | pi | omp | claude | codex |
|---|---|---|---|---|
| `interactiveCmd` | `pi.ts:417-419` — `pi` plus optional worker tool/extension args, model/quicklist and thinking flags | `omp.ts:83-85` — `omp` plus model/quicklist flags | `claude.ts:245-247` — joins its interactive argv with spaces | `codex.ts:119-123` — `codex`, optional `--model <quoted model>`, compaction config args |
| `interactiveArgv` | `pi.ts:421-423` — raw `pi` argv composition | `omp.ts:87-89` — `omp` plus model/quicklist argv | `claude.ts:249-253` — `buildInteractiveArgv("claude", opts)`, settings, optional effort | `codex.ts:125-127` — interactive `codex` argv plus compaction config args |
| `headlessCmd` | `pi.ts:432-434` — pi argv plus optional worker args, model/quicklist, thinking and prompt | `omp.ts:98-100` — `omp`, model/quicklist args, prompt | `claude.ts:256-260` — `claude -p`, settings, optional effort, prompt via builder | `codex.ts:130-132` — `codex exec --json`, compaction args, prompt via builder |
| `workerLaunch.restrictedInteractiveCmd` | `pi.ts:427-429` — worker pi argv with tool policy and bridge/extensions | `omp.ts:93-96` — `omp`, worker tool policy, bridge/extensions, model args | `null` (`claude.ts:213`) | `null` (`codex.ts:102`) |
| `workerLaunch.restrictedHeadlessCmd` | `pi.ts:437-439` — worker pi argv, prompt included | `omp.ts:103-105` — `omp`, worker policy/extensions, model args, prompt | `null` (`claude.ts:213`) | `null` (`codex.ts:102`) |
| `steer` | `pi.ts:360-362` — `undefined`; bridge receives steer | `pi.ts:360-362` inherited — `undefined`; bridge receives steer | `claude.ts:282-284` — `undefined`; caller uses degraded delivery | `codex.ts:140-148` — `codex resume <session> <text>` when interactive, else `codex exec resume <session> <text>` |
| `lifecycleControl.lifecycleCmd` | `pi.ts:370-372` — reset `/new`, reload `/reload`, restart `/quit` | inherited from `pi.ts:370-372` — same pi-style text | `claude.ts:219` — reset `/clear`; reload/restart `undefined` | `null` (`codex.ts:101`) |
| `thinking.launchArgs` | `pi.ts:391-394` — `--thinking <level>` | `null` (`omp.ts:54`) | `claude.ts:222-230` — `--effort <mapped level>` | `null` (`codex.ts:100`) |
| `compaction.launch` | `pi.ts:413` — `NO_COMPACTION` (bridge handles it) | `omp.ts:64` — `null` | `claude.ts:230` — `CLAUDE_CODE_AUTO_COMPACT_WINDOW=<tokens>` environment | `codex.ts:109` — args `-c model_auto_compact_token_limit=<tokens>` |

## Callers

| Member | Caller | Enclosing function | Use |
|---|---|---|---|
| `interactiveCmd` | `packages/orch/src/backends/backend.ts:23` | `createInteractiveCommand` | Fallback launch command when no command override or restricted worker launcher is used. |
| `interactiveCmd` | `packages/orch/src/daemon/server/spawn/models.ts:40` | `adapterCommand` | Fallback command for spawning a worker. |
| `interactiveArgv` | `packages/orch/src/backends/herdr/index.ts:389` | `spawn` | Supplies executable arguments to herdr without shell quoting. |
| `headlessCmd` | `packages/orch/src/backends/headless/index.ts:176` | `spawn` | Fallback argv to start detached agent after worker-specific launcher. |
| `workerLaunch.restrictedInteractiveCmd` | `packages/orch/src/backends/backend.ts:23` | `createInteractiveCommand` | Preferred complete worker launch command. |
| `workerLaunch.restrictedInteractiveCmd` | `packages/orch/src/daemon/server/spawn/models.ts:40` | `adapterCommand` | Preferred complete worker command. |
| `workerLaunch.restrictedHeadlessCmd` | `packages/orch/src/backends/headless/index.ts:175` | `spawn` | Preferred worker argv for detached launch. |
| `steer` | `packages/orch/src/control/dispatch.ts:105` | `deliverPrompt` | Produces adapter command if the adapter has native steering. |
| `lifecycleControl.lifecycleCmd` | `packages/orch/src/control/dispatch.ts:212` | `deliverLifecycle` | Gets harness text for a lifecycle verb. |
| `lifecycleControl.lifecycleCmd` | `packages/orch/src/daemon/server/handlers/relaunch.ts:96` | `recordedHarness` | Gets harness text when preparing reload/relaunch. |
| `thinking.launchArgs` | No caller outside `src/adapters/` | Adapter launch builders compose the harness-specific thinking flag; no external caller invokes this role. |
| `compaction.launch` | `packages/orch/src/policy/workers.ts:36` | `compactionLaunch` | Gets the selected adapter's launch-time compaction environment and arguments. |

## Roles

Role declaration is in `packages/orch/src/types/adapter.ts:270-321`.

| Nullable role / property | pi | omp | claude | codex |
|---|---|---|---|---|
| `thinking: ThinkingStrategy \| null` | strategy (`pi.ts:390-395`) | `null` (`omp.ts:54`) | strategy (`claude.ts:211-216`) | `null` (`codex.ts:100`) |
| `workerLaunch: WorkerLaunchRole \| null` | restricted command role (`pi.ts:342-345`) | inherited restricted role (`pi.ts:342-345`; methods in `omp.ts:93-105`) | `null` (`claude.ts:213`) | `null` (`codex.ts:102`) |
| `modelControl: ModelControlRole \| null` | role, bridge applies it (`pi.ts:346`) | inherited role (`pi.ts:346`) | `null` (`claude.ts:214`) | `null` (`codex.ts:103`) |
| `lifecycleControl: LifecycleControlRole \| null` | role (`pi.ts:347`) | inherited role (`pi.ts:347`) | lifecycle role (`claude.ts:219`) | `null` (`codex.ts:104`) |
| `sessionView: SessionViewRole \| null` | role (`pi.ts:348`) | inherited role (`pi.ts:348`) | role (`claude.ts:220`) | role (`codex.ts:105`) |
| `workspaceTrust: WorkspaceTrustRole \| null` | trust role (`pi.ts:401`) | `null` (`omp.ts:55`) | `null` (`claude.ts:221`) | `null` (`codex.ts:106`) |
| `shim: ShimRole \| null` | install/diagnose role (`pi.ts:402-407`) | role (`omp.ts:56-59`) | `shimRole(this)` (`claude.ts:222`) | `shimRole(this)` (`codex.ts:107`) |
| `settingsFile: SettingsFileRole \| null` | `null` (`pi.ts:351`) | inherited `null` (`pi.ts:351`) | sync role (`claude.ts:224`) | `null` (`codex.ts:108`) |
| `defaultModel: DefaultModelRole \| null` | role (`pi.ts:408`) | role (`omp.ts:60`) | `null` (`claude.ts:225`) | `null` (`codex.ts:109`) |
| `models: ModelCatalogueRole \| null` | role (`pi.ts:409`) | role (`omp.ts:61`) | role (`claude.ts:226`) | role (`codex.ts:110`) |
| `modelWarm: ModelWarmRole \| null` | role (`pi.ts:410`) | role (`omp.ts:62`) | role (`claude.ts:227`) | `null` (`codex.ts:111`) |
| `compaction: CompactionRole \| null` | role (`pi.ts:413`) | `null` (`omp.ts:64`) | role (`claude.ts:230`) | role (`codex.ts:109`) |
| `bridge: BridgeRole \| null` | takes dispatch/steer/answer/model (`pi.ts:349`) | inherited bridge (`pi.ts:349`) | `null` (`claude.ts:231`) | `null` (`codex.ts:113`) |
| `hooks: HookReportRole \| null` | `null` (`pi.ts:350`) | inherited `null` (`pi.ts:350`) | reports start/prompt (`claude.ts:233`) | `null` (`codex.ts:114`) |
| `commandGate: boolean` | `true` (`pi.ts:352`) | inherited `true` (`pi.ts:352`) | `true` (`claude.ts:234`) | `false` (`codex.ts:115`) |

## Prerequisites and doctor

`Prerequisite` is `{ install?: InstallCommands; docsUrl?: string; needs?: readonly string[]; signIn?: string; recommended?: boolean }` (`packages/orch/src/types/adapter.ts:374-386`). `InstallCommands` is a partial host-OS-to-command record (`packages/orch/src/types/adapter.ts:374-375`). Registry entries (`packages/orch/src/shared/prerequisites.ts:12-27`):

| ID | Prerequisites |
|---|---|
| `pi` | Install `bun add -g @earendil-works/pi-coding-agent` on linux/darwin/windows; needs `bun`; sign-in `pi auth` (`prerequisites.ts:13`) |
| `omp` | Install `bun add -g @oh-my-pi/pi-coding-agent` on linux/darwin/windows; needs `bun`; sign-in `omp setup` (`prerequisites.ts:14`) |
| `claude` | POSIX curl install or Windows PowerShell install; sign-in `claude auth` (`prerequisites.ts:15`) |
| `codex` | Manual docs URL; sign-in `codex login` (`prerequisites.ts:16`) |
| `tmux` | Manual docs URL (`prerequisites.ts:18`) |
| `herdr` | POSIX/Windows install command, docs URL, recommended (`prerequisites.ts:19-23`) |
| `orca` | Manual docs URL (`prerequisites.ts:24`) |

Doctor checks are registered in `packages/orch/src/daemon/server/doctor/runner.ts:82-154`; individual check declarations:

| Check | Location | Verifies |
|---|---|---|
| Required binaries | `doctor/bins.ts:8` | Enabled adapter binaries are on PATH. |
| Adapter binary, integration shim, model catalogue | `doctor/runner.ts:99-108` | Per enabled adapter checks PATH, its shim diagnosis, and whether a default model remains offered (`doctor/models.ts:11`). |
| Live adapter/backend pairs | `doctor/runner.ts:51-78` | Each running composition's adapter shim is diagnosable. |
| Backend environments | `doctor/backends.ts:156` | Enabled backends are available and active backend is inside its session. |
| Backend versions | `doctor/backends.ts:139` | Installed plexer client/server versions meet supported ranges. |
| Declared vs reality | `doctor/declared-vs-reality.ts:104` | Stored live-agent lease, environment, orphan, and tuning claims match reported state. |
| Malformed presence records | `doctor/presence.ts:23` | Presence directory identities are valid. |
| Dead agent rows | `doctor/presence.ts:103` | Dead agents remain in the store. |
| Store | `doctor/store.ts:60` | Database opens and contains expected migration/table records. |
| Unscoped tasks | `doctor/presence.ts:67` | Each queued task has exactly one scope. |
| Unrunnable tasks | `doctor/unrunnable-tasks.ts:46` | Missing scope rows, unrunnable tasks, and stale queued tasks. |
| Extension staleness | `doctor/extensions.ts:22` | Live extension hashes match shipped bundles; presence root is usable. |
| Help docs | `doctor/help-docs.ts:7` | CLI help documentation is current. |
| Settings validity | `doctor/settings-file.ts:43` | Settings file keys and values validate; identifies repairable defects. |
| Declared runtime | `doctor/runtime.ts:55` | Executing runtime and entrypoint match declared runtime. |
| Skill links | `doctor/skills.ts:24` | Packaged skill store and harness links are current. |
| Spawn limits | `doctor/settings-file.ts:16` | Per-space caps do not exceed global cap. |
| Provenance depth | `doctor/provenance-depth.ts:8` | Live agent depth is within configured max. |
| Unclaimed agents | `doctor/unclaimed-agents.ts:7` | Agents have not remained unclaimed past threshold. |
| Command locks | `doctor/settings-file.ts:33` | Enabled harnesses gate configured locked/gated commands. |
| Desktop notifications | `doctor/notify.ts:13` | Native backend or desktop notification tier exists. |
| Notification sinks | `doctor/notify.ts:72` | Configured sink URLs, commands, sound, and desktop delivery are usable. |
| Notifiers | `doctor/notify.ts:25` | Configured notifiers validate and are reachable; `done` is included. |
| ORCH_DIR location | `doctor/settings-file.ts:80` | WSL ORCH_DIR is not on DrvFs. |
| orchd registration/presence/code/lock/socket | `doctor/daemon.ts:10,80,108,143,158` | Machine registration liveness, daemon lock/process, code freshness, and bound transport. |
| OS-side executors | `doctor/daemon.ts:47` | Live daemon runs on a side with an executor. |
| Worktree gitignore/provider | `doctor/settings-file.ts:102,113` | Selected worktree provider is available and repository worktree directory is ignored. |

## Settings

Types derive from `SETTINGS_FILE_SCHEMA` in `packages/orch/src/settings/schema.ts:115-174`; all listed settings are optional unless shown otherwise. Values shown under Default are only those explicitly present in `SETTINGS_DEFAULTS` at `schema.ts:89-108`; other optional fields have no declared default there.

| Key | Type | Default | Source |
|---|---|---|---|
| `enabled.adapters` | `AdapterId[]` | none | `schema.ts:120-125` |
| `enabled.backends` | `BackendId[]` | none | `schema.ts:120-125` |
| `defaults.adapter` | `AdapterId` | none | `schema.ts:126-127` |
| `defaults.backend` | `BackendId` | none | `schema.ts:126-127` |
| `defaults.models` | partial adapter-id → string | none | `schema.ts:129-132` |
| `defaults.thinking` | `ThinkingLevel` | `medium` | `schema.ts:132`; defaults `schema.ts:99` |
| `defaults.thinking_by_harness` | partial adapter-id → `ThinkingLevel` | `{}` | `schema.ts:133`; defaults `schema.ts:99` |
| `models.allowed` | partial adapter-id → string[] | none | `schema.ts:156-160` |
| `models.preferred` | partial adapter-id → string[] | none | `schema.ts:156-160` |
| `workers.exclude_extensions` | partial adapter-id → string[] | none | `schema.ts:164-167` |
| `workers.compact_at_tokens` | adapter ID → model → positive integer | `{}` | `schema.ts:171-174`; defaults `schema.ts:102` |
| `skills.install` | boolean | `true` | `schema.ts:107`; key registry `registry.ts:281` |
| `skills.store` | string | `~/.agents/skills` | `schema.ts:107`; key registry `registry.ts:282` |
| `skills.link` | string[] | `~/.claude/skills` | `schema.ts:107`; key registry `registry.ts:283` |
| `runtime` | required `OrchRuntime` | no default | `schema.ts:115-119`; runtime selected during setup |

## Setup

1. Resolve runtime from flag, interactive picker, or noninteractive default (`packages/orch/src/setup/composition.ts:57-68`; runtime prompt `setup/wizard.ts:15-25`).
2. Select adapter/harness IDs (`setup/composition.ts:270-278`; prompt `setup/wizard.ts:33-36`), then choose default adapter (`composition.ts:273-278`; `wizard.ts:38-41`).
3. Select backends, prechecking detected and recommended choices (`composition.ts:279-285`; `wizard.ts:43-52`), then choose default backend (`composition.ts:286-289`; `wizard.ts:54-57`).
4. Query the selected harness catalogues and resolve model defaults; interactive setup can pick allowed/quicklist models (`composition.ts:104-136`, `composition.ts:290-295`; `wizard.ts:78-135`).
5. Record runtime, enabled sets, defaults and model lists, then materialize settings (`composition.ts:227-253`).
6. Probe selected adapter/backend prerequisites; offer `chooseInstalls` for missing binaries on interactive TTY when `--install` is unspecified, otherwise install all with `--install` or print commands (`commands/setup.ts:126-145`; prompt `setup/wizard.ts:138-140`). The install selection is per missing binary/harness prerequisite, not a separate harness-install screen.
7. Install selected missing prerequisites in probe order (`commands/setup.ts:145`; `daemon/server/setup.ts:124-150`).
8. Integrate selected adapter shims and runtime (`commands/setup.ts:159`; `daemon/server/setup.ts:286-`), then offer packaged skill installation (`commands/setup.ts:161`); interactive setup may configure notifiers (`commands/setup.ts:162`, `setup.ts:205-`).
9. Run doctor, report gaps, and run smoke only when requested (`commands/setup.ts:166-188`).

## Does not fit

- `Prerequisite` registry includes `bun` as a dependency entry and `notify-send` as a notification tool, not a selected harness/backend (`packages/orch/src/shared/prerequisites.ts:12-27`).
