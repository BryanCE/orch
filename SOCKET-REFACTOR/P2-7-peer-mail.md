# P2-7 `peer-mail` — `orch_send` goes through the daemon

Read `SOCKET-REFACTOR/README.md` first (Decisions: a peer message is MAIL; Cross-slice
contracts). Read `CLAUDE.md` at the repo root (Rule 6). Paths are inside `packages/orch/`.

## You own exactly these files

- `src/agent/peers.ts`
- `test/peer-identity.test.ts`, `test/peer-tools-registration.test.ts`,
  `test/no-sibling-relay.test.ts`

Touch nothing else. P2-1 (same phase) serves the `message` RPC
(`{ from, target, text }` → `{ accepted: true, id, ack }`); your tests fake the daemon, so
you do not depend on it landing first.

## The task

- Delete `appendPeerInbox`. Its other caller (`result-delivery.ts`) was rewired in phase 1;
  `grep -rn appendPeerInbox src` must show only this file before you delete it, else stop and
  report.
- `sendPeerMessage`: `daemon.ask("message", { from: ownKey, target: resolved.peer.key,
  text: <the same "[from …]" body> })`. `undefined` → return
  `"error: daemon unreachable; message not sent"`. A result with `ack !== "acknowledged"` →
  `sent to <label> (queued, not yet read)`; acknowledged → `sent to <label>`.
- `liveSpawnerPeer`: drop the `INBOX_FILE` existence check; a live pid with a status record
  is reachable (the daemon queues for a bridge that is not attached yet). Delete the
  `INBOX_FILE` import. Fix the doc on `spawnerReachable` and `UNREACHABLE_SPAWNER_ADVICE`
  if they mention an inbox.
- `grep -n "inbox\|INBOX" src/agent/peers.ts` → zero hits.

Tests:
- `test/peer-identity.test.ts`: `sendPeerMessage` calls `message` with `from`, `target`,
  `text`; assert on the fake daemon's recorded call, never on a file; the three return
  strings.
- `test/peer-tools-registration.test.ts`, `test/no-sibling-relay.test.ts`: "has an inbox" →
  "has a live status record"; delete `inbox.jsonl` fixtures.

## Done means

`bun check` clean on your files (paste it). `bun test` on the three test files green (paste
it). Paste the `message` params you send.
