# Plexer identity refactor: implementation migration inventory

Source of truth: `openspec/changes/pluggable-plexer-backends/design.md`. Line numbers below are current line numbers.

## Phase 1 — Identity module and Backend port

| Site | Current code | Must become |
|---|---|---|
| `src/backends/backend.ts:40-48` | `Backend` has `id`, `panes`, `focusable`, `spawn`, `close`, `list`. | Add the identity/probing port methods: `mintIdentity(handle) -> Identity`, `isAvailable()`, and `isInsideSession()`. Keep identity opaque to adapters. |
| `src/backends/backend.ts:16-27` | `BackendSpawnOpts.key?: string` is an optional presence key. | Carry the structured/minted identity (or the spawn-time identity input) and ensure the serialized opaque key is passed as `ORCH_AGENT_KEY`; do not let adapters mint plexer keys. |
| `src/backends/backend.ts:30` | `export type BackendHandle = unknown`. | Add/export the common `Identity` shape `{ backend, workspace, handle }`, plus `serializeIdentity` and `parseIdentity`; this is the only key/identity boundary. |
| `src/policy/workspace.ts:6-13` | `workspaceOf(id)` parses `/^([^:]+):p[0-9A-Za-z]+$/`. | Delete the `ws:pane` grammar and accept/read a presence identity workspace field. |

## Phase 2 — Backend identity, probing, and presence spawn data

| `scripts/claude-hooks.ts:124,166-168` | Shipped Claude hook duplicates presence-directory serialization and derives its key from `HERDR_PANE_ID` (falling back to a headless session key). | Read `ORCH_AGENT_KEY`, parse/validate it through the shared identity boundary, and use the shared presence-directory resolver; do not serialize or read plexer identity in the hook. |

| Site | Current code | Must become |
|---|---|---|
| `src/backends/herdr.ts:21-24` | `const caller = process.env.HERDR_PANE_ID; panes.find(...caller)`. | Herdr backend owns this mapping: mint identity from the current herdr pane handle and its `workspace_id`; expose `isAvailable()`/`isInsideSession()`. Core callers must call the backend, not read this env var. |
| `src/backends/herdr.ts:26-57` | `spawnPane` gets workspace by `callerPane`, then returns raw `result.agent.pane_id`. | Mint/pass a structured identity for the returned handle, serialize it, and inject `ORCH_AGENT_KEY`; persist `backend` and `workspace` at spawn. |
| `src/backends/herdr.ts:60-85` | `HerdrBackend` implements only lifecycle methods. | Implement `mintIdentity`, `isAvailable`, and `isInsideSession`; use backend-owned workspace/handle logic. |
| `src/backends/headless.ts:141-143` | `const key = opts.key ?? \\`session-${process.pid}-${++generatedKey}\\``. | Mint a headless identity via the port, with `workspace: null` (or the explicitly chosen future synthetic workspace), and serialize it. Do not treat a legacy arbitrary key as identity. |
| `src/backends/headless.ts:169` | `ORCH_AGENT_KEY: key` is passed, but `key` is locally minted. | Pass the serialized identity minted by `mintIdentity`; keep it opaque to the agent process. |
| `src/backends/headless.ts:121-215` | `HeadlessBackend` has only `spawn`, `close`, and `list`; `HeadlessHandle` embeds `key`. | Add `mintIdentity`, `isAvailable`, and `isInsideSession`; make handle/key use the identity serialization consistently. Headless availability is local process support; inside-session is false. |
| `src/backends/headless.ts:93` | `presenceAgentDir(key, directory)` resolves status using a raw key. | Resolve/validate the serialized identity through `parseIdentity`; use the canonical flat directory key. |
| `src/store.ts:20-32` | Windows-only `presenceDirectoryName`/`presenceKeyFromDirectoryName`; non-Windows keys are raw `ws:pane` strings. | Replace with platform-independent `serializeIdentity`/`parseIdentity` percent escaping and one path-safe directory segment. Keep `agents/` flat. |
| `src/store.ts:34-63` | `PresenceStatus` has `paneId?: string`, but no `backend` or `workspace`. | Persist the structured identity fields (`backend`, `workspace`, `handle`, or the agreed identity representation) in status/presence data. `paneId` becomes backend-specific compatibility data only if still needed by herdr UI. |
| `src/store.ts:100-118` | `recordSpawned(pane, metadata)` writes `SpawnedRecord { pane, ...backend }`. | Accept the structured identity/serialized key and write its backend/workspace identity fields. Rename `pane` semantics to target/identity key; callers must not manufacture `ws:pane`. |
| `src/store.ts:147-155` | `loadPresence` decodes a directory name, then calls `presenceAgentDir(key)`. | Enumerate flat serialized identity directories and parse each key once; reject malformed identities without platform-specific `%25/%3A` handling. |
| `extensions/orchestrator-bridge.ts:3` | Comment says `<KEY> = HERDR_PANE_ID`. | Document `<KEY> = ORCH_AGENT_KEY`, an opaque serialized identity. |
| `extensions/orchestrator-bridge.ts:219-236` | `computeKey` falls back to `HERDR_PANE_ID`; bridge duplicates `presenceDirectoryName`, `presenceKeyFromDirectoryName`, and `presenceAgentDir`. | `computeKey` reads only `ORCH_AGENT_KEY` (with the defined headless fallback if required); remove duplicated serialization/path logic and use the shared identity boundary. |
| `extensions/orchestrator-bridge.ts:814-815,878-881` | Bridge computes a key and directly maps directory names to keys. | Read/compare parsed serialized identities; do not decode a plexer string or maintain a second serializer. |

