# P3-5 `help` — `orch help` says what the commands do now

Read `SOCKET-REFACTOR/README.md` first. Read `CLAUDE.md` at the repo root. Paths are inside
`packages/orch/`.

## You own exactly these files

- `src/commands/help.ts`
- `src/commands/index.ts`

Touch nothing else. Every claim you write, check against the command's code in the same
sitting: `src/commands/control.ts` (dispatch, steer, answer), `src/commands/spawn/report.ts`
(the attach wait), `src/commands/results.ts` (questions). scratch.md item 20 exists because
help and the skill drifted once already.

## The task

- `answer` (`help.ts` ~103-105, `index.ts` ~82-83): usage loses `[--force]`; delete the
  `--force` line. One-liner: "Answer the question the agent is asking. Refused when it is
  not asking."
- `steer` (`help.ts` ~118): "the agent reads it from its inbox mid-turn" → "orchd pushes it
  down the agent's bridge link; the reply says whether the agent applied it".
- `dispatch`: add the two outcomes it prints (copy the exact words from
  `reportControlDelivery` in `control.ts`): delivered with the dispatch id, or queued
  because no bridge ack arrived within `timeouts.dispatch_ack_ms`. A queued dispatch is
  durable: orchd retries every `daemon.outbox_drain_ms` and re-pushes the moment the bridge
  attaches.
- `spawn`: spawn waits up to 60 s for each agent's bridge to attach, prints `ok` or
  `STALLED` per agent, exits 1 on a stall; an adapter with no bridge prints an UNVERIFIED
  warning. Copy the exact strings from `spawn/report.ts`.
- `questions`: reads each live agent's pending question from its status record.
- `grep -n -i "inbox\|question.json\|answer.json\|--force" src/commands/help.ts src/commands/index.ts`
  → only the `--force` hits that belong to `result` and `clean` remain.

There is a help test (`grep -ln "cmdHelp\|help.ts" test/`). Run it; if it snapshots text and
the snapshot lives under `test/`, regenerate it and say so.

## Done means

`bun check` clean on your files (paste it). The help test green (paste it). Paste the
`dispatch`, `spawn` and `answer` help entries verbatim.
