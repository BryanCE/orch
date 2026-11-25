---
name: orch-plan
description: Write a job's plan as orch queue files, so the lead loads the whole plan into lanes with one command per file and its agents drain them. Use when planning work for an orch fleet, splitting a plan into lanes by difficulty or domain, or when the lead has a pile of tasks to hand off.
allowed-tools: Bash, Read, Write, Edit
---

# orch-plan

A plan in queue shape is a set of wave files, one per lane per wave, where every `## ` section
is one exact task. When the plan is done, the lead loads each file into its lane, spawns
agents into each lane, and orchd hands every idle agent the next task in its lane.

The plan carries the design, so the lead spends the run on review and on what comes up. A task
any agent in its lane can take, in any order, beside any other task of the wave, is the bar
every section meets.

## The job directory

```
<job>/
  plan.md          the goal, the lanes, the start commands, the checkpoints
  W1-<lane>.md     wave 1, one file per lane
  W2-<lane>.md     wave 2: work that builds on wave 1
```

## Lanes

A lane is a named queue. The planner names them for the job: by difficulty (`hard`, `easy`),
by domain (`api`, `web`, `tests`), or any split that fits. An agent spawned with `--lane <name>`
takes only that lane's tasks, so each lane gets the agents that suit its work. Every wave file
loads under a lane, and the lead's own session, which is in no lane, stays free.

Name a lane for its work. The user picks each lane's model: a spawn line in `plan.md` carries
`--model` only when the user named that model for that lane.

## A wave file

The text above the first `## ` heading starts every task of the file. Keep it to the shared
pointers: the files every task reads first, the one-line goal. Then one `## T<n> <title>`
section per task, in the `orch` skill's exact task form (its section "The exact task"),
stop line and report line included.

The queue adds three facts the task form must meet:
- Any agent of the lane takes any task, and several run at once. The tasks of one wave touch
  disjoint files, across every lane of that wave.
- A task that needs another task's change goes in a later wave, and states the shape it
  builds against.
- A task carries everything it needs in its text and in the files it names by path. It names
  no agent and no other task's progress.

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

Size each lane's agents to its tasks: no more agents than the wave has tasks in that lane.

## Done

The plan is done when every item holds:
- Every wave file has at least one `## ` section, and every section is an exact task with its
  stop line and report line.
- Inside each wave, no two tasks share a file. List each task's files to check.
- Every dependency points to an earlier wave.
- `plan.md` holds the goal, the lane table, the start commands, and a checkpoint per wave.

## The run

The lead runs the `## Start` lines, then arms `orch monitor`. The agents start idle and orchd
sends each one its next task. A lane agent stays up between tasks, so it runs in any form but
`oneshot`, which exits after its one prompt. Each result comes back to the lead as the task settles:
`orch queue list` shows every task's lane and state. At a checkpoint, the lead runs the verify
commands, then loads the next wave. An agent whose lane has no task left is closed.
