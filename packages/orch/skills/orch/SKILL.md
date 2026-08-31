---
name: orch
description: Drive the orch CLI to run a fleet of coding agents in visible panes - spawn, dispatch work, watch state transitions, and collect results. The moment you are told to use orch, use it, or spawn agents, your FIRST action is `orch spawn` - one command, no preflight, no driving the plexer yourself, no asking. Then dispatch async and watch the push stream; never babysit with a blocking wait. Use for any multi-agent dispatch, for spawn/tile/close/reset lifecycle, for the durable task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch

`orch` runs coding agents (the harnesses: `pi`, `omp`, `claude`, `codex`) in panes of a
terminal multiplexer (the plexers: `herdr`, `tmux`, detached `headless`). A resident daemon
brokers every write, so a dispatch survives restarts and state changes arrive as a push
stream instead of a poll.

Never drive the plexer directly. `orch help <command>` is authoritative for flags. Config is
`$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON you may edit by hand.

`orch setup` must have run once. Every command except `setup`, `doctor`, `status`, `help`,
and `version` refuses until it has, naming the fix. Broken install: `orch doctor -y`.

## The loop

Told to use orch? `orch spawn` is your first tool call. No status preflight, no asking.

```bash
orch spawn api-types api-routes api-guards --tab api --cwd "$(git rev-parse --show-toplevel)"
orch dispatch api-types "<the full task spec>"
orch events --all --status done,error,blocked,asking   # arm as a Monitor in this same message
orch result api-types
```

Read the diff, `orch reset <pane>`, `orch rename <pane> <next-slice>`, dispatch again.

## Rules

- **Pass `--cwd "$(git rev-parse --show-toplevel)"` on every spawn.** Omitting it does not
  fail loudly. It records whatever directory you ran from and `orch status` then shows a
  confident path to the wrong repo. A repo path typed into a prompt is text, not a boundary.
  A fleet spawned for one repo has edited another's source this way.
- **The positionals are the names, one per agent.** No `--name` flag, no count argument, no
  `<prefix>-N` numbering. Name each pane for the slice it holds.
- **Arm the watch in the same message as the first dispatch.** Not after it. An unwatched
  fleet finishes and sits done while you believe it is still working, and `orch status` only
  saves you if you already suspect something.
- **`--all` is required today** (U9, 2026-08-29). The default caller-space scope drops the
  events of a fleet spawned from a pane in no space, and the watch never fires.
- **Arm through the Monitor tool (`persistent: true`).** Never `&`, `nohup`, or
  `run_in_background`. A stream that never exits never wakes a harness that wakes on
  completion, and the silence looks exactly like "still working".
- **Never wrap `orch status` in a `while true` loop.** `orch events` pushes transitions the
  instant they happen. `orch status` is for one-shot inspection.
- **`orch reset <target>` before every new task.** Never stack a task on a used session.
- **Reuse before spawn, your own panes only.** Spawn a replacement only after a
  reset-and-dispatch on the idle pane actually errors, then close the zombie it replaces.
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
| `orch reset <target>` (alias `new`) | fresh session, same pane, model re-pinned | before every new task |
| `orch reload <target>` | live-reload code in place after a rebuild | you rebuilt orch or an extension |
| `orch restart <target>` | full harness process relaunch | reset and reload both failed |
| `orch close <target>` (alias `kill`) | close the pane | that domain is finished for good |

## Collect

```bash
orch result <target>          # result.json, else the session's last assistant text
orch tail <target> -n 40      # last N session entries, human-readable
orch peek <target>            # what is literally on the pane screen right now
orch questions                # every agent currently blocked on a question
orch answer <target> "<text>" # unblock one
```

## Reference

- `reference/fleet.md` for tabs and domains, slicing, naming, fleet size, capacity, and the
  cadence that keeps panes busy.
- `reference/commands.md` for spawn flags, models, dispatch options, the queue, watch
  scoping and event fields, steering, worktree review, settings and notify sinks.
- `reference/troubleshooting.md` for daemon skew, ambiguous targets, the `status --json`
  shape, workspace walls, doctor and clean.
