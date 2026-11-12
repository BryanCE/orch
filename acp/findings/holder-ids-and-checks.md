# Holder ids and checks

## Id reads

| path:line | expression | decision |
|---|---|---|
| `packages/orch/src/types/backend.ts:260` | `BACKEND_IDS = ["herdr", "tmux", "orca", "headless", "held"]` | Declares the supported backend id set. |
| `packages/orch/src/types/backend.ts:263` | `BackendId = (typeof BACKEND_IDS)[number]` | Defines the backend id union from that list. |
| `packages/orch/src/types/backend.ts:529` | `HERDR_SINK_ID = BACKEND_IDS[0]` | Selects the first backend id for the herdr notification sink. |
| `packages/orch/src/shared/plexer.ts:9` | `BACKEND_IDS.includes(value)` | Validates that a value is a backend id. |
| `packages/orch/src/settings/schema.ts:140` | `z.enum(BACKEND_IDS)` | Validates configured backend arrays. |
| `packages/orch/src/settings/schema.ts:144` | `z.enum(BACKEND_IDS)` | Validates the configured default backend. |
| `packages/orch/src/settings/read.ts:23` | `backend: BACKEND_IDS, backends: BACKEND_IDS` | Selects valid ids for backend settings. |
| `packages/orch/src/commands/settings.ts:135` | `validateSetupFlag(key, value, BACKEND_IDS)` | Validates a backend setting supplied by CLI. |
| `packages/orch/src/commands/setup.ts:254` | `BACKEND_IDS.join("|")` | Prints accepted plexer ids in setup help. |
| `packages/orch/src/setup/composition.ts:266` | `resolveProviderSet(... BACKEND_IDS ...)` | Parses selected setup backends against the supported ids. |
| `packages/orch/src/shared/plexer-env.ts:15` | `BACKEND_IDS.map((id) => id.toUpperCase())` | Derives backend-specific environment variable prefixes. |
| `packages/orch/src/daemon/client/protocol.ts:645` | `z.enum(BACKEND_IDS)` | Validates backend ids in setup prerequisite RPC. |
| `packages/orch/src/daemon/client/protocol.ts:647` | `z.enum(BACKEND_IDS)` | Validates backend ids in setup install RPC. |
| `packages/orch/src/daemon/client/protocol.ts:847` | `z.enum(BACKEND_IDS)` | Validates the backend field of spawn-headless RPC. |
| `packages/orch/src/daemon/client/protocol.ts:867` | `z.enum(BACKEND_IDS)` | Validates available plexer ids in RPC response. |
| `packages/orch/src/commands/status/table.ts:11` | `DETACHED_ENVIRONMENT = "headless"` | Chooses the label used for detached environments. |
| `packages/orch/src/setup/smoke.ts:15` | `"headless"` in `--plexer` args | Runs smoke spawn with the headless backend. |
| `packages/orch/src/backends/herdr/index.ts:30` | `HERDR_BACKEND: BackendId = "herdr"` | Assigns the backend id. |
| `packages/orch/src/backends/tmux/index.ts:23` | `TMUX_BACKEND: BackendId = "tmux"` | Assigns the backend id. |
| `packages/orch/src/backends/orca/index.ts:43` | `ORCA_BACKEND: BackendId = "orca"` | Assigns the backend id. |
| `packages/orch/src/backends/headless/index.ts:23` | `HEADLESS_BACKEND: BackendId = "headless"` | Assigns the backend id. |
| `packages/orch/src/backends/held/index.ts:26` | `HELD_BACKEND: BackendId = "held"` | Assigns the backend id. |
| `packages/orch/src/entities/inventory.ts:26` | `plexer === backend.id` | Associates a pane handle with an agent only when their backend ids match. |
| `packages/orch/src/entities/census.ts:19` | `enabled.has(backend.id)` | Selects enabled backends. |
| `packages/orch/src/entities/census.ts:36` | `used.has(backend.id)` | Selects enabled backends in use. |
| `packages/orch/src/entities/census.ts:45-47` | map access and writes keyed by `backend.id` | Maintains pane census per backend. |
| `packages/orch/src/backends/registry.ts:22,37,44` | map keys, result ids, and joined ids use `backend.id` | Registers and reports backends by id. |
| `packages/orch/src/daemon/server/handlers/space.ts:29` | `id: backend.id` | Reports the chosen backend as the space plexer id. |
| `packages/orch/src/daemon/server/handlers/machine.ts:61` | available backends mapped to `backend.id` | Lists ids of available plexers. |
| `packages/orch/src/daemon/server/spawn/placement.ts:70,279` | `callerPlexer === backend.id` | Chooses whether placement matches the caller's plexer. |
| `packages/orch/src/daemon/server/spawn/tab-label.ts:60` | `environment.plexer === backend.id` | Selects agents in the target backend for labels. |
| `packages/orch/src/daemon/server/tabs.ts:31,48` | `environment.plexer !== backend.id`; `plexer !== backend.id` | Filters mismatched environments and refuses a target owned by another backend. |
| `packages/orch/src/daemon/server/session-registry.ts:64` | `getBackend(plexerId)` | Selects backend version support for the reported plexer id. |
| `packages/orch/src/daemon/server/doctor/declared-vs-reality.ts:43` | `getBackend(plexerId)` | Selects the backend inventory provider for a recorded plexer id. |
| `packages/orch/scripts/check-bridge.ts:51,53,55` | `PLEXER_IDS`, `HARNESS_IDS`, `ENVIRONMENT_IDS` | Derives and combines the scanned backend and harness directory ids. |
| `packages/orch/scripts/check-bridge.ts:244` | exact `BACKEND_IDS` declaration string | Enforces the single backend-id declaration site and spelling. |
| `packages/orch/scripts/check-bridge.ts:280` | `for (const backend of PLEXER_IDS)` | Checks generated backend environment names for every backend id. |
| `packages/orch/scripts/check-bridge.ts:635` | regex alternation from `PLEXER_IDS` | Finds backend-specific imports forbidden outside backend directories. |
| `packages/orch/scripts/check-bridge.ts:660-672` | identity/environment literal checks using derived id lists | Rejects identity branches and plexer literals in governed source scopes. |
| `packages/orch/src/db/schema.ts:264` | `plexer_id` column | Stores an agent's backend id; not an id comparison. |
| `packages/orch/src/types/command.ts:107`, `types/doctor.ts:57,75`, `types/store.ts:42,79` | `plexerId` fields/parameters | Type-level uses, not comparisons or id-list construction. |

