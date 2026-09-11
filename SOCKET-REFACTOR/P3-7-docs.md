# P3-7 `docs` — README, one web comment, scratch.md items 4 / 9 / 10 closed

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root. Paths: the first
is inside `packages/orch/`, the second inside `packages/web/`, the third at the repo root.

## You own exactly these files

- `packages/orch/README.md`
- `packages/web/src/lib/fleet.ts` (one comment, ~line 12)
- `scratch.md`

Touch nothing else. Check every claim against the code before you write it.

## The task

1. `packages/orch/README.md`: `grep -n -i "inbox\|ack\.jsonl\|answer\.json\|question\.json\|presence protocol"`.
   Where the README describes how orch talks to agents, say it in two sentences: a bridge
   holds one link to orchd; every message is an outbox row pushed down that link and settled
   by one ack. Delete the old description. Do not add a section.
2. `packages/web/src/lib/fleet.ts` ~12: "delivery is orch's own inbox mechanism and needs
   no screen" → "delivery is orchd's push down the agent's bridge link and needs no screen".
3. `scratch.md`:
   - Item 9 → ✅. Replace the "half still owed" text: `orch dispatch` waits for the bridge
     ack and prints delivered or queued; the `ack` RPC settles the row; no file is read.
   - Item 10 → ✅. The skill states the attach wait; `sleep` after spawn is ruled out.
   - Item 4 → ✅. The answer carries `questionId`; the bridge drops an answer for a question
     it is not waiting on and does not ack it, so the caller sees the miss.
   - In "Ahead of the 20" and "The four half-done ones", strike the sentences that describe
     `ack.jsonl` as the settling mechanism.
   - The count line at the top (`13 done, 4 half done, 3 open`) must match the table after
     your edits. Count it.
   - Add one row under "Landed this session, outside the 20": the control channel moved
     off files (`inbox.jsonl`, `ack.jsonl`, `answer.json`, `question.json`); where:
     `SOCKET-REFACTOR/README.md`.

## Done means

Paste the grep from step 1 (empty). Paste the three scratch.md rows and the count line.
