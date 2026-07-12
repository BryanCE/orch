# pi model tiers + thinking levels — task → (model, level)

Two levers per call. Pick the MODEL TIER first, then the thinking level within
it. All tiers ride the openai-codex subscription.

| Tier | Required model flag | Use it for | Normal effort |
|---|---|---|---|
| Sol, flagship | `--model "openai-codex/gpt-5.6-sol:<effort>"` | Hard implementation at low/medium; architecture, adversarial review, and security at high/xhigh. | low through xhigh |
| Terra, smart default | `--model "openai-codex/gpt-5.6-terra:<effort>"` | Default grunt at low; everyday implementation, review, and tests at medium/high. | low through high |
| Luna, trivial only | `--model "openai-codex/gpt-5.6-luna:high"` | Pure mechanical reformatting and tiny extractions only. | high |

Every pif dispatch MUST carry one of those explicit model flags. The saved pi
default may be stale; never rely on it.

**Luna context guardrail:** luna scores 41.3% MRCR versus sol at 91.5% and terra
at 89.6%. Wide many-file sweeps always go to terra at low effort, even when the
work is mechanically simple.

Tradeoff rule: a smarter model at low thinking beats a dumber model at high
thinking. Route by the fixed ladder: luna high, terra low, terra medium/high,
sol low/medium, then sol high/xhigh. The cheaper appropriate rung drafts and the
next rung checks.

Effort is the biggest quality-versus-latency lever within a tier. The ladder is
`none, low, medium, high, xhigh, max`. Pi spells native `none` as `off`, so the
pif suffix is `:off`; `minimal` silently maps to `low` on this provider. All
three 5.6 models support `max` (verified in pi's `openai-codex.models.js`
`thinkingLevelMap`). `ultra` DOES NOT EXIST in pi; it is a ChatGPT-app feature,
never reference it in a dispatch.

| Native effort | Pi suffix | Use it for | Example |
|---|---|---|---|
| `none` | `off` | Available, but luna high is the mandated floor for its trivial-only tasks. | Do not route normal work here. |
| `low` | `low` | Terra default grunt or sol hard implementation. | Inventory files; draft a report; trace a hard implementation path. |
| `medium` | `medium` | Everyday implementation, focused tests, normal code review. | Write a validated helper; review a service. |
| `high` | `high` | Hard multi-file logic, tricky bugs, design trade-offs, subtle domain rules. | Trace a wrong-number bug; review a payroll cascade. |
| `xhigh` | `xhigh` | High-stakes architecture, security, or adversarial review. | Design a migration; attack spec edge cases. |
| `max` | `max` | Exceptional single-model depth after xhigh is demonstrably thin. TTFT runs minutes here; never interactive. | Reconcile a critical correctness dispute. |

## Rules of thumb

- Luna high is only for pure mechanical reformatting and tiny extractions.
- Terra low is the grunt-work default because extra intelligence beats raising
  luna's thinking.
- Terra medium/high handles everyday implementation, review, and tests.
- Sol low/medium handles hard implementation; sol high/xhigh handles architecture,
  adversarial review, and security.
- Never give luna a wide context sweep.
- Sol and terra use less than half the output tokens per task versus the
  orchestrator. Token efficiency is a primary reason to delegate.
- Keep tier data current against [Artificial Analysis](https://artificialanalysis.ai/).

```bash
pif -p --no-session --model "openai-codex/gpt-5.6-terra:medium" "Review this function for bugs: ..."
pif -p --no-session --model "openai-codex/gpt-5.6-sol:xhigh" "Design the migration for ..."
pif -p --no-session --model "openai-codex/gpt-5.6-luna:high" @data.json "Reformat this as a markdown table."
```
