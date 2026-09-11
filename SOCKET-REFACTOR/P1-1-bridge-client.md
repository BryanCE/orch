# P1-1 `bridge-client` — the bridge holds one live link to orchd

Read `SOCKET-REFACTOR/README.md` first (the spec: The wire, Step 0, Cross-slice contracts).
Read `CLAUDE.md` at the repo root; every rule binds you. Paths are inside `packages/orch/`.

## You own exactly these files

- `src/presence/socket-client.ts`
- `src/agent/daemon-client.ts`
- `src/types/agent.ts`
- `src/types/settings.ts`, `src/settings/schema.ts`, `src/settings/registry.ts`
- `test/bridge-client.test.ts` (new)

Touch nothing else. `src/agent/presence.ts` is P2-5's; it calls what you build next phase.
Need a change outside this list? Stop and report it.

Already in place: `src/control/bridge-message.ts` (`BridgeDelivery`, `isBridgeDelivery`).
Import the guard from there. Do NOT import `src/control/bridge-links.ts` — it pulls the store
graph into the bridge bundle (Rule 6: node built-ins and leaf modules only in `src/agent/**`).

## 1. A persistent line link — `src/presence/socket-client.ts`

`requestJsonLine` is one-shot. Add beside it:

```ts
export interface JsonLineLink {
  /** Write one JSON line. False when the socket is gone. */
  send(payload: unknown): boolean;
  close(): void;
}
export function openJsonLineLink(
  endpoint: string | number,
  handlers: { onLine(line: string): void; onClose(): void },
): Promise<JsonLineLink | undefined>;
```

Resolves `undefined` when the connect fails. Once connected it stays open: every newline-
framed line goes to `onLine` (buffer partial lines across chunks; do not import
`daemon/rpc/wire.ts`, it is daemon-side — write the few lines here). `onClose` fires exactly
once on `close`, `end` or `error`. Unref the socket so a live link never keeps a harness
process alive on exit. Node built-ins only.

## 2. `DaemonClient.attach` — `src/agent/daemon-client.ts`, `src/types/agent.ts`

New surface on `DaemonClient`:

```ts
/** Open the persistent link and announce this agent. Deliveries arrive on onDelivery
 *  until detach(). Reconnects on its own; never throws. */
attach(key: string, onDelivery: (delivery: BridgeDelivery) => void): void;
/** Close the link and stop reconnecting. */
detach(): void;
/** True while a link is open and attached. */
attached(): boolean;
```

Behaviour:
- Resolve the endpoint the way `ask` does (unix socket path when it exists, else the port
  file), through `openJsonLineLink`.
- Send `{"id":<n>,"method":"attach","params":{"key":<key>}}` first. Requests on the link
  take ids from the same `nextRequestId` counter. Replies (`{id, result}` / `{id, error}`)
  resolve the waiting promise for that id; a reply nobody waits on is dropped.
- Route every `{"event":{"kind":"delivery",...}}` line that passes `isBridgeDelivery` to
  `onDelivery`. Ignore anything else on the link.
- After `onClose`, wait `daemon.bridge_reconnect_ms` and redial, forever, until `detach()`.
  Every redial re-sends `attach`. Read the setting once at `attach()` through
  `loadSettingsOrNull(orchDir)?.daemon.bridge_reconnect_ms`; a null settings file means no
  orch install — use `SETTINGS_DEFAULTS.daemon.bridge_reconnect_ms` (the one place a default
  may come from; `?? <literal>` is forbidden, Rule 17). `tools.ts` already imports
  `loadSettingsOrNull` from the bridge, so the import is bundle-safe.
- `postAck(id)` sends `ack` OVER THE LINK when it is up; falls back to the one-shot
  `ask("ack", {id})` only when no link is up. Signature unchanged.
- Keep `messageIdOf`, `isAcked`, `markAcked`, `ask`, `postControlOutcome`.
- Delete the header comment that names `ack.jsonl`. New header: the link is the transport;
  a lost ack costs one redelivery; the dedupe set applies each id once.
- `src/types/agent.ts`: rewrite the `DaemonClient` doc so it names no file.

## 3. The setting

- `src/types/settings.ts`: `daemon.bridge_reconnect_ms: number` and
  `daemon.outbox_max_attempts: number`.
- `src/settings/schema.ts`: defaults `bridge_reconnect_ms: 1_000` and
  `outbox_max_attempts: 120` in `SETTINGS_DEFAULTS.daemon` (the retry delay caps at 30 s,
  so 120 is about an hour of a live agent with no link); `PositiveInt.optional()` for both
  in the zod block.
- `src/settings/registry.ts`: `"daemon.bridge_reconnect_ms": "How long an agent's bridge waits before it redials the daemon after the link drops, in milliseconds."`
  `"daemon.outbox_max_attempts": "How many delivery attempts a queued write gets before the daemon closes it as undeliverable."`
  And fix `daemon.outbox_drain_ms`: "How often the daemon retries queued writes whose agent
  has no bridge link, in milliseconds."
- Find the registry test (`grep -ln SETTINGS_DEFAULTS test/`) and run it.

Why the cap exists: on 2026-09-11 the daemon retried ten dead agents' writes 568 times
each, every 30 s, and `orch clean` did not close them. The gone signal (P2-1) is the fix;
the cap is the backstop so no row can ever retry without a limit again.

## 4. Tests — `test/bridge-client.test.ts`

Stand up a real `node:net` server on a temp unix socket in the test — no orchd. Put the
socket path where `daemonRuntimeFiles(orchDir).socket` expects it (see how
`test/daemon-rpc.test.ts` builds a temp `ORCH_DIR`). Cover:

- `attach` sends the attach request first, with the key.
- A `{"event":{"kind":"delivery",...}}` line reaches `onDelivery` parsed.
- A line that fails `isBridgeDelivery` is ignored.
- `postAck` after `attach` arrives on the SAME server connection.
- Server closes the connection: the client redials after the configured delay and re-sends
  `attach` (write a small `bridge_reconnect_ms` into the temp `settings.json`).
- `detach` stops reconnecting.
- `openJsonLineLink` to a dead endpoint resolves `undefined` and calls no handler.

## Done means

`bun check` clean on your files (paste it). `bun test test/bridge-client.test.ts` and the
settings registry test green (paste both). Report the final `DaemonClient` interface
verbatim.