## Phase 3 — Bridge environment and identity block

| Site | Current code | Must become |
|---|---|---|
| `extensions/orchestrator-bridge.ts:245` | `const HERDR_PANE_ID = process.env.HERDR_PANE_ID`. | Remove this bridge-level plexer read. Read `const ORCH_AGENT_KEY = process.env.ORCH_AGENT_KEY` and parse only through the identity module as needed. |
| `extensions/orchestrator-bridge.ts:256-263` | Herdr metadata is gated by `HERDR_ENV`, socket, and `HERDR_PANE_ID`; request sends `pane_id: HERDR_PANE_ID`. | Keep this in a separate herdr-specific reporting adapter if required, or pass a backend-provided herdr handle into that adapter. The generic bridge must not know herdr env vars. |
| `extensions/orchestrator-bridge.ts:396` | `paneId: process.env.HERDR_PANE_ID ?? null`. | Populate status identity from `ORCH_AGENT_KEY`/parsed identity; retain `paneId` only as optional backend UI metadata. Add persisted `backend` and `workspace`. |
| `extensions/orchestrator-bridge.ts:436` | `metadataEnabledForState` requires `HERDR_PANE_ID` and `state.key === state.paneId`. | Gate backend-specific metadata using the parsed identity/backend handle, outside the generic bridge identity path. |
| `extensions/orchestrator-bridge.ts:504` | Herdr pane lookup compares `candidate.pane_id === HERDR_PANE_ID`. | Move lookup to the herdr integration; generic bridge uses the identity handle supplied by the backend. |
| `extensions/orchestrator-bridge.ts:514` | `if (!HERDR_PANE_ID) return` before reading herdr identity. | Remove from generic bridge; backend-specific metadata may check its own handle. |
| `extensions/orchestrator-bridge.ts:926,1215,1412` | `state.key || computeKey(ctx.hasUI)` is used for peer/handoff delivery. | Use the single parsed/serialized `ORCH_AGENT_KEY` identity key; all target resolution must compare canonical serialized keys. |
| `extensions/herdr-agent-state.ts:21` and `:24-28` | Reads `HERDR_PANE_ID` to enable/report `pane_id`. | Classify as herdr-only integration: move behind the herdr backend adapter or pass a backend-owned handle. It must not be part of agent identity minting; generic agent adapters must not read it. |
| `src/adapters/claude.ts:120` | `request.opts?.env?.HERDR_PANE_ID ?? request.key`. | Use `ORCH_AGENT_KEY`/the canonical request key for degraded delivery; Claude must not inspect a plexer env var. Resolve the target through the backend, then send the opaque handle. |

