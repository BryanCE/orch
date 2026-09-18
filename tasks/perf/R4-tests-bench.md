# R4. Recon: how the daemon is tested in-process, and what the bench and the event subscribers expect

Read only. Edit nothing. Run nothing but `grep`, `cat`, `sed -n`. Repo: /home/bryan/orch, package `packages/orch/`.

Goal: I am changing the `report-status` fan-out (encode the event line once per event), holding fleet capacity in memory, and holding a pre-serialised `status` reply. I need to know how to test each in-process, what the bench measures, and what every event subscriber expects on the wire so nothing observable changes.

Report, written to `/home/bryan/orch/tasks/perf/recon/R4-tests-bench.md`, with exactly these sections:

## In-process daemon tests
How a test serves the real daemon without a process: the helper(s) under `packages/orch/test/helpers/` that build a `DaemonState` and call `rpcHandlers(state)` or start `rpc.ts`'s server on a temp dir. Name each helper, its signature, and one existing test that uses it as a model (file:line of the `test(` line). Show how a test subscribes to events (`subscribe-events`) and asserts on what arrived. Show how a test seeds N agents (`seedOrch`, `registerSpawnedAgent`, whichever).

## The bench
`packages/orch/scripts/bench-daemon.ts`: for each phase (`daemon-status`, `status`, `peer-view`, `report-status`, `pipelined`), the exact RPC method and params it sends, and for `report-status` what status patch it sends and whether every request is a state transition (so every request publishes an event) or only some. How the fan-out numbers (`expected`, `received`, p50/p99) are measured.

## Event subscribers on the wire
Every client that subscribes to orchd events and parses the `{ kind: "event", ... }` line: `src/commands/monitor.ts`, `src/commands/events.ts`, the web UI (`packages/web/`), extensions (`extensions/*/`), `src/daemon/client/*`. For each: file:line, how it parses the line (schema name), and which fields it reads. Paste the wire schema for an event line (`src/daemon/client/protocol.ts` or wherever the `kind: "event"` shape is declared).

## Who calls `status` RPC
Every caller of the `status` RPC method (`rpcCall(..., "status"` and any wrapper): file:line and what it does with `rows`. Include `packages/web/`.

## Existing perf tests
Any test under `packages/orch/test/` that asserts a cost (call count, `[O(fleet)]`, "opens no store", "no rebuild"): file:line and what it guards. `grep -rn "cost\|rebuild\|opens\|probe" packages/orch/test/*.test.ts` is a start.

Do not propose a design. Report facts. When done, reply with the single line: `R4 written`.
