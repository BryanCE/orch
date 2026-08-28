# orch issue log

## 2026-08-27 — spawn/registration bug RESOLVED

The morning spawn failure (herdr `pane run` empty ack, then `no bridge dir`
stalls) is fixed: the pane launch command now loads
`~/.pi/agent/extensions/pi-bridge.js` instead of `orchestrator-bridge.js`, and
`orch spawn` registers agents cleanly; dispatch + `orch events` stream verified
working (doccheck fleet, ~21:40).

Open annoyance, unchanged: after a pane's first completed dispatch, name
targets can resolve ambiguous (`Ambiguous target "research-1"` on `orch
close`). Workaround: address by pane id.

## 2026-08-27 (~21:50) — `orch tile` creates a pane but never starts the harness

`orch spawn` works (doccheck-1/2 registered, dispatched, streaming). But
`orch tile doccheck --name doccheck-3` (and -4) added the pane, ECHOED the `pi`
launch command into it twice, and left a bare `t3reports >` shell — pi never
ran. Signals: the tile output itself warns `could not pin ...: no presence dir
for pi inbox delivery`; `orch status` shows AGENT `-` / STATE `unknown?`;
a dispatch then fails `write ... was not applied or acknowledged`. `orch
restart doccheck-3` refuses: `Target "doccheck-3" has no recorded harness -
cannot determine its restart mechanism`.

Repro: working spawned fleet → `orch tile <tab> --name <x>` → dead shell pane.
Workaround: never grow a fleet with `tile`; close the dead pane by ID and use
`orch spawn N --name <prefix>` (grows into the live tab). Orchestrator lesson:
treat the `could not pin` warning as fatal — check registration before any
dispatch to a tiled pane.

## 2026-08-27 (~late) — HEAD commit 2462a62 was committed half-refactored; spawn was dead (FIXED in tree, rebuilt)

`orch spawn` on the freshly built install failed two ways:
1. Fresh-tab path: `launchAdditionalAgents is not defined` — 2462a62 renamed it
   to `growFleetIntoGroup` (new signature) but left the old call in
   `executeSpawn` (src/commands/spawn.ts:698).
2. Fill-existing-tab path: `identity backend must be a non-empty string:
   undefined` — `spawnIntoExistingTab` still passed a `TilePlacement` where the
   new `placeAgent` signature expects `backend`, so `spec.backend.id` was
   undefined.

Both fixed in the working tree (executeSpawn now spreads
`growFleetIntoGroup(...)`; spawnIntoExistingTab delegates to it), rebuilt via
`bun run build:dev`, daemon restarted, fleet spawning verified.

RESIDUAL RISK, not yet fixed: 2462a62 touched src/adapters/pi.ts,
src/agent/harness-bridge.ts (new), src/backends/backend.ts,
src/backends/herdr/cli.ts and more — other stale call sites from the same
half-finished rename may lurk.

## 2026-08-27 (~23:00) — status shows `blocked` for an agent that is actively running commands

`orch status` reported the queue-rewire pane as `blocked` (and `orch events`
emitted working->blocked) while `orch peek` showed it actively running
`bun test` with a live spinner, and `orch questions` was empty. A blocked
state with no pending question is contradictory - likely the bridge marks
"blocked" on some sub-state (e.g. waiting on a locked command / long tool run)
or a stale status.json write. Consequence: orchestrators poll questions for
nothing and may wrongly redispatch. Repro seen twice on long turns (>$2.5).

## 2026-08-27 (~23:10) — recurring "WebSocket error" kills turns on pane w7:p8

Two agents on the SAME pane (w7:p8) died mid-turn with `WebSocket error`
(pi-footer at $0.13, then spawn-registry at $0.65). No other pane has hit it.
Either the pane's pi session has a bad connection or the pane itself is
cursed - worth watching whether a third strike lands on p8 specifically.
Recovery used: orch reset + redispatch with "check git status for partial
edits and build on them".

## 2026-08-27 (~23:20) — pi-bridge lock interception leaks the lock; fleet-wide stall

The command lock was held 10+ minutes by pid 27915 = the pi AGENT process
itself (holder herdr~w7~ht5d1vh2bl, note "bun test test/routing-hardening...").
The bridge's acquire->release wrap around the intercepted tool call never
released after the child ended, and since the pi process stays alive, the
liveness check keeps the stale lock valid - so five other agents queued
behind it indefinitely and the holder's own turn wedged (frozen cost/ctx,
spinner alive). `orch lock release --force` + `orch abort <holder>` recovers.
Note: the suite's failing test "pi-bridge command-lock interception > wraps a
matching locked command in acquire→release around the tool call" is exactly
this path. Fix the bridge release (finally/timeout) and add a lock max-age
eviction so one leak cannot stall a fleet.

