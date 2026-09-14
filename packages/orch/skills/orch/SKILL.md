---
name: orch
description: Drive the orch CLI to run a fleet of coding agents - spawn, dispatch work, watch state transitions, and collect results. The moment you are told to use orch, use it, or spawn agents, your FIRST action is `orch spawn` - one command, no preflight, no driving the plexer yourself, no asking. Then run the job as waves (recon orchs write reports, you write one task list, you dispatch 3-4 exact tasks at a time and refill the instant one lands) and watch the push stream; never babysit with a blocking wait. Use for any multi-agent dispatch, for spawn/tile/close/reset lifecycle, for the durable task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch

`orch` runs coding agents (the harnesses: `pi`, `omp`, `claude`, `codex`) in panes of a
terminal multiplexer (the plexers: `herdr`, `tmux`). Outside every plexer, `orch spawn` is
headless unless `--backend` names a plexer. That named plexer opens its own home behind a
user grant. A resident daemon brokers every write, so a dispatch survives restarts and state
changes arrive as a push stream instead of a poll.

Never drive the plexer directly. `orch help <command>` is authoritative for flags. Config is
`$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON you may edit by hand.

`orch setup` must have run once. Every command except `setup`, `doctor`, `settings`,
`status`, `help`, and `version` refuses until it has, naming the fix. Broken install:
`orch doctor -y`.

## The loop

Told to use orch? `orch spawn` is your first tool call. No status preflight, no asking.

A fleet is one command. Every per-agent flag repeats exactly N times, or once for all:

```bash
orch spawn api-types api-routes api-guards --tab api \
  --file specs/types.md --file specs/routes.md --file specs/guards.md \
  --model luna:high --model luna:low --model luna:high
orch events                                   # arm as a Monitor in this same message
orch result api-types api-routes api-guards   # one call collects the wave
```

Each agent starts on its own spec, on its own model, and gets to work before spawn returns.
Read the diffs, `orch rename <target> <next-slice>`, then `orch dispatch` the next slice.
Dispatch clears the context itself, so there is no reset step between two tasks.

```bash
orch dispatch api-types 'the full task spec'
orch dispatch api-routes --file slice.md --with src/api/routes.ts   # spec too long for a line
```

## Waves

Every job, planning included, runs as waves of 3 to 4 orchs. Nobody idles: not you, not an
orch. The order is fixed. Doing step 3 before step 2 is the failure this section exists to
stop.

1. **Recon wave.** Before you read the tree yourself, spawn 3 to 4 orchs whose only job is
   to read and report. Each gets one topic, an exact answer shape (file:line, signatures,
   a table), and one report file to write. You read the reports, not the tree. Your context
   is for planning, theirs is for reading.
2. **Task list.** You write it, in one sitting, from the reports, before any implementing
   dispatch goes out. Not an orch. Not "a few quick tasks first while I think": that is the
   failure this step exists to stop. It takes minutes, not the length of a wave. One task
   list file (see `reference/fleet.md` for the shape). Every task names exact files, exact edits with names and signatures, the
   test files to run, and the report shape to answer with. A task is 1 to 3 minutes of
   mechanical work. If a task needs the orch to investigate or choose, it is not a task:
   send another recon wave or split it. Group tasks into waves by file ownership, so no two
   tasks in one wave touch the same file. Mark checkpoints between waves.
3. **Dispatch the whole wave at once.** One message: 3 to 4 dispatches, each `--file` on
   its task, `--with` on the report it cites, and `orch events` armed as a Monitor.
4. **Prepare the next wave while this one runs.** Write the next specs now. By the time
   they are written the first orchs are landing. Read each diff, run `bun check` on the
   files that task touched and `bun test` on the test files that task named. A set of tests,
   never the full suite. A finding is a new task for the next wave, not an edit you make.
5. **Refill the instant an orch lands.** `orch rename` to the next slice, `orch dispatch`
   the next task. Close an orch only when the task list has nothing left for it. Never
   clear an orch while work remains.
6. **Checkpoint.** At every marked checkpoint: run the scoped checks over everything landed
   since the last one, report progress to the user in a few lines, and run what the user
   asked for at checkpoints (their commit skill, a summary). Then start the next wave.

Who does what, with no overlap:

- **You** plan, gather through orchs, write the task list, dispatch, read diffs, run the
  wider scoped checks, and decide. You never run the full test suite and you never do a
  task an orch could do.
- **An orch** does exactly what its task says, verifies only what the header tells it to
  (the named tests once at the end of the dispatch, or nothing at all when you said you
  would check), and reports back in the shape the task asked for. It never plans, never
  investigates past what it was named, never decides, never re-runs a check to be sure. A task that makes it do any of those
  was under-specced, and the fix is a better task, not a smarter orch.

The mechanics that keep the cycle fast:

- **Time budget.** Recon plus task list is a small fraction of the job. If orchs have been
  idle while you write, you are the bottleneck: dispatch what is ready and finish the list
  while they run.
- **One spec file per task.** Cut every task out of the task list into its own file the
  moment the list exists (a shell loop over the `### T<n>.` headings), with the list's
  conventions header on top. Then a refill is one `orch dispatch <name> --file specs/T<n>.md
  --with <report>`, never a rewrite.
