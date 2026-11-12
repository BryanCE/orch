# P6: wiring review fixes, the viewer for a held agent here, switching form

Paths are relative to the repo root `/home/bryan/orch`. Read `acp/MODEL.md` first.

Rules for every section:
- Never run `orch`, `bun run build`, any `bun db:*`, `drizzle-kit`, `bun add`, `bun install`,
  or anything under `packages/orch/scripts/`. Never edit `packages/orch/drizzle/`.
  `git diff` and `git status` only, read-only. Never commit, never stash, never checkout.
- No `as` casts, no `any`. No `Bun.*`, no `bun:*` in `src/`: `node:` builtins and Web Streams.
- Never branch on a harness id, a backend id or a form id. Branch on what is declared.
- No number, timeout, path or name as a literal: a setting or an existing constant.
- One shape. No code that accepts an old shape. Call an existing helper before writing one.
  Never copy a function: move it or export it.
- Text a command prints holds no parentheses.
- Comments: one short doc line on an exported name, nothing else.
- Tests: run `bun test packages/orch/test/<the files you edited>`. After a fix, once more.
  Never bare `bun test`. Never a test that opens a pane, a terminal or a real plexer, and
  never run a test file that drives a real plexer: `backend-tmux`, `backend-herdr`,
  `backend-orca`, `cli-backends-*`, `herdr-*`. A type-only edit there is checked by `bun check`.
- Verify means: run `bun check` from the repo root. After a fix, once more. Other agents are
  editing other files. An error in a file you did not touch is not yours: report `pending`.
- A type, schema, fixture or test your shape change forces is yours to edit. List every file.

## T1 Wiring review fixes and one owner table
Five exact changes.

1. `packages/orch/src/daemon/server/acp-agents.ts`: the `openScreen` call sits after the
   `try` whose `catch` releases the pipes. Move it inside that `try`, so a throw from
   `openScreen` also runs `releasePipes` and rethrows.
2. `packages/orch/src/agent/session-log.ts`: add
   `/** Creates an agent's session log, empty, when it does not exist. */`
   `export function openSessionLog(path: string): void`. It makes the directory the way
   `appendSessionEntries` does, by calling the same code, and creates the file empty without
   truncating an existing one. In `acp-agents.ts`, call it once, before the first
   `acceptStatusReport` that reports `sessionPath`.
3. `packages/orch/src/backends/held/index.ts`: `startHeldAgent` computes
   `opts.cwd ?? process.cwd()`, and `acp-agents.ts` computes it again. Export
   `/** The directory a held agent starts in. */ export function heldCwd(opts: SpawnOpts): string`
   from `held/index.ts`, with the parameter type `startHeldAgent` already takes, re-export it
   where `heldLaunchEnv` is re-exported, and call it in both places.
4. `packages/orch/src/types/form.ts`: `FORM_TRANSCRIPT` and `FORM_STATE_OWNER` hold the same
   fact twice. Delete both. Add one:
   ```ts
   /** Who holds each form's session: that side writes the transcript and reports the agent's
    *  state. An agent in an `orchd` form ignores its harness's reports. */
   export const FORM_SESSION_OWNER: Readonly<Record<FormId, "harness" | "orchd">> = { tui: "harness", oneshot: "harness", acp: "orchd" };
   ```
   `packages/orch/src/agent/read.ts` line 61 and
   `packages/orch/src/daemon/server/handlers/table.ts` line 71 read it. No other name stays.
5. `packages/orch/test/acp-agents.test.ts`:
   - In the first-prompt case, after the existing assertions, assert the stored result's text
     is the turn's last assistant message, read the way the other cases read presence.
   - New case: an agent started with no first prompt. Its session log file exists, and
     `parseSessionLog` of its content returns no entries.

Tests: `packages/orch/test/acp-agents.test.ts`, `packages/orch/test/session-log.test.ts`,
`packages/orch/test/held-spawn.test.ts`.
Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 A viewer pane for a held agent on this host
Read `acp/MODEL.md` section "Viewers". Read `packages/orch/src/daemon/server/spawn/viewers.ts`
whole, every caller of what it exports, and `packages/orch/src/types/backend.ts`.

