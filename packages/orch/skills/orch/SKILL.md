---
name: orch
description: Drive the orch CLI to run a fleet of coding agents. Told to use orch or to spawn agents? Your first tool call is `orch spawn`, with no preflight and no questions. Then run the job as waves, watch `orch monitor`, and collect with `orch result`. Use for any multi-agent dispatch, the agent lifecycle, the task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch

`orch` runs coding agents (`pi`, `claude`, `codex`) in panes of a terminal multiplexer
(`herdr`, `tmux`). A resident daemon brokers every write, so a dispatch survives restarts
and state changes arrive as a push stream. Never drive the plexer directly.

`orch help <command>` is the source for every flag, default and output shape. Read it before
you guess at a flag. Config is `$ORCH_DIR/settings.json`, plain JSON you may edit by hand.
Broken install: `orch doctor -y`.

## The loop

```bash
orch spawn api-types api-routes api-guards --tab api \
  --file tasks/T1-types.md --file tasks/T2-routes.md --file tasks/T3-guards.md \
  --model luna:high --model luna:low --model luna:high
orch monitor                                  # arm as a Monitor in this same message
orch result api-types api-routes api-guards   # one call collects the wave
```

A fleet is one command. Every per-agent flag repeats exactly N times, or once for all. The
positionals are the names, one per agent, named for the slice each holds. `--tab` names the
domain. Spawn returns after every agent is attached, so never sleep after it.

Refill the moment an agent lands:

```bash
orch rename api-types api-auth && orch dispatch api-auth --file tasks/T4-auth.md --with recon/api.md
```

Dispatch clears the context itself. There is no reset step between two tasks.

## A task is written once. `--file` sends that file.

- `--file <path>` sends a file's contents as the prompt. The file is one you ALREADY have: a
  task you wrote in the task list, a spec the user wrote. Write each task straight into the
  file `--file` will send, one file per task, at the moment you write the task list.
- `--with <path>` hands the agent a path it opens for context: a recon report, a directory.
  Orch checks it exists and never reads it.
- A short task with no file is typed: `--prompt` on spawn, the quoted argument on dispatch.

Never write a second file to send a task that exists. Never rewrite, restate or copy a task
out of the task list into a temp file for `--file`. That is the same task paid for twice,
plus a file to name, create and clean up. The task list IS the files you send.

## Waves

Every job runs as waves of 3 to 4 agents. Nobody idles, not you and not an agent.

1. Recon wave. Before you read the tree yourself, spawn 3 to 4 agents that only read and
   report. Each gets one topic, an exact answer shape, and one report file to write.
2. Task list. You write it from the reports, in one sitting, before any implementing
   dispatch. Every task names exact files, exact edits, the tests to run, and the report
   shape. A task is 1 to 3 minutes of mechanical work. Group tasks into waves by file
   ownership. The shape is in `reference/fleet.md`.
3. Dispatch the whole wave in one message, `--file` on each task's own file as you wrote
   it, `--with` on the report it cites, and `orch monitor` armed.
4. Write the next wave's specs while this one runs. When an agent lands, read its diff and
   run the scoped checks. A finding is a task for the next wave, not an edit you make.
5. Refill the instant an agent lands. Rename, then dispatch. Close an agent only when the
   task list has nothing left for it.
6. Checkpoint between waves. Run the scoped checks over everything landed, report to the
   user in a few lines, and do what the user asked for at checkpoints.

## Who does what

You plan, write the task list, dispatch, read diffs, run scoped checks, and decide. You never
run the full test suite and never do a task an agent could do.

An agent does exactly what its task says, runs only the named tests once, and reports in the
shape the task asked for. It never plans, investigates past its topic, or decides. A task
that makes it do any of those was under-specced. Fix the task, not the agent.

## Rules

- A dispatch is one to three tiny edits with exact paths, names and signatures. A spec the
  agent has to figure out is two tasks.
- No two tasks in one wave touch the same file.
- `done` is a claim. Read the diff before you build on it.
- Answer `asking` within seconds: `orch questions`, then `orch answer`. A blocked agent is
  the most expensive idle.
- Redispatch once on error, then escalate the model one rung.
- `pending` is not `blocked`. An agent whose own files are clean but whose check names
  another task's files reports `pending: <files>` and is done. Say this in the task header.
- A question from an agent gets a one-line scope grant, not a discussion.
- Another session's agents are never yours. Spawn what fits, hold the rest.

## Reference

- `orch help <command>` for flags, defaults, output shapes and what each command refuses.
- `reference/fleet.md` for tabs and domains, fleet size, capacity, the task list shape, and
  the cadence that keeps panes busy.
- `reference/commands.md` for which `orch help <command>` to read in which situation, and
  the few rules that span commands: targets, reuse before spawn, steer once.
- `reference/troubleshooting.md` for daemon skew, model refusals, queued dispatches,
  stalled spawns, ambiguous targets, and repair.
