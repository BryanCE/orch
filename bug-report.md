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
