# Control: dispatcher, channels, outbox

## Actions

| Action (`ControlAction`) | Type location | Delivery function |
|---|---|---|
| `run` | `packages/orch/src/types/control.ts:4` | `deliverPrompt` (`dispatch.ts:96`) |
| `steer` | `packages/orch/src/types/control.ts:5` | `deliverPrompt` (`dispatch.ts:96`) |
| `answer` | `packages/orch/src/types/control.ts:6` | `deliverAnswer` (`dispatch.ts:137`) |
| `model` | `packages/orch/src/types/control.ts:7` | `deliverModel` (`dispatch.ts:155`) |
| `lifecycle` | `packages/orch/src/types/control.ts:8` | `deliverLifecycle` (`dispatch.ts:202`) |

## Channel choice

- `run`: `deliverPrompt` maps it to `dispatch` (`dispatch.ts:99`); if `adapter.bridge?.takes.includes(bridgeAction)` then it verifies liveness and pushes via `pushToBridge`, returning ack `expected` (`dispatch.ts:100-103`). Otherwise it calls `adapter.steer`; if that returns a command, it executes the command and returns ack `none` (`dispatch.ts:105-109`). Otherwise `typePrompt` submits to backend input. Missing route/input yields the applicable boundary answer; a successful submit returns ack `none`, unless the adapter echoes prompts, in which case it expects echo ack (`dispatch.ts:114-135`).
- `steer`: same order as `run`; mapping is `steer` (`dispatch.ts:99`), with `refuseSteerWhileAsking` first (`dispatch.ts:97`).
- `answer`: bridge path is chosen when `adapter.bridge?.takes.includes("answer") === true`; otherwise if the adapter does not echo prompts it returns a no-environment-role answer (`dispatch.ts:138-141`). It verifies liveness and requires a pending question before delivery (`dispatch.ts:142-145`). With no bridge it uses `typePrompt` (`dispatch.ts:145`); with bridge it pushes the answer plus `questionId`, ack `expected` (`dispatch.ts:146`).
- `model`: rejects adapters without `takesModel`; admits the requested model, checks liveness, calls `adapter.modelControl?.setModel`, and executes the resulting command if present (`dispatch.ts:155-165`). Then, if `adapter.bridge?.takes.includes("model")`, pushes a model message (`dispatch.ts:166-168`). It waits for control outcome and verifies the applied model (`dispatch.ts:169-179`).
- `lifecycle`: rejects null lifecycle control, resolves a live backend handle, requires backend `agentInput`, gets `adapter.lifecycleControl.lifecycleCmd(verb)`, then submits its text (`dispatch.ts:202-215`). No bridge channel is selected.

## Bridge links

`BridgeLink` has `push(delivery: BridgeDelivery): void` and `close(): void` (`packages/orch/src/control/bridge-links.ts:7-11`). The daemon-only `Map<string, BridgeLink>` is the canonical target-to-link registry (`:24-25`). `attachBridge` normalizes the key and replaces any prior link (`:27-30`); `detachBridge` normalizes and removes only if the closing link is still current (`:32-36`). `pushToBridge` looks up the agent id and throws `BridgeDetachedError` if absent; otherwise calls `link.push(delivery)` (`:48-52`). `BridgeDetachedError` denotes an absent link (`:13-18`). Bridge delivery carries `{id, message}`; the id is the outbox row id (`packages/orch/src/shared/bridge-message.ts:49-52`). The bridge's `ack` RPC reads the row, marks it delivered, calls `acknowledgeDelivery(id)`, and wakes the daemon (`packages/orch/src/daemon/server/handlers/table.ts:217-222`).

## Outbox

`outbox` columns: `id` primary key, `target`, serialized `payload`, `state`, `attempts`, `created_at`, `next_attempt_at` (`packages/orch/src/db/schema.ts:27-35`). The insertion writer `insertOutboxMessage` initializes pending state and timestamps (`packages/orch/src/store/outbox-rows.ts:44-55`); callers are text writes (`packages/orch/src/daemon/server/handlers/write.ts:255-260`), initial lifecycle prompt (`handlers/lifecycle.ts:113`), and inter-agent mail (`daemon/server/mail.ts:47`).

