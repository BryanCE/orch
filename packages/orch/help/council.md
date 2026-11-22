A council is several agents on different models that review one subject and score it. You
convene it, read what the members wrote, improve the subject yourself or with workers, and
send the next round. A council runs the number of rounds the `council.rounds` setting gives.
The user sees the scores after each one and may stop it early.

    orch council convene plan-review \
      --prompt "Review the plan in plan.md. A good plan can be built without one question." --with plan.md
    orch council steer plan-review "The user ruled the rollback steps out. Do not score against them."
    orch council scores plan-review
    orch council round plan-review "Rewrote section 2 and added the rollback steps." --with plan.md
    orch council close plan-review

Who sits on a council is the `council.models` setting: models by harness, one member per
model, each with its thinking level, each one in that harness's `models.allowed`. The user
picks it: the `council.models` row of `orch settings` walks each enabled harness, checks
members off the models it lists and may launch, then asks each member's thinking level. With
no terminal it is JSON, the level after the model's name:

    orch settings council.models '{"<harness>": ["<model>:<level>", "<model>:<level>"], "<harness>": ["<model>:<level>"]}'

A model with no level runs at the thinking default, as any launch does.

`convene` launches that lineup and names each member for the council and its model, as in
`plan-review-sonnet`. To seat other members once, name them: `convene plan-review ada bea
--model sol,luna`.

A member is a read-only agent: it reads files and has no shell. It writes one file per round,
`round-<n>.md` in its own directory under `council.directory`, holding its score and its
ordered list of improvements. orchd reads the score from that file when the member finishes.

Traps:
- Pick different models: members on the same model agree with each other.
- `--model` and `--harness` go with members you name: one value for all, or one per member in
  order. With no member named they are refused.
- A lineup member's name is the council's name and its model, at most 32 characters. A longer
  one is refused: shorten the council's name.
- The members sit in a tab named for the council. A lineup bigger than
  `fleet.max_agents_per_tab` spreads evenly over numbered tabs after it, as in `plan-review-2`.
- A member cannot run a command. Hand it what a command would show (a diff, test output, a
  screenshot) as a file through `--with`.
- A member has to stay up between rounds. A launch into a form that takes one prompt and
  exits is refused.
- A harness that cannot refuse a tool call cannot run a member, and the launch says which can.
- A round past `council.rounds` is refused. To go on, the user raises the setting.
- `round` waits for every member of the round before it. `orch monitor` reports each finish.
- A round one member refuses still goes to the others. The command names that member and
  the reason; its cell in the scores shows `-` for the round.
- Whoever may dispatch to the members may send a round, and whoever may close them may close
  the council: the agent that convened it, an agent that adopted them, and the human.
- `steer` corrects the members mid-round: one instruction to every member still writing the
  current round, such as a ruling from the user they must hold to. A member that finished the
  round is named and not steered; say it to that member in the text of the next round.
- The text of `round` says what changed since the last one. From round 2 each member also
  reads what the others wrote in the round before.
- A `?` in the scores means a member's file carried no score orch could read; the line under
  the table says what was wrong with it. Send that member's next round after you tell it.
- `--dir` on `round`, `scores` and `close` names the directory the council was convened from.
  Without it, run them from that directory.
