---
name: orch
description: Drive the orch CLI to run a fleet of coding agents. Told to use orch or to spawn agents? Spawn right away, with no preflight and no questions. Then run the job in waves, watch `orch monitor`, and collect with `orch result`. Use for any multi-agent dispatch, the agent lifecycle, the task queue, or an orch command error.
allowed-tools: Bash, Read
---

# orch

`orch` runs coding agents (`pi`, `omp`, `claude`, `codex`) in panes of a terminal
multiplexer (`herdr`, `tmux`, `orca`), or headless. A resident daemon brokers every write, so
a dispatch survives restarts and state changes arrive as a push stream. Drive agents through
orch and leave the plexer alone.

`orch help <command>` holds every flag, default and output shape for the installed build.
Read it before the first use of a command. Settings live in `$ORCH_DIR/settings.json`, and
`orch settings` reads and writes them. A broken install gets `orch doctor -y`.

## You are the orchestrator

Your measure is throughput: the job finished and correct, as fast as the fleet can go.
Everything below is a default. Use your judgment at each step and take the path that
finishes fastest.

You plan, split the work, dispatch, review what lands, and decide. Read any file you need.
Hand agents any work that can run in parallel, reading and reviewing included. Keep every
agent busy. An idle agent is the waste you hunt.

## The loop

```bash
orch spawn api-types api-routes api-guards --tab api --with tasks/W1-api.md \
  --prompt "Do section T1 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T2 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T3 of tasks/W1-api.md. Only that section." \
  --model luna:high --model luna:low --model luna:high
orch monitor                                  # arm as a Monitor in this same message
orch result api-types api-routes api-guards   # one call collects the wave
```

The Monitor's command is exactly `orch monitor`. orch filters and formats its own output and
finds its own directory, so a `cd`, a `2>&1`, a pipe or a `grep` only hides the events you
armed it for.

A fleet is one command. The positionals are the agent names, one per slice. `--tab` names the
domain. `--file`, `--prompt` and `--model` each take one value for all agents or exactly one
per agent. `--with <path>` reaches every agent, and `--with <name>=<path>` reaches one.

Spawn returns once every bridged agent (`pi`, `omp`) attaches or `timeouts.spawn_attach_ms`
runs out, so the next command can follow at once. `claude` and `codex` have no bridge. Spawn
prints an UNVERIFIED warning for them, and `orch status` shows when they are ready.

Refill the moment an agent lands:

```bash
orch rename api-types api-auth && orch dispatch api-auth "Do section T4 of tasks/W2-api.md. Only that section." --with tasks/W2-api.md
```

Dispatch clears the agent's context itself, so the next task goes straight in.

## Waves

A wave is 3 to 4 agents on tasks that touch different files. The usual shape:

1. Context. With the context in hand, write the tasks and dispatch. Without it, read the code
   yourself or spawn read-only agents to report on it, whichever is faster.
2. Tasks. Each names exact files, exact edits, the files to verify, and the report shape. No
   two tasks in a wave touch the same file. The task shape is in `reference/fleet.md`.
3. Dispatch the whole wave in one message, with `orch monitor` armed.
4. Write the next wave while this one runs. Review each landed diff yourself, or hand it to a
   reviewer agent when that is faster. A finding becomes a task in a later wave.
5. Refill each agent as it lands. Close it when the task list has nothing left for it.
6. At a checkpoint, run the verify commands over what landed, report to the user in a few
   lines, and do what the user asked for at checkpoints.

`done` is the agent's claim. Build on it once the diff passes review.

## Sending a task

The task list is what you send, so write each task once and send it where it stands:

- A task file goes as `--file tasks/T13.md`. Its contents are the prompt.
- A wave file with one `## T13 <title>` section per task goes as a one-line pointer, with the
  wave file in `--with`:
  `--prompt "Do section T13 of tasks/W2-core.md. Only that section." --with tasks/W2-core.md`.
  The agent does its own section and reads the others as context.
- A short task goes inline: `--prompt` on spawn, the quoted argument on dispatch.
- A spec the user wrote goes as `--file`.

`--with <path>` hands the agent a path to open for context: a wave file, a report, a
directory. orch checks that it exists and never reads it.

## Project commands

Set these once per project, before the first wave:

```bash
orch settings workers.verify_commands '["bunx oxlint", "bunx tsc --noEmit", "bun test"]'
orch settings locked_commands.commands '["bun test", "bunx tsc"]'
```

`workers.verify_commands` goes into every worker's header. Each worker runs them over its own
files before it reports, so a task names only the files. Write `{cwd}` or `{wincwd}` for the
agent's directory. `locked_commands.commands` run one at a time machine-wide. The harness hook
locks each match, so ten workers take turns on the test suite without knowing it. Pick both
from the project's scripts (`package.json`, `Makefile`) and lint config. When
`orch settings` already shows them, keep them.

Rows marked `agent` in `orch settings` are yours to write. Every other key is the user's. A
refusal names the keys you may set and the `orch settings grant` the user runs to widen them.
A command list takes whole commands only: `bun test` matches the full suite, and
`bun test <file>` stays free. orch refuses prose, `*` and `<file>` in a list.

`gated_commands` need the user's approval. A match is refused with a request id, the worker
reports the id, and you hand the user `orch grant <id>`. The worker reruns the command once
the user approves it. `denied_commands.commands` never run, and
`denied_commands.applies_to` says for whom: `slave`, `orch`, or both.

## While agents run

- `asking`: answer within seconds with `orch questions`, then `orch answer`. A one-line scope
  grant settles most questions. A blocked agent is the most expensive idle.
- `waiting`: a locked command holds the agent, and the monitor line names the holder. After
  `timeouts.lock_wait_ms` the monitor shows `gave up on "<pattern>"`, and the agent does its
  other work first. `orch peek <holder>` shows whether the holder is stuck.
- `pending: <files>`: the agent's own files are clean and the verify run fails only in
  another task's files. That agent is done. orch's worker header leaves this out, so put it
  in every task.
- Error: redispatch once, then move the model up one rung.
- Stuck: `orch peek` shows one tool call with a climbing `Elapsed`. A steer waits for that
  call to return. `orch abort <name> "<what to do instead>"` cancels the call and steers in
  one command.

## Reference

- `reference/fleet.md`: tabs, fleet size, capacity, slicing, renaming, another session's
  agents, the cadence, and the task list shape.
- `reference/commands.md`: which `orch help <command>` to read in which situation, targets,
  and steering.
- `reference/troubleshooting.md`: daemon skew, model refusals, queued dispatches, stalled
  spawns, ambiguous targets, `status --json`, space walls, and repair.
