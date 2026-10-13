# orch skill eval: results

The orch skill teaches an orchestrator to treat orch agents as **hands**: the orchestrator
designs every change and writes exact tasks, and fast, cheap models (GPT-6 Luna) type them in
parallel. This suite measures whether the skill makes the orchestrator write that kind of plan.

## Result

| Skill version | With skill | Without skill | Δ |
|---|---|---|---|
| Before (first "agents are hands" rewrite) | 0.83 | 0.50 | +0.33 |
| **After (100-line rewrite + 3 rules)** | **1.00** (3 of 3 runs perfect) | 0.50 | **+0.50** |

+0.50 is the largest gain this case allows (1 − baseline). The skill now closes the whole gap.

For scale, published skill benchmarks measure task pass rate, not plan quality, so they do not
compare one to one:
- SkillsBench: curated skills give +16.2 points on average, and +4.5 for software engineering.
- SWE-Skills-Bench: +1.2 on average. 39 of 49 skills change nothing, and the best give +7 to +30.

## The test

`plan-per-agent-harness`: Opus (the orchestrator) gets the orch source at commit `0004d9b`,
before the real `--harness` fix. Opus plans the first wave of agents into `wave.md` and stops.
It runs twice, once with the skill loaded and once without it. Graders score `wave.md`:

| Grader | Type | Checks |
|---|---|---|
| `wrote-wave` | file | `wave.md` exists |
| `no-open-design` | regex | no "figure out", "investigate", "as needed", "decide how" |
| `exact-edits` | judge | each task names its files and the end state of each edit |
| `disjoint-files` | judge | no two tasks edit the same file |
| `stop-line` | regex | every task ends with the stop line |
| `design-decided` | judge | the plan decides harness, model, `--cmd` and the tests itself |

Score = the fraction of graders that pass, as a mean over the runs. `skill-loads` is a smoke
case that costs less than one cent. It proves that the skill reaches the model.

## What each run found, and what changed

| Run | With | Without | Found | Skill change |
|---|---|---|---|---|
| 1 | 0.67 | 0.67 | Not valid: the eval refused the `Skill` tool, so both arms ran without the skill | Added `Skill` to `allowed_tools`; added the `skill-loads` smoke case |
| 2 | 0.83 | 0.50 | The skill works. One task still left a branch: "If the fixture rejects X, use Y" | "You check every fact a task leans on. A task holds answers." |
| 3 | 0.83 | — | `exact-edits` fixed. The plan had no test task and left `--cmd` with mixed harnesses open | "How each new input meets every existing option"; "A behavior change carries its test task" |
| 4 | 1.00 ×3 | — | Every grader passed in all three runs | None |

Without the skill, the plan gives one agent the whole source change, with lines such as "work
out per agent what `preTrustWorkspace` needs". With the skill, the plan gives four agents
disjoint files, each with the exact code, line numbers, the stop line and the report line.

## Skill changes

- `SKILL.md` is now 100 lines, with the most important content first:
  1. The reference pointers, each with its moment to read.
  2. The hands rule.
  3. The exact task shape with an example and a ready criterion.
  4. Waves, the loop, and what to do while agents run.
- The task shape moved into `SKILL.md` from `reference/fleet.md`. In run 1 the model never
  opened `fleet.md`.
- The description now says "You design each change and write exact tasks". The old text,
  "Spawn right away, with no preflight", worked against the design rule.
- `reference/fleet.md` starts with the project checks. `reference/troubleshooting.md` lists
  its cases by frequency. Each rule now has one source.
- `skills/orch/.npmignore` keeps `evals/` out of `npm pack`, so the build never installs or
  links the suite. The installer copies the skill from the installed package.

## Cost

| Run | Cost |
|---|---|
| 1 (not valid) | $1.39 |
| 2 (both arms) | $1.74 |
| 3 (with only) | $1.21 |
| 4 (with only, 3 runs) | $5.19 |
| Smoke | < $0.01 |
| **Total** | **$9.53** |

One Opus planning run costs about $1.70. `--max-cost-usd` is checked only before each run
starts, so runs that start together can go past it.

## Limits

- The suite has one case. Cases for T3 (`restart --harness`) and T4 (claude `--effort`) would
  show whether the gain holds beyond this bug.
- The baseline of 0.50 is from one run, judged by Haiku. The final 1.00 is from three runs,
  judged by Sonnet. So +0.50 combines two runs, not one paired measurement. The "Compare"
  command below measures both arms together with one judge.
- This measures the plan, not the agents. Whether Luna lands an exact wave faster needs an
  end-to-end run through orch.

## Run it

Run from the repo root. Results go to `results/` here, which git ignores.

Smoke check, after a change to `case.yaml` or the eval CLI:

```
claude plugin eval packages/orch/skills/orch --eval-dir evals --case skill-loads --allow-tools Write --ablation none --model claude-haiku-5-5 --runs 1 --concurrency 1 --threshold 1.0 --max-cost-usd 0.25 --no-publish
```

Compare two skill versions (about $5 per arm):

```
claude plugin eval packages/orch/skills/orch --eval-dir evals --case plan-per-agent-harness --scaffold --allow-tools Write --ablation with-without --model claude-opus-5-5 --judge-model claude-sonnet-5-5 --runs 3 --concurrency 3 --threshold 0 --max-cost-usd 12 --no-publish
```

Sources: [Claude Code plugin evals](https://code.claude.com/docs/en/plugin-evals.md),
[SkillsBench](https://huggingface.co/papers/2602.12670),
[SWE-Skills-Bench](https://arxiv.org/html/2603.15401v1).
