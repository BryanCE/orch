# Spawn/pane launch recon

## `cmdSpawn` / `cmdTile` paths

### Fresh tab (`cmdSpawn`)
* `src/commands/spawn.ts:817-824` executes policy/model/name gates, resolves spawner, then `spawnBackend`; `:831-834` resolves workspace and capacity, adapter, and names.
* `src/commands/spawn.ts:574-577` (`createSpawnRoot`) validates name, mints key with `serializeIdentity({backend,id:mintAgentId(),workspace})` at `:560`, builds `rootEnv` (agent identity/worktree, `ORCH_AGENT_KEY`, `ORCH_DIR`) at `:563-569`.
* Port calls in order: `groupHome.create({workspace,cwd,label,env})` (`:574`), then `backend.spawn(adapter,{key,env,cwd,name,workspace,group,intoPane:rootPane,orchDir,model,preferredModels,tools,workers,cmd})` (`:582`). The group call creates a tab and root shell pane; spawn adopts that pane.
* On group-create failure: `die` (`:579`). On root spawn failure: best-effort `groupHome.close(group.id)` then `die` (`:584-587`).
* Root is recorded/registered after backend calls at `:837-842`; additional panes are grown by `growFleetIntoGroup` (`:844`) and each uses `placeAgent` → `tileAgentIntoGroup` (`:693-703`) → `spawnOneIntoTab`.
* `spawnOneIntoTab` mints key at `:624`, builds env at `:626`; opens pane first via `paneHost.open({cwd,workspace,group,split,targetPane,env})` (`:628`), then calls `backend.spawn` with `intoPane:pane` plus `key/env/cwd/name/workspace/group/orchDir/model/preferredModels/tools/workers/cmd` (`:634-639`). If spawn fails, closes opened pane best-effort (`:640-643`) and rethrows. On success `recordSpawned` (`:646-659`) then `registerSpawnedAgent` (`:660-665`).
* `growFleetIntoGroup` catches each failure, warns, and continues (`:706-712`). Final shortfall is nonzero/report-only (`:740-746`); bridge stalls and pin failures are warnings, while control-plane outage sets exit code (`:95-108`, `:748-774`).

### `--tab <existing>`
* Existing group selected at `:827-829`: `findGroupInWorkspace` lists `groupHome` (`:714-718`) and matches id/label/workspace; a live-prefix fallback `groupOfLivePrefix` uses `paneInventory.list` and `groupHome.list` (`:720-725`).
* `spawnIntoExistingTab` (`:732-735`) calls `growFleetIntoGroup`; therefore each agent path is `spawnOneIntoTab`: key mint → `paneHost.open` → `backend.spawn(intoPane)` → record/register. No group create/move. Per-agent failures warn/continue. This requires a non-null `paneHost`; tmux declares `paneHost = null` (`src/backends/tmux/index.ts:109`), so tmux additional-pane placement currently throws `backend has no pane host` and is warning/continued by `growFleetIntoGroup`, while tmux fresh-root spawn is supported via `intoPane`.

### Live-prefix grow
* Same branch as existing tab (`:827-829`), with `groupOfLivePrefix` (`:720-725`) locating the group containing a live named record. Name claims continue numbering (`:727-730`); otherwise identical pane-host/spawn/record sequence above.

### Headless/detached
* `spawnBackend` falls back to `detachedBackend` when no group role (`:790-802`); `executeSpawn` dispatches to `executeDetachedSpawn` at `:821-823`.
* For each claimed name, worktree creation/pretrust occurs (`:418-422`), key is minted with `serializeIdentity`/`mintAgentId` (`:440`), then daemon RPC `callDaemon("spawn-detached", {key,adapter,cwd,env,model,preferredModels,prompt,tools,workers})` (`:444-469`). No paneHost/group calls; `intoPane/targetPane/split/group` are unset. `recordSpawned` occurs after RPC (`:475-486`). Failures warn and break, preserving already-launched agents (`:487-491`); shortfall sets exit code (`:496`), bridge stalls are awaited (`:497`).

### `cmdTile`
* Validates pane inventory/group roles (`:849-854`), resolves tab/layout via `resolveTab`, `readGroupLayout` (`:864-867`), then calls `spawnOneIntoTab` (`:873-891`) with `placement: planTilePlacement(layout, first_split)` (`:882`). Thus order is key/env → `paneHost.open` with split+targetPane → `backend.spawn(intoPane)` → record/register. Errors are converted to `die("tile failed")` (`:893-895`); no cleanup is done by cmdTile itself, but `spawnOneIntoTab` closes the newly opened pane on spawn failure. Pin failure only warns (`:904`).