## 2026-08-27 (~23:30) — registry wipe cascade: store nuked, control verbs dead, names survive only daemon-side

Sequence: a worker ran dev-tree code (STORE_SCHEMA 6) against the real
~/.orch, stamping the live db 6; the installed CLI (schema 5) then reaped and
recreated it EMPTY per the pre-publish rule - losing the spawned registry,
renames, ownership. Fallout: `orch reset/rename <name>` resolves the name but
dies "malformed identity key: w7:pD" (no registry row to map pane->key);
bare pane ids are rejected outright; dispatch still works because it routes
via daemon presence. Lessons: (1) workers must NEVER run dev orch against the
real ORCH_DIR - tests must always set a temp ORCH_DIR; (2) control verbs
should fall back to presence-derived identity when the registry row is
missing; (3) J1's bare minted id removes the 3-segment key failure class
entirely; (4) orchd should hold its store open (a persistent handle would
have made the old rows recoverable from /proc).

## orch reload: name→key mapping stale + rebuild noise (2026-08-27, footer reload pass)
- `orch reload lease-hardening` failed with `malformed identity key: expected 3 segments, got 1: "w7:pJ"` while `orch status` maps that name to `w7:pW`; reload by pane id worked. Stale name→key row surviving the store wipe.
- Every `orch reload` prints `FileNotFound opening root directory "...node_modules/@bryance/orch/extensions/pi"` — reload tries to rebuild the extension bundle from source under the INSTALLED root, which the npm install doesn't ship. Reload still signals and the pane picks up the existing dist bundle, but the error is noise and the rebuild attempt is aimed at the wrong root (should be the checkout, or skipped when dist is prebuilt).

## 2026-08-28 ~00:5x — status false-WORKING: finished agent never transitions, no done event, result unextractable
- `checker-1` (w7:pZ, pi, luna:high) completed all its todos (visible on screen: 3/3 done, spinner stuck at "Working...") but its state stayed `working` in `orch status` indefinitely; no `done` transition was ever published, so the `orch events` push watch never fired for it.
- `orch result w7:pZ` returned "No result available (no result.json and no adapter-extractable session text)" despite ~$0.15 of completed work and a 32%-full session.
- Same family as the earlier status false-blocked entry: the agent-state seam misses a terminal transition; downstream truth channels (events, result) all go blind with it. Orchestrators cannot see a stopped pane without a human eyeballing the screen.
- Also this session: `orch reload` did NOT re-discover user extensions (`~/.pi/agent/extensions/footer.ts`) on live panes — reload swapped the bridge bundle but panes kept the stale footer until a full `orch restart`. Reload should re-run extension discovery.

## 2026-08-28 ~01:0x — orphan pane unreachable by ANY orch verb (root cause of the "checker-1 doing nothing" pane)
- w7:pN was the previous session's checker; the ~23:30 store wipe deleted its registry row while its pi process lived on. orch cannot list, target, or close a live pane with no row.
- Its herdr pane LABEL still read "checker-1" while orch's registry name "checker-1" pointed at a different pane (pZ) — the human saw one agent, orch addressed another. Environment coordinate used as displayed identity, exactly Rule 11's forbidden weld.
- `orch close w7:pN` (bare pane id) crashes in parseIdentity ("expected 3 segments") instead of pane-close cleanup, so close's "never refuses" contract is unreachable for orphans. Had to drive herdr directly (send-keys ctrl+c ctrl+c) — a rule-breaking escape hatch orch forced.
- Needed: (a) target resolution accepts bare pane ids (in flight, reload-bugs slice); (b) an adoption/reap path for a live pane with no registry row — orch must be able to re-own or kill everything visible in its plexer, or the store is a single point of identity loss for living processes.

## 2026-08-28 — schema-mismatch wipe destroys live agents' identity (root bug behind the registry-wipe cascade)
- On a store stamp it does not recognize, orch reaps and RECREATES the db silently — even while live presence dirs / running agent processes exist. That turned one version skew into the loss of every living agent's identity (the 12-pane orphan set, the unkillable "checker-1" ghost pane).
- Required contract: version-mismatch handling must ERROR (name the skew, name the fix: rebuild/reinstall) whenever any live presence exists; a silent wipe-and-recreate is only ever acceptable on a store with zero living agents. Losing a holder costs a driver, never a life (Rule 11).
- RULED 2026-08-28 (Bryan): recorded as TASKS/02-scope.md H10 — a slave never reaps or recreates the store; destructive store maintenance is reserved for the user or the pack's orch; schema-mismatch recreate refused for everyone while live presence exists.