## Phase 4 — Workspace wall and all `workspaceOf` callers

| Site | Current code | Must become |
|---|---|---|
| `src/policy/workspace.ts:10-12` | Regex extracts workspace from `ws:pane`. | Delete regex. `workspaceOf` should accept a presence/entity identity record (or its persisted `workspace` field), returning null for headless. |
| `src/policy/workspace.ts:40-49` | `checkWall` calls `workspaceOf(ownKey)` and `workspaceOf(targetKey)`. | Compare `ownIdentity.workspace` and `targetIdentity.workspace`; unscoped/null remains wall-eligible. |
| `src/policy/workspace.ts:61` | `scopeToWorkspace` calls `workspaceOf(keyOf(item))`. | Resolve each item’s persisted identity workspace, never parse its key. |
| `src/entities.ts:63` | `workspaceOf(e.paneId ?? e.key)`. | Read `e.presence.status.workspace`/identity workspace; use backend pane metadata only for display. |
| `src/entities.ts:66-75` | `currentWorkspace` and `selfActor` read `HERDR_PANE_ID`; self actor is a raw pane key. | Resolve the current backend identity through the selected backend; return its workspace and canonical serialized identity key. |
| `src/entities.ts:79` | Scope key is `entity.paneId ?? entity.key`. | Scope by the entity/presence identity workspace field. |
| `src/entities.ts:206` | `const ownKey = currentWorkspace() === null ? null : \\`${currentWorkspace()}:p0\\``. | Pass the actual current identity (or its workspace) to `checkWall`; never synthesize `ws:p0`. |
| `src/entities.ts:168-176` | Target suffix matching uses `lastIndexOf(":")`, `endsWith(":" + localTarget)`, and `short.startsWith`. | Match canonical identity fields/handle through `parseIdentity`; do not assume colon separates workspace and handle. |
| `src/commands.ts:715,720,726,767` | Question output calls `workspaceOf(pres.status?.paneId ?? pres.key)`. | Use `pres.status?.workspace` (or parsed persisted identity) directly. |
| `src/commands.ts:947` | `event.workspace ?? workspaceOf(event.key)`. | Use event workspace or the presence identity workspace; no key parsing. |
| `src/daemon/events.ts:109` | `workspaceOf(key) ?? undefined`. | Load the presence identity/workspace for `key`; emit that field. Remove the `workspaceOf` import once unused. |
| `src/notify.ts:321-325,334` | Derives labels with `key.includes(":")`, `split`, `lastIndexOf`, then `workspaceOf(key)`. | Use `event.workspace`/persisted identity workspace and identity handle for short labels. Escaped `%` and `:` must remain display-safe. |
| `src/work.ts:85` | `task.workspace ?? workspaceOf(entry.key) ?? entry.key.split(":", 1)[0]`. | `task.workspace ?? entry.status?.workspace ?? null`; no legacy colon fallback. |
| `src/work.ts:163` | `workspaceOf(entry.key) ?? entry.key.split(":", 1)[0]`. | Use the worker presence identity workspace; null means unscoped/headless. |
| `extensions/orchestrator-bridge.ts:306` | `event.workspace ?? workspaceOf(event.key) ?? event.key.split(":", 1)[0]!`. | Use the event/persisted workspace field; remove both key parsing fallbacks. |
| `src/doctor.ts:139` | `key.includes(":") ? key.slice(0, key.indexOf(":")) : null`. | Parse identity and report `identity.workspace`; never infer it from serialized text. |

## Phase 5 — Registry/factory and target-resolution routing

