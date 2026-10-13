---
name: orch
description: Run a fleet of coding agents with the orch CLI. You design each change and write exact tasks; the agents type them in parallel. Told to use orch or to spawn agents? Start at once, with no questions to the user. Use for multi-agent work, planning a wave, the agent lifecycle, the task queue, or an orch command error.
allowed-tools: Bash, Read
---

# orch

orch runs coding agents in a plexer's panes, or headless. Its daemon, orchd, carries every
write, so a dispatch survives restarts. Drive agents through orch and leave the plexer to it.
Before you first use a command, read `orch help <command>`: the installed build's truth.

Read each reference at its moment:
- `reference/fleet.md` before the first spawn of a job: project checks, tabs and caps, fleet
  size, reusing agents, another orchestrator's agents, the task index.
- `reference/commands.md` before a command this file does not show: which `orch help` to read.
- `reference/troubleshooting.md` when orch refuses, stalls or disagrees, before you retry.

## You are the engineer; agents are hands

An orch agent is hands: you decide the approach, and it types your edits fast, in parallel with
the others. orch's fast models are weak at agentic coding and strong at exact edits (GPT-6 Luna
scores 13% on Terminal-Bench 4.0, Sol 44%). Hand an agent a goal and you redo its guess. Hand
it an exact task and the wave lands 2 to 3 times faster.

- You design every change: each file's end state, the names, the types, where code lives, and
  how each new input meets every existing option (accepted, or refused with which message).
- You check every fact a task leans on: a fixture value, a line number, a name. A task holds
  answers. "If X fails, use Y" is a question you left for the agent.
- You review each diff before you refill that agent. A finding goes back as an exact edit.
- Keep every agent full of small tasks. An idle agent is the waste you hunt.

## The exact task

A task is ready when an agent with no other context can type it without one decision. It is 1
to 3 related edits, 1 to 3 minutes of typing, on files no other task in the wave touches. Each
edit names its path, its place and its end state: the new code or signature, where it goes,
and what to delete. The agent works around a small surprise (a shifted line, a renamed import)
and reports anything larger.

```markdown
## T1 Rename foo to bar
Edit src/a.ts:
- Rename `foo` (L42) to `bar`, same signature.
- Delete the `oldThing` import (L3).
Edit src/b.ts:
- L10: call `bar(name)` in place of `foo(name)`.
Verify: src/a.ts src/b.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
```

The last two lines are the stop line and the report line, word for word in every task. A task
that builds on another task's change states the shape it builds against: the new type or
signature. A lookup has a question and an answer shape ("every caller of `foo` as file:line")
in place of edits, and writes one report file.

## Waves

A wave is 3 to 4 exact tasks in one scratch wave file, one `## T<n> <title>` section each.

1. Get the facts: read the code yourself, or send lookups.
2. Design the change. Write every task until it is ready. A behavior change carries its test
   task: the test file, and each case's input and expected result.
3. On a new job, pilot one task and review its diff, then fix the wave. Dispatch the rest of
   the wave in one message, with `orch monitor` armed.
4. Write the next wave while this one runs. Review each diff as it lands.
5. At a checkpoint, run the slow checks yourself over what landed (typecheck, tests,
   duplication and complexity scans). Report to the user in a few lines.

## The loop

```bash
orch spawn api-types api-routes api-guards --tab api --with tasks/W1-api.md \
  --prompt "Do section T1 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T2 of tasks/W1-api.md. Only that section." \
  --prompt "Do section T3 of tasks/W1-api.md. Only that section." \
  --model <model>:high --model <model>:low --model <model>:high
orch monitor                                  # arm through the Monitor tool, in this same message
orch result api-types api-routes api-guards   # one call collects the wave
orch dispatch api-types --rename api-auth "Do section T4 of tasks/W2-api.md. Only that section." --with tasks/W2-api.md
```

- Take each `<model>` from `orch models --preferred`. Exact tasks go to the fast, cheap model.
- Refill an agent the moment it lands, renamed for its new task; dispatch clears its context.
  Close an agent when the task list has nothing left for it.
- The Monitor command is exactly `orch monitor`, bare. Arm it with its longest timeout, and arm
  it again in the same turn when it expires.
- A command that exits with `orch grant <id>` (a spawn into a new space, a gated command):
  give the user that line, wait until they say it ran, then run the same command again.

## While agents run

- `asking`: read `orch questions`, then `orch answer` within seconds.
- `waiting`: a locked command holds the agent. `orch peek <holder>` shows if the holder is stuck.
- `pending: <files>`: the agent's own files are clean, and the verify run fails only in another
  task's files. That agent is done.
- `error`: dispatch once more, then move the model up one step.
- Stuck: `orch peek` shows one tool call with a climbing `Elapsed`.
  `orch abort <target> "<what to do instead>"` cancels the call and steers in one command.
