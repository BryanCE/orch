# P3-2 `check-bridge` — the static gate no longer names the deleted files

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root (Rule 10: the
`check-bridge.ts` scan must stay recursive). Paths are inside `packages/orch/`.

## You own exactly these files

- `scripts/check-bridge.ts`
- `test/check-bridge.test.ts`

Touch nothing else.

## The task

1. `PRESENCE_FILENAMES` loses `inbox.jsonl`, `answer.json`, `ack.jsonl`. Add
   `question.json` to nothing — it is gone too. Fix the comment on the list.
2. Delete the NOTE inside `ADAPTER_WIRE_LITERALS` that explains why `inbox.jsonl` /
   `answer.json` are not there.
3. `ENVIRONMENT_ROLE_NAMES` is derived from the port files. After P3-1 deletes the `channel`
   role, check that nothing in the test still expects it and that the derived list matches
   the ports (`bun run check:bridge` prints the breach list; it must be empty).
4. `test/check-bridge.test.ts`: fix every assertion that names a deleted file or the
   `channel` role. Add one: the raw string `"inbox.jsonl"` anywhere under `src/` is NOT a
   presence-filename breach any more (it is simply not a presence filename) — and one that
   `"status.json"` still is.
5. The recursive `extensions` scan: assert it still scans (the test file already has a
   case; make sure it is there and green).

## Done means

`bun run check:bridge` green (paste it). `bun test test/check-bridge.test.ts` green (paste
it). `bun check` on your two files (paste it).
