# Spawn pipeline and lifecycle verbs

## Spawn, step by step
1. `cmdSpawn` parses flags, resolves settings, and executes the RPC request (`packages/orch/src/commands/spawn/index.ts:36-40`); `parseSpawnFlags` parses positional names and `--prompt`, `--file`, `--tasks`, model, harness, host, directory, plexer and worktree flags (`packages/orch/src/commands/spawn/flags.ts:54-79`).
2. `resolveSpawnSettings` resolves names, per-agent harness/model, prompt and context references, then constructs the request object (`packages/orch/src/commands/spawn/flags.ts:156-192`). The spawn RPC schema carries governed caller data plus agents, cmd, plexer, cwd, tab, space, host and worktree (`packages/orch/src/daemon/client/protocol.ts:679-688`).
3. The handler dispatches to `spawnAgents`; it derives caller identity, calls `planSpawn`, admits the launch, resolves the caller's environment, then resolves the runtime backend (`packages/orch/src/daemon/server/handlers/table.ts:130-130`; `packages/orch/src/daemon/server/spawn/index.ts:263-274`).
4. `planSpawn` selects headless for a remote host, otherwise selects requested/configured backend; it resolves each harness command via `adapterCommand`, tools, workers, worktree and launch placement settings (`packages/orch/src/daemon/server/spawn/plan.ts:46-72`). `spawnBackend` falls back to headless unless the plexer is caller's, explicitly chosen, or a space was specified (`packages/orch/src/daemon/server/spawn/placement.ts:298-315`).
5. A placed spawn prepares workspaces, mints one agent id, composes launch env, creates/joins a group, opens placements, starts the backend/harness, then registers the resulting process (`packages/orch/src/daemon/server/spawn/index.ts:188-209`; `packages/orch/src/daemon/server/spawn/placement.ts:113-115`, `137-181`).
6. `spawnEnv` sets launch credential and `ORCH_DIR`, plus adapter-specific compaction env (`packages/orch/src/daemon/server/spawn/placement.ts:113-115`). `launchSpawnBackend` calls `backend.spawn(adapter, opts)` (`packages/orch/src/daemon/server/spawn/placement.ts:137-150`).
7. Registration records the agent and normalized environment transactionally, including process, handle, plexer, tuning, space, worktree and lease as applicable (`packages/orch/src/store/spawn-registration.ts:24-27`, `44-73`, `104-119`).
8. The result reports backend, host, agents, panes and harness startup traits. The CLI waits for a bridge or hook startup report and then delivers the first prompt through its report flow (`packages/orch/src/daemon/server/spawn/index.ts:73-93`; `packages/orch/src/commands/spawn/index.ts:22-29`). Headless initial prompts are passed to `spawnHeadless`; prompts for a remote held agent are queued in the outbox (`packages/orch/src/daemon/server/handlers/lifecycle.ts:77-106`).

## Spawn params

| Field | Type | Declaration |
|---|---|---|
| caller | `CallerCredential` (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| actor | nullable agent identity (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| actorSpace | nullable space (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| actorIsOperator | boolean (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| steal | boolean (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| crossSpace | boolean (governance) | `packages/orch/src/daemon/client/protocol.ts:679-688` |
| agents | nonempty array of spawn agent records | `packages/orch/src/daemon/client/protocol.ts:680` |
| cmd | nonblank string or null | `packages/orch/src/daemon/client/protocol.ts:681` |
| plexer | nonblank string or null | `packages/orch/src/daemon/client/protocol.ts:682` |
| cwd | nonblank string | `packages/orch/src/daemon/client/protocol.ts:683` |
| tab | nonblank string or null | `packages/orch/src/daemon/client/protocol.ts:684` |
| space | nonblank string or null | `packages/orch/src/daemon/client/protocol.ts:685` |
| host | nonblank string or null | `packages/orch/src/daemon/client/protocol.ts:686` |
| worktree | nullable worktree intent | `packages/orch/src/daemon/client/protocol.ts:687` |

## Rows at registration

| Table/row | Evidence | Value source |
|---|---|---|
| `agents` | `packages/orch/src/store/spawn-registration.ts:57-66` | Minted key; spawner lookup; harness id; current host identity; cwd/name; registration time. |
| `agent_harnesses` | `packages/orch/src/store/spawn-registration.ts:60` | `harnessId`, used as both id and display name. |
| `agent_plexers` | `packages/orch/src/store/spawn-registration.ts:73`, `104-105` | Stated backend id, as id and name. |
| `agent_origins` | `packages/orch/src/store/spawn-registration.ts:68-69` | Explicit origin or inherited origin of spawner. |
| `agent_handles` | `packages/orch/src/store/spawn-registration.ts:107` | Spawned handle, when present. |
| `agent_processes` | `packages/orch/src/store/spawn-registration.ts:108` | Backend's running pid/start token and local host. |
| `agent_spaces` | `packages/orch/src/store/spawn-registration.ts:114` | Requested/resolved space, when present. |
| `agent_tunings` | `packages/orch/src/store/spawn-registration.ts:117` | Resolved model and thinking. |
| `agent_worktrees` | `packages/orch/src/store/spawn-registration.ts:118` | Worktree descriptor, when present. |
| `agent_leases` | `packages/orch/src/store/spawn-registration.ts:80-85` | Explicit owner, otherwise registered spawner; omitted if null/self. |

Remote registration writes agent/harness, tuning and lease reference only; the remote host records its process and environment (`packages/orch/src/store/spawn-registration.ts:34-40`).

## Far spawns
`--host` requires `--dir` and rejects explicit plexer, worktree and command overrides (`packages/orch/src/commands/spawn/flags.ts:156-163`). The initiating orchd chooses headless placement and invokes the host link's `spawn-headless`; the remote orchd starts the process, returning its result (`packages/orch/src/daemon/server/spawn/plan.ts:53-54`; `packages/orch/src/daemon/server/handlers/lifecycle.ts:122-131`). Near side registers a hosted-agent reference with host, cwd, harness, tuning and spawner lease, but no pid (`packages/orch/src/daemon/server/handlers/lifecycle.ts:128-131`; `packages/orch/src/store/spawn-registration.ts:34-40`). Remote agents are held in PTYs when requested by a peer, and their first prompt enters the outbox (`packages/orch/src/daemon/server/handlers/lifecycle.ts:91-111`). The near side plans and opens viewer panes using the backend's command-placement role, launching `orch attach` (`packages/orch/src/daemon/server/spawn/index.ts:110-112`, `158-159`; `packages/orch/src/daemon/server/spawn/viewers.ts:90-117`).

## Lifecycle verbs

| Verb | Handler | Roles / adapter members | Rows written |
|---|---|---|---|
| reset (`new`) | `clearSession` RPC, `clearSession` daemon handler (`packages/orch/src/daemon/server/handlers/table.ts:135`; `packages/orch/src/daemon/server/handlers/lifecycle.ts:198-230`) | `deliverControl` lifecycle `reset`; adapter lifecycle control; host routing | reclaim/status claim via `reclaimAgent`; agent status changes are reports (`packages/orch/src/daemon/server/handlers/lifecycle.ts:225-230`). |
| reload | lifecycle RPC (`packages/orch/src/daemon/server/handlers/table.ts:134`) | backend `agentInput` for escape when available; adapter `lifecycleControl.lifecycleCmd("reload")`; bridge status wait (`packages/orch/src/daemon/server/handlers/relaunch.ts:65-106`) | no process/handle replacement; shim refresh and reported presence. |
| restart | lifecycle RPC (`packages/orch/src/daemon/server/handlers/table.ts:134`) | `relaunching.relaunch`, or `agentInput.submit`, adapter `lifecycleCmd("restart")`, `workspaceTrust.preTrustWorkspace`; process/handle roles (`packages/orch/src/daemon/server/handlers/relaunch.ts:141-191`) | reclaim; `agent_processes`, `agent_handles`, and on far side harness/tuning through reclaim (`packages/orch/src/daemon/server/handlers/relaunch.ts:146-153`, `218`). |
| reclaim | `reclaim` RPC (`packages/orch/src/daemon/server/handlers/table.ts:148`) | none | releases agent claim; optional `setHarness` and `setTuning` (`packages/orch/src/daemon/server/handlers/lifecycle.ts:253-261`). |
| close | close command routes close/abort to drive handler (`packages/orch/src/daemon/server/handlers/table.ts:132-133`; `packages/orch/src/daemon/server/handlers/drive.ts:58-70`) | backend/process close path; no adapter lifecycle role | `endAgent`/ending record and closed event (`packages/orch/src/daemon/server/handlers/lifecycle.ts:164-190`). |
| reap | `reap` RPC (`packages/orch/src/daemon/server/handlers/table.ts:150`) | process/host placement as needed | deletes agent record and descendants (`packages/orch/src/daemon/server/handlers/lease.ts:150-170`, `313-321`). |
| adopt | `adopt` RPC (`packages/orch/src/daemon/server/handlers/table.ts:143`) | lease ownership | lease row (`packages/orch/src/daemon/server/handlers/lease.ts:109-121`, `228-241`). |
| detach | `detach` RPC (`packages/orch/src/daemon/server/handlers/table.ts:143`) | lease ownership | releases lease (`packages/orch/src/daemon/server/handlers/lease.ts:91-106`, `222-225`). |
| move | `set-handle` RPC (`packages/orch/src/daemon/server/handlers/table.ts:149`) | no adapter member; updates recorded handle | closes/opens handle interval (`packages/orch/src/daemon/server/handlers/lifecycle.ts:266-270`). |

## Relaunch in place
- `relaunchInPlace(state, agent, recorded, request, place)` chooses the new harness/tuning/command, reclaims old claim, invokes `place.role.relaunch`, records returned process and handle while swapping, then waits for a fresh bridge report (`packages/orch/src/daemon/server/handlers/relaunch.ts:141-162`). Caller: `restartHere` when target route has `backend.relaunching` (`packages/orch/src/daemon/server/handlers/relaunch.ts:165-172`).
- `RelaunchRole<Handle>.relaunch(handle, command)` asynchronously returns new handle and local process (`packages/orch/src/types/backend.ts:89-92`).
- `whileSwappingProcess(directory, key, callback)` brackets process replacement so presence does not mistake intentional gap for process death (`packages/orch/src/daemon/server/handlers/relaunch.ts:148`; implementation `packages/orch/src/presence/store.ts`).
- `recordProcess(directory, agent, now, process)` writes process interval (`packages/orch/src/daemon/server/handlers/relaunch.ts:151`; declaration/implementation in `packages/orch/src/store/interval-rows.ts`). `setHandle(directory, agent, now, handle)` writes handle interval (`packages/orch/src/daemon/server/handlers/relaunch.ts:152`; same store module).
- `restartHere(state, agent, request)` routes to environment relaunch, or quits in the pane and submits the planned command; if environment has no input, it can only invoke the same harness lifecycle restart (`packages/orch/src/daemon/server/handlers/relaunch.ts:165-191`). Caller: `lifecycleHere` (`packages/orch/src/daemon/server/handlers/relaunch.ts:196-203`).

## Launch environment

| Variable | Set where | Read/meaning |
|---|---|---|
| `ORCH_AGENT_ID` | `spawnEnv` via computed `LAUNCH_ENV` (`packages/orch/src/daemon/server/spawn/placement.ts:113-115`; constant at `packages/orch/src/identity/launch.ts:5`) | `launchCredential` reads `process.env[LAUNCH_ENV]` (`packages/orch/src/identity/launch.ts:11-27`); identifies the spawned caller. |
| `ORCH_DIR` | `spawnEnv` (`packages/orch/src/daemon/server/spawn/placement.ts:115`); viewer launch env (`packages/orch/src/daemon/server/spawn/viewers.ts:105`) | Runtime configuration path consumed by the CLI/services and harness bridge (e.g. `packages/orch/src/identity/launch.ts:13`). |
| Adapter-specific compaction env | `compactionEnv(adapter, model, workers)` spread by `spawnEnv` (`packages/orch/src/daemon/server/spawn/placement.ts:115`); headless path supplies it (`packages/orch/src/daemon/server/spawn/index.ts:136`) | Derived from adapter compaction configuration (`packages/orch/src/policy/workers.ts:40-49`); harness adapter consumes the variable(s). |

## Does not fit
- Spawn registration is split: local spawns record process and environment in one transaction, while far-spawn references are registered separately and the remote orchd owns process/environment rows (`packages/orch/src/store/spawn-registration.ts:24-40`).
- `move` is implemented as a `set-handle` operation; no lifecycle RPC named `move` appears in the handler table (`packages/orch/src/daemon/server/handlers/table.ts:149`).
