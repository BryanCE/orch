# P1-2 `link-server` — the daemon accepts `attach` and holds the link

Read `SOCKET-REFACTOR/README.md` first (The wire, Step 0, Cross-slice contracts). Read
`CLAUDE.md` at the repo root; every rule binds you. Paths are inside `packages/orch/`.

## You own exactly these files

- `src/daemon/rpc/server.ts`
- `src/types/daemon.ts`
- `test/bridge-link-server.test.ts` (new)

Touch nothing else. Need a change outside this list? Stop and report it.

Already in place: `src/control/bridge-links.ts` (`attachBridge`, `detachBridge`,
`bridgeAttached`, `attachedBridgeKeys`, `BridgeLink`).

## The task

`server.ts` already holds persistent sockets for `subscribe-events`: `handleLine` adds the
socket to `subscriptions` BEFORE the handler runs; `attachConnection` removes it on
close/error. Do the same for `attach`.

1. In `handleLine`, when `request.method === "attach"`:
   - `params.key` is a required non-empty string; missing → `errorResponse(request.id,
     "INVALID_REQUEST", "attach requires key")` and return.
   - `const link: BridgeLink = { push: (delivery) => lineResponse(socket, { event: { kind: "delivery", ...delivery } }) }`.
   - `attachBridge(key, link)`; keep `{ key, link }` on the per-connection `ConnectionState`
     so close/error can `detachBridge(key, link)`. A connection attaches at most one key; a
     second `attach` on the same socket detaches the old key first.
   - Fall through to normal handler dispatch so orchd's `attach` handler answers
     `{attached: true, open: n}` (P2-1 writes that handler; today an unknown method returns
     `METHOD_NOT_FOUND`, which your test tolerates by supplying a handler).
2. `attachConnection`: on `close` and `error`, detach if the state holds a link.
3. `RpcServerOptions` gains `onBridgeAttached?: (key: string) => void`. Call it AFTER the
   handler's reply line is written, so the bridge sees `{attached:true}` before the first
   pushed delivery.
4. `RpcServer` gains `attachedBridgeCount(): number` from `attachedBridgeKeys().length`.
5. `close()` destroys every socket; the close listener detaches each link. Prove it in the
   test.
6. In `src/types/daemon.ts`, rewrite the `OutboxDelivery` doc: `queued` = pushed down the
   bridge link, ack pending. Remove every `ack.jsonl` / inbox word from that file.

The server passes the raw key; `bridge-links` normalizes. Do not import
`normalize-target.ts` here.

## Tests — `test/bridge-link-server.test.ts`

Follow `test/daemon-rpc.test.ts` for `startRpcServer` on a temp `orchDir` and dialing with
`node:net`. Cover: attach registers the key and returns the handler's result; a pushed
delivery arrives as `{"event":{"kind":"delivery",...}}` and passes `isBridgeDelivery`;
socket close detaches; a second attach for the same key from a new socket replaces the first
and a push reaches only the new socket; attach without `key` is `INVALID_REQUEST`;
`onBridgeAttached` fires once per attach after the reply; `attachedBridgeCount` follows
attach and close; `server.close()` leaves no key attached.

`bridge-links.ts` is module state: detach every key in `afterEach`.

## Done means

`bun check` clean on your files (paste it). `bun test test/bridge-link-server.test.ts
test/daemon-rpc.test.ts` green (paste it). Report the exact names you added to
`src/types/daemon.ts`.