| `test/claude-adapter.test.ts:24` | Claude hook fixture injects `HERDR_PANE_ID` as the identity input. | Inject `ORCH_AGENT_KEY` with a serialized identity instead; add a missing-key test asserting the hook fails safely/returns the defined error state when `ORCH_AGENT_KEY` is absent. |
| `test/workspace-walls.test.ts:6-71` | Entity fixtures, workspace extraction, wall checks, and queued-task assertions encode `ws:pane` grammar (`w1:p1`, `w6:p21`, etc.). | Replace every grammar-based fixture/assertion with structured identity/persisted workspace fields; retain tests for same/cross workspace, null/unscoped behavior, override, and task scoping without parsing serialized keys. |
| `test/workspace-policy.test.ts:5-56` | Workspace extraction, wall, scope, and base32 coverage assert that `ws:pane` strings encode workspace. | Replace all old-key assertions with identity/workspace-field cases, including escaped handles, null workspace, same/cross workspace walls, and scoped collection behavior. |

| Site | Current code | Must become |
|---|---|---|
| `src/commands.ts:1852-1866` | Hard-coded `backends = [herdrBackend, headlessBackend]`, local `resolveBackend`, and `herdrAvailable()` selection. | Add backend registry plus shared `resolveBackend(config)` factory. Register `herdr`, `headless`, and later `tmux`; use `isAvailable`/`isInsideSession` only for probing, never to override explicit config. |
| `src/commands.ts:1961-1980` | Calls `headlessBackend.spawn` and records `handle.key`. | Resolve selected backend, mint identity, pass `ORCH_AGENT_KEY`, and record identity backend/workspace. |
| `src/commands.ts:1989-1991` | Workspace is `requested ?? callerWorkspace() ?? herdrPanes()[0]?.workspace_id`; failure says herdr. | Ask the selected backend for workspace/identity; no `herdrPanes()[0]` fallback for a generic backend. |
| `src/commands.ts:1731` | `callerWorkspace()` directly reads `HERDR_PANE_ID` and looks up a herdr pane to infer workspace. | Ask the selected backend for the caller identity/workspace; command code must not read the herdr env var. |
| `src/commands.ts:2033,2061,2117,2897` | `recordSpawned(pane, ...)` records raw pane strings at all herdr spawn/tile/restart paths. | Record the backend-minted serialized identity and identity fields at every spawn path. |
| `src/commands.ts:2054,2093` | Branches on `settings.backend === headlessBackend.id`; tile explicitly assumes headless/herdr. | Route through backend capabilities (`panes`, `focusable`) and factory; only pane-specific commands should require capabilities. |
| `src/commands.ts:2010` | Tab creation closes the temporary shell with `herdrBestEffort(["pane", "close", shellRoot])`. | Close through the selected backend/handle capability; no direct herdr operation in generic spawn flow. |
| `src/commands.ts:2217,2246,2321-2362` | `wait`, `reset`, reload, and hard restart use direct herdr exec/best-effort `pane run`, `send-keys`, and process-info calls. | Route wait/reset/reload/restart, including Escape, `/new`, `/reload`, `/quit`, relaunch, and foreground checks, through backend target/control capabilities; preserve headless behavior explicitly. |
| `src/commands.ts:2458-2465,2538-2560` | Rename, abort, and raw keys call herdr `pane`/`agent` operations directly. | Route rename, abort, and key delivery through backend capabilities; reject only when the selected backend lacks that capability. |
| `src/commands.ts:2483-2512` | Close-all reads `HERDR_PANE_ID`; separately lists `herdrBackend` and `headlessBackend`; matches `candidate.key === ent.key`. | Resolve self via backend identity, use the registry/factory for listing/closing, and match parsed identities/canonical keys. |
| `src/commands.ts:2578-2587,2618-2623` | Peek and tab resolution assume a herdr pane and call herdr read/list directly. | Resolve backend handles and require a read/tab capability only where supported; do not make herdr pane shape universal. |
| `src/commands.ts:2674-2704,2722-2742,2770-2794` | Tab create/rename/close/focus, agent focus, zoom, move, and workspace focus all use concrete herdr JSON/best-effort operations. | Route every listed target/control operation through the backend registry and capability methods; keep herdr-specific layout handles inside the herdr adapter. |

