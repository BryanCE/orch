# Fleet retrospective

Here is what this fleet took and what got in the way.

## What it took

Seven commands for three workers: three spawns, three dispatches, one watch. Two of the spawns were forced, not chosen.

## What I did not like

- **The model vocabulary is split.** Your rules and the skill say `luna:high` and `luna:low`. Spawn refused `luna:low` with `model luna is not in models.allowed.pi` and listed the full ids, one of which is `openai-codex/gpt-5.6-luna`. The error knew the answer and still made me retype it. Spawn should resolve a short name when exactly one allowed spec contains it, and refuse only on zero or many matches.
- **One model per spawn.** `--model` pins every agent in the call to the same model. Mixing `luna:high` and `luna:low` in one fleet means two spawns.
- **One spec file per spawn.** `--prompt` repeats N times for per-agent tasks, but `--file` reads exactly one file for all. Per-agent specs long enough to need files force a separate dispatch per agent, which is what I did. `--tasks` covers it only if I first pack the specs into a JSON array, which is a worse version of repeating the flag.
- **`orch result` takes one target.** Collecting a wave is N commands.

## Single-command candidates, in order of payoff

1. `orch spawn` with `--file` repeated N times, mirroring `--prompt`. The whole fleet above becomes one command: spawn, per-agent spec, done.
2. `--model` repeated N times in spawn, same rule as `--prompt`: one for all, or exactly N.
3. Short-name model resolution in spawn, dispatch, and `orch model`, using the same one-match rule.
4. `orch result` accepting several targets and printing each under its name, so a wave is collected in one call.

## What worked well

Spawn validated every name and the model before creating anything, so the failed call left nothing behind. The tab reuse by label put the third worker beside the first two. Dispatch printed the delivery line with the dispatch id, and `orch events` bare was the right watch with no flags to think about.

## Next

The first three are all in the spawn flag parser and the model resolver, so they are one wave of two agents once the section-3 fleet clears.
