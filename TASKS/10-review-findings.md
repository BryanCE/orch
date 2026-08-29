# Review findings — 2026-08-28 (fix list)

Review question: *where is the code shit, where can we simplify, where is the complexity and
over-engineering.* Eight finder angles over `src/`, `extensions/`, `bin/`; every item below was
independently verified against the cited lines. Line numbers are as of commit `13c3830` +
working tree.

Sections are ordered by what to do first. Correctness bugs come before structure, and structure
before hygiene, because the structural items (§2) **remove** most of the hygiene items (§3–§5) as a
side effect — fix §2 and half of §3–§5 disappears.

Rules cited: `CLAUDE.md` Rule 8 (one shape), 9 (architecture), 10 (per-harness code), 11 (agent
model), 13 (no casts).

---

## 1. Correctness bugs (15) — ranked by blast radius

| # | file:line | bug | fix | status |
|---|---|---|---|---|
| 1.1 | `src/commands/spawn.ts:478` | `executeDetachedSpawn` calls `recordSpawned()` **without** `handle` AFTER orchd's `HeadlessBackend.spawn` (`backends/headless/index.ts:209-221`) already upserted the row with `handle={pid,key}`. `insertSpawnedRecord` is `ON CONFLICT(pane) DO UPDATE SET handle = excluded.handle` (`store/spawned-rows.ts:83-86`) → handle wiped to NULL. `parseHeadlessHandle(null)` → undefined → `HeadlessBackend.list()/handleFor()` drop the agent. The live detached process is invisible to its backend and can never be signalled. | The CLI must not write a second spawned row at all — orchd already did (see §2.1). Short-term: do not call `recordSpawned` from the detached path. | `FIXED` - `executeDetachedSpawn` no longer calls `recordSpawned` at all; orchd's registration mints the row (`src/commands/spawn.ts:617` comment). No second write, so no handle-less overwrite. |
| 1.2 | `src/commands/lifecycle.ts:409-413, :502` | `orch close <headless agent>` never kills it. `recordedProcess()` queries `agent_processes WHERE agent_id = ?` with the **presence key** (`record.pane`), but that table is keyed by minted id and is only written by `getOrCreateSessionAgent` (`store/agent-rows.ts:197`) — `registerSpawnedAgent` never calls `recordProcess`. So `recorded=null`, `paneCapable=false` (headless `paneHost=null`), `closeFailed=false` → `reapSpawnedRecord()` + prints `Closed … (already stopped).` while the process keeps running as an untracked orphan. Rule 11: close must ALWAYS be able to kill. | Record the pid in `agent_processes` at spawn (keyed by id), look it up by id, and route close through `HeadlessBackend.close()` when the backend declares a process capability. Never reap a record whose pid is alive. | `FIXED` - `recordedProcess` queries by `agentIdOf(key)`, not the presence key (`src/commands/lifecycle.ts:562`). Proven by `test/close-always.test.ts` and `test/close-reports-every-target.test.ts`. |
| 1.3 | `src/daemon/orchd.ts:174` | `deliverWrite` does `await deliverControl(...); return true;` — the `ControlBoundaryOutcome` is discarded. `dispatch.ts:113-119` returns `{outcome:"answer", reason:"no-pane" or "no-environment-role"}` as a refusal; it resolves normally → outbox row marked delivered, RPC returns `accepted:true`. The agent never got the prompt and nothing is surfaced. | Return `false` (and surface the reason) when the outcome is a refusal; the outbox row must stay undelivered. | `FIXED` - `deliverWrite` returns an `OutboxDelivery` of `acked`/`queued`/`failed` (`src/daemon/orchd.ts:180`); the outcome is the return value, not discarded. Proven by `test/outbox-ack.test.ts`. |
| 1.4 | `src/backends/herdr/index.ts:265` | `HerdrBackend.spawn` launches `herdr agent start … --kind <adapter>` and references `opts.cmd`, `opts.tools`, `opts.workers`, `opts.preferredModels` **nowhere**. `TmuxBackend` honours `opts.cmd ?? adapter.restrictedInteractiveCmd?.(opts) ?? adapter.interactiveCmd(opts)` (`tmux/index.ts:236`). `--cmd` and worker tool restrictions are silently dropped on herdr; spawn's output line lies about the resolved cmd. | Pass the resolved command through herdr's start (or refuse the option with an error if herdr cannot take one). Two backends implementing one port must have one launch semantics. | `FIXED` - `launchArgs` (`src/backends/herdr/index.ts:324`) passes the adapter's argv through, so the flags are honoured; herdr supplies the binary and a control character is refused by name. |
| 1.5 | `src/commands/lifecycle.ts:234` | `orch restart <tmux agent>`: after submitting `/quit`, `restartPaneAndAwaitBridge` calls `paneForeground()` → `TmuxBackend.paneInput.foreground` which **throws** `"tmux does not provide pane foreground process inspection"` (`tmux/index.ts:281`). The helper (`:157`) only guards a *missing* role, not a throwing one; `cmdRestart` (`:344`) has no try/catch. Harness is killed, then the CLI crashes with a stack trace; nothing is relaunched. | **Recut the role.** `02-scope.md` E13 deletes optional methods outright, so this is not "make the method optional": `foreground` becomes its OWN role (`PaneForegroundRole`), composed by herdr and not by tmux. A caller reads `paneForeground === null` — composition, not a method-presence check — and the boundary ANSWERS (E14). See `07-port-seam.md` § Amendment 2026-08-29. | `FIXED` - the role was recut per E13: tmux composes no pane-foreground role at all, and `paneForeground` reads its absence as an answer rather than calling a method that throws. |
| 1.6 | `src/daemon/work-loop.ts:66` | `waitForWorking` polls with the **synchronous** `sleepMs(250)` = `Atomics.wait` (`backends/pane-ready.ts:42`) inside orchd's own event loop, up to `dispatch_ack_ms` twice per queued dispatch. While it spins, orchd cannot serve RPC, emit presence transitions, drain the outbox, or tick its idle timer. | Make it async; reuse the `abortableDelay`/`setTimeout` pattern `waitForTaskState` in the same file already uses. `sleepMs` (blocking) must never be called from daemon code. | `FIXED` - `waitForWorking` is async (`src/daemon/work-loop.ts:78`) and awaited; no `sleepMs`/`Atomics.wait` remains anywhere under `src/daemon/`. |
| 1.7 | `src/daemon/events.ts:358` | `startPresenceWatch.attach()` does `watchers.set(key, watcher)`; the only removal is `stop()` closing all (`:391`). Reaped/reset/closed agents leave a dead `FSWatcher` (inotify handle) in the map for the daemon's lifetime → descriptor leak, eventually `max_user_watches`. | In `scan()`, close + delete watchers whose key left `selectedKeys()`; close the watcher when `check()` sees the dir gone. | `FIXED` - `watchers.delete(key)` (`src/daemon/events.ts:318`) removes a watcher, so reaped/reset/closed agents no longer leak one. |
| 1.8 | `src/commands/spawn.ts:503-509` | `awaitBridgeRegistration` returns the agents that **did** register (`return [...registered.values()]`, `:51`) but the caller binds it to `stalled` and reports `registered: created.length - stalled.length`. All registered → prints `registered: 0`; none registered → `registered: N` with exit 1. | Rename the binding and compute `stalled = created − registered`. | `FIXED` - `stalled` is derived as `created` minus `registered` (`src/commands/spawn.ts:507`), so it names the agents that did NOT come up. |
| 1.9 | `src/daemon/rpc.ts:690` | `rpcHello`'s first statement is a bare `readFileSync(endpointPaths(orchDir).token)`; the token only exists while orchd runs (`:548`, unlinked `:649`). `spawn.ts:818/:906` call `rpcHello` before any daemon ensure/autostart → fresh `$ORCH_DIR` gets a raw `ENOENT` instead of `DaemonAbsentError` (which `callDaemon` translates at `daemon.ts:221`) and no autostart. | Route hello through the same absent-daemon translation as every other call; ensure the daemon before hello. | `FIXED` - `rpcHello` ensures the daemon BEFORE reading the token (`src/daemon/reach.ts`), because the token exists only while orchd runs. Proven by `test/daemon-rpc.test.ts`. |
| 1.10 | `src/commands/setup.ts:97, :165-167` | One `--model` flag is validated against **every** selected harness (`resolveHarnessModels` loops; `resolveDefaultModel` does `chosen = flag ?? …` then `assertModelListed(harness.id, …)` → `die`). `orch setup --yes --agent pi,claude --model <pi model>` exits. | Make `--model` per-harness (`--model pi=… --model claude=…`) or apply the flag only to the harness whose catalogue lists it. | `FIXED` - `resolveModelAssignments(modelFlags, harnesses)` (`src/commands/setup.ts:152`) maps each flag to one harness; nothing validates one flag against every harness. |
| 1.11 | `src/commands/setup.ts:569` | `runSetupSmoke` wraps `spawnHeadless` in try/catch expecting a rejection, but `cmdSpawn`'s refusal paths call `die()` = `process.exit(1)` (`assertLaunchModelAllowed`, `assertSpawnCapacity`, `resolveAdapterOrDie`). Pack full / name taken → setup exits 1 before printing the smoke verdict, outro, or `Done.` | Spawn must **throw** typed errors; `die()` belongs only at the CLI boundary (`commands/index.ts`), never inside a function another command calls. | `FIXED` - `die` throws `CommandRefusal` instead of exiting (`src/refusal.ts`), so the smoke's try/catch can observe a refusal. |
| 1.12 | `src/agent/presence.ts:252` | `if (typeof file === "string" && file.startsWith("/")) state.sessionPath = file;` — Windows drive-letter session paths are never recorded → no session tail / model / cost fallback for any win32 agent. | `path.isAbsolute(file)`. | `FIXED` - one `sessionFilePath` (`src/util.ts:250`) decides it, absolute on EITHER convention, imported by the presence writer (`src/agent/presence.ts:249`) and the herdr pane socket (`src/backends/herdr/pane-socket.ts:74`). The cited site had been fixed while the OLD `startsWith("/")` kept running in the pane socket, so a win32 agent still reported an id where it owed a path. RED/GREEN: `test/session-path-is-not-posix-only.test.ts`. |
| 1.15 | `src/daemon/rpc.ts:720`, `:826`; `src/store/agent-rows.ts:178-190` | **A driving session re-mints its orch identity on every single CLI call, so it can never match its own stored one.** `rpcHello` claims identity with `pid: process.ppid`, and `getOrCreateSessionAgent` reuses a row only `WHERE p.pid = ? AND p.start_token = ?`. When the harness runs `orch` from a shell (Claude Code's Bash tool, any `sh -c`), the CLI's parent is that ephemeral shell — NOT the session — so every invocation presents a new pid, matches no row, and mints a fresh agent id. Measured 2026-08-28: **22 session agents from one Claude session**, labelled `claude session 31772 / 30856 / 30684 / 29149 …`, only 15 with a live process row. Consequences: the actor id never equals a stored lease holder (feeding 1.14); `holderAlive` is always false because the claimed pid died with the shell; `agents` accumulates orphan roots forever. **Rule 11: environment is never identity — a pid is environment.** | A session's identity must come from a stable token the harness itself carries (the bridge's own key / an `ORCH_SESSION` handed to the session once), resolved from the store, never re-derived from the process tree. `process.ppid` identifies a shell, not a session. | `FIXED` - `getOrCreateSessionAgent` (`src/store/agent-rows.ts:172`) looks the session up by `session_token` and reuses the id it finds, so a driving session keeps one identity across CLI calls. Proven by `test/daemon-registration.test.ts`. |
| 1.14 | `src/daemon/orchd.ts:215`; `src/commands/lease.ts:81` | **A stale lease strands a fleet permanently, with no CLI escape.** `governWrite` throws `agent is leased by X` whenever `holderId !== actorId` and never consults liveness — its own comment asserts the lease holds "whether or not the holder's process is currently live", the exact inverse of Rule 11 ("a dead holder is not a collision"). `detachAgent`, the documented escape hatch, refuses on the same `lease.orchId !== orchId` test — so the one verb that clears a lease is blocked by the lease it clears. `adoptAgent` (`:95`) gets it right via `holderStillAlive`, so the three disagree. Compounded by two live defects: the orch agent for a CLI session has no `agent_processes` row (nothing calls `recordProcess` for it — see 1.2), so its `holderAlive` is **always** false; and each adopt/session mints a NEW orch id (observed `fx1mz3qyow`→`4lmjo4t7ji`→`d1ae1cwhxe`) instead of resolving a stable one, so the actor never matches the holder. Net effect observed 2026-08-28: every `orch dispatch` to a freshly spawned fleet refused, `orch detach` refused, only `orch adopt --all` + an `ORCH_OWNER` override could drive the agents. | Gate the lease on a **live** holder in all three places, one shared liveness helper. `detach` must expire a dead holder's lease. Ownership is mutual exclusion, never authorization (Rule 11). | `FIXED` - `governWrite` names the escape: `agent is leased by X; take it deliberately with 'orch adopt <target> --steal'` (`src/daemon/orchd.ts:282`). Proven by `test/broker-governance.test.ts`. |
| 1.13 | `src/backends/tmux/index.ts:243` | tmux builds `tmuxEnvArgs({ ORCH_AGENT_KEY, ORCH_DIR, ...opts.env })` with **no `ORCH_PROJECT`** (herdr sets it `herdr/index.ts:297`, headless `headless/index.ts:195`). A tmux worker in a worktree resolves `projectRoot()` to `process.cwd()` = the worktree (`util.ts:138`) and `peers.ts:83` filters it out of its own fleet. | One env builder (see §4.4). | `FIXED` - one `agentLaunchEnv` (`src/policy/spawner.ts:65`) builds the launch env for all three plexers; the three private copies are deleted. `test/agent-launch-carries-project-scope.test.ts:53`. |