## 2026-08-28 ~01:2x — `orch tile` spawned a pane WITHOUT the user's inherited pi extensions (no footer)
- `orch tile review --name checker` produced pane w7:p0 running pi with the stock footer ("MODEL: ... THINKING LEVEL: high"), while `orch spawn`/`orch restart` panes launch `pi --no-extensions -e pi-bridge.js -e herdr-agent-state.ts -e footer.ts` and show the personal footer.
- Code reading: cmdTile (src/commands/spawn.ts:788) does pass `workers: workerPolicyFrom(config)` into tileAgentIntoGroup → spawnOneIntoTab, so the miss is somewhere below that seam (adapter extension composition on the tile path, or tile-by-label resolution using a different config). Evidence pane was closed before its argv could be captured; repro: `orch tile <tab> --name x`, then compare the pane's pi argv to a spawned pane's.
- Same session, `orch restart` DID compose extensions correctly but silently re-pinned the agents to luna:medium instead of the settings default luna:high (three panes downgraded until manually re-pinned) — restart's model re-pin reads a different default than spawn/reset.
- RULED 2026-08-28 (Bryan): rebuilding/publishing installed artifacts is USER-ONLY. No orch verb (reload/reset/restart), no slave, no orchestrator session may build or write bundles into the installed package. Root cause of the 00:19 broken-bundle publish: src/commands/lifecycle.ts:256 auto-runs buildExtensionBundle during reload. Fix dispatched: lifecycle verbs signal re-import only, never build.

## 2026-08-28 ~01:4x — watch/notify blind spots let an asking agent sit 7+ minutes unseen
- `orch events` default scope filters on spawnedBy == the watching session's key, so a session driving REUSED panes (spawned by a dead prior session) receives ZERO events for them — every done/asking transition this session was invisible to the armed watch. C6 says events scope by LEASE; the stream must cover agents the session drives (holds leases on), not only ones it spawned.
- Notify sinks reject `asking`: --on accepts idle,working,blocked,done,error,aborted,exited,unknown — the asking state exists in status/events but not in the sink vocabulary, so no sink (herdr/desktop) can ever announce a question. One state vocabulary everywhere.

## 2026-08-28 ~02:0x — `orch lock run` does not actually serialize: workers ran their test files concurrently
- Multiple slaves invoked `orch lock run -- bun test <files>` at the same time and all ran simultaneously; the lock provides no machine-wide mutual exclusion in the installed build. The whole point of the lock (a 9-pane pack must not stampede the machine with parallel bun test runs) is not delivered.
- RULED (Bryan): make it a true feature — one machine-wide lock in $ORCH_DIR held by (pid, start_token), waiters block/poll until free, dead holders evicted by process-instance proof, the bridge's locked-command interception routes through the same lock, and a concurrency test proves two runs never overlap.

## 2026-08-28 ~02:3x — `orch spawn --tab <label>` surfaced a pane in the user's current tab
- `orch spawn 1 --name build-audit --tab review` — orch status/tabs report the pane in tab w7:tB (review), yet the user saw it appear in his own tab 1. Either the split was first made against the focused pane and then reseated, or focus was stolen; both violate "never steals focus" and "--tab fills the labelled tab".
- Same command earlier (`spawn 2`) was correctly REFUSED by the pack cap (A12/A13 working as designed).

## Open orch bugs from this session to fix TDD (queue, in order)
1. events stream scope: filter by LEASE (agents this session drives), not spawnedBy — C6 (reused panes were invisible to the watch).
2. terminal-state loss: an agent that finishes can stay `working` forever with no done event and no extractable result (checker-1/pZ).
3. `orch close` reported success while the pane process lived on (pZ) — close must verify the pane is gone.
4. `orch tile` spawns without the inherited user extensions (footer missing) while spawn/restart include them.
5. `orch restart` re-pins the model to luna:medium instead of the settings default.
6. spawn --tab placement/focus (above).

- 2026-08-28 ~03:0x: pane w7:pV (pi) died mid-slice with "WebSocket error" (harness-side); redispatched once. Third occurrence of this family this week.
- 2026-08-28 ~03:4x: pane w7:p14 (web-layout, G8) died mid-slice with "WebSocket error" — fourth of this family; not redispatched (session ending). Partial G8 work may exist under packages/web — check git status before redispatch.
- 2026-08-28 ~03:5x: pane w7:pQ (adapter-no-build + J9) died mid-slice with "WebSocket error" — fifth this session, three within ~20 min: the harness-side socket is failing systemically now, not per-pane. Not redispatched (session ending); check git status for partial adapter/J9 work before redispatch.
  (correction: w7:p14 recovered from the WebSocket error and finished G8 — the socket error is transient, the pane kept working.)
