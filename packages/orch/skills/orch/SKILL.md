---
name: orch
description: Drive the orch CLI to run a fleet of coding agents. Told to use orch or to spawn agents? Your first tool call is `orch spawn`, with no preflight and no questions. Then run the job as waves, watch `orch monitor`, and collect with `orch result`. Use for any multi-agent dispatch, the agent lifecycle, the task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch

`orch` runs coding agents (`pi`, `omp`, `claude`, `codex`) in panes of a terminal
multiplexer (`herdr`, `tmux`, `orca`), or headless outside every plexer. A resident daemon
brokers every write, so a dispatch survives restarts and state changes arrive as a push
stream. Never drive the plexer directly.

`orch help <command>` is the source for every flag, default and output shape. Read it before
you guess at a flag. Config is `$ORCH_DIR/settings.json`; `orch settings` reads and writes
it. Broken install: `orch doctor -y`.

## The loop

```bash
orch spawn api-types api-routes api-guards --tab api \
  --file tasks/T1-types.md --file tasks/T2-routes.md --file tasks/T3-guards.md \
  --model luna:high --model luna:low --model luna:high
orch monitor                                  # arm as a Monitor in this same message
orch result api-types api-routes api-guards   # one call collects the wave
```

A fleet is one command. `--file`, `--prompt` and `--model` each take one value for all or
exactly N. `--with <path>` on a spawn reaches every agent; `--with <name>=<path>` reaches
only that agent.
The positionals are the names, one per agent, named for the slice each holds. `--tab` names
the domain. Spawn returns once every bridged agent (`pi`, `omp`) attached or
`timeouts.spawn_attach_ms` expired, so never sleep after it. `claude` and `codex` have no
bridge: spawn prints an UNVERIFIED warning, so check `orch status` before you dispatch.

Refill the moment an agent lands:

```bash
orch rename api-types api-auth && orch dispatch api-auth --file tasks/T4-auth.md --with recon/api.md
```

Dispatch clears the context itself. There is no reset step between two tasks.

## The project's commands are a setting, set once before the first wave

Every worker header carries `workers.verify_commands` (what a worker runs over its own
files before it reports; write `{cwd}` or `{wincwd}` for the agent's directory, never a
path). `locked_commands` are heavy commands that run one at a time machine-wide, so ten
workers never run the test suite at once; the harness hook locks each match, and the
worker never hears of it. A task file never names a
lint, type check or test command. Set both from the project before the first wave, once per
project:

```bash
orch settings workers.verify_commands '["bunx oxlint", "bunx tsc --noEmit", "bun test"]'
orch settings locked_commands '["bun test", "bunx tsc"]'
```

Read the project's scripts (`package.json`, `Makefile`) and its lint config (biome, oxlint,
eslint) to pick them. When `orch settings` already shows them set, leave them. Rows marked
`agent` in `orch settings` are yours to write; any other key is the user's, and a refusal
names the keys you may set and the `orch settings grant` the user runs to widen them.

An agent in `waiting` is held by a locked command, and the monitor line names the holder.
After `timeouts.lock_wait_ms` the monitor shows `gave up on "<pattern>"`: the command did
not run, and the agent does its other work first. Step in only when the holder is stuck:
`orch peek <holder>`.

`gated_commands` is the user's list of commands no agent runs without approval (a build, a
migration, a push). A match is refused with a request id. Hand the user
`orch grant <id>`; the agent reruns the exact command once it is approved. A worker's
header tells it to report the id. You never run a gated command yourself.

`denied_commands.commands` is the user's list of commands an agent never runs, with no
grant. `denied_commands.applies_to` names who is refused: `workers`, `orchestrators`, or
both. A pattern matches only the whole command: `bun test` refuses the full suite, and
`bun test <file>` runs. Never write prose, `*`, or `<file>` into any command list; orch
refuses it.

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

1. Recon wave. Spawn 3 to 4 agents that only read and report. Each gets one topic, an
   exact answer shape, and one report file to write. A recon report quotes the current code
   at every site it names, verbatim, and the replacement.
2. Task list. You assemble it from the reports, never from the tree, in one sitting, before
   any implementing dispatch. Every task names exact files, exact edits, the files to
   verify, and the report shape. A task is 1 to 3 minutes of mechanical work. Group tasks
   into waves by file ownership. The shape is in `reference/fleet.md`.
3. Dispatch the whole wave in one message, `--file` on each task's own file as you wrote
   it, `--with` on the report it cites, and `orch monitor` armed.
4. Assemble the next wave's specs from the reports while this one runs. A landed diff goes
   to a reviewer agent that reports pass or a finding list. You read the verdict, not the
   diff. A finding is a task for the next wave, not an edit you make.
5. Refill the instant an agent lands. Rename, then dispatch. Close an agent only when the
   task list has nothing left for it.
6. Checkpoint between waves. Run the verify commands over everything landed, report to the
   user in a few lines, and do what the user asked for at checkpoints.

## Who does what

You plan, write the task list, dispatch, read verdicts, and decide. You never run a gated
command and never do a task an agent could do.

You never open a source file. Every fact a task needs (the current code at a site, a
signature, an import list, a caller) comes from a recon report. A spec that needs one more
fact is one more recon dispatch, not a Read.

An agent does exactly what its task says, runs the verify commands over its own files once,
and reports in the shape the task asked for. It never plans, investigates past its topic, or
decides. A task that makes it do any of those was under-specced. Fix the task, not the
agent.

## Rules

- A dispatch is one to three tiny edits with exact paths, names and signatures, copied from
  a recon report. A spec the agent has to figure out is two tasks.
- No two tasks in one wave touch the same file.
- `done` is a claim. Build on it only after a reviewer agent reports pass.
- Answer `asking` within seconds: `orch questions`, then `orch answer`. A blocked agent is
  the most expensive idle.
- Redispatch once on error, then escalate the model one rung.
- Stuck is one tool call with a climbing `Elapsed` in `orch peek`. A steer waits for that
  call; it frees nothing. `orch abort <name> "<what to do instead>"` cancels the call and
  steers in one command.
- `pending` is not `blocked`. An agent whose own files are clean but whose verify run fails
  in another task's files reports `pending: <files>` and is done. orch's worker header does
  not say this, so write it into every task file.
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
