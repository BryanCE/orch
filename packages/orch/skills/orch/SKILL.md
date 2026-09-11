---
name: orch
description: Drive the orch CLI to run a fleet of coding agents - spawn, dispatch work, watch state transitions, and collect results. The moment you are told to use orch, use it, or spawn agents, your FIRST action is `orch spawn` - one command, no preflight, no driving the plexer yourself, no asking. Then dispatch async and watch the push stream; never babysit with a blocking wait. Use for any multi-agent dispatch, for spawn/tile/close/reset lifecycle, for the durable task queue, or when an orch command errors.
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

`orch setup` must have run once. Every command except `setup`, `doctor`, `status`, `help`,
and `version` refuses until it has, naming the fix. Broken install: `orch doctor -y`.

## The loop

Told to use orch? `orch spawn` is your first tool call. No status preflight, no asking.

```bash
orch spawn api-types api-routes api-guards --tab api --prompt "<the first task>"
orch dispatch api-types "<the full task spec>"
orch dispatch api-routes --file slice.md --with src/api/routes.ts   # spec too long for a line
orch events                                            # arm as a Monitor in this same message
orch result api-types
```

Read the diff, `orch rename <target> <next-slice>`, dispatch again. Dispatch clears the
context itself, so there is no reset step between two tasks.

## Rules

- **You are the mind, workers are hands.** Slice by file ownership before the first spawn and
  keep every worker on its own files. One dispatch is one to three tiny edits with exact
  paths, names, and signatures already decided. A spec a worker has to "figure out" is
  under-specced: split it. A multi-section spec to one pane is the failure; the same work is
  a mover, a code-changer, and a checker running at once. Workers may go find things for you
  (a doc, a definition, every caller of a symbol) when you name the topic and the answer
  shape. They never design a feature, pick an approach, or decide what to build.
- **An agent starts where you spawned it.** No flag for the normal case. `--dir <path>` when a
  slice belongs somewhere else. A repo path typed into a prompt is text, not a boundary: a
  fleet spawned from one repo has edited another's source that way.
- **The positionals are the names, one per agent.** No `--name` flag, no count argument, no
  `<prefix>-N` numbering. Name each agent for the slice it holds.
- **Single-quote the spec; a mangled prompt is never an orch bug.** The shell splits argv
  before orch exists, so orch receives whatever survived. Single quotes are literal in bash,
  zsh and PowerShell alike, so one rule covers every shell orch runs under. Use `--file` for a
  spec too long for one line, never to dodge quoting.
- **Arm the watch in the same message as the first dispatch.** Not after it. An unwatched
  fleet finishes and sits done while you believe it is still working, and `orch status` only
  saves you if you already suspect something.
- **Arm the watch with no flags at all.** `orch events` bare already streams every state of
  every agent you own, in lines complete enough to act on. A flag only ever narrows that
  (`--filter=done,error` hides the agents working and asking) or widens it to the rest of
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
- **`orch dispatch` already clears the context.** It clears the session, re-pins the model,
  then sends, so a new task never stacks on a used session. Do not pair it with `orch
  reset`. `--keep-context` opts out, only to add to work already in flight.
- **Reuse before spawn, your own panes only.** Spawn a replacement only after a
  dispatch to the idle agent actually errors, then close the zombie it replaces.
- **Send the task and only the task.** orch composes the worker contract per adapter and
  prepends it to every dispatch. A hand-written near-copy delivers the rule twice in two
  wordings and the two drift. A missing rule gets added to the header. `--raw` opts out.
- **`done` is a claim, not a verification.** Read the diff before building on it.
- **Redispatch once on error, then escalate the model.** Not the other way around.
- **Answer `asking` within seconds.** `orch questions`, then `orch answer`. A blocked pane is
  the most expensive idle, and a steer aimed at one is accepted and then lost.

## Lifecycle

| verb | what it does | when |
|---|---|---|
| `orch reset <target>` (alias `new`) | fresh session, same agent, model re-pinned | you want the context gone without sending work |
| `orch reload <target>` | live-reload code in place after a rebuild | you rebuilt orch or an extension |
| `orch restart <target>` | full harness process relaunch | reset and reload both failed |
| `orch close <target>` (alias `kill`) | close the pane | that domain is finished for good |

## Collect

```bash
orch result <target>          # results.jsonl, else the session's last assistant text
orch tail <target> -n 40      # last N session entries, human-readable
orch peek <target>            # what is literally on the pane screen right now
orch questions                # every agent currently blocked on a question
orch answer <target> "<text>" # unblock one
```

Closing does not discard the work. `orch close` ends the process and keeps the agent's row
and its history, so `orch result` and `orch tail` still answer afterwards. Only `orch reap`
deletes, and retention sweeps ended agents on its own schedule.

## Reference

- `reference/fleet.md` for tabs and domains, slicing, naming, fleet size, capacity, and the
  cadence that keeps panes busy.
- `reference/commands.md` for spawn flags, models, dispatch options, the queue, watch
  scoping and event fields, steering, worktree review, settings and notify sinks.
- `reference/troubleshooting.md` for daemon skew, ambiguous targets, the `status --json`
  shape, workspace walls, doctor and clean.