- **Orchestrate for speed, every time, from the tasks in front of you.** There is no one
  shape. Look at the task list and pick the split that finishes soonest: how many orchs,
  how much each carries, and whether they verify their own work. Twenty two-line edits of
  one kind (convert a fixture, rename a call, drop an import) are five orchs with four
  edits each, told in the header to edit straight through with no tests and no `bun check`,
  because a refill and a diff read cost more than the edit and you run the checks when the
  batch lands. Five larger slices that each touch logic are five orchs with one slice each,
  running their own named tests once at the end. A mix is a mix. Following one recipe
  regardless of the work is the slow path; deciding the split is the orchestrator's job and
  nobody else will do it.
- **`pending` is not `blocked`.** Tasks in one wave compile against each other. An orch
  whose own files are clean but whose `bun check` names only another task's files reports
  `pending: <files>` and is done. `blocked` is reserved for its own slice. Say this in the
  conventions header so no orch stalls on a neighbour's red.
- **A question gets a scope grant, not a discussion.** When an orch asks whether it may touch
  a caller outside its named files, answer in one line: yes, these three files, this one
  change, name them in your done line. Then move on.
- **Rename on refill.** `orch rename <target> <slice>` in the same command as the dispatch,
  so the status column and the events stream name the work, not the spawn.

## Rules

- **You are the mind, workers are hands.** Slice by file ownership before the first spawn and
  keep every worker on its own files. One dispatch is one to three tiny edits with exact
  paths, names, and signatures already decided. A spec a worker has to "figure out" is
  under-specced: split it. A multi-section spec to one pane is the failure; the same work is
  a mover, a code-changer, and a checker running at once. Workers may go find things for you
  (a doc, a definition, every caller of a symbol) when you name the topic and the answer
  shape. They never design a feature, pick an approach, or decide what to build.
- **Short model names are fine.** `luna:high` expands to the one listed, allowed model that
  contains `luna`. Two matches are refused by name so you pick one. Zero matches names what
  the harness does list. Verify the MODEL column in `orch status` after a spawn or pin.
- **An agent starts where you spawned it.** No flag for the normal case. `--dir <path>` when a
  slice belongs somewhere else. A repo path typed into a prompt is text, not a boundary: a
  fleet spawned from one repo has edited another's source that way.
- **The positionals are the names, one per agent.** No `--name` flag, no count argument, no
  `<prefix>-N` numbering. Name each agent for the slice it holds.
- **Single-quote the spec; a mangled prompt is never an orch bug.** The shell splits argv
  before orch exists, so orch receives whatever survived. Single quotes are literal in bash,
  zsh and PowerShell alike, so one rule covers every shell orch runs under. Use `--file` for a
  spec too long for one line, never to dodge quoting.