Today a viewer pane opens in the spawner's plexer only for an agent on a linked host. The
rule becomes: an agent whose backend has no placement role gets a viewer pane in the
spawner's plexer, when the spawner is in one. A far agent and a `held` agent on this host
take the same code path. An agent in a pane gets none, as today. A spawner with no plexer
gets none, as today.

End state:
- The decision reads a declared property of the agent's backend. If `Backend` already
  states that it places agents in panes, use that member. No backend id is compared.
- One function decides and opens the viewer for both the far and the local case. The far
  case keeps its behavior exactly.
- The viewer pane for a local held agent runs what the far viewer runs to show an agent's
  screen, with this host's name where the far case passes the linked host's.
- An `acp` agent and a `tui` agent in `held` both get one: nothing reads the form.

Do not edit `packages/orch/src/daemon/server/acp-agents.ts`,
`packages/orch/src/daemon/server/handlers/relaunch.ts` or anything under
`packages/orch/src/commands/lifecycle/`. Other agents are editing them.

Tests, in the test file that covers the far viewer today, with the fake backends already
used there:
- A spawner in a plexer spawns an agent that lands in `held` on this host: one viewer pane
  is requested from the spawner's backend, with the agent's name.
- The same spawn from a spawner with no plexer: none.
- An agent placed in a pane: none.
- The existing far cases pass unchanged.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 `orch restart <agent> --form tui|acp`
Read `acp/MODEL.md` section "Switching form". Read
`packages/orch/src/daemon/server/handlers/relaunch.ts`, the `restart` command under
`packages/orch/src/commands/`, its entry in `packages/orch/src/commands/registry.ts` and
`packages/orch/src/daemon/client/protocol.ts`, `packages/orch/src/daemon/server/acp-agents.ts`,
`packages/orch/src/backends/held/index.ts`, `packages/orch/src/acp/session.ts`,
`packages/orch/src/types/adapter.ts` for the `acp` and `resume` roles, and the store
functions that open and close an `agent_forms` row.

Another agent is editing `acp-agents.ts` and `held/index.ts` in small places right now: the
`openScreen` call, a new `openSessionLog` call and a `heldCwd` helper. Read each file again
right before you edit it, and keep those edits.

End state:
- `orch restart <agent> --form <form>` parses the form the way `orch spawn --form` does and
  sends it in the restart request, null when the flag is absent. The help text and the
  registry entry state the flag. The request travels to the orchd where the agent runs the
  way restart already does.
- `startAcpAgent` takes how to open the session: new, or an existing session id. With a
  session id it opens with `load` when the binding offers it, else `resume`. Before a `load`
  the session log is emptied, because the replay writes the whole conversation again.
- A restart with no `--form`, or with the agent's current form, restarts the agent in its
  current form. The start is picked by `FORM_STDIO` of that form, the way spawn picks it. An
  agent whose form needs pipes is started again by `startAcpAgent` on its recorded session id
  when it has one.
- A restart to another form keeps the agent id, the lease and the backend. It ends the
  agent's process and channel in the old form, closes the open `agent_forms` row, opens the
  next, and starts the new form on the recorded session id:
  - to a form that needs a terminal: the adapter's `resume.argv(opts, sessionId)` in a held PTY.
  - to a form that needs pipes: `startAcpAgent` with the session id.
- `probeAcpAgent` in `src/acp/session.ts` also returns `load: boolean` and `resume: boolean`
  from the initialize response. Its other callers keep working.
