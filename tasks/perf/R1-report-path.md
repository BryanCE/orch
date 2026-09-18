# R1. Recon: the `report-status` request path in orchd

Read only. Edit nothing. Run nothing but `grep`, `cat`, `sed -n`. Repo: /home/bryan/orch, package `packages/orch/`.

Goal: I am about to make two edits and need exact facts to write them as tasks.
(a) Stop recomputing fleet capacity on every transition event; hold it instead.
(b) In the subscriber fan-out, JSON-encode the event line once and write the same string to every socket.

Trace this chain and report on it:

1. `src/daemon/server/handlers/table.ts` `"report-status"` handler.
2. `src/daemon/server/status-report.ts` `acceptStatusReport`.
3. `src/daemon/server/events.ts` `emitAndNotify`, in particular the `capacity` block (lines ~79-90) that calls `agentViews`, `loadPresence`, `computeFleetCapacity`, `packsUsed`.
4. `src/daemon/server/rpc.ts` around line 247: the `bus.on` handler that loops `subscriptions` calling `lineResponse`.
5. `src/daemon/client/wire.ts` `lineResponse`, `encodeLine`, and the `RpcLine` type.
6. `src/daemon/server/replay.ts` `ReplayBuffer.push`.

Report, written to `/home/bryan/orch/tasks/perf/recon/R1-report-path.md`, with exactly these sections:

## Call chain
One line per hop: `file:line function(args) -> what it returns`. Every allocation of a Map, array, or object that is O(fleet) gets a `[O(fleet)]` tag on its line.

## Capacity: who reads `event.capacity`
Every reader of the `capacity` field on a `NotifyEvent`: file:line, and what it does with `packUsed` / `packCap`. Include `packages/web/` and `extensions/`. State whether any reader needs it on every event or only on some event types.

## Capacity: the exact signature and inputs
Paste the full signatures of `computeFleetCapacity`, `packsUsed`, `agentViews`, `loadPresence`. List exactly which facts capacity depends on (which fields of `AgentView`, which fields of `PresenceEntry`, which settings keys).

## Fan-out
Paste the `bus.on` handler in `rpc.ts` and `lineResponse` + `encodeLine` in `wire.ts` verbatim. State what `socket.write` is given (string or Buffer) and whether any other caller of `lineResponse` would be affected by adding an "encode once" variant.

## Types I will need
Full definitions of `NotifyEvent` (`src/types/notify.ts`), `FleetCapacity`, `BufferedEvent`, `RpcLine`.

## Tests that import these modules
For each of: `events.ts`, `status-report.ts`, `rpc.ts`, `wire.ts`, `replay.ts`, `policy/capacity.ts` — the test files under `packages/orch/test/` that import it directly (grep the import lines, not the names).

Do not propose a design. Report facts. When done, reply with the single line: `R1 written`.