Readers: due open rows (`outbox-rows.ts:57-64`), open rows by target (`:66-73`), unique open targets (`:75-80`), row by id (`:83-86`), state (`:88-93`), pending/unsent (`:96-100`), and open status (`:102-105`). `attemptDelivery` checks open status, calls the delivery dependency, then updates the row (`packages/orch/src/daemon/server/outbox.ts:36-42`, `:47-93`). `deliverOutboxMessage` handles the newly queued row (`:101-105`); `redeliverOpenRows` handles all open rows for a target (`:108-112`); `drainOutbox` processes due messages (`:118-136`).

Retry delay is exponential from 500ms, capped at 30,000ms (`outbox.ts:23-32`); failures retry until `deps.maxAttempts`, then become undeliverable (`:73-79`). An ack-expected queued write becomes `awaiting`; redelivery happens when its retry time is due and no ack has settled it (`:82-89`). The drain runs on its configured daemon interval (`packages/orch/src/daemon/server/orchd.ts:246-254`); bridge attachment triggers target redelivery (`:153-157`). A bridge ack marks the row delivered (`handlers/table.ts:217-222`). Gone targets and exhausted attempts become undeliverable (`outbox.ts:68-79`); ending an agent closes all its open rows (`packages/orch/src/store/outbox-rows.ts:129-132`, called at `packages/orch/src/store/agent-rows.ts:110` and `packages/orch/src/presence/store.ts:89,169`). Settled rows are removed by retention (`outbox-rows.ts:141-145`).

## Around the dispatcher

| Location | Function | Effect / reason |
|---|---|---|
| `packages/orch/src/daemon/server/handlers/drive.ts:29-39` | `abortHere` | Sends Escape twice with backend `agentInput.sendKeys`; abort is a kill verb and the comment at `drive.ts:3-5` states kill verbs are not lease-gated. |
| `packages/orch/src/daemon/server/handlers/relaunch.ts:66-67` | relaunch handler | Sends Escape to cancel a turn before relaunch. |
| `packages/orch/src/daemon/server/handlers/pane.ts:89-91` | pane action handler | Forwards explicit pane `keys` or focus operations through the input role. |
| `packages/orch/src/daemon/server/handlers/write.ts:119-128` | `deliverWrite` | Raw session/no adapter delivery directly submits text to backend input when there is no composed adapter; event-stream routing handles cases without a bridge and input. |
| `packages/orch/src/backends/orca/index.ts:178,289` | launch/setup methods | Submits shell launch commands to an Orca terminal, not agent control. |

All `pushToBridge` call sites are inside `deliverControl`'s implementation in `packages/orch/src/control/dispatch.ts:102,146,167`; no bridge push outside that dispatcher was found. `typePrompt` is also internal to `dispatch.ts` (`:110-111,145`).

## Far agents

The originating host calls `driveOnHost`, which uses the peer link's `peer-drive` RPC (`packages/orch/src/daemon/server/handlers/host.ts:87`). The RPC parameters are a discriminated union (`packages/orch/src/daemon/client/protocol.ts:428-441`); the receiving `peerDrive` validates the origin, places the agent locally, and switches on action (`packages/orch/src/daemon/server/handlers/drive.ts:78-104`). Carried actions: `dispatch`, `steer`, `answer`, `model`, `lifecycle`, `clear`, `rename`, `abort`, `close`, `reap`, `pane`, and `wait` (`protocol.ts:430-441`; result variants `:445-458`). For dispatch/steer it calls `confirmTextWrite`; answer calls `answerHere`; model calls `applyModel`; lifecycle calls `lifecycleHere`; clear calls `clearHere`; rename calls `renameHere`; abort/close call local handlers; pane and wait call their respective local handlers (`drive.ts:87-103`).

## Control outcomes

`ControlAck` is exactly `"expected" | "echo" | "none"` (`packages/orch/src/types/control.ts:23`). The `control-outcome` handler builds a `ControlOutcomeReport`, inserts the durable record, appends outcome history, and settles the in-memory waiter (`packages/orch/src/daemon/server/handlers/table.ts:224-243`). The control outcome record is inserted in the `control_outcomes` table (`packages/orch/src/store/control-outcome-rows.ts:9-21`); append and waiter settlement are at `table.ts:240-242`. Model delivery waits via `awaitControlOutcome(id, timeoutMs)` (`packages/orch/src/control/dispatch.ts:169`); pending waiters are held by id in memory, timeout rejects, and report settles the matching waiter (`packages/orch/src/control/outcome.ts:10-30`).

## Does not fit

nothing
