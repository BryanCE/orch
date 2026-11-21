---
name: council
description: Convene a council with the orch CLI: several agents on different models review one subject (a plan, a UI, an implementation), score it and list improvements, round by round, while you do the work between rounds. Use when the user asks for a council, a multi-model review, or scored review rounds.
allowed-tools: Bash, Read
---

# council

A council is several agents on different models that review one subject and score it. The
members only review. You are the lead: you read their reviews, improve the subject, and send
the next round. The user decides when the rounds stop.

Read `orch help council` before the first command: it is the installed build's truth.

## The loop

```bash
orch council convene plan-review ada bea cy --model sol,luna,opus \
  --prompt "Review the plan in plan.md. A good plan can be built without one question." --with plan.md
orch monitor                          # arm through the Monitor tool, in this same message
orch council scores plan-review       # once every member is done
orch council round plan-review "Rewrote section 2 and added the rollback steps." --with plan.md
orch council close plan-review
```

1. **Convene.** Name the council for its subject. Give each member a different model, because
   members on one model agree with each other. The prompt says what the subject is and what a
   good one looks like: the members score against that.
2. **Wait.** Arm `orch monitor`. Each member reports `DONE` when its review is written.
3. **Read.** `orch council scores <council>` shows every score. Each member's review is the
   file `round-<n>.md` in its own directory under the council's directory. Read every one:
   the improvements are ordered, most important first.
4. **Report.** Show the user the scores for the round and the improvements the members agree
   on. Ask whether to run another round. The user decides; never start a round unasked.
5. **Improve.** Make the changes yourself, or hand exact tasks to workers with the `orch`
   skill. A member never edits the subject.
6. **Next round.** `orch council round <council> "<what changed>"`. Say what you changed and
   what you chose to leave, with the reason. Each member reads the subject again, and reads
   what the others wrote in the round before.
7. **Close** when the user is done: `orch council close <council>`.

## What a member can do

- A member reads files and has no shell. It cannot run a test, a build or `git diff`.
- Hand it what a command would show as a file through `--with`: a saved diff, test output, a
  screenshot.
- It writes only in its own directory, one file per round.

## When something is off

- `?` in the scores: that member's file carried no score orch could read. The line under the
  table says what was wrong. Tell the member in the text of the next round.
- `orch council round` is refused while a member of the round before still runs. Wait for its
  `DONE`, or `orch peek <member>` when it looks stuck.
- A launch refused because a harness cannot run a read-only agent: pick one of the harnesses
  the refusal names.
- Scores that stop moving between rounds mean the council has said what it has to say. Tell
  the user, and let them close it.
