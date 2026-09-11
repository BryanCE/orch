# P1-4 `dispatch-push` — `deliverControl` pushes through the bridge link

Read `SOCKET-REFACTOR/README.md` first (The design, The wire, Step 0, Cross-slice contracts).
Read `CLAUDE.md` at the repo root and `learnings/2026-07-16-harness-plexer-architecture.md`.
Paths are inside `packages/orch/`.

## You own exactly these files

- `src/control/dispatch.ts`, `src/types/control.ts`
- `test/control-dispatch.test.ts`, `test/answer-dispatch.test.ts`
- `test/presence-inbox.test.ts` — DELETE it (its transport is gone; P1-1/P1-2 own the new
  transport tests)

Touch nothing else. You code against `adapter.bridge` (P1-3, same phase — see the contract
in the README) and against `src/control/bridge-links.ts` (Step 0, in place).

## The task

`dispatch.ts` is the one module allowed to invoke a control strategy (`check-bridge.ts`
enforces it); it is also the one that pushes. Import `pushToBridge` from `./bridge-links.ts`.

`deliverPrompt`:
```ts
refuseSteerWhileAsking(target, action);
const bridgeAction = action.kind === "run" ? "dispatch" : "steer";
if (adapter.bridge?.takes.includes(bridgeAction)) {
  requireLiveAgent(target, adapter, action.kind);
  pushToBridge(target, { id: action.id, message: { action: bridgeAction, text: action.text } });
  return { outcome: "invoke", ack: "expected" };
}
// command path and keystroke path unchanged
```
`requireLiveAgent` stays as the GONE check and throws `AgentGoneError`. A live agent with
no link makes `pushToBridge` throw `BridgeDetachedError`. Do not catch either here: both
must reach the daemon's `deliverWrite` with their type intact. Today `deliverWrite` catches
every throw as `failed`, so a dead agent's write retries every 30 s forever (2026-09-11:
568 attempts per row, ten dead agents). P2-1 fixes `deliverWrite` to map `AgentGoneError`
to `gone` and everything else to `failed`; your job is to throw the typed error and never
wrap it. Remove the `adapter.inboxSteering.steer(...)` branch.

`deliverAnswer`:
```ts
if (!adapter.bridge?.takes.includes("answer")) return { outcome: "answer", reason: "no-environment-role", text: `cannot answer ${target}: adapter ${adapter.id} takes no answers` };
requireLiveAgent(target, adapter, "answer");
const questionId = loadPresence().get(target)?.status?.asking?.id;   // typed in src/types/presence.ts:45
if (questionId === undefined) return { outcome: "answer", reason: "not-asking", text: `${target} is not asking a question` };
pushToBridge(target, { id: action.id, message: { action: "answer", text: action.text, questionId } });
return { outcome: "invoke", ack: "expected" };
```
Add `"not-asking"` to the reason union in `src/types/control.ts`.

`deliverModel`: after `assertModelAllowed` and `requireLiveAgent`, run the adapter command if
it returns one (unchanged), then
`if (adapter.bridge?.takes.includes("model")) pushToBridge(target, { id, message: { action: "model", model } })`.
The `awaitControlOutcome` wait stays as it is (P2-2 changes its signature next phase).

`src/types/control.ts`: `ControlAction` `run` and `steer` get `readonly id: string`
(required; `deliverWrite` in orchd already passes the outbox id). Rewrite the two doc blocks
that say inbox / marker / `ack.jsonl`: `expected` = pushed down the bridge link, the bridge
acks when it applies it; `none` = a channel with no reader that acks.

## Tests

Rewrite, do not patch. Attach a fake link with `attachBridge(key, { push })` and assert on
the pushed `BridgeDelivery`. Delete every `appendAck` / `drainInbox` / `inbox.jsonl` /
`answer.json` read. Detach every key in `afterEach`.

- `test/control-dispatch.test.ts`: a `run` and a `steer` push `{action, text}` with the
  action id; a live agent with NO link → `deliverControl` rejects with
  `BridgeDetachedError`; a dead agent → `AgentGoneError`; an answer to an agent whose status
  has no `asking` → `{ outcome: "answer", reason: "not-asking" }`; an answer carries
  `asking.id` as `questionId`; a model push carries `{ action: "model", model }` and the
  adapter's command (if any) still runs; a `bridge: null` adapter with `steer: "keys"`
  behaviour still reaches the keystroke path and never `pushToBridge`.
- `test/answer-dispatch.test.ts`: same treatment for the answer path.

## Done means

`bun check` on your files (paste it; an error that only P1-3's rename clears is named).
`bun test test/control-dispatch.test.ts test/answer-dispatch.test.ts` green after P1-3 lands
(paste it). Report the final `ControlAction` and `ControlBoundaryOutcome` types verbatim.