## Plexer row

| path:line | function | read/write | use |
|---|---|---|---|
| `packages/orch/src/store/interval-rows.ts:148-150` | `setAgentPlexer` | Read | Checks whether this agent already has a plexer row and rejects a second assignment. |
| `packages/orch/src/store/interval-rows.ts:152` | `setAgentPlexer` | Write | Inserts the agent id and plexer id, then refreshes the agent view at line 153. |
| `packages/orch/src/store/interval-rows.ts:57` | `relocateIn` | Write/delete | Deletes the row when the agent moves to a different host because the plexer is local to this machine. |
| `packages/orch/src/store/agent-view.ts:84` | `agentPlexersByAgent` | Read | Reads all plexer memberships into an agent-keyed view. |
| `packages/orch/src/store/agent-view.ts:88-89` | `agentPlexer` | Read | Reads one agent's plexer id. |
| `packages/orch/src/store/agent-rows.ts:304` | caller registration path | Write via `setAgentPlexer` | Records a caller's detected plexer only if the pane has none. |
| `packages/orch/src/store/spawn-registration.ts:102` | spawn registration | Write via `setAgentPlexer` | Records the requested backend for a newly spawned agent. |
| `packages/orch/src/daemon/server/doctor/declared-vs-reality.ts:61-65` | `environmentRows` | Read | Joins open handle rows to live agents to compare recorded plexer handles with actual inventory. |

## Interval pattern

`closeOpen` in `packages/orch/src/store/interval-rows.ts:33-42` finds an open row, closes it at `max(now, since + 1)`, and returns that instant for the next row. Its `IntervalTable` covers handles, hosts, processes, spaces, and tunings (`:26`). Those writers use transactions for close-then-open; the database checks require `until` to be null or later than `since`.

