# Fleet shape and cadence

## Project checks

Before the first wave, set the checks from the project's scripts. Keep what `orch settings`
already shows. For a Bun project:

```bash
orch settings workers.verify_commands '["bunx oxlint"]'
orch settings locked_commands.commands '["bun test", "bunx tsc"]'
```

Each agent runs `workers.verify_commands` over the files it edited before it reports, so a task
names only the files. A read-only task runs none. Keep the list to the cheap lint: the typecheck, the tests and the repo-wide
scans are the orchestrator's, once per wave. `locked_commands.commands` run one at a time
across the machine. `orch help settings` says which keys you may write.

## Tabs

One tab per area of work (`server`, `client`), one agent per task inside it. The human watches
the panes by eye, and a crammed tab shows nothing.

Pass `--tab <tab>` on every spawn. A tab that already carries the label gets the new agents.
A spawn without `--tab` opens a tab with a random label like `elk-glacier-01`.

A tab holds at most `fleet.max_agents_per_tab` agents, and orch refuses a spawn or tile that
would overfill it before anything opens. Fill a tab before you open another. Overflow goes to
`<label>-02`, then `-03`, so split a spawn that is too big across `--tab api` and
`--tab api-02`. `orch tile <tab> <name>` adds one agent. `orch move <target> --tab <tab>` fixes
an agent in the wrong tab. Move skips the cap, so move only into a tab with room.

## Fleet size

Run one agent per task that touches its own files, up to `fleet.max_agents_per_pack` live
agents under one root orchestrator. Reach for `--worktree` when parallel agents might touch
the same files by accident, then collect with `orch review`.

Read `orch status --capacity` before each wave. It names the free slots and the orchestrators
that hold the rest. Each orchestrator counts only its own agents, so two orchestrators at 5 and
8 are both under a cap of 10.

Split by role as well as by file: moving a file, fixing its callers and checking the result are
three agents on three sets of files.

## Reuse the agent

`orch dispatch` gives an agent a fresh session with its name and model intact. Spawn a
replacement only after a dispatch to the idle agent errors, then close the one it replaces.
Close a tab when its work is done.

Name each agent for its task (`mcp-types`, `mcp-tools`) and rename it when the task changes:
`orch dispatch <agent> --rename <new-name> "<task>"` renames and refills in one command. The
monitor keeps following a renamed agent.

## Another orchestrator's agents

Their lease is not yours. Verbs that drive an agent refuse one with a live foreign holder, and
the refusal names the owner. `orch result --steal <target>` reads one. `orch adopt` takes an
agent with no lease, and `orch detach` releases your own.

Their orchestrator can close them at any moment, so plan only on your own agents. When the cap
blocks a spawn, spawn what fits now and retry on the next event that frees a slot.

## The cadence

- One command per wave: one `orch spawn` with a `--file` or `--prompt` and a `--model` per
  agent. On a refill wave, send every rename and dispatch together.
- Before a wide change, one read-only agent lists every caller and fixture into a report file.
  Later tasks point `--with` at it.
- At a stopping point, idle agents run the verify commands over their own files.

## The task index

Keep one index file for the job beside the wave files. Send a task file with `--file`, or a
wave section with a one-line `--prompt` and the wave file in `--with`.

```markdown
# <job>  (notes: notes/readers.md)

## Wave 1: tasks/W1.md
- T1   src/a.ts     <one-line title>
- T2   src/b.ts     <one-line title>

## CHECKPOINT 1
verify: src/a.ts src/b.ts test/a.test.ts
```
