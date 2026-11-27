---
name: orch-plan
description: Plan a job as orch queue files, one wave file per lane, that the lead loads with one command each and lane agents drain. Use when planning work for an orch fleet, or when the lead has more tasks than agents.
allowed-tools: Bash, Read, Write, Edit
---

# orch-plan

A queued plan is a job directory of wave files, one per lane per wave, where every `## ` section
is one exact task. The lead loads each file into its lane, spawns agents into each lane, and
orchd hands every idle agent the next task in its lane.

Every task is *independent*: any agent of its lane takes it, in any order, while the rest of its
wave runs. The plan carries the design, so the lead spends the run on review.

## Steps

1. **Split the work into waves.** A task that needs another task's change goes in a later wave,
   and states the shape it builds against: the new type or signature. Done when every
   dependency points to an earlier wave.
2. **Name the lanes.** See Lanes. Done when every task has a lane.
3. **Write each wave file.** See A wave file. Done when every section is an exact task and no
   two tasks of one wave, across every lane, share a file. List each task's files to check.
4. **Write `plan.md`.** See plan.md. Done when every lane has a load line and a spawn line, and
   every wave after the first has a checkpoint.

The plan is done when all four criteria hold.

## Lanes

A lane is a label on a task and on an agent. An agent spawned with `--lane <name>` takes only
that lane's tasks. Name each lane for its work: by difficulty (`hard`, `easy`), by domain
(`api`, `web`, `tests`), or any split that fits the job.

Put every task in a lane. The lead's session is in no lane, so it takes no task and stays free
for review.

A spawn line carries `--model` only with the model the user named for that lane. Give a lane no
more agents than its wave has tasks.

## A wave file

`<job>/W<n>-<lane>.md`. The text above the first `## ` heading starts every task of the file:
keep it to the files every task reads first and the one-line goal. Then one `## T<n> <title>`
section per task, in the `orch` skill's exact task form (its section "The exact task"), stop
line and report line included.

```markdown
Read first: src/queue.ts, src/types/queue.ts. Goal: tasks carry a lane.

## T1 Add the lane to TaskOptions
Edit src/types/queue.ts:
- ...
Verify: src/types/queue.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
```

A `## ` line starts a new task unless it is inside a code fence. Use `###` for a heading inside
a task. A task carries everything it needs in its text and in the files it names by path, and
names only files, never an agent or another task.

## plan.md

```markdown
# <job>
<What the job does, in two plain sentences.>

## Lanes
| Lane | Work | Agents |
|---|---|---|
| hard | type and schema changes | 2 |
| easy | call-site and fixture edits | 4 |

## Start
orch queue load <job>/W1-hard.md --lane hard
orch queue load <job>/W1-easy.md --lane easy
orch spawn hard-1 hard-2 --lane hard --tab <job>-hard
orch spawn easy-1 easy-2 easy-3 easy-4 --lane easy --tab <job>-easy

## Checkpoint 1, after wave 1
verify: <the typecheck, lint and test commands over wave 1's files>
then: orch queue load <job>/W2-<lane>.md --lane <lane>, for each lane of wave 2
```

## The run

The lead runs the `## Start` lines, then arms `orch monitor`. The agents start idle, and orchd
sends each one the next task of its lane. Each result comes back to the lead as its task
settles. `orch queue list` shows every task's lane and state.

A lane agent stays up between tasks, so it runs in any form but `oneshot`, which exits after
one prompt.

At a checkpoint, the lead runs the verify commands, then loads the next wave into the agents
already running. When a lane has no task left in any wave, the lead runs `orch close` on its
agents.