| table | schema columns (`packages/orch/src/db/schema.ts`) | functions opening/closing (`packages/orch/src/store/interval-rows.ts`) |
|---|---|---|
| `agent_handles` | `agentId`, `since`, `until`, `handle`, lines 300-308 | `setHandle` opens and closes through `closeOpen`, lines 109-115. |
| `agent_hosts` | `agentId`, `since`, `until`, `hostId`, `cwd`, lines 274-285 | `openLocationIn` opens, `relocateIn` closes/opens, lines 45-56; callers include session relocation. |
| `agent_processes` | `agentId`, `since`, `until`, `pid`, `startToken`, lines 288-297 | `recordCallerProcessIn` and `recordProcess` open after close; `endProcess` closes, lines 85-104. |
| `agent_spaces` | `agentId`, `since`, `until`, `spaceId`, lines 311-319 | `setSpace` opens after close; `clearSpace` closes, lines 118-131. |
| `agent_tunings` | `agentId`, `since`, `until`, `model`, `thinking`, lines 322-331 | `setTuning` opens after close, lines 134-143. |
| `agent_leases` | `id`, `agentId`, `orchId`, `since`, `until`, `releaseReason`, lines 334-343 | Separate lease interval logic: `openLease` reads the open row (`lease-rows.ts:20`); `closeLease` closes it (`:53`); lease assignment/open and release/handoff/adoption use those functions. It does not call `closeOpen`. |
| `agent_plexers` | `agentId`, `plexerId`, lines 262-265 | Not an interval. `setAgentPlexer` permits one row for the agent and inserts it (`interval-rows.ts:148-153`); `relocateIn` deletes it on host change (`:57`). No since/until or shared interval helper. |

## Harness and tuning writes

| path:line | caller | verb/handler |
|---|---|---|
| `packages/orch/src/daemon/server/handlers/lifecycle.ts:258` | `setHarness` | Lifecycle relaunch handler; stores the relaunch harness id. |
| `packages/orch/src/control/dispatch.ts:178` | `setTuning` | Model/thinking control dispatch; stores the applied tuning. |
| `packages/orch/src/daemon/server/handlers/lifecycle.ts:259` | `setTuning` | Lifecycle relaunch handler; stores requested relaunch model and thinking. |
| `packages/orch/src/store/spawn-registration.ts:36` | `setTuning` | Spawn registration; initializes tuning from spawn input. |
| `packages/orch/src/store/spawn-registration.ts:114` | `setTuning` | Agent registration path; records model and thinking after registration. |

## Static checks

### `check-bridge.ts`

Rules are applied in `runAllChecks` (`packages/orch/scripts/check-bridge.ts:777-914`) across source outside backends, recursive extensions, scripts, adapters, recursive backend sources, package sources, and targeted source scopes:

| rule | path:line | behavior |
|---|---|---|
| Composition-root restrictions | `check-bridge.ts:406-452`, `:784-787`, `:821-823`, `:879-882` | Restricts composition-root construction to the designated composition seam. |
| Launch environment boundary | `:310-325`, `:788`, `:823`, `:849`, `:866` | Rejects launch-environment access outside allowed ownership boundaries. |
| Environment capability branching | `:571-619`, `:790-794`, `:834-837`, `:869-872`, `:897-900` | Rejects branches on plexer identity or port method presence in governed scopes. |
| State-file channel restrictions | `:326-405`, `:795`, `:826`, `:852`, `:862` | Rejects forbidden state/control file reads and writes. |
| `fs.watch` prohibition | `:797`, `:828`, `:854`, `:864` | Rejects filesystem watching in scanned scopes. |
| Backend environment naming and use | `:278-325`, `:800`, `:873-876` | Derives backend environment names and restricts references to backend-owned code. |
| Plexer literal / backend-specific import boundaries | `:201-277`, `:801-803`, `:837-840`, `:877-879`, `:635` | Rejects plexer literals and backend subpath imports outside their permitted boundary. |
| Harness presence-file names | `:326-355`, `:838-841`, `:855-858`, `:870-872` | Requires presence filenames to come from the one schema definition. |
| Backend-specific herdr/tmux identifiers | `:801-803` | Rejects backend-specific identifiers outside backend sources. |
| Harness ids in backend code | `:866-875` | Rejects adapter imports and harness-id literals in backend code, except explicit allowlist entries. |
| Adapter/backend imports | `:858-861`, `:866-875` | Prevents adapters importing backends and backends importing adapters. |
| Backend identity declaration | `:237-252` | Checks the one canonical `BACKEND_IDS` declaration. |
| Dispatcher call boundary | `:905-909` | Checks control traffic call sites against dispatcher rules. |
| Spawner reply fallback | `:909-910` | Checks spawner reply fallback patterns. |
| Identity construction | `:910-912` | Checks identity construction throughout source, subject to explicit allowlist. |
| Command parser | `:912` | Checks command parser restrictions in commands. |
| Lease/provenance separation | `:913` | Checks store lease/provenance coupling. |
| Bundle-store boundary | `:764-775`, `:916` | Checks built bundle imports against store restrictions. |

