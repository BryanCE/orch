# 04-bus-and-wire

Owns: `src/daemon/event-bus.ts` (new), `src/daemon/rpc/server.ts`, `src/daemon/rpc/replay.ts`, `src/daemon/rpc/wire.ts`, `src/daemon/rpc/client.ts`, `src/types/daemon.ts`, `test/event-bus.test.ts` (new)

Codes against `design/events-union/PLAN.md` "Target shape" (`EventBus`) and `notifyEventSchema` from `src/notify/event.ts`.

Do:
1. New `src/daemon/event-bus.ts`: `createEventBus(logger: Logger): EventBus`. `on` wraps the handler so an exception is caught and logged as `logger.warn("events.handler-failed", { error: errorMessage(error) })` and never propagates; it returns an unsubscribe closure that removes exactly that wrapped handler. `emit` calls every current handler in registration order. Plain `Set` of wrapped handlers; no `node:events`.
2. `src/daemon/rpc/replay.ts`: `push(event: NotifyEvent)` and the buffered shape carries `event: NotifyEvent`; `since` unchanged.
3. `src/daemon/rpc/wire.ts`: the `event` line's schema parses `event` with `notifyEventSchema`, so `RpcLine`'s event member is `{ kind: "event"; seq?: number; event: NotifyEvent }`. A line whose event fails the schema is dropped the way a malformed line is today (say in your report which path that is).
4. `src/daemon/rpc/server.ts`: `startRpcServer` creates one `EventBus` (logger from the same place the server logs today; if it has no logger, take one through its options and report the caller under CALLERS). The `Set<Socket>` fan-out becomes one `bus.on` subscription registered at start: push to the replay buffer, then `lineResponse` to every subscribed socket. `RpcServer.emit(event: NotifyEvent)` delegates to `bus.emit`. `subscriptions` stays the set of subscribed sockets.
5. `src/types/daemon.ts`: `RpcServer.emit` and every `onEvent` callback take `NotifyEvent`; `RpcLine` as in step 3.
6. `src/daemon/rpc/client.ts`, `subscribeEvents`: `onEvent: (event: NotifyEvent, seq: number) => void`, and the call is wrapped: `try { onEvent(line.event, line.seq); } catch (error) { decisionLogger(orchDir, null).warn("events.handler-failed", { error: errorMessage(error) }); }`.
7. `test/event-bus.test.ts`: a throwing handler does not stop a later handler from receiving the same event and is logged once; unsubscribe removes only its own handler; emit with no handlers is a no-op.

Check: `bun check`. Tests: `test/event-bus.test.ts`, `test/bridge-client.test.ts`, `test/orchd-rpc-subscribe.test.ts`.