## Other pane/group callers
* `src/commands/panes.ts:195-199` `cmdTabNew`: `groupHome.create({workspace,cwd,label})`, then `backend.close(rootHandle)`; group-create errors propagate (no explicit cleanup).
* `src/commands/panes.ts:204-205`, `:213-214`, `:221-222`: tab rename/close/focus call corresponding `groupHome` methods; errors propagate.
* `src/commands/panes.ts:309-320` `cmdMove`: computes placement using `paneInventory`/`groupLayout`, then `groupHome.move({handle,group,split,against,label})`; catches and dies (`:318-320`). `--new-tab` passes `group:null`.
* `src/commands/panes.ts:127-130`, `:170-172`, `:233-235`, `:278-285` consume pane inventory/layout for resolution/planning; no launches.
* `src/commands/lifecycle.ts:489-515` close path chooses process SIGTERM, else `paneHost.close` or legacy `backend.close`; `:520-528` rechecks `paneInventory`/`inventory`; failure warns and retains record (`:532-534`), success `reapSpawnedRecord` (`:536`). `cmdClose --all` enumerates records at `:442-466` and never ownership-gates.
* Lifecycle reset (`cmdNew`) at `src/commands/lifecycle.ts:140-151` resolves target/ownership/model, then `writeRpc("lifecycle",{target,verb:"reset"})` (`:171`); it does not call spawn/pane ports. Reload (`:248-299`) uses `paneInput` or daemon RPC (`:277-279`), no creation. Restart (`:301-345`) uses paneInput typing or daemon RPC (`:326-328`), no creation.
* `src/daemon/orchd.ts:289-307` daemon detached path calls `detachedBackend.spawn` with key/env/cwd/prompt/model/preferredModels/tools/workers; no pane/group roles.

## Backend port roles and consumers
* Port definitions: `src/backends/backend.ts:13-31` pane host open/close; `:33-37` inventory; `:39-56` input/screen/zoom/naming/status; `:58-81` group home create/list/rename/close/focus/move; `:83-85` group layout; `:87-96` environment role composition; `:127-147` capabilities; `:151-184` `BackendSpawnOpts` (including key/env/name/workspace/group/split/targetPane/intoPane); `:262-294` Backend methods.
* Consumers: spawn (`src/commands/spawn.ts:574,582,628,636`), tile (`:849-882`), panes (`src/commands/panes.ts:127-172,195-235,309-320`), lifecycle close (`src/commands/lifecycle.ts:489-528`), entities inventory (`src/entities.ts:167-169,223`), control dispatch no-pane gate (`src/control/dispatch.ts:111`). Implementations: herdr roles `src/backends/herdr/index.ts:153-188`; tmux roles `src/backends/tmux/index.ts:109-138`; headless null roles `src/backends/headless/index.ts:124-132`.
* Capability/identity flags: normal callers mostly gate on role presence/capabilities. `src/commands/spawn.ts:849` gates `paneInventory`, `:850` group/layout; lifecycle `:491` gates paneHost/capability. Backend implementations do branch on environment vars: herdr `HERDR_PANE_ID` (`src/backends/herdr/index.ts:58,164,206`) and `HERDR_ENV` (`:194`); tmux `TMUX_PANE` (`src/backends/tmux/index.ts:112,155`) and `TMUX` (`:145`). These are provider internals, but are environment-id branching that should be capability-mediated at call sites under Rule 11. Core also compares backend ids for identity/selection (`src/entities.ts:120`, `src/commands/panes.ts:127`, `src/commands/spawn.ts:440,560,624`); no launch sequencing branch uses a concrete id except detached fallback by missing group role (`:790-802`).

## Tests exercising paths
* `test/spawn-identity.test.ts:49-72,84-103,109-135`: key is minted opaque, passed to backend, record fields/name/handle persist, dead-name reuse and target normalization.
* `test/spawn-policy.test.ts:78-146`: refused `cmdSpawn` performs no backend allocation, name/worktree/registry/task mutation.
* `test/commands-spawn.test.ts:12-102`: missing name and unknown `--detached` refuse before allocation; flag parsing and adapter command/prompt behavior.
* `test/owner-scoping.test.ts:104-129`: `spawnOneIntoTab` stamps owner; remaining tests assert close/reaping and lifecycle ownership/force rules (including reset gate at `:160-170`).
* `test/spawn-preferred-models.test.ts:73-120`: pane spawn forwards preferred models; headless backend forwards them; command preview contains model quicklist.
* `test/backend-tmux.test.ts:365-374`: `createGroup` invokes tmux new-window and returns group/root pane.
* `test/backend-herdr.test.ts:209-224`: group creation forwards env; adjacent tests assert handed-over pane uses direct launch and planned split launches directly without move.
* `test/commands-lifecycle.test.ts:3-10`: reload helper reports missing/failed bridge without backend misuse (lifecycle-only coverage; not matched by the requested spawn grep).
* `test/close-always.test.ts` and `test/commands-lease.test.ts`: close always reaps regardless ownership; reset driving verb remains lease-gated (lifecycle-only coverage).

## Minimal panes-first change surface
Change only `src/commands/spawn.ts` launch pipeline: `createSpawnRoot` (`:545-592`) and `spawnOneIntoTab` (`:618-669`), plus callers `growFleetIntoGroup`/`tileAgentIntoGroup` (`:693-712`) if batching is introduced. Existing `cmdSpawn` branch selection (`:827-845`) and `cmdTile` placement (`:873-891`) can remain, but tests asserting backend call order/cleanup must update: `test/backend-herdr.test.ts` direct/adopted/split tests, any new `spawnOneIntoTab` order assertions in `test/spawn-identity.test.ts` and `test/spawn-preferred-models.test.ts`, and command integration assertions in `test/commands-spawn.test.ts`. Group-only tests (`backend-tmux.test.ts`, herdr group-create test) remain valid unless `createGroup` API changes.