Id lists derive from immediate child directories of `src/backends` and `extensions`, via `directoryIds` (`check-bridge.ts:35-55`); `ENVIRONMENT_IDS` is their sorted unique union (`:55`). `directoryIds` uses directory entries as ids, excluding the designated boundary entries. The scans use `scanDirectory`, `scanSrcOutsideBackends`, `scanSourceTree`, and `scanPackagesSrc` (`:63-143`); the extensions, scripts, adapters, and backends scans are recursive where specified (`:821-877`).

### `check-layers.ts`

| rule | path:line | behavior |
|---|---|---|
| Source layer classification | `packages/orch/scripts/check-layers.ts:31-80`, `:84-93` | Classifies modules as server, client, or shared; the server list wins over client paths. |
| Runtime-import graph and server boundary | `:95-151`, `:153-179` | Scans value imports, re-exports, and static dynamic imports, then finds non-server modules that directly load server modules. |
| Baseline ratchet | `:187-211`, `:222-245` | Fails for newly present client/shared-to-server loads and for baseline entries no longer present; `--prune` only deletes stale entries. |
| Client reach reporting | `:181-185`, `:235-238` | Optionally reports client modules that reach server transitively through shared modules. |

The script derives ids neither from directory names nor backend lists. Its directory lists are literal `SERVER`, `CLIENT`, and `ROOTS` constants (`check-layers.ts:31-80`); `sourceFiles` recursively walks each root (`:95-103`).

`SERVER` list, verbatim from `packages/orch/scripts/check-layers.ts:31-67`:

```ts
export const SERVER: readonly string[] = [
  "src/daemon/server/",
  "src/store/",
  "src/db/",
  "src/presence/",
  "src/backends/",
  "src/adapters/",
  "src/control/",
  "src/agent/drive-state.ts",
  "src/agent/read.ts",
  "src/pty/",
  "src/hosts/",
  "src/worktrees/",
  "src/entities/",
  "src/process-identity.ts",
  "src/process-place.ts",
  "src/local-process.ts",
  "src/session.ts",
  // Notification sinks start processes to deliver; orchd delivers. orch-ding is the command orchd runs.
  "src/notify/ding.ts",
  "src/notify/sinks.ts",
  "src/notify/router.ts",
  "src/notify/remediation.ts",
  "bin/orch-ding.ts",
  // Who a caller is and what it may touch, decided against the store.
  "src/identity/self.ts",
  "src/identity/ancestry.ts",
  "src/policy/caller.ts",
  "src/policy/close-authority.ts",
  "src/policy/orphan.ts",
  "src/policy/ownership.ts",
  "src/policy/space.ts",
  "src/queue.ts",
  // Starting a process is acting on the machine: only orchd does it.
  "node:child_process",
];
```

`packages/orch/package.json:14-15` runs them as `check:layers` (`bun scripts/check-layers.ts`) and `check:bridge` (`bun scripts/check-bridge.ts`). The package `check` script runs both at line 13.

## Does not fit

`agent_plexers` is explicitly a membership row, not an interval, and is deleted rather than closed when the host changes (`packages/orch/src/store/interval-rows.ts:57,144-153`).