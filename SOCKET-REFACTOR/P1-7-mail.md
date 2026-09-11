# P1-7 `mail` — a message between agents is an outbox row

Read `SOCKET-REFACTOR/README.md` first (Decisions: a peer message is MAIL; Cross-slice
contracts). Read `CLAUDE.md` at the repo root (Rule 11). Paths are inside `packages/orch/`.

## You own exactly these files

- `src/daemon/mail.ts` (new)
- `src/daemon/result-delivery.ts`
- `test/cross-pack-result-delivery.test.ts`

Touch nothing else. P2-1's `message` RPC and P2-7's `orch_send` land on top of `acceptMail`
next phase. Need a change outside this list? Stop and report it.

## The task

### `src/daemon/mail.ts`

```ts
/** Queue one agent's message to another. Mail is governed by the space wall only, never by
 *  the lease: it is not a driving verb (Rule 11). The row is picked up by the outbox drain
 *  or by the caller's own delivery attempt. */
export function acceptMail(directory: string, from: string, target: string, text: string): { id: string }
```
- `checkWall(directory, from, target, { crossSpace })` from `src/policy/space.ts`;
  `crossSpace` comes from `loadSettingsOrNull(directory)?.fleet.cross_space ??
  SETTINGS_DEFAULTS.fleet.cross_space` exactly as `governWrite` in `orchd.ts` reads it (that
  is the one existing spelling; copy it, do not invent a second). A refused wall throws with
  the wall's reason.
- `from` and `target` are required non-empty strings; `text` too.
- `insertOutboxMessage(directory, { id: randomUUID(), target, payload: { action: "steer", text } })`.
- Log `mail.accepted { from, target }` through `decisionLogger(directory).forCorrelation(id)`.
- Return `{ id }`. Delivery is NOT attempted here (the drain tick or the RPC caller does it).

### `src/daemon/result-delivery.ts`

Replace `appendPeerInbox(presenceAgentDir(task.enqueuedBy, orchDir), body)` with
`acceptMail(orchDir, settled.agentId, task.enqueuedBy, body)`. Keep it best-effort (catch,
drop): a settled task never unsettles because its enqueuer is gone or walled. Delete the
`appendPeerInbox` and `presenceAgentDir` imports. Rewrite the doc comment: the result
travels as an outbox row pushed down the enqueuer's bridge link, not `inbox.jsonl`.

### `test/cross-pack-result-delivery.test.ts`

Rewrite the assertions: the result is an outbox row for the enqueuer with
`payload.action === "steer"` and the body text; the runner gets no row; an enqueuer across
the wall (with `fleet.cross_space` false) gets no row and the task stays settled; delete the
`INBOX_FILE` / `presenceFile` reads and the seeded inbox fixture. Fix the header comment.

Add the `acceptMail` unit cases to the same file (it is the only test file you own): wall
refusal throws by reason; empty `from`/`target`/`text` throws; the row's payload passes
`isBridgeMessage`.

## Done means

`bun check` clean on your files (paste it). `bun test test/cross-pack-result-delivery.test.ts`
green (paste it). Report `acceptMail`'s final signature.
