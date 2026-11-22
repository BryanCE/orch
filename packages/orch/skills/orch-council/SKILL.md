---
name: orch-council
description: Run a council with the orch CLI. Agents on different models score one subject, a plan, a UI or a change, round by round, and you improve it between rounds. Use when the user asks for a council, a multi-model review, or scored review rounds.
allowed-tools: Bash, Read
---

# orch-council

A council is several agents on different models that score one subject and list what would
improve it. You are the lead and the members only review. You read their reviews, improve the
subject, and send it back for the next round, until the stopping point.

Read `orch help council` before the first command. It describes the build that is installed.

## The brief

A council costs one run per member per round, so it starts from a brief. Write these four
lines before you convene:

- **Subject.** The exact files under review, and what in them you may change.
- **Goal.** What a good one looks like, as criteria a member can score against. "Can be built
  without one question" is a criterion. "Is good" is not.
- **Stopping point.** What ends the council before its last round, when the user named
  something: every member at 8 or above, or one round only. With nothing named, the council
  runs its full count of rounds.
- **Work.** Who makes the changes between rounds: you, a subagent, or a fleet through the
  `orch` skill. With nothing named, pick what fits the size of the work.

Take each line from the user's request. A subject or a goal the request leaves open is a
question for the user, and a guess spends every round on the wrong target. Done when all four
lines are written and the user has seen them. When nothing was open, show the brief and
convene in the same turn.

## The loop

```bash
orch council convene plan-review \
  --prompt "Review the plan in plan.md. A good plan can be built without one question." --with plan.md
orch monitor                          # arm through the Monitor tool, in this same message
orch council scores plan-review       # once every member is done
orch council round plan-review "Rewrote section 2 and added the rollback steps." --with plan.md
orch council close plan-review
```

1. **Convene.** Name the council for its subject. `--prompt` carries the brief's subject and
   goal, and `--with` names each file a member must read. The members are the user's
   `council.models` setting, one per model, each at the thinking level the setting gives it.
   Done when the command reports round 1 sent to every member.
2. **Wait.** Arm `orch monitor`. Done when every member of the round has reported `DONE`.
3. **Read.** Run `orch council scores <council>`. Each member's review is `round-<n>.md` in
   its own directory, `.orch/councils/<council>/<member>/` unless the `council.directory`
   setting moves it. Its improvements are ordered, most important first. Done when the table
   shows no `running` and you have read every member's file.
4. **Improve.** Go through every improvement every member listed. Make each one that serves
   the goal, in the subject itself: the plan, the code, whatever is under review. Skip one
   that is wrong or outside the subject, and keep a one-line reason. Done when each
   improvement is made or has its reason, and the subject passes its own checks: a plan reads
   whole, code passes the project's gate.
5. **Summarize.** Tell the user in a few lines: which round this was and how many remain,
   each member's score and the mean with the change from the round before, what you changed,
   and what you skipped and why.
6. **Check the stopping point.** When it is reached, go to step 7. Otherwise send the next
   round in the same turn, `orch council round <council> "<what changed, what you left and
   why>"`, and go back to step 2. Each member reads the subject again, rescores it, and reads
   what the others wrote in the round before.
7. **Finish.** Report every round's scores, what moved across the rounds, and what is still
   open. The last round's changes are unscored, so say that. Ask the user one question: close
   the council, or raise `council.rounds` and go on. On their word, run
   `orch council close <council>`. The review files stay.

## The stopping point

The council reaches its stopping point at the first of these:

- The brief's stopping point is met.
- The council has run its full count, the user's `council.rounds` setting. The title of
  `orch council scores` shows the count. orch refuses a round past it, and the user is the
  one who raises it.
- The user says stop.
- A round's scores match the round before and the members list nothing new. The council has
  said what it has to say.

## A ruling mid-council

When the user rules on something the members are scoring, the members must hear it, or they
keep scoring against it.

- While a round runs: `orch council steer <council> "<the ruling, stated as decided>"`. It
  reaches every member still writing the round, and names each member that had finished.
- Between rounds, and for each member the steer named: open the next round's text with the
  ruling.
- Change the subject to match the ruling before the next round.

## Ask first

Ask the user, in one message that holds every open question, and go on from the same step
once they answer:

- A subject or a goal the request leaves open.
- `council.models` is empty and `convene` says so. The user picks the members, in the
  `council.models` row of `orch settings`.
- Two members want opposite changes, and choosing between them changes the goal.
- An improvement most members ask for reaches outside the subject.
- A command exits with `orch grant <id>`. Give the user that line, wait until they say it
  ran, then run the same command again.

Everything else you decide yourself, and the summary says what you decided.

## What a member can do

- A member reads files and has no shell. It runs no test, no build and no `git diff`.
- Hand it what a command would show as a file through `--with`: a saved diff, test output, a
  screenshot.
- It writes in its own directory only, one file per round.

## When something is off

- `?` in the scores: that member's file carried no score orch could read. The line under the
  table says what was wrong. Tell the member in the text of the next round.
- `-` in the scores: the round did not reach that member. The `round` command printed why.
- `orch council round` is refused while a member of the round before still runs. Wait for its
  `DONE`, or run `orch peek <member>` when it looks stuck.
- A launch is refused because a harness cannot run a read-only agent. Tell the user which
  harnesses the refusal names. The lineup is theirs to change.
- A member's name is refused as longer than 32 characters. It is the council's name and the
  model, so convene under a shorter council name.
