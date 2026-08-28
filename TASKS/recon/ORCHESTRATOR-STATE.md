# Orchestrator state — 2026-08-28 ~03:30 (session end)

## Where we are
Gate burn-down is one user gate run from rebuild. Last user gates (00:53): check-bridge OK,
4 tc, 24 lint, 2 test-fail pairs — every item has since been fixed in tree (gate-sweep,
schema hotfix, launch/complexity slices). NOTHING has been rebuilt or published: the installed
package still carries last night's hand-built seat bundle (`Effect.runForkWith` crash in every
pi session) and a `bun` shebang on dist/bin/orch.js. Only the user publishes (CLAUDE.md Rule 12).

## Checkpoint sequence (IN ORDER)
1. USER runs: `bun check > current-errors.md 2>&1` then `bun run test > test-results.md 2>&1`
2. Orchestrator READS both files; dispatch every item to the pack (never fix by hand).
3. Green → USER runs `bun run build:dev` (now cleans stale dist/tarballs/global/symlinks first,
   node shebang, live store protected — see TASKS/recon/build-audit.md), then `orch daemon
   reload` — which DEAFENS every live bridge → `orch close --all`, respawn the pack.
4. Resume the wave loop below.

## Live pack at session end (w7; all luna:high; reuse via reset, never spawn while idle exists)
tabs: fixes (pQ adapter-no-build+J9 — DIED on WebSocket error, redispatch first, pR close-verifies [orch bug #3], pS lock-serialize
[user ruling: true machine-wide lock]), followup (pV terminal-state [orch bug #2, redispatched
once after WebSocket death], pW port-seam-4, pX launch-parity [orch bugs #4/#5], pY
tasks-unrunnable I8), review (p12 daemon-singleton M6, p14 web-layout G8).
Pack cap is 10 (A12) — spawn refuses past it. Events watch: arm with
`orch events --status done,error,blocked,asking --any-agent` (C6 lease scope landed in tree but
the INSTALLED CLI still filters by spawnedBy until rebuild).

## Landed this session (all TDD, scoped test runs green; checker wave5 review in TASKS/recon/)
H10 store guard; schema one-shape + hotfix; reopen verified; retention orphan fix + dedupe;
I6/I7 queue tests; port-seam slices 1-3 (herdrBestEffort deleted, channel/capture roles, pane
roles, Backend booleans gone); herdr version seam; close kill-path contract + close fixes;
lease hardening + I3 per command; F4 spawn naming; F7 target resolution (names/pane ids);
no-publish lifecycle; C6 lease-scoped events; asking as first-class notify state; monitor
tests + history-leak fix; G10 history projection; G11 orch-only names; I1 check-bridge rule;
build:dev audit + fixes; fallow dead-code cleanup (versions.ts aliases, 3 web files);
complexity decomposition: configValues, runCommand, status.ts, cmdResult, parseSession,
derivePresenceTransition, cmdQueue, buildEntities, cmdSetup; seat tc/lint clean +
test/seat-index; bridge-lock settings surface; design reconciliation
(TASKS/recon/design-rulings.md — all DESIGN tags resolved; D10 dropped, G8 BUILD).

## Remaining waves (order) — all specs live in TASKS/, dispatch from the rows
1. Gate green + rebuild (above).
2. Port-seam slices 5-9 (07-port-seam.md; 4 in flight).
3. J1/J2/J3 key change (recon/key-change-map.md) — after port-seam.
4. E9 plexer homes, F5 `orch space`, I4 doctor diagnoses, M7 cross-OS executor, M8 delete
   `status --offline` (specs: recon/design-rulings.md). I2 check-bridge rule after slice 9.
5. Orch bug #6 (spawn --tab placement/focus) — bug-report.md "Open orch bugs".
6. fallow debt: 135 functions > 12 cyclomatic (fallow health), 17% duplication — one file per
   slice, characterization tests first. Baselines committed; `bun run fallow:*`.

## Standing doctrine (from the user, this session)
Never write into the installed tree (Rule 12). Never spawn while an idle pane exists; never spawn
into the user's tab. Answer `asking` within seconds. Lint rules are gate rules — every dispatch
carries the LINT block + "run fallow dupes before adding a helper". Luna:high default, no sol
unless told. TDD every slice, workers run only their own test files via `orch lock run`.
Delegate — the orchestrator never fixes code by hand. Read TASKS, follow TASKS.