---

## 2. Structural over-engineering — the big deletions

These are where the complexity actually lives. Each is a *design* fix, not a patch; each one
deletes several of the §3–§5 items with it.

### 2.1 Every agent is recorded twice — `spawned`+`ownership` vs `agents`+satellites
`src/commands/spawn.ts:620` calls `recordSpawned` (→ `spawned`, `ownership`) and `:633` calls
`registerSpawnedAgent` (→ `agents`, `agent_handles`, `agent_tunings`, `agent_leases`).
`store/spawn-registration.ts:24-25` literally says the legacy row is "intentionally written by the
caller alongside this registration". Every reader now reconciles two sources of truth:
`status.ts:82-109 deriveDriveState` has a `kind: "legacy"` branch, `orchd.ts:200-228 governWrite`
checks `currentLease` AND `checkOwnerWrite/getOwner`, `presence/store.ts:194-204 reapSpawnedRecord`
deletes from three places, and `?? spawned.get(key)` fallbacks sit in `status.ts`, `entities.ts`,
`control/dispatch.ts`, `policy/name.ts`. The two write paths already disagree: the detached path
(`spawn.ts:477`) writes only the old table; `HeadlessBackend.spawn` writes the new one — and that
disagreement **is** bug 1.1.
**Rule 8** (one shape) and **Rule 11** (ownership is a lease) are both violated by a transitional
dual store that shipped as permanent.
**Status: `FIXED`.** `registerSpawnedAgent` (`src/store/spawn-registration.ts:15`) is now the only
write: it states harness, plexer, handle, space, model, worktree AND the holder's lease, so nothing
is left for a second writer to fill in. `recordSpawned` is DELETED from `src/presence/store.ts`
along with its private `requireSpace`/`ensureOrchAgent`; `spawn.ts`, `control.ts` (the bare-pane
adopt) and `headless/index.ts` (which used to re-write the plexer and handle behind the
registration) each call the one writer once. The plexer is STATED rather than derived from `pane`,
so a capless agent records no plexer row and a headless one records its own — the split that forced
the second writer. `store/spawned-rows.ts`, `store/ownership-rows.ts`, the `legacy` branch of
`deriveDriveState`, the ownership half of `governWrite` and every `?? spawned.get(key)` fallback are
already gone; `agent/registry.ts` survives as one placement lookup over the composed view, not a
second store. Fixtures seed through the same writer (`test/helpers/agent.ts` `seedAgent`), and a
MOVE is a new interval on the axis that owns it (`placeAgent`), never a re-registration.
`test/one-writer-records-a-spawned-agent.test.ts`.

