# Events and streams

## Event types

`packages/orch/src/types/notify.ts:39-44`

```ts
export type NotifyEvent =
  | (EventIdentity & AgentActivity & { readonly type: "transition"; readonly oldState: AgentState; readonly newState: Exclude<AgentState, "asking"> })
  | (EventIdentity & AgentActivity & { readonly type: "asking"; readonly oldState: AgentState; readonly newState: "asking"; readonly askCount: number; readonly gaveUp: boolean })
  | (EventIdentity & { readonly type: "message"; readonly newState: "message"; readonly dispatchId: string; readonly mail: { readonly id: string; readonly text: string } })
  | (EventIdentity & { readonly type: "closed"; readonly oldState: AgentState; readonly newState: "closed" })
  | (EventIdentity & { readonly type: "task"; readonly oldState: TaskState; readonly newState: TaskState; readonly task: string; readonly lastError?: string });
```

## Emitters

| Event type | `path:line` | Function |
|---|---|---|
| transition / asking | `packages/orch/src/daemon/server/status-report.ts:98-104` | `acceptStatusReport` publishes a changed status row via `transitionEventFromRow` or `askingEventFromRow`. |
| transition / asking / exited transition | `packages/orch/src/daemon/server/status-report.ts:186` | Liveness reconciliation publishes an exited transition; status-event helpers define the event shapes at `packages/orch/src/daemon/server/status-events.ts:90-125`. |
| transition | `packages/orch/src/daemon/server/handlers/command-lock.ts:47-52` | `moveAgent` records and publishes waiting/working state with a reason. |
| closed | `packages/orch/src/daemon/server/handlers/lifecycle.ts:178-191` | Close handler ends the agent, constructs and publishes `closed`. |
| message | `packages/orch/src/daemon/server/handlers/write.ts:35-65` | `sessionMessageEvent` constructs mail event; `deliverToSessionStream` publishes it. |
| transition | `packages/orch/src/daemon/server/orchd.ts:226` | `publishPresenceEvent` publishes presence/liveness events. |
| task | `packages/orch/src/daemon/server/work-loop.ts:180-203` | `taskEvent` builds task lifecycle events; work loop calls its event callback at `packages/orch/src/daemon/server/work-loop.ts:341`. |
| any relayed event | `packages/orch/src/daemon/server/host-events.ts:40-53` | `applyHostEvent` applies the far-host state and republishes the event here. |
| synthetic transition / asking | `packages/orch/src/daemon/server/handlers/machine.ts:30-42` | `notifyTest` delivers directly to configured sinks; it does not publish to subscribers or durable log. |
| transitions and asking generated for RPC notification | `packages/orch/src/daemon/server/handlers/table.ts:103-112` | `notify` composes these for pane HUD notification; it does not call the event publisher. |

## Path of one event

1. Server producers call `publishFromOrchd`; `emitAndNotify` drops repeat transitions and `deliverEvent` stamps the per-agent `seq`, fills a missing display name/space, emits to the socket bus and sends to configured notifier sinks: `packages/orch/src/daemon/server/events.ts:63-100`.
2. The replay buffer is connected to the server event bus and appends the stamped event with timestamp: `packages/orch/src/daemon/server/rpc.ts:298`, `packages/orch/src/daemon/server/rpc.ts:460`, `packages/orch/src/daemon/server/replay.ts:30-36`, `packages/orch/src/store/event-rows.ts:33-45`. The events table stores `seq`, `ts`, and JSON `payload`; reads are ordered by sequence: `packages/orch/src/store/event-rows.ts:52-69`.
3. Notifier sinks receive events through `notify`; configured entries are state-filtered and queued for delivery: `packages/orch/src/notify/router.ts:94-113`. Sink dispatch and formatting are in `packages/orch/src/notify/router.ts:50-67` and `packages/orch/src/notify/format.ts:77-102`.
4. `EventBus.emit` fans the event to registered handlers: `packages/orch/src/daemon/server/event-bus.ts:10-27`. Each subscriber socket is sent an event by the server RPC event emitter: `packages/orch/src/daemon/server/rpc.ts:186-205`, `packages/orch/src/daemon/server/rpc.ts:210-213`.
5. The client `subscribeEvents` transport handles replay, gaps, reconnect, and live events: `packages/orch/src/daemon/client/rpc.ts:160-255`. `orch monitor` and `orch events` connect through `startEventsTransport`; the CLI filters/renders events and does not perform sink delivery: `packages/orch/src/commands/events.ts:108-140`, `packages/orch/src/commands/events.ts:370-410`.
6. The web server subscribes to the daemon stream and translates event lines to SSE `id`/`data` frames: `packages/web/src/server/daemon.ts:171-234`. GET `/api/events` serves it at `packages/web/src/server/daemon.ts:236-251`, routed in `packages/web/src/routes/api/events.ts:5-10`.
7. Browser `useDaemonEvents` opens `EventSource("/api/events")` and updates event state: `packages/web/src/lib/daemon-events.ts:96-133`; `/events` renders the list and replay-gap notice at `packages/web/src/routes/events.tsx:8-36` (also space activity at `packages/web/src/routes/spaces/$slug.tsx:41-56,112-127`).

