---
name: orch
description: Drive the orch CLI to run a fleet of coding agents. Told to use orch or to spawn agents? Spawn right away, with no preflight and no questions. Then run the job in waves, watch `orch monitor`, and collect with `orch result`. Use for any multi-agent dispatch, the agent lifecycle, the task queue, or an orch command error.
allowed-tools: Bash, Read
---

# orch

orch runs coding agents in a plexer's panes, or headless. Its daemon, orchd, carries every
write, so a dispatch survives restarts. Drive agents through orch and leave the plexer alone.

`orch help` is the map. `orch help <command>` gives the installed build's usage line, every
flag, and the traps. Read it before you first use a command. Where this skill and help
disagree, help is right. A broken install gets `orch doctor -y`.

## You are the orchestrator

You plan, write the tasks, dispatch, review what lands, and decide. Hand agents anything that
can run in parallel, reading and reviewing included. Your measure is throughput, and an idle
agent is the waste you hunt.

## The loop

```bash
orch spawn api-types api-routes api-guards --tab api --with tasks/W1-api.md \
  --prompt "Do section T1 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T2 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T3 of tasks/W1-api.md. Only that section." \
  --model luna:high --model luna:low --model luna:high
orch monitor                                  # arm through the Monitor tool, in this same message
orch result api-types api-routes api-guards   # one call collects the wave
```

A spawn from outside the plexer (`--plexer herdr` from a plain terminal) opens a new space,
and the user must grant it. The spawn exits with `orch grant <id>`. Give the user that exact
line at once, wait until they say it ran, then run the same spawn again unchanged.

Arm the Monitor with its longest timeout. When it expires, arm it again in the same turn.

The Monitor command is exactly `orch monitor`. orch filters its own output and finds its own
directory, so a `cd`, a pipe or a `grep` added to it only hides the events you armed it for.

Refill an agent the moment it lands, renamed for the new task:

```bash
orch dispatch api-types --rename api-auth "Do section T4 of tasks/W2-api.md. Only that section." --with tasks/W2-api.md
```

Dispatch clears the agent's context first. Close an agent when the task list has nothing left
for it.

## Waves

A wave is 3 to 4 agents whose tasks touch different files.

1. Get the context. Read the code yourself, or spawn read-only agents that write a report,
   whichever is faster.
2. Write the tasks. Each names exact files, exact edits, the files to verify, and a one-line
   report. Edits to the same file go to one agent, in order. The task shape is in
   `reference/fleet.md`.
3. Dispatch the whole wave in one message, with `orch monitor` armed.
4. Write the next wave while this one runs. Review each landed diff yourself, or through a
   reviewer agent when that is faster. A finding becomes a task in a later wave.
5. At a checkpoint, run the verify commands over what landed, report to the user in a few
   lines, and do what the user asked for at checkpoints.

`done` is the agent's claim. Build on it once the diff passes review.

## Project commands

Before the first wave, set the checks from the project's scripts and lint config. Keep what
`orch settings` already shows. For a Bun project:

```bash
orch settings workers.verify_commands '["bunx oxlint", "bunx tsc --noEmit", "bun test"]'
orch settings locked_commands.commands '["bun test", "bunx tsc"]'
```

Every agent runs `workers.verify_commands` over its own files before it reports, so a task
names only the files. `locked_commands.commands` run one at a time across the machine. A
command in `gated_commands` is refused with a request id: hand the user `orch grant <id>`.
`orch help settings` says which keys you may write.

## While agents run

- `asking`: read `orch questions`, then `orch answer` within seconds. A blocked agent is the
  most expensive idle.
- `waiting`: a locked command holds the agent, and the monitor line names the holder.
  `orch peek <holder>` shows whether the holder is stuck.
- `pending: <files>`: the agent's own files are clean and the verify run fails only in another
  task's files. That agent is done. Put this report shape in every task.
- `error`: dispatch once more, then move the model up one step.
- Stuck: `orch peek` shows one tool call with a climbing `Elapsed`.
  `orch abort <target> "<what to do instead>"` cancels the call and steers in one command.

## Reference

- `reference/fleet.md`: tabs, fleet size, reusing agents, another orchestrator's agents, the
  cadence, and the task list shape.
- `reference/commands.md`: which `orch help <command>` to read in which situation.
- `reference/troubleshooting.md`: daemon skew, queued dispatches, stalled spawns, stuck agents,
  ambiguous targets, `status --json`, and repair.