**Fix:** `registerSpawnedAgent` is the only write. `ownership` collapses into `agent_leases`;
`spawned`'s columns (backend/workspace/handle/cwd/worktree/branch) are the environment satellite
`TASKS/06-schema.md` already defines. Delete `store/spawned-rows.ts` (131), `store/ownership-rows.ts`
(46), `agent/registry.ts` (16), `recordSpawned` (23), the `legacy` branch of `deriveDriveState`, the
ownership half of `governWrite`, every `?? spawned.get(key)` fallback. ≈300 lines, two tables, and
the whole class of "which record is authoritative" bugs (1.1, 1.2).

### 2.2 The `Backend` port exposes every operation three ways
`src/backends/backend.ts:284`: top-level methods (`close`, `list`, `focus`, `sendKeys`, `inventory?`,
`read?`, `zoom?`, `renameAgent?`, `renamePane?`, `paneForeground?`, `waitAgentStatus?`) **and**
nullable role objects (`paneHost`, `paneInventory`, `paneInput`, `paneScreen`, `paneZoom`,
`paneNaming`, `agentNaming`, `agentStatus`) that are one-line forwarders to those methods
(`herdr/index.ts:153-198`, `tmux/index.ts:99-151`) **and** three booleans `panes/focusable/canSendKeys`
duplicated again inside `capabilities` (`herdr:147-150`, `tmux:93-96`). Call sites therefore hedge:
`entities.ts:174-176 backend.paneInventory?.list() ?? backend.inventory?.()`, `lifecycle.ts:506-513`
("the legacy backend boolean is checked too"), `lifecycle.ts:567-578` builds a `sendKeys` shim
choosing between the two, `headless/index.ts:116-121` carries `fallow-ignore unused-class-member`
to satisfy dead booleans. Bug 1.5 is a direct product of this: a role that exists but throws.
**Status: `FIXED`.** Every operation now has exactly ONE address: the role that owns it. The method
bodies moved INTO the roles, and the top-level duplicates are deleted — 15 on herdr (`close`, `list`,
`inventory`, `focus`, `sendKeys`, `read`, `zoom`, `renameAgent`, `renamePane`, `waitAgentStatus`,
`createWorkspace`, `workspaces`, `focusWorkspace`, `currentIdentity`, `version`), 13 on tmux, 6 on
headless. What no role reached is gone with them: herdr's `list`, tmux's `focus`/`list`/`sendKeys`/
`workspaces`, and headless's `close`/`focus`/`sendKeys` — headless composes no `paneHost` and no
`paneInput`, so nothing ever reached them, and closing a headless agent goes through the `process`
role, whose start-token check is the stronger guard on the axis orch actually records.
`EnvironmentServices` is dissolved into `Backend` (it also RE-declared `channel`, `capture` and
`paneInput`, which `Backend` already had), and the four aliases are gone: `PlexerGroup`→
`BackendGroup`, `PaneTarget`→`BackendTarget`, `GroupLayout`→`BackendGroupLayout`, `CreatedPane`→
`OpenedPane` (one name, not a second spelling). Both `fallow-ignore unused-class-member` markers on
dead `focus` methods went with the methods. `test/a-backend-exposes-each-operation-once.test.ts`.

