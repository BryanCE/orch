# P4: the link declares what it takes, answers pick an option, prerequisites, reviews

Paths are relative to the repo root `/home/bryan/orch`. Read `acp/MODEL.md` first.

Rules for every section:
- Never run `orch`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`, `bun install`,
  or anything under `packages/orch/scripts/`. `git diff` and `git status` only, read-only.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins only.
- Never branch on a harness id, a backend id or a form id. Branch on what is declared.
- No number, timeout, path or name as a literal: a setting or an existing constant.
- One shape. No code that accepts an old shape. Call an existing helper before writing one.
- Comments: one short doc line on an exported name, nothing else.
- Tests: run `bun test packages/orch/test/<the files you edited>`. After a fix, once more.
  Never bare `bun test`. Never a test that opens a pane, a terminal or a real plexer.
- Verify means: run `bun check` from the repo root. After a fix, once more. Other agents are
  editing other files. An error in a file you did not touch is not yours: report `pending`.
- A type, schema, fixture or test your shape change forces is yours to edit. List every file.

## T1 The link declares what it takes, and an answer can carry an option
Read `packages/orch/src/control/agent-links.ts`, `packages/orch/src/control/dispatch.ts`,
`packages/orch/src/types/control.ts`, the `answer` handler in
`packages/orch/src/daemon/server/handlers/write.ts`, `packages/orch/src/store/question-rows.ts`,
and where a bridge link is attached under `packages/orch/src/daemon/server/`.

Part 1. Today the dispatcher asks the adapter whether its bridge takes an action
(`adapter.bridge?.takes.includes(...)`). An ACP link is not a bridge, so the link says it.
- `AgentLink` gains `readonly takes: readonly <BridgeAction>[]`, with the real name of the
  action type `adapter.bridge.takes` uses. Where a bridge link is attached, `takes` is that
  adapter's `bridge.takes`. Every other place that builds an `AgentLink` states its `takes`.
- `dispatch.ts` gains one helper that answers "does this action go down the link": the
  attached link's `takes` when a link is attached, else the adapter's `bridge.takes`, else no.
  Every `adapter.bridge?.takes.includes(...)` in `dispatch.ts` becomes a call to it.
- No behavior change for any agent that exists today.

Part 2. A question may carry options, and the answer picks one.
- The `answer` handler reads the agent's oldest pending question and its options. With
  options, the answer text must be a whole number from 1 to the count, and it selects that
  option by position. Anything else is refused with exit 1 and the message
  `answer with a number from 1 to <count>`. With no options, the text is the answer, as today.
- The answer `ControlAction` and the answer message pushed down a link gain
  `optionId: string | null`: the chosen option's id, null for a free-text answer. The text
  stays: for a chosen option it is that option's label.
- The harness side that receives an answer message ignores `optionId`. Its schema and
  fixtures gain the field.

Tests, in the existing dispatch and answer test files:
- An agent with a link attached whose `takes` has `steer` and whose adapter has no bridge:
  a steer goes down the link.
- An agent with no link attached and an adapter bridge that takes `dispatch`: unchanged.
- A question with two options, answer `2`: the message down the link has the second
  option's id and its label as text.
- The same question, answer `3` and answer `yes`: both refused with the message above.
- A question with no options, answer `yes`: delivered with `optionId` null.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 A binding is a prerequisite of its adapter's `acp` role
Read `packages/orch/src/shared/prerequisites.ts`, how doctor and setup use it under
`packages/orch/src/daemon/server/doctor/` and `packages/orch/src/setup/`, and `AcpRole` in
`packages/orch/src/types/adapter.ts`.

End state:
- For every adapter whose `acp` role is not null, the command its `acp.argv` starts with is
  a prerequisite, found the way the harness's own command is found today.
- A missing binding is reported the way an optional missing prerequisite is reported: the
  harness still works in its other forms. It is never a hard failure of the harness.
- No adapter id and no binding name appears in the prerequisites code. It walks the adapters.
- Doctor shows one line per binding: found with its path, or missing.

Tests, in the prerequisites test file, with `fakeAdapter`:
- An adapter with an `acp` role whose command is on the fake PATH: found.
- The same with the command absent: reported missing, and the harness is not failed.
- An adapter with `acp` null adds no prerequisite.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R3 Review: abort, the session log, the status form column
Read-only on code. Writes one file: `acp/findings/review-P1-c.md`.

Read sections T3, T8 and T10 of `acp/tasks/P1-parallel.md`. T3's design was changed after
the file was written: abort does not touch `BridgeMessage`. `AgentLink` has a nullable role
`abort: (() => void) | null`, and `deliverAbort` calls it when the attached link has one,
else sends the keys `abortHere` sent before.

Read each change with `git diff -- <file>`, and new files whole:
- T3: `packages/orch/src/types/control.ts`, `packages/orch/src/control/dispatch.ts`,
  `packages/orch/src/control/agent-links.ts`, `packages/orch/src/daemon/server/handlers/drive.ts`,
  and the test files `git status` shows changed that name `abort`.
- T8: `packages/orch/src/agent/session-log.ts`, `packages/orch/src/agent/read.ts`,
  `packages/orch/src/types/form.ts`, `packages/orch/test/session-log.test.ts`.
- T10: `packages/orch/src/types/command.ts`, `packages/orch/src/daemon/server/fleet-rows.ts`,
  `packages/orch/src/commands/status/table.ts`, `packages/orch/src/commands/status/options.ts`,
  and the status test files `git status` shows changed.
Other agents have edits in some of these files. Review only the lines that belong to T3, T8
and T10.

Check each change against its end state and the rules at the top of this file. Check by name:
- T3: the key-sending code exists once. Abort is never written to the outbox and never
  checked against a lease.
- T8: no `form === "acp"` or any other form id comparison. A malformed line throws with its
  line number. `readAgent` shares everything after parsing.
- T10: the column prints the value with no branch on a form id.

Answer shape, one entry per finding:
`<file>:<line>` then the rule or end-state line it breaks, then the exact edit that fixes it.
End each task's part with `T<n>: <count> findings`. Zero findings is a valid answer. Do not
report style or naming taste.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/review-P1-c.md, <total> findings" or "blocked: <exact error>".

## R4 Review: the pipes provider and holder
Read-only on code. Writes one file: `acp/findings/review-P1-d.md`.

Read section T2 of `acp/tasks/P1-parallel.md`. Its design was changed in one place after the
file was written: a failed start throws from `PipesProvider.spawn`, and `exited` only ever
describes a process that started.

Read whole: `packages/orch/src/types/pipes.ts`, `packages/orch/src/pty/node-pipes.ts`,
`packages/orch/src/daemon/server/held-pipes.ts`, `packages/orch/test/helpers/fake-pipes.ts`,
`packages/orch/test/held-pipes.test.ts`. Read `packages/orch/src/daemon/server/held.ts` and the
PTY provider under `packages/orch/src/pty/` to compare.

Check against T2's end state and the rules at the top of this file. Check by name:
- A process that exits is forgotten by the holder, with no listener left behind.
- stderr text reaches listeners added before and after the first chunk the same way, or the
  difference is stated in a doc line.
- Nothing in `node-pipes.ts` leaves an unhandled `error` event or an unhandled rejection.
- The holder copies nothing from `held.ts` that it could call.
- Each T2 test case exists and asserts what T2 says.

Answer shape, one entry per finding:
`<file>:<line>` then the rule or end-state line it breaks, then the exact edit that fixes it.
End with `T2: <count> findings`. Zero findings is a valid answer. Do not report style or
naming taste.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/review-P1-d.md, <count> findings" or "blocked: <exact error>".