- Refusals, each exit 1, checked in this order, all before anything of the running agent is
  ended:
  1. The adapter lacks the role the target form needs: `harness <harness> has no <form> form`.
  2. The agent's backend does not offer the stdio the form needs, by `offersForm`:
     `cannot switch <agent> to <form>: its backend <backend> does not run that form`.
  3. No session id is recorded for the agent:
     `cannot switch <agent> to <form>: no session id is recorded`.
  4. The adapter's `acp.sharesSessions` is false:
     `cannot switch <agent> to <form>: the <harness> binding does not share sessions with its TUI`.
  5. The target form needs pipes, and a probe of the binding offers neither load nor resume:
     `cannot switch <agent> to <form>: the <harness> binding does not offer session load`.
- No comparison with a form id anywhere: `FORM_STDIO`, `offersForm` and the adapter's roles decide.

Do not edit `packages/orch/src/daemon/server/spawn/`. Another agent is editing it.

New `packages/orch/test/restart-form.test.ts`, on the fake PTY provider, `fakePipes()`,
`fakeAcpAgent` and a fake adapter with `acp` and `resume` roles, built like
`packages/orch/test/acp-agents.test.ts`:
- An `acp` agent with a session id, restart to `tui`: the fake agent's session was closed,
  the pipes are released, a PTY was started whose argv is the adapter's resume argv with
  that session id, the agent id is unchanged, and the agent's open form is `tui`.
- That agent, restart to `acp`: the PTY ended, the binding received `session/load` with the
  session id, the replayed entries are the whole session log, and the open form is `acp`.
- A binding that offers resume and not load: it received `session/resume`.
- Each of the five refusals, with its exact message, and the agent still running in its old form.
- Restart with no `--form` on an `acp` agent: the binding was started again and received the
  session id.

Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Bring the plan docs in line with what landed
Edits only `acp/TASKS.md`, `acp/README.md` and `acp/MODEL.md`. Read-only on code. Run no
command except `grep`, `cat`, `ls`, `git diff`, `git status` and `git log`.

Read `acp/TASKS.md`, `acp/README.md`, `acp/MODEL.md`, every file under `acp/tasks/`, and the
one-line verdict at the end of every file under `acp/findings/review-*.md`.

Write the docs as the current state. No history, no "was", no "changed from", no dates.
No em dashes, no parentheses in prose, sentence case headings, plain words.

`acp/TASKS.md`:
- The index lists every task file under `acp/tasks/` once, in the order the work ran, each
  with one line saying what it holds. `P1-parallel.md` through `P6-finish.md` and
  `L2-wiring-lookup.md` are missing today.
- Every task whose code is in the tree is checked. Check a task by finding its named file
  or exported name with `grep` or `ls`. A task you cannot find stays unchecked.
- The waves that P1 to P6 covered are stated as done by pointing at the P file and section
  that did them. An outline wave that P1 to P6 did not cover stays as it is.
- Every `**Bryan:**` line stays, word for word, unchecked.

`acp/MODEL.md`, each as a short statement in the section it belongs to, matching the code:
- "What the ACP session reports": one owner per form. `FORM_SESSION_OWNER` in
  `src/types/form.ts` says who holds a form's session. That side writes the transcript and
  reports the agent's state. orchd ignores a `report-status` or `report-result` from the
  harness of an agent whose form's owner is `orchd`.
- "Questions": a question may carry options. `orch answer` then takes a whole number from 1
  to the count, and anything else is refused with `answer with a number from 1 to <count>`.
- "Channels": a link states the actions it takes, and may have an abort role. Abort calls
  the role when the attached link has one, else sends the abort keys.
- "Transcript and events": a thought chunk writes no entry. A plan writes one assistant
  message with one line per item. An agent's session log exists from the moment it starts.
- "Switching form": read the refusal messages from
  `packages/orch/src/daemon/server/handlers/relaunch.ts` and list them. A load empties the
  session log first because the replay writes the conversation again. A resume keeps the log.
- "Viewers": state the rule as `packages/orch/src/daemon/server/spawn/viewers.ts` has it.
If the code disagrees with a line above, write what the code does and name the line in your report.

`acp/README.md`: the file list names every directory and file kind under `acp/` as it is now.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>" or "blocked: <exact error>".