| `src/entities.ts:188-215` | `resolveTarget` scopes and checks walls using raw `paneId`/`key`; `resolvePane` assumes a herdr pane. | Resolve targets to structured identities, scope by identity workspace, and make `resolvePane` a capability/handle operation rather than a universal target shape. |
| `src/daemon/orchd.ts:81-91` | Dispatch falls back directly to `herdrBestEffort(["pane", ...])` and `agent/send`; comment names `HERDR_PANE_ID`. | Resolve the target identity, select its backend, and invoke a generic `Backend.deliver(target, payload)` port method. Remove hard-coded herdr dispatch from the daemon. This is an API decision: add delivery (and any required handle/control capability methods) to the Backend contract before removing the herdr path. |
| `src/commands.ts:21-26` | Imports `workspaceOf`, concrete backends, and a local `Backend` type. | Import identity/factory APIs; concrete backend wiring belongs in the registry, not command call sites. |

## Phase 6 — tmux backend and escaping risk

| Site | Current code | Must become |
|---|---|---|
| New `src/backends/tmux.ts` | No tmux backend exists. | Implement the full `Backend` port: spawn/close/list, `mintIdentity`, `isAvailable`, `isInsideSession`, workspace/session mapping, and opaque `ORCH_AGENT_KEY` injection. |
| New identity serialization tests | Existing Windows-only escaping handles only `%` and `:` in directory names. | Add round-trip tests for herdr (`:`), tmux handles containing `%` and `:`, and headless (`null` workspace); reserve a separator that cannot occur after escaping. |
| All key consumers above | Current code treats colon as a workspace separator and may expose raw handles. | Use one flat path-safe segment such as `herdr~wD~p2`, `tmux~main~%255`, `headless~~1234`. Never split serialized keys by `:`. |

**Risk flags:** tmux handles can contain both `%` and `:`; escaping must be ordered and round-trip-safe. The selected design is a flat `~/.orch/agents/<serialized-identity>/` map. Switching to nested `agents/tmux/main/%5/` would break clean/doctor/status enumeration and is not an equivalent implementation.

## Phase 7 — documentation and abandoned old directories

| Site | Current code/data contract | Must become |
|---|---|---|
| `orch-architecture-*.md` (repository docs) | Describes pane-key identity and herdr-derived workspace. | Describe backend-owned structured identity, `ORCH_AGENT_KEY`, factory selection, and workspace field. |
| `docs/files-and-data-layout.md:15` | The exact directory contract says `<key> = herdr "ws:pane" id, or "session-<pid>" headless`. | Replace this migration assertion with the flat serialized identity contract, including backend/workspace fields, escaping, headless null workspace, and abandoned old-directory cleanup behavior; add a documentation/fixture assertion that the old examples are no longer accepted as canonical keys. |
| CLI/config documentation | Backend selection is herdr/headless-specific. | Document `[defaults] backend`, `--backend tmux`, probing semantics, and explicit-config precedence. |

## Per-file change count

Counts below are distinct implementation sites (a grouped line range counts as one site; comments/import cleanup is included only when it changes behavior or an API boundary).

| File | Sites |
|---|---:|
| `src/backends/backend.ts` | 3 |
| `src/backends/herdr.ts` | 3 |
| `src/backends/headless.ts` | 4 |
| `src/store.ts` | 4 |
| `src/policy/workspace.ts` | 3 |
| `src/entities.ts` | 5 |
| `src/commands.ts` | 18 |
| `src/adapters/claude.ts` | 1 |
| `src/daemon/orchd.ts` | 1 |
| `src/daemon/events.ts` | 1 |
| `src/notify.ts` | 1 |
| `src/work.ts` | 2 |
| `src/doctor.ts` | 1 |
| `extensions/orchestrator-bridge.ts` | 11 |
| `extensions/herdr-agent-state.ts` | 1 |
| `src/backends/tmux.ts` (new) | 1 |
| `docs/architecture/layout docs` | 3 |
| `scripts/claude-hooks.ts` | 1 |
| `test/claude-adapter.test.ts` | 1 |
| `test/workspace-walls.test.ts` | 1 |
| `test/workspace-policy.test.ts` | 1 |
| **Total distinct change sites** | **67** |
