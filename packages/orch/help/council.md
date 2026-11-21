A council is several agents on different models that review one subject and score it. You
convene it, read what the members wrote, improve the subject yourself or with workers, and
send the next round. The user sees the scores and decides whether another round runs.

    orch council convene plan-review ada bea cy --model sol,luna,opus \
      --prompt "Review the plan in plan.md. A good plan can be built without one question." --with plan.md
    orch council scores plan-review
    orch council round plan-review "Rewrote section 2 and added the rollback steps." --with plan.md
    orch council close plan-review

A member is a read-only agent: it reads files and has no shell. It writes one file per round,
`round-<n>.md` in its own directory under `council.directory`, holding its score and its
ordered list of improvements. orchd reads the score from that file when the member finishes.

Traps:
- `--model` and `--harness` take one value for all members, or one per member in order. Pick
  different models: members on the same model agree with each other.
- A member cannot run a command. Hand it what a command would show (a diff, test output, a
  screenshot) as a file through `--with`.
- A member has to stay up between rounds. A launch into a form that takes one prompt and
  exits is refused.
- A harness that cannot refuse a tool call cannot run a member, and the launch says which can.
- `round` waits for every member of the round before it. `orch monitor` reports each finish.
- The text of `round` says what changed since the last one. From round 2 each member also
  reads what the others wrote in the round before.
- A `?` in the scores means a member's file carried no score orch could read; the line under
  the table says what was wrong with it. Send that member's next round after you tell it.
- `--dir` on `round`, `scores` and `close` names the directory the council was convened from.
  Without it, run them from that directory.