- **Arm the watch in the same message as the spawn.** Not after it. An unwatched fleet
  finishes and sits done while you believe it is still working, and `orch status` only saves
  you if you already suspect something.
- **Arm the watch with no flags at all.** `orch events` bare already streams every state of
  every agent you own, in lines complete enough to act on. A flag only ever drops states
  (`--filter=working,idle` hides the transitions you never act on) or widens it to the rest of
  your space (`--space-wide`, for two orchs coordinating). Reach for one when you were told
  to observe something specific, never as standard setup.
- **`orch spawn` already waited.** It returns only after each agent's bridge attached to
  orchd (or prints `STALLED` and exits 1). Never `sleep` after a spawn. A dispatch sent before
  attach is queued, not dropped: orchd re-pushes it the moment the bridge attaches.
- **Arm through the Monitor tool (`persistent: true`).** Never `&`, `nohup`, or
  `run_in_background`. A stream that never exits never wakes a harness that wakes on
  completion, and the silence looks exactly like "still working".
- **Never wrap `orch status` in a `while true` loop.** `orch events` pushes transitions the
  instant they happen. `orch status` is for one-shot inspection.
- **`orch dispatch` already clears the context.** It clears the session, re-pins the model
  the agent holds, then sends, so a new task never stacks on a used session. Do not pair it
  with `orch reset`. `--keep-context` opts out, only to add to work already in flight.
- **Reuse before spawn, your own panes only.** Spawn a replacement only after a
  dispatch to the idle agent actually errors, then close the zombie it replaces.
- **Send the task and only the task.** orch composes the worker contract per adapter and
  prepends it to every dispatch. A hand-written near-copy delivers the rule twice in two
  wordings and the two drift. A missing rule gets added to the header. `--raw` opts out.
- **`done` is a claim, not a verification.** Read the diff before building on it.
- **Redispatch once on error, then escalate the model.** Not the other way around.
- **Answer `asking` within seconds.** `orch questions`, then `orch answer`. A blocked pane is
  the most expensive idle, and a steer aimed at one is accepted and then lost. The daemon
  re-asks on `questions.renag_ms` up to `questions.renag_limit` times, each a fresh `asking`
  event line, then gives up and says so.
- **A worker's report arrives as an event.** A worker whose bridge has peer tools replies to
  its spawner with `orch_send target "spawner"`, and that lands on your `orch events` stream
  as a `message` line carrying the text. A worker with no reachable spawner ends its turn and
  you collect with `orch result`.

## Lifecycle

| verb | what it does | when |
|---|---|---|
| `orch reset <target>` (alias `new`) | fresh session, same agent, held model re-pinned | you want the context gone without sending work |
| `orch reload <target>` | live-reload code in place after a rebuild | you rebuilt orch or an extension |
| `orch restart <target>` | full harness process relaunch, on the held model | reset and reload both failed |
| `orch close <target>` (alias `kill`) | close the pane | that domain is finished for good |

## Collect

```bash
orch result <target>...       # results.jsonl, else the session's last assistant text; N targets under == headers
orch result a b c --json      # one JSON array
orch tail <target> -n 40      # last N session entries, human-readable
orch peek <target>            # what is literally on the pane screen right now
orch questions                # every agent currently blocked on a question
orch answer <target> '<text>' # unblock one
```

Closing does not discard the work. `orch close` ends the process and keeps the agent's row
and its history, so `orch result` and `orch tail` still answer afterwards. Only `orch reap`
deletes, and retention sweeps ended agents on its own schedule.

## Reference

- `reference/fleet.md` for tabs and domains, slicing, naming, fleet size, capacity, and the
  cadence that keeps panes busy.
- `reference/commands.md` for spawn flags, models, dispatch options, the queue, watch
  scoping and event shapes, steering, worktree review, settings and notify sinks.
- `reference/troubleshooting.md` for daemon skew, ambiguous targets, model refusals, the
  `status --json` shape, space walls, doctor and clean.