## Replay

`REPLAY_WINDOW` is the constant `1_000`, not a settings value: `packages/orch/src/daemon/server/replay.ts:26-28`. Local `since(seq)` returns up to that many stored events, `gap`, and `oldestSeq`; `gap` is true only when the requested cursor precedes the retained log: `packages/orch/src/daemon/server/replay.ts:38-48`. A linked-host `resume(place, origin)` returns `null` if log identity differs, cursor is past newest, required history is pruned, or more than `REPLAY_WINDOW` events are missed; otherwise it returns the missed events: `packages/orch/src/daemon/server/replay.ts:51-62`. The RPC sends `snapshot-required` on null: `packages/orch/src/daemon/server/rpc.ts:186-194`.

## Across hosts

A host link sends `subscribe-events` with `{ since, log }` when it has a cursor: `packages/orch/src/hosts/link.ts:413-426`; the params include optional `since`, `log`, and CLI `stream`: `packages/orch/src/daemon/client/protocol.ts:593-599`. The receiving RPC uses `ReplayBuffer.resume` with the peer host id, restricting replay to its originated agents; invalid continuation returns `snapshot-required`: `packages/orch/src/daemon/server/rpc.ts:186-197`. `eventLogId` identifies the local store plus `bootCodeHash`; resume validates that identity and replays rows: `packages/orch/src/daemon/server/replay.ts:10-16,51-62`. The link reloads peer status when no cursor can resume, holds events arriving during reload, then consumes newer sequenced events and persists its cursor: `packages/orch/src/hosts/link.ts:413-464`; cursor storage/read is `packages/orch/src/store/host-rows.ts:53-76`.

Relayed events pass `publishRelayed` to `deliverEvent`, which assigns this daemon's event sequence and fills a missing label, then emits/stores/notifies: `packages/orch/src/daemon/server/host-events.ts:40-53`, `packages/orch/src/daemon/server/events.ts:78-90,102-105`. The original event fields (including its host identity and optional original `seq`) otherwise remain; `deliverEvent` spreads the event and overrides `seq`. Far status changes synthesized during reload are built from the local agent view and peer status: `packages/orch/src/daemon/server/host-events.ts:66-89`.

## Subscriptions

| Stream | RPC/method and params | Messages | Back-pressure |
|---|---|---|---|
| Events | `subscribe-events({ since?, log?, stream? })`, schema `packages/orch/src/daemon/client/protocol.ts:593-599`; handled in `packages/orch/src/daemon/server/rpc.ts:186-205` | `RpcLine` event `{ kind: "event", seq?, event }`, gap `{ kind: "gap", oldestSeq }`, or snapshot-required; `packages/orch/src/daemon/client/wire.ts:50-62`. | Per-subscriber event queue is bounded by `daemon.subscriber_queue_bytes`; the setting help says a subscriber over the limit is disconnected and can resume from the last event it took: `packages/orch/src/daemon/server/orchd.ts:151`, `packages/orch/src/settings/registry.ts:264`. Replay/live subscription flow: `packages/orch/src/daemon/server/rpc.ts:186-205`. |
| Screen | Screen attach and screen control RPCs use screen handlers; `screen-input({ key, data })`, `screen-resize({ key, cols, rows })`, and `screen-detach({ key })` are declared at `packages/orch/src/daemon/client/protocol.ts:764-768`. | Stream messages are `{ kind: "screen", key, chunk }`; `ScreenChunk` is `snapshot(data)`, `data(data)`, or `end(reason)`: `packages/orch/src/daemon/client/wire.ts:58-62`, `packages/orch/src/types/screen.ts:7-21`. | `ScreenConnection` queues bytes up to `attach.queue_bytes`; on overflow it drops queued output, marks screens stale, ignores data until a fresh snapshot, and does not block the agent: `packages/orch/src/daemon/server/screens.ts:1-4,25-69,84-107`; setting default/schema/help are `packages/orch/src/settings/schema.ts:115,329`, `packages/orch/src/settings/registry.ts:269`. |
| Other | `subscribe-events` is the event subscription RPC in the daemon protocol; event stream and screen stream are distinct wire variants `packages/orch/src/daemon/client/wire.ts:50-62`. | — | — |

## Web

The web UI receives events over browser `EventSource` from `GET /api/events`; it does not connect directly to orchd: `packages/web/src/lib/daemon-events.ts:96-104`, `packages/web/src/routes/api/events.ts:5-10`. `eventsResponse` bridges daemon newline-framed `subscribe-events` over its socket to SSE, reconnects from the latest event id, and forwards replay gaps: `packages/web/src/server/daemon.ts:171-234,236-251`. The event feed is consumed by `packages/web/src/lib/daemon-events.ts:96-133`, displayed at `packages/web/src/routes/events.tsx:8-36`, and filtered for space activity at `packages/web/src/routes/spaces/$slug.tsx:41-56,112-127`.

## Does not fit

`notifyTest` and the pane-HUD `notify` handler construct event-shaped values but do not publish them through the event bus, durable log, or subscriber stream (`packages/orch/src/daemon/server/handlers/machine.ts:30-42`; `packages/orch/src/daemon/server/handlers/table.ts:99-113`).
