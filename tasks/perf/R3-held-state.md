# R3. Recon: orchd's held in-memory state and every mutation that patches it

Read only. Edit nothing. Run nothing but `grep`, `cat`, `sed -n`. Repo: /home/bryan/orch, package `packages/orch/`.

Goal: orchd holds the fleet (`src/store/agent-view.ts`) and presence (`src/presence/store.ts`) in memory and patches them on write instead of rebuilding. I want to add two more held values on top of the same mechanism: (a) a held `FleetCapacity`, and (b) a held, pre-serialised `status` reply string. To write those tasks I need the exact shape of the existing hold-and-patch mechanism and every mutation point.

Read: `src/store/agent-view.ts`, `src/presence/store.ts`, `src/policy/capacity.ts`, `docs/orchd-owns-the-store.md`, `learnings/2026-09-17-in-memory-state-with-durable-copy.md`, and `src/store/write-queue.ts` (or wherever `queueWrite` lives; grep for `export function queueWrite`).

Report, written to `/home/bryan/orch/tasks/perf/recon/R3-held-state.md`, with exactly these sections:

## The fleet hold
How `agent-view.ts` holds the fleet: the module-level or per-dir container, its type, how it loads (function, when), and `refreshAgent` verbatim with its signature. Every caller of `refreshAgent` in `src/` (file:line, one line on what mutation it follows). Every other exported function of `agent-view.ts` that mutates the held map (name, signature, who calls it).

## The presence hold
Same for `presence/store.ts`: the container, its type, the load, every function that patches it (`recordAgentStatus`, `reapDeadAgentRecords`, the liveness tick, anything else) with signatures, and every caller (file:line). Where `alive` is decided and how often (the tick's interval setting key).

## Capacity inputs, mapped to mutations
`computeFleetCapacity(views, presence, settings, options)` reads specific fields. For each input fact, which held-map patch changes it:
- a view appearing or disappearing → which function
- a view's `rootAgentId` / space / provenance changing → which function
- presence `alive` changing → which function
- settings `fleet.max_agents_per_pack`, `max_agents_per_space`, `max_agents_total`, `spaces` changing → how orchd learns settings changed (grep `settingsWatch` in `src/daemon/server/`)
Give file:line for each.

## The write queue
Signature of `queueWrite` and the drain (`setImmediate`?). Whether a queued write can fail after the in-memory patch succeeded and what happens then. Where in the loop the drain runs relative to the reply.

## Where a per-dir singleton lives today
Every module in `src/` that holds per-`OrchDir` state at module level (grep `new Map<` at top level and `WeakMap`). Name, file:line, what it holds, how it is reset for tests (`closeAllStores`? a reset export?).

## Tests that import these modules
For `agent-view.ts`, `presence/store.ts`, `policy/capacity.ts`, the write queue module — the test files under `packages/orch/test/` that import each directly.

Do not propose a design. Report facts. When done, reply with the single line: `R3 written`.