## T5 What restart prints, and a test through the handler
Read `packages/orch/src/daemon/server/handlers/relaunch.ts`,
`packages/orch/src/daemon/server/handlers/restart-form.ts`,
`packages/orch/src/commands/lifecycle/reload.ts`, the restart response in
`packages/orch/src/daemon/client/protocol.ts`, and `packages/orch/test/restart-form.test.ts`.

1. After a restart the CLI prints `bridge live.` and `restarted with fresh bridge.` for every
   agent. That is false for an agent whose session orchd holds. End state: the restart
   response says whether a bridge came back, as a field orchd fills from what it did, and
   the form the agent now runs in. The CLI prints the bridge lines only when the field says
   a bridge came back. Otherwise it prints `restarted <agent> in the <form> form.` The CLI
   compares no form id and reads no table: it prints what the response holds.
2. `restartInForm` in `relaunch.ts` has no test. Add one case to
   `packages/orch/test/restart-form.test.ts` that goes through the restart handler the way
   the existing restart tests in `packages/orch/test/held-lifecycle.test.ts` call it: an agent
   in the `tui` form on a backend that offers no pipes, restart with form `acp`, refused with
   `cannot switch <agent> to acp: its backend <backend> does not run that form`, and the
   agent still runs in `tui`. Use a real adapter from the registry that has an `acp` role,
   found by walking the registry for a non-null role, never by naming a harness.

Do not edit `packages/orch/src/daemon/server/spawn/` or `packages/orch/src/acp/`.

Tests: `packages/orch/test/restart-form.test.ts`, `packages/orch/test/held-lifecycle.test.ts`,
and the test file that covers what `orch restart` prints, if one exists.
Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## R5 Review: switching form
Read-only on code. Writes one file: `acp/findings/review-P6-restart.md`. Run no command
except `grep`, `cat`, `ls`, `git diff` and `git status`.

Read section T3 of this file and `acp/MODEL.md` section "Switching form". Read whole:
`packages/orch/src/daemon/server/handlers/restart-form.ts`,
`packages/orch/src/daemon/server/acp-agents.ts`, `packages/orch/test/restart-form.test.ts`.
Read with `git diff --`: `packages/orch/src/daemon/server/handlers/relaunch.ts`,
`packages/orch/src/acp/session.ts`, `packages/orch/src/acp/link.ts`,
`packages/orch/src/agent/session-log.ts`, `packages/orch/src/backends/held/index.ts`,
`packages/orch/src/commands/spawn/flags.ts`, `packages/orch/src/commands/lifecycle/reload.ts`,
`packages/orch/src/commands/registry.ts`, `packages/orch/src/daemon/client/protocol.ts`.
Another agent is editing `reload.ts`, `protocol.ts` and the restart response right now: do
not report what the CLI prints after a restart.

Check against T3's end state and the rules at the top of this file. Check by name:
a. Every refusal is thrown before anything of the running agent is ended, in T3's order,
   with T3's exact text and no parentheses.
b. A failure after the old form is ended: what state the agent is left in, whether its
   `agent_forms` row matches what runs, and whether pipes, PTY, screen or link leak. Name
   each path that leaves the store saying one form while another runs, or nothing runs.
c. The probe process is always ended and its pipes released, on success, refusal and throw.
d. No comparison with a form id, a harness id or a backend id. No literal timeout or name.
e. `recordHeldAgent` on a key the store already holds: every existing caller still records
   what it recorded before, and no caller depends on the old overwrite.
f. `startHeldAgent` with a `program`: every existing caller compiles to the same behavior.
g. The lease and the agent id are untouched by a switch. Name the line that proves each.
h. The `existing` open kind in `session.ts`: load is preferred, the log is emptied only
   before a load, and neither offered rejects with a message naming what is missing.
i. Code copied from `startAcpAgent`, `startHeldAgent` or `relaunch.ts` that could be called.
j. Each T3 test case exists and asserts what T3 says.

