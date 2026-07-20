# Tasks

## 1. Make the socket the disconnect signal

- [x] 1.1 Add an optional `onClose` callback to `rpcSubscribe` (`src/daemon/rpc.ts`), fired from the socket's `close` event. Guard it with a `stopped` flag set by the returned stop function so a caller-initiated `socket.destroy()` is never reported as a daemon disconnect.

## 2. Delete the client-side file transport

- [x] 2.1 Delete `startPreferredEvents`, `PreferredEventsOptions`, and `PreferredEvents` from `src/daemon/events.ts`, including the 500ms `daemon-status` probe. Drop the now-unused `rpcCall` / `rpcSubscribe` imports. Leave no alias (Rule 8).
- [x] 2.2 Rewrite `startEventsTransport` in `src/commands/events.ts` to call `rpcSubscribe` directly, passing an `onClose` that `die()`s naming `orch daemon start`.
- [x] 2.3 Remove `offline` from `EventsOptions`, from `parseEventsOptions`, and from the `ensureDaemon` guard in `cmdEvents`. Drop the now-unused `startPresenceWatch` / `PresenceWatch` / `notify` imports.
- [x] 2.4 Record the layering on `startPresenceWatch`'s doc comment: daemon-only ingress, and importing it outside `src/daemon/` reintroduces the second event source.
- [x] 2.5 Delete `seedEventStates` and the `EventsContext.states` map. Seeding read presence files client-side to populate a map that, once the file transport is gone, nothing reads — it was the last client-side presence read in the events path. Drops the `derivePresenceTransition` import, leaving `src/commands/events.ts` importing only a type from `src/daemon/events.ts`.

## 3. Documentation

- [x] 3.1 Drop `--offline` from the `orch events` help line in `src/commands/index.ts` and say the command requires a running daemon. Leave the `orch status --offline` line intact.
- [x] 3.2 Same edit to the `events` row of the command table in `README.md`.

## 4. Tests

- [x] 4.1 Update `test/commands-events.test.ts` — the flag-parsing case no longer passes or expects `--offline`.
- [x] 4.2 Replace the `a dead daemon falls back once and diffs the switch snapshot` case in `test/daemon-events.test.ts` with two cases against `rpcSubscribe`: a daemon-side close fires `onClose` exactly once, and a caller-initiated `stop()` does not fire it at all.
- [x] 4.3 Check `test/routing-hardening.test.ts` and `test/broker-routing.test.ts` — both exercise `status --offline`, which this change does NOT touch. Confirm neither asserts anything about `events --offline`. (Verified: all four references are `status`.)

## 5. Verification

- [x] 5.1 Gate: ask the user to re-run `bun run check` and `bun test`, then re-read `current-errors.md` and `test-results.md`. Expect the two pre-existing `daemon-events` failures to be reduced by the deleted case, and watch for any remaining `startPresenceWatch` fs-watch failure — that defect predates this change and is NOT fixed by it. (2026-07-20: closed on user-run gates — `current-errors.md`: oxlint 0/0 over 168 files, tsc clean, `check:bridge OK (149 files scanned)`; `test-results.md`: 394 pass / 0 fail.) The two `daemon presence events` failures are resolved: one case was deleted by this change, and the surviving `startPresenceWatch` fs-watch defect — which this change correctly noted it did not fix — was fixed separately by making the watcher accept the `status.json.tmp-<pid>` name that `atomicWrite` renames from (`src/presence/writer.ts` `namesPresenceFile`).
- [ ] 5.2 With a daemon running, `orch events` streams transitions; kill the daemon mid-stream and confirm it exits non-zero naming `orch daemon start` rather than continuing to emit.
- [x] 5.3 Confirm `grep -rn "startPreferredEvents\|events.*--offline" src/ test/ docs/ README.md` returns nothing outside `docs/charts/old/`, which is a dated as-built record and is left alone. (2026-07-20: returns nothing outside `docs/charts/old/`. The one straggler was `test/golden/help.txt`, which still advertised `--offline` on `orch events`; corrected. That sweep also caught the live usage string in `src/commands/index.ts` omitting `--notify`, which IS still supported — fixed.)
- [x] 5.4 Decide the `--notify` open question recorded in the proposal. (2026-07-20: DECIDED — remove it. Confirmed inert on disk: `cmdEvents` builds no sinks and nothing reads the parsed `notifications` flag. Delivery belongs to orchd, and client-side delivery would double-notify against the daemon's own sinks, so the flag cannot be fixed, only deleted. Recorded in proposal.md as a Resolved Decision; the deletion itself is a follow-up change because it touches the usage string, `EventsOptions`, and a test assertion.)
