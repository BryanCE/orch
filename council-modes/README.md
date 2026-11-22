# Council modes: stop on a round count or on a score, and choose fresh or kept context

Bryan's decisions, all settled:

- Two modes of stopping, chosen by a setting. A fixed round count is the default, because it
  is a hard stop on token use. Score mode runs until the mean reaches a target or stops
  rising, and it is turned on only on purpose.
- In score mode, one flat round is allowed: the council stops on the second round in a row
  whose mean does not rise.
- Whether a member keeps its conversation between rounds is a setting.
- When the lead skips a member's improvement, the next round's text tells that member why, so
  it stops scoring the subject down for an item already ruled on. This is in the orch-council
  skill, step 6, already.

## Settings

All five live in the `council` section. Each one can be set per project, and each is read live
at every `council round`, so a change applies to the next round of a running council.

| Setting | Values | Default | Used by |
| --- | --- | --- | --- |
| `council.stop` | `"rounds"` or `"score"` | `"rounds"` | both modes |
| `council.rounds` | positive int | 3 | `rounds`: the council runs exactly this many rounds |
| `council.target_score` | number, from 1 to `council.scale` | 9 | `score`: the council ends when a round's mean reaches it |
| `council.patience` | non-negative int | 1 | `score`: how many rounds in a row the mean may fail to rise before the council stops |
| `council.context` | `"keep"` or `"fresh"` | `"keep"` | both modes: `fresh` clears each member's session before rounds 2 and later |

Each setting needs:
- an entry in the schema, `SETTINGS_SCHEMA` (`settings/schema.ts`);
- a default in `SETTINGS_DEFAULTS`;
- a help line in `settings/registry.ts`;
- a field in the required type, `OrchSettings.council` (`types/settings.ts`);
- a line in `help/council.md` and `help/settings.md`.

## The rule orchd enforces

`councilRound` (`daemon/server/council.ts:154`) refuses the next round when the council has
stopped. `orch council scores` prints the same reason under its table.

- **`rounds` mode, the default:** the council stops when it has run `council.rounds` rounds.
  This is today's rule, and it caps what a council can spend.
- **`score` mode:** the mean of a round counts only the members that scored it, leaving out
  `?` and `-`. The council stops at the first of these:
  - **reached:** the last round's mean is at least `target_score`;
  - **stalled:** the mean has failed to rise for `patience + 1` rounds in a row. Round 1 has
    nothing to compare with, so it never stalls.
- The refusal names the mode, the means and the setting to change:
  - "council X reached 9.1, at or above council.target_score 9"
  - "council X stalled: its mean has not risen since round 4 (7.7, 7.7, 7.3); raise
    council.patience or change the subject"

## Fresh context

With `council.context: "fresh"`, `councilRound` clears each sitting member before it sends
round 2 or later. It uses `clearHere`, the `reset` verb.

- A member whose harness has no reset is refused for that round, with the reason. It shows
  as `-`. Branch on `adapter.lifecycleControl?.lifecycleCmd("reset")`, never on a harness id.
  Today codex has no reset.
- A fresh member still has the history: the round text says what changed and what was ruled
  on, and from round 2 on it reads the other members' last reviews.

## The skill

Update `packages/orch/skills/orch-council/SKILL.md` in four places:
- The stopping point: `rounds` is the default and a hard stop on token use. `score` runs
  until the target is reached or the mean stalls, and is chosen on purpose with `council.stop`.
- Step 5, summarize: in score mode, report the target and the streak of flat rounds.
- Step 7, finish: offer to raise `council.rounds` or `council.target_score`, depending on the
  mode.
- A note under "What a member can do", on what `fresh` means for a member.

## Tests

- `rounds` mode refuses round `rounds + 1`.
- `score` mode refuses the round after a mean at or above the target.
- `score` mode with `patience: 1` goes on after one flat round and refuses after two.
- A `-` or a `?` is left out of the mean.
- `fresh` clears each member before round 2. A member with no reset is refused for that round
  only.
- Each setting comes through a project file.