Answer shape, one entry per finding:
`<file>:<line>` then the rule or end-state line it breaks, then the exact edit that fixes it.
End with `T3: <count> findings`. Zero findings is a valid answer. Do not report style or
naming taste.

Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: acp/findings/review-P6-restart.md, <count> findings" or "blocked: <exact error>".

## T6 Fixes from the restart review
Read `acp/findings/review-P6-restart.md` whole, then
`packages/orch/src/daemon/server/handlers/restart-form.ts`,
`packages/orch/src/daemon/server/handlers/relaunch.ts`,
`packages/orch/src/daemon/server/acp-agents.ts`, `packages/orch/src/backends/held/index.ts`,
`packages/orch/src/daemon/server/doctor/bins.ts`, `packages/orch/src/agent/session-log.ts` and
`packages/orch/test/restart-form.test.ts`. The decisions are made below. Apply them as written.

1. Finding 1. In `swapProcess`, `setForm` runs after `start()` has returned or resolved, never
   before. A start that throws leaves the store on the old form.
2. Finding 2. `restartPipes` with a recorded session id runs the same probe check `switchForm`
   runs, through one shared function, before anything is ended, and refuses with the
   refusal 5 text. With no session id it opens a new session and probes nothing.
3. Findings 3 and 4. Doctor already starts a binding and probes it under
   `timeouts.acp_probe_ms`, in `doctor/bins.ts`. That is the one binding probe. Move it to a
   server module both doctor and `restart-form.ts` import, returning what `probeAcpAgent`
   returns and rejecting on the timeout. `restart-form.ts` deletes its own pipes spawn and
   calls it. The probe gets the environment doctor gives it, never an agent's launch
   environment. The probe process is ended and its pipes released on every path.
4. Finding 5. Recording is explicit. `recordHeldAgent` goes back to recording a new agent, so
   a key the store already holds fails as it did before T3. A second exported function
   records only the process and handle of an agent that exists. `startHeldAgent` and
   `startAcpAgent` each take which one applies as a required parameter with two named
   values, and every caller states it: spawn paths the new agent, restart paths the
   existing one. Nothing infers it from the store.
5. Finding 6. One function builds the `SpawnOpts` for a restart from what the store holds
   about the agent, and every restart path that needs opts calls it. If `relaunch.ts`
   already has it, call that. For each of `env`, `tools`, `workers` and `worktree`: if the
   store holds it, the opts carry it. If the store does not hold it, leave it out and name
   it in your report.
6. The residual. A failed `session/load` must not lose the log. Replace `emptySessionLog`
   in `session-log.ts` with one function that sets the existing log aside under a sibling
   name built from an exported constant, creates the log empty, and returns
   `{ keep(): void; restore(): void }`: `keep` deletes the one set aside, `restore` puts it
   back over the new one. `startAcpAgent` calls it from `onLoad`, calls `restore` when the
   open rejects, and `keep` when it resolves. No other caller of `emptySessionLog` stays.
7. Findings 7 and 8, in `restart-form.test.ts`:
   - The agent id: capture the id before the switch, and after it assert the store holds
     one agent with that name and that id.
   - The lease: the holder read before the switch equals the holder read after.
   - The backend refusal case asserts the old form still runs.
   - The refusal 5 case asserts the probe process was killed and no pipes are held for it.
   - New case: a start that throws during a switch leaves the open form the old one.
   - New case: a `session/load` that the fake agent rejects leaves the session log holding
     the entries it held before.
   - New case: `restartPipes` on a binding that offers neither load nor resume, with a
     session id recorded, is refused and the old process still runs.

Do not edit `packages/orch/src/daemon/server/spawn/` beyond the one required parameter a
caller there must now pass. Do not edit `packages/orch/src/commands/`.

Tests: `packages/orch/test/restart-form.test.ts`, `packages/orch/test/acp-agents.test.ts`,
`packages/orch/test/session-log.test.ts`, `packages/orch/test/held-spawn.test.ts`,
`packages/orch/test/held-lifecycle.test.ts`, and the doctor test file that covers the binding probe.
Verify: `bun check`.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