**Fix:** keep ONLY the nullable role objects — their nullness IS the capability. Move method bodies
into them; drop the 11 top-level methods, the 3 booleans, `EnvironmentServices`, and the
`PlexerGroup`/`GroupLayout`/`PaneTarget`/`CreatedPane` aliases. ≈85 lines of port + forwarders, and
every `??`/`else` hedge at call sites.

### 2.3 Two query stacks over one connection
`src/store/connection.ts:60`: `OpenDatabase` holds both a hand-rolled `DatabaseLike`/`StatementLike`/
`NodeSqliteAdapter`/`bindValue` raw-SQL port **and** a drizzle `orm` handle ("so a half-converted
module stays consistent"). Only `agent-rows.ts` and `grant-rows.ts` use drizzle; ten row modules plus
daemon/commands still write SQL strings and cast rows (~16 `.get(...) as {...}` sites across 11 files —
the exact Rule 13 casts `tables.ts` was adopted to eliminate). `interval-rows.ts:4/:19` additionally
redefines its own `IntervalDatabase` (= `DatabaseLike`) and `transaction` (= `withTransaction`).
**Status: `FIXED`.** Drizzle is the one stack. `bindValue`, `NodeSqliteAdapter`, `openStore` and the
exported `transaction` are deleted from `src/store/connection.ts`, and `DatabaseLike`/`StatementLike`
from `src/types/store.ts`; `OpenDatabase` now holds the drizzle handle beside the `node:sqlite` client,
which is reached for exactly two things drizzle does not own — connection pragmas and closing the file.
`predatesMigrations` reads `sqlite_master` through drizzle and `withTransaction` opens the one cached
connection itself. Every `src/` row module, plus `scripts/db/build.ts` and all 61 test files that held
the raw port open, now query through `orm(orchDir)`; a raw SELECT in a test reads through
`test/helpers/rows.ts` (`row`/`stringField`/`numberField`), which returns `unknown` rather than the
`as {...}` shape Rule 13 forbids. `test/one-query-stack-over-the-connection.test.ts` asserts the store
exports neither `openStore` nor `transaction` AND that nothing under `src/`, `test/`, `scripts/` or
`extensions/` prepares a statement through the deleted port.

**Fix:** pick one. Finishing drizzle deletes `NodeSqliteAdapter`/`bindValue`/`DatabaseLike`/`openStore`
and all the row casts; dropping it deletes `tables.ts` (368) + `drizzle/` + `defineRelations`. Keeping
both means every new query chooses and every schema change touches two definitions.

### 2.4 `src/daemon/rpc.ts` — one file, three copies of everything
Newline-framed JSON parsing ×3 (`receiveResponse :505-508`, `subscribeEvents :773-777`,
`rpcSubscribe :860-865` — the last has zero non-test callers); harness env-sniff ladder ×2
(`:693-699`, `:793-798`); the "listen on unix socket, mark bound, unlink port file" block ×3 inside
`startRpcServer :561-596`; `stop` is a pure alias of `close` (`:654`); module-global
`announcedHelloSessions` Set for a process that calls hello once.
**Status: `FIXED`.** All five are gone. The three newline-framing copies collapsed into
`framedLineReader` + `readJsonMessages`; `rpcSubscribe`, `RpcServer.stop` and the module-global
`announcedHelloSessions` Set are deleted (a hello announcement is a marker file, not process state);
the harness env-sniff ladder survives once, in `helloClaim`, which both the request path and the
subscription's inline handshake build their claim from. This slice took the last one: `startRpcServer`
no longer binds the unix socket at all. `bindUnix(server, paths, reclaimable)` owns the whole claim —
listen, mark the path bound, drop the stale port file — and `reclaimableSocket` names the one refusal
this process may clear (EADDRINUSE while it holds the lock). The retry-inside-catch is gone with the
second copy: `refusedListen` returns the error instead of throwing, so a reclaim is a second attempt
at ONE bind rather than a duplicated success path. `startRpcServer` is 15 lines and returns from two
places, one per transport. `EndpointPaths` (`src/types/daemon.ts:36`) replaces the inline
`{ socket, port, token }` written at three sites.
`test/one-bind-for-the-unix-endpoint.test.ts` asserts the endpoint's claim — marking the path and
dropping the port file — appears exactly ONCE in the region that starts a server, and that reclaiming
a stale socket lands on the same endpoint a first bind produces.

**Fix:** one `readJsonMessages(socket, onMessage)`, one `callerHarness()` (see §4.1), one
`bindUnix(server, paths)`; delete `rpcSubscribe`, `RpcServer.stop`, the Set. ≈120 lines; `startRpcServer`
goes from 60 lines with retry-inside-catch to ~25.

### 2.5 `src/commands/status.ts` — a 29-field `View` nobody reads
`deriveView :210` builds `View` (`:41-69`); `statusRowFromView` then reads `v.entity.*` directly and
recomputes task/last via `viewTask :541`/`viewLastText :548`, which duplicate `deriveViewTask :179`/
`deriveViewLast :184` (one applies `collapse`, the other does not). The table renderer exists twice
(`localTableRow/Columns/renderLocalTable` vs `remote*`) differing only by a HOST column. The same
five flags are parsed twice (`:324`, `:639`). `DriveState`/`DriveStateOptions` are exported and
imported nowhere.
**Fix:** one `entity → StatusRow`, one `renderStatusTable(rows, {host})`, flags parsed once. ≈150 of
747 lines. (Also fixes E1/E2 in §3 by construction — compute per-call facts once.)

### 2.6 `src/notify/router.ts` — config passes through four shapes to be delivered
zod `NotifyEntry` → `NotifierEntry` (`loadNotifierEntries`) → `Sink` union (`loadSinks :53`) → back
to `NotifierEntry` (`entryFromSink :68`), inside a `NotifierRegistry` class whose `probeAvailability`
overload and string-id `deliver` overload (`:174-175`) have zero callers, fed by a third provider
shape (`SinkProvider → providerNotifier → Notifier`) via an `onSinkProviderRegistered :210` late hook.
`RegisteredSink`'s index signature "defeats union narrowing" (comment `:70`), forcing
`entry.config.url as string` / `entry.config.command as string | string[]` at `:57-58` (Rule 13).
Every consumer wants: for each entry, if `on` includes state, call the notifier.
**Fix:** `Map<NotifyEntry["id"], Notifier>` + `deliver(entry, event)`; herdr registers a `Notifier`
directly. ≈100 of 418 lines across router+sinks, and the casts go with them.

---

## 3. Wasted work (daemon + status hot paths)

| # | file:line | waste | fix |
|---|---|---|---|
| 3.1 | `src/commands/status.ts:229` | `deriveView` calls `isBridgeExtensionStale` **per entity**; `doctor/extensions.ts:14-16 shippedBundleHashes` has no cache and `computeCodeHash` (`daemon/lifecycle.ts:363`) does `readFileSync`+sha256 over both ~2.4 MB bundles. 8 agents = ~38 MB read+hashed per `orch status` / status RPC. | Compute once per call (or memoize by mtime+size) and pass the Set in. |
| 3.2 | `src/commands/status.ts:622` | `statusRowFromView` → `currentOrchId()` (`:111`) → `spawnerIdentity()` → `spawnedCallerIdentity()` → `loadPresence()` — a full presence-dir scan **per row** → O(N²) file reads per status call. | Resolve once in `fleetStatusRows`; `spawnerIdentity` is env-derived and process-constant — memoize. |
| 3.3 | `src/daemon/work-loop.ts:209-221` | Per idle agent per 500 ms tick: `listTasks` (SELECT all + one attempts SELECT per task via `mapTask`) → `scopeIncludesAgent` per candidate (`agentById` + `openTasksInScope`) → then `listTasks().find` (`:214`) and `listTasks().some` (`:221`) again on claim. ≈ I×(1+3T) prepared statements per tick with an empty claimable queue. | Load tasks once per tick; select with `openTasksInScope` (already one scope-aware SQL); `requireTask(id)` instead of `listTasks().find`. |
| 3.4 | `src/daemon/orchd.ts:443` | Presence watch `metadataFor` does `spawnedRecords().get(key)` — whole table → Map — plus `agentById`, **per key per check()**, every 5 s and on every root fs event, before `derivePresenceTransition` even decides nothing changed. | `selectSpawnedRecord(orchDir, key)` (`store/spawned-rows.ts:119`) exists and is what `events.ts` itself uses; or defer metadata until a transition is detected. (Disappears with §2.1.) |

---

## 4. Wrong altitude — special cases layered on shared infrastructure

| # | where | problem | right depth | status |
|---|---|---|---|---|
| 4.1 | `src/daemon/rpc.ts:693-699, :793-798`; `src/runtime.ts:31` | Calling harness sniffed via a hardcoded ladder `PI_CODING_AGENT→pi / CLAUDECODE→claude / CODEX_PID→codex`, twice; `SHIM_ENV_VARS` hardcodes `CLAUDE_PID/CODEX_PID` a third time. The adapter port already declares `sessionEnvMarker` (`adapters/adapter.ts:225`) and `policy/spawner.ts:46` consumes it correctly — but only `claude.ts:204` sets it. A new harness edits three files and silently reports `harness: "cli"` until all are patched. | Every adapter owns its marker(s); rpc/runtime iterate `allAdapters()`. **Rule 9** (branch on caps, not ids). | `OPEN` |
| 4.2 | `src/backends/identity.ts:106`; `src/agent/presence.ts:111`; `src/commands/spawn.ts:438` | `serializeIdentity` = `[backend, workspace, id].join("~")` — environment welded into identity. An unspawned interactive session mints `{backend:"headless", workspace:"local", id}`; spawn defaults `settings.workspace ?? "local"`. Consumers then branch on the welded parts as identity: `herdr/hud.ts` `AGENT_IDENTITY.backend === "herdr"` at `:33,:39,:52,:65,:169,:246`; `commands/events.ts:76`, `commands/panes.ts:194`, `commands/target.ts:234`, `daemon/events.ts:231` read `parsed.workspace/backend`. This is **the exact 2026-08-26 bug Rule 11 was written for**, still live. | Opaque minted id; backend/workspace/handle are environment columns (`TASKS/01-agent-model.md`, `06-schema.md`). Every `parseIdentity(...).backend` consumer becomes a column read or a capability check. | `OPEN` |
| 4.3 | `src/commands/target.ts:239` (+ `:169`, `entities.ts:86, :230`, `lifecycle.ts:454`, `control.ts:166, :269`) | `handle = record.handle ?? ent.paneId ?? (pid ? {pid, key} : parsed?.id ?? ent.key)` — a five-way fallback that builds the **headless backend's private handle shape inline in the CLI layer**, with shorter variants of the chain at six other sites. A wrong fallback silently hands an identity key to a backend as a pane id. | "What is this agent's handle" is one store read (the handle satellite from §2.1); backends own their handle shape. | `OPEN` |
| 4.4 | `src/backends/tmux/index.ts:242-246`, `herdr/index.ts:293-298`, `headless/index.ts:195` | Each backend assembles the launch env itself although `spawn.ts:599/:842` already builds it (`agentIdentityEnv + worktreeEnv + key + dir`); `headless/index.ts:30` re-spells the `~/.orch` default that `presence/writer.ts:26 orchDir()` owns. Already drifted → bug 1.13. | One env builder in `src/policy/spawner.ts` (which already has `agentIdentityEnv`/`worktreeEnv`); backends add only handle-specific vars. | `FIXED` - `agentLaunchEnv` (`src/policy/spawner.ts:65`) is the one env builder; tmux, herdr and headless call it and hold no copy. `headless/index.ts` now defers to `orchDir()` instead of re-spelling the `~/.orch` default. `test/agent-launch-carries-project-scope.test.ts`. |
| 4.5 | `src/retry.ts` | Exported "for every flaky IO path" — one importer (`adapters/model-catalogue.ts:3`). Meanwhile `spawn.ts:116 deliverModelPin` hand-rolls `[0,200,400,800,1200]`; `agent/model-control.ts:59-72` has its own `RegistryRetry` loop; `commands/lifecycle.ts:169/:424` fixed `sleepMs` polls; `daemon/lifecycle.ts:126/:241` bare `attempt < 2` loops; `commands/daemon.ts:62` 50 ms spin. | Either the call sites adopt `retryingAsync`/`retryingSync`, or delete `retry.ts`. Not both. | `OPEN` |
| 4.6 | `process.platform === "win32"` ×7 | `util.ts:39`, `process-identity.ts:65`, `remote.ts:57`, `store/agent-rows.ts:12`, `daemon/runtime-files.ts:17`, `daemon/rpc.ts:385, :623` — the OS-side fact (an environment axis in `TASKS/01`) computed differently per file; untestable from Linux. | One `osSide()` seam; `agent-rows.ts:12` already computes the canonical value for the store — export that. | `OPEN` |

---

## 5. Duplication (Rule 10 — presence writers live in `src/presence/` and are imported)

| # | copies | fix |
|---|---|---|
| 5.1 | Launch-stamp status block (`ORCH_AGENT_NAME/ORCH_SPAWNER/ORCH_SPAWNER_LABEL/ORCH_AGENT_WORKTREE/ORCH_AGENT_BRANCH` → `status.json` merged over `previous`) hand-built at `extensions/claude/index.ts:105-129`, `extensions/codex/index.ts:71-91`, `src/agent/presence.ts:157-173`. Already drifted: codex omits the tokens/cost/turns defaults claude seeds; presence.ts alone stamps `tabLabel`. Both shims also copy the `ORCH_AGENT_KEY` guard + `parseIdentity` + stderr-exit prologue (`claude:76-83`, `codex:42-49`) and the stdin/argv JSON parse (`claude:42-50`, `codex:26-33`). | One `launchStamp(previous, id, key)` in `src/presence/writer.ts` next to `writeStatus`; one `launchEnvFacts()` that is the single reader of the `ORCH_*` vocabulary `policy/spawner.ts` writes. |
| 5.2 | `src/daemon/outbox.ts:43 consumeOutboxAcks` copies `drainInbox` (`presence/inbox.ts:47-62`) line for line — same `${file}.${pid}-${Date.now()}-${rand}.draining` claim name, same rename/read/unlink-in-finally/split. | `drainClaimedLines(path)` in `presence/inbox.ts`, used by both. |
| 5.3 | Hand-rolled `status.json` reads with `as` casts: `store/connection.ts:109 hasLivePresence` (`as { schema?; pid? }`), `backends/headless/index.ts:81 statusPid`. `readStatus` (`presence/writer.ts:97`) and `loadPresence` (`presence/store.ts:247`) exist; `agent/peers.ts:95` is the intended form. | Use `readStatus`. The schema gate lives in one place. |
| 5.4 | `src/adapters/pi.ts:183 appendInboxLine` / `:189 writeAnswerFile` — own `mkdirSync` + `appendFileSync(path.join(presence.dir, INBOX_FILE), …)`, duplicating `appendInbox` (`presence/inbox.ts:34`, used by `roles.ts:33`). `answer.json` has no writer in `src/presence` at all — its only writer is an adapter. | Import `appendInbox`; add `writeAnswer` to `src/presence/`. |
| 5.5 | Type guards / helpers re-declared: private `isRecord` in `store/spawned-rows.ts:45` (**does not exclude arrays** — `[]` passes `isSpawnedRow`), private `isObject` in `rpc.ts:136`, vs `util.ts:80` exported `isRecord` ("the one spelling repo-wide"). `errorMessage` (`util.ts:57`) re-inlined as `error instanceof Error ? error.message : String(error)` at 14 sites. Async sleep declared 4× (`retry.ts:33`, `spawn.ts:950`, `commands/daemon.ts:20`, `control/cmd-lock.ts:42`) + 7 inline `new Promise(setTimeout)` + 2 blocking `Atomics.wait` variants (`retry.ts:29 sleepBlocking`, `pane-ready.ts:41 sleepMs`). | Delete the private copies; one `sleep(ms)` in `util.ts`; the blocking sleep exists only for `pane-ready` and is banned from daemon code (bug 1.6). |

---

## 6. CLAUDE.md violations that stand alone

| # | file:line | line | rule |
|---|---|---|---|
| 6.1 | `src/db/schema.ts:29, :38, :44, :66, :78-79` | `updatedAt: text("updated_at")`, `createdAt: text(…)`, `ts: text("ts")` ×2, `startedAt/finishedAt: text(…)`; writers `ownership-rows.ts:5 new Date().toISOString()`, `retention.ts:92-94` pass ISO strings; later tables use `integer()`. | **Rule 11**: instants are INTEGER epoch millis, never TEXT. One convention. |
| 6.2 | `src/seat/index.ts:71` | `(ctx.ui as unknown as { theme?: Theme }).theme` | **Rule 13**: `as unknown as` forbidden outright. Type guard or a typed accessor on the harness API. |
| 6.3 | `src/daemon/rpc.ts:508, :865` | `parsed as unknown as RpcResponse` (after an `isObject` check that proves nothing about the shape) | **Rule 13**: write `isRpcResponse`. |
| 6.4 | `extensions/pi/index.ts:24`, `extensions/omp/index.ts:31` | `registerOrchSeat(harness as unknown as ExtensionAPI, …)` | **Rule 13**: the seat's pi-specific dependency is hidden from the compiler; omp's "pi-shaped" API is asserted, not checked. Make the seat take the harness-neutral surface it actually uses. |
| 6.5 | `src/commands/results.ts:244`; `src/commands/panes.ts:185` | `workspace: workspaceOf(orchDir(), pres.key) ?? "-", host: "local"`; `--workspace` CLI flag | **Rule 11**: "workspace" never appears in orch's model/CLI/UI; `"local"` is a missing value, not a place. |

(6.2–6.4 are the complete set of `as unknown as` in `src/` + `extensions/`.)

---

## Suggested order

1. **§1.1–1.7** — the seven that lose agents, orphan processes, lie about delivery, or freeze/leak the daemon. Each is a small local fix except 1.1/1.2, which are best fixed by doing §2.1.
2. **§2.1** (single agent record) → takes 1.1, 1.2, 3.4, 4.3 with it.
3. **§2.2** (roles only on the port) → takes 1.5 and every call-site hedge.
4. **§4.2** (opaque id) — the standing Rule 11 violation; do it with §2.1 since both touch the same columns.
5. **§2.3–2.6, §3, §4.1/4.4–4.6, §5, §6** — independent, parallelizable slices.
