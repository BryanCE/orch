# P2-4 `cli-dispatch` — `orch dispatch` says delivered or queued; `orch answer` loses `--force`

Read `SOCKET-REFACTOR/README.md` first (The design: closes #9; Decisions: `--force`;
Cross-slice contracts). Read `CLAUDE.md` at the repo root. Paths are inside `packages/orch/`.

## You own exactly this file

- `src/commands/control.ts`

Touch nothing else. P2-1 (same phase) makes the `dispatch` RPC return
`{ accepted: true, id, ack: "acknowledged" | "unavailable" }`; code against that. Help text
(`help.ts`, `index.ts`) is P3-5's.

## The task

1. `cmdDispatch`: the RPC result now carries `ack`. `reportControlDelivery` already prints
   steer/answer outcomes; extend its `action` union with `"dispatched"` and call it from
   `cmdDispatch` — one printer, three verbs. Words:
   - acknowledged → `Delivered to <recipient> (dispatch <id>)`
   - unavailable → `Queued for <recipient> (dispatch <id>): no bridge ack within <timeouts.dispatch_ack_ms>ms`
   Read the timeout from `loadSettings(orchDir()).timeouts.dispatch_ack_ms` (it is already
   loaded in `cmdDispatch`). `--json` carries `ack` and `id` through. `dispatchToAgent`
   returns the whole RPC result, not `{ dispatchId }` alone; fix its one other caller in
   this file if there is one (`grep -n dispatchToAgent`), and if a caller is outside this
   file, report it and stop.
2. `cmdAnswer`: delete the `question.json` existence check, `--force`, the `QUESTION_FILE`
   import, and the `files` / `path` imports if they go unused. The daemon's `not-asking`
   boundary answer is the refusal; `writeRpc` already `die`s on an RPC error. The usage
   string loses `[--force]`; the remote forward loses the `--force` pass-through.
3. `grep -n "inbox\|question.json\|answer.json" src/commands/control.ts` → zero hits.

There is a test for dispatch/steer printing (`grep -ln "reportControlDelivery\|Dispatched to" test/`).
If it exists and no other phase-2 slice lists it, it is yours: cover the two dispatch lines
and the `--json` shape; delete the `--force` cases.

## Done means

`bun check` on your file (paste it; residue only P2-1 clears is named). The control test
green (paste it). Paste the two dispatch output lines verbatim — P3-5 and P3-6 document them.
