# Orchestrator state — 2026-08-27 ~23:40 (compaction/restart insurance)

## Where we are
Stopping point reached: the pi fleet is DOWN on the OpenAI team-plan usage limit
(every worker errors "usage limit has been reached" until the window resets).
The store-wipe incident + recovery is logged in bug-report.md (~23:30 entry).

## Checkpoint sequence from here (IN ORDER)
1. USER runs, in the orch bash prompt:
   `bun check > current-errors.md 2>&1`  then  `bun run test > test-results.md 2>&1`
2. Orchestrator READS both files (ground truth), fixes/dispatches every item.
3. When gates are acceptable: `bun run build:dev` (rebuilds + reinstalls orch,
   schema 6 aligned - ends the 5/6 stamp ping-pong that wiped the store),
   then `orch daemon reload` (or stop/start), which DEAFENS all bridges.
4. `orch close --all` the old panes, respawn a fresh fleet (gets: worker-park
   no-relay contract, pi footer, lock turn-end release + max-age eviction,
   spawn-side agents registration).
5. Resume the wave loop below.

## Landed today (verified by checker or diff unless noted)
Schema 6 (5NF DDL, FK ON, STRICT, triggers) + inventory tests; store row modules
agent-rows/interval-rows/lease-rows/task-rows; hello registers sessions as agents
rows (session_identities DELETED); QUEUE REWIRE onto tasks/task_attempts (old
queue table + queue-rows deleted, Cq8 fixed, state derived); spawn registers
agents+satellites+lease at spawn; lease verbs detach/adopt/reap (H3, I3);
adoption announcements at hello (D8); events scoped by lease (C6); close ungated
+ strict pid+start_token kill (round 2 partially - see wave4-review item 3);
retention windows H4-H9 + J8; presence retention clock (recorded instants);
status truth L3/L4 + M9 cross-workspace reads + F6 unleased display; worker-park
L6; caps->capabilities (E6) incl web wire; herdr 0.8.2 CLI fixes (L9-L11);
spawn policy caps A9/A12/A13; pi-footer left-aligned model+thinking; ack-reader
(L7); plexer version ranges E17-E19 (landed? verify); G9 web orphan bucket +
daemon lease facts; port-seam design contract TASKS/07-port-seam.md (approved);
scope-hygiene status pass (partial - worker died mid-run?).
Orchestrator self-fixes: spawn.ts half-commit bugs (growFleetIntoGroup,
placeAgent, TileFirstSplit import); check-bridge BACKEND_KIND_MAP_ALLOWLIST;
config.test/work-loop retired retention keys; lifecycle `process` shadowing;
spawn-policy fixture; openStore reopen idempotence; cmd-lock max-age eviction +
tools.ts turn-end release. Settings: default model luna:high; locked_commands
["bun test","bun run test"].

## Died to the quota mid-task (redispatch after respawn, check git status for partials)
- close-strict (wave4-review section 3: strict kill contract + --force removal +
  owner-scoping test rewrite) - my ruling: close NEVER refuses; no-proof targets
  get pane-close cleanup, never bare-pid SIGTERM.
- lease-hardening (wave4-review items 1.2/1.3/2-caveat/4: live-holder adoption
  refusal test, lease-layer I3 tests, spawn-refusal zero-mutation test,
  docs/reference/store.md rewrite).
- plexer-versions (E17/E18/E19) - may have partially landed, verify.
- scope-hygiene (TASKS/02-scope.md status updates) - verify/redo.
- store-connection fix dispatch (I DID IT MYSELF - verify only).
- retention-fixes dispatch: test/retention.test.ts fixture until<=since CHECK
  violations + retention.ts ended-agent double-count (STILL TODO).
- herdr-tests dispatch: test/herdr-notify-hardening.test.ts stale pane-run argv
  + HERDR_KINDS[""] blank-adapter crash (STILL TODO).
- bridge-lock dispatch (I DID THE CORE MYSELF; still TODO: don't swallow
  settings-load failures in lockedCommandPatterns; make
  test/cmd-lock-bridge.test.ts green).

## Key reports (read before dispatching)
TASKS/recon/failures-2254.md (27-fail triage; store-connection rows now fixed by
me), wave1-4 reviews, consumer-map.md, key-change-map.md, 2462a62-audit.md,
build-checklist.md, TASKS/07-port-seam.md (9 ordered migration slices - the
next big wave after gates are green).

## Remaining big waves (order)
1. Gate burn-down to green.
2. Port seam slices 1-9 per TASKS/07-port-seam.md (slice 1 = error contract /
   herdrBestEffort deletion).
3. J1/J2/J3 key change per TASKS/recon/key-change-map.md (bare minted ids).
4. Enforcement: I1/I2 check-bridge rules, I4/I8 doctor; H3 reap tree already in.
5. Web G8 (needs design), G10/G11; M-section daemon singletons (M6/M7 DESIGN).
6. Open ruling for Bryan: does docs/reference/identity-registration.md move into
   TASKS/ (scope "Open rulings" #1)? D10 lock-delay design; E9 workspace port surface.

## Fleet doctrine (standing)
Luna:high first for implementation; sol only after a luna failure (user OK'd
judgment calls for genuinely complex slices) - checker runs sol:medium. TDD:
tests first, workers run ONLY their own test files via
`orch lock run -- bun test <files>`; full gates are USER-run on demand
(currently via bash: `bun check > current-errors.md 2>&1`). Batch
reset+rename+dispatch per wave; checker reviews every wave to TASKS/recon/;
every dispatch ends "END YOUR TURN - never message another agent".
Known orch bugs live in bug-report.md (status false-blocked; WebSocket deaths
2x on pane w7:p8; registry-wipe cascade; lock leak - fixed in tree).
