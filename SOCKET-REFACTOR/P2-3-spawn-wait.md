# P2-3 `spawn-wait` — spawn waits for the bridge to attach, not for a file

Read `SOCKET-REFACTOR/README.md` first (The design: closes #10; Cross-slice contracts). Read
`CLAUDE.md` at the repo root (Rule 11: prefer a nullable value over a sentinel). Paths are
inside `packages/orch/`.

## You own exactly these files

- `src/commands/spawn/report.ts`
- `src/commands/status.ts`, `src/types/command.ts`
- `src/presence/store.ts`

Touch nothing else. P2-1 (same phase) fills `bridgeAttached` in orchd's `fleetStatus`; you
define the field and consume it.

## The task

1. `src/types/command.ts` `StatusRow`: add
   ```ts
   /** True while the agent's bridge holds a link to orchd; null when the row was built
    *  without asking the daemon (a local `orch status`). */
   bridgeAttached: boolean | null;
   ```
   `src/commands/status.ts` `fleetStatusRows` fills `bridgeAttached: null` — it reads
   presence locally and cannot know. If a status test snapshots row keys, update it (find it
   with `grep -ln fleetStatusRows test/`; if that test file is not yours, report the exact
   line and stop — do not edit it).
2. `src/commands/spawn/report.ts`:
   - `awaitBridgeRegistration` → `awaitBridgeAttach`. Poll `rpcCall(orchDir(), "status")`
     (from `src/daemon/rpc/client.ts`) every 500 ms up to the same 60 s deadline; an agent
     is `ok` when its row has `bridgeAttached === true`. The STALLED line: `STALLED <handle>
     <name> - bridge never attached; try: orch restart <name>`.
   - `confirmAgentsCameUp`: branch on `adapter.bridge` (not `presenceRegistration`). A
     `bridge: null` adapter keeps the UNVERIFIED warning.
   - Delete the `bridgeRegistered` import.
3. `src/presence/store.ts`: delete `bridgeRegistered` (its only caller was the old wait —
   `grep -rn bridgeRegistered src test` to prove it).
4. `presenceRegistration` on the adapter port now has no reader
   (`grep -rn presenceRegistration src`). If that is true, report it for P3-3 — do not
   touch `src/types/adapter.ts`.

There is a spawn report test (`grep -ln "awaitBridgeRegistration\|confirmAgentsCameUp" test/`).
If it exists and is not in another phase-2 slice's list, it is yours: fake the `status` RPC
and cover `ok` on attach, `STALLED` on the deadline with exit code 1, and the UNVERIFIED
branch.

## Done means

`bun check` on your files (paste it; a residue only P2-1's `fleetStatus` clears is named).
The spawn report test green (paste it). Report the exact `StatusRow` field you added.
