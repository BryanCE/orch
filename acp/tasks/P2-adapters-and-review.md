# P2: adapter roles, and review of what P1 landed

Paths are relative to the repo root `/home/bryan/orch`. Read `acp/MODEL.md` first.

Rules for every section:
- Never run `orch`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`, `bun install`,
  or anything under `packages/orch/scripts/`. Never edit `packages/orch/drizzle/`.
- `git diff` and `git status` are allowed, read-only. No other `git` command.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins only.
- Never branch on a harness id, a backend id or a form id. Branch on what is declared.
- No number, timeout, path or command name as a literal: a setting or an existing constant.
- One shape. No code that accepts an old shape. Call an existing helper before writing one.
- Comments: one short doc line on an exported name, nothing else.
- Tests: run `bun test packages/orch/test/<the files you edited>` once, after your edits.
  Never bare `bun test`. Never a test that opens a pane, a terminal or a real plexer.
- Verify means: run `bun check` once from the repo root. Other agents are editing other files
  at the same time. An error in a file you did not touch is not yours: report `pending`.
- A type, schema, fixture or test that your shape change forces is yours to edit. List it.

## T1 Adapters: resume the TUI by session id, and the codex `acp` role
Read `packages/orch/src/types/adapter.ts`, the three adapters
`packages/orch/src/adapters/{pi,claude,codex}.ts`, `packages/orch/test/helpers/adapter.ts`,
`acp/findings/adapter-forms.md`, `acp/findings/sessions.md`,
`acp/reference/official-codex-README.md` and `acp/reference/npm-codex-acp.json`.

Part 1, resume. `orch restart --form tui` will start a harness TUI on a conversation that an
ACP session held, by session id.
- If `AgentAdapter` already has a way to build the TUI command that resumes a given session
  id, change nothing for part 1 and name that member in your report.
- If not, `AgentAdapter` gains a nullable role `resume`, shaped like the other nullable
  roles: `{ argv(opts: SpawnOpts, sessionId: string): readonly string[] } | null`. Each
  adapter whose harness CLI can resume by id gets it, built from the same pieces its
  interactive command uses, with that harness's own resume flag. An adapter whose CLI cannot
  gets `null`. `fakeAdapter` gets `null` by default.
- Test: for each adapter with the role, the argv holds the session id and the resume flag.

Part 2, the codex `acp` role in `packages/orch/src/adapters/codex.ts`.
- `acp` stops being `null`. `argv` is the binding command, which the README names. The
  command name comes from where the adapter already gets its other command names. If those
  are literals in the adapter, follow that existing convention exactly.
- `env` returns what the README says the binding reads to find the Codex CLI and to set the
  starting mode, from the same sources the adapter uses for its interactive command. Nothing
  the README does not name.
- `sharesSessions`: `true` only if the README states that the binding's sessions are the
  Codex CLI's own sessions. Otherwise `false`. Quote the README line in your report.
- Test: the role's argv and env for a default `SpawnOpts`, in the codex adapter's test file.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R1 Review: questions, ack, static check, inventory
Read-only on code. Writes one file: `acp/findings/review-P1-a.md`.

Read these sections of `acp/tasks/P1-parallel.md`: T1, T4, T6, T9. Then read the change each
made with `git diff -- <file>` on:
- T4: `packages/orch/src/store/question-rows.ts`, `packages/orch/src/types/daemon.ts`,
  `packages/orch/src/daemon/client/protocol.ts`, `packages/orch/src/daemon/server/handlers/lifecycle.ts`,
  `packages/orch/src/commands/results.ts`, `packages/orch/test/commands-results.test.ts`,
  `packages/orch/test/events-open-with-pending-questions.test.ts`
- T9: `packages/orch/src/daemon/server/outbox.ts`, `packages/orch/src/daemon/server/handlers/table.ts`
- T6: `packages/orch/scripts/check-bridge.ts`, `packages/orch/scripts/check-layers.ts`,
  `packages/orch/test/check-bridge.test.ts`
- T1: `packages/orch/test/store-rebuild-schema.test.ts`
`protocol.ts` also holds another agent's spawn edits. Review only the question lines there.

Check each change against its section's end state and against the rules at the top of this
file. Also check: a query per row where one query would do, a copied function, a test that
asserts nothing, an end-state line the change does not meet.

Answer shape, one entry per finding:
`<file>:<line>` then the rule or end-state line it breaks, then the exact edit that fixes it.
End each task's part with a line `T<n>: <count> findings`. Zero findings is a valid answer.
Do not report style, naming taste or anything the rules above do not cover.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/review-P1-a.md, <total> findings" or "blocked: <exact error>".

## R2 Review: the held screen that orchd writes
Read-only on code. Writes one file: `acp/findings/review-P1-b.md`.

Read section T7 of `acp/tasks/P1-parallel.md`. Then read the change with `git diff --` on
`packages/orch/src/daemon/server/held.ts` and `packages/orch/test/held-pty.test.ts`, and read
the whole of `held.ts` as it stands.

Check the change against T7's end state and the rules at the top of this file. Check these
by name:
- Text from the writer and bytes from a PTY reach the screen and the viewers through one
  code path. Name the function. A second buffer or a second broadcast loop is a finding.
- The held entry is a union on its source. A nullable `pty` field is a finding.
- `close()` and a PTY exit end the screen through one code path.
- Every existing caller of the PTY held path still compiles to the same behavior.
- Each T7 test case exists and asserts what T7 says.

Answer shape, one entry per finding:
`<file>:<line>` then the rule or end-state line it breaks, then the exact edit that fixes it.
End with `T7: <count> findings`. Zero findings is a valid answer. Do not report style or
naming taste.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/review-P1-b.md, <count> findings" or "blocked: <exact error>".
