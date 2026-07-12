# Model matrix — provider-agnostic routing (openai-codex is the worked example, NOT the system)

Raw research:
`~/.claude/learnings/-mnt-c-Users-Bryan-Documents-NewReports-t3reports/model-metrics-aa-2026-07-06.md`

Every pif dispatch pins one exact `provider/model-id:effort` explicitly. Never
rely on the saved pi default.

## The abstraction: route by TIER × LEVEL, instance by provider

Routing decisions are made against three abstract tiers; every provider family
below maps its models onto them. Adding a provider = adding an instance table +
a tier mapping, nothing else changes.

| Tier | Role | Route here |
|---|---|---|
| **FRONTIER** | near-orchestrator intelligence | architecture, security, operator-ordered adversarial review; load-bearing implementation at its LOWER levels |
| **WORKHORSE** | everyday engine | implementation, tests, multi-file logic, repo sweeps, grunt reads at its lower levels |
| **FAST** | cheap overflow | disposable one-shot trivia only; NEVER wide context |

THE PRIME RULE (provider-independent): per task, judge the lowest tier+level
the task can get away with, start there, and SUPERVISE WHILE IT RUNS via
`orch status` (lastText, currentFile, turns, tokens). Escalate ONE rung at a
time; raise thinking in place first, switch model only when the model itself is
the problem. Never start high because a task feels important. FRONTIER starts
require a genuine near-frontier reason or a demonstrated WORKHORSE failure.

**Smarter model at low thinking beats dumber model at high thinking** — true on
every provider measured so far.

THE ROUTING METRIC IS COST-TO-COMPLETE: price × tokens actually spent ×
retries/steering to an ACCEPTED result. A smarter model at a higher level wins
whenever it finishes cheaper. The bridge tracks real dollars per pane
(`orch status` COST column) — compare observed per-task cost and update the
instance tables when data disagrees.

Two budgets bound everything: dollars per task AND per-provider usage windows
(subscription quotas: e.g. codex 5h windows; metered fallbacks: raw dollars).
Spend the abundant quota on grunt; hoard the scarce one for judgment.

## Task shape → tier:level (provider-independent; THE routing table)

| Task shape | Setting |
|---|---|
| Trivial mechanical: pure reformat, tiny extraction | WORKHORSE:off/low |
| Narrow grunt: single-file reads, short drafts, report writeups | WORKHORSE:low |
| Wide multi-file reads, repo sweeps, long-context collection | WORKHORSE:low (FAST is BANNED here — long-context recall collapses on small models) |
| Everyday implementation, tests | WORKHORSE:medium→high |
| Load-bearing implementation, hard debugging | FRONTIER:low→medium |
| Architecture, adversarial review, security (operator-ordered review dispatches only; default reviewer is the Claude orchestrator itself) | FRONTIER:high→xhigh |
| Never | any provider/model not on the roster below |

Latency: TTFT scales hard with effort on every family measured. Interactive or
high-volume loops stay at low/medium.

## Provider roster (operator-controlled — NEVER route off-roster)

| Priority | Provider | Status | Tier mapping |
|---|---|---|---|
| 1 (default) | `openai-codex` (OpenAI subscription, no per-token cost) | primary; 5h usage windows per model | sol=FRONTIER, terra=WORKHORSE, luna=FAST |
| 2 (fallback) | `openrouter/x-ai` (metered via OpenRouter) | operator-designated fallback 2026-07-12 when codex windows are exhausted | grok-4.5 is WORKHORSE-class (Intel 54 ≈ terra 55, below sol/opus): :high=WORKHORSE-max, :medium=everyday, :low=grunt. NOT a true FRONTIER substitute — for architecture/security prefer codex sol whenever its window is open |

Failover procedure: quota exhaustion is now VISIBLE (bridge writes
`state: "error"` + lastError like "Codex error: The usage limit has been
reached"; the orchestrator's monitor pings it). On it: `orch model` each pane
to the fallback instance per the tier mapping, expect the wedged-pane dispatch
rules in SKILL.md, and move back to priority 1 when the window resets. Only the
operator adds/reorders roster rows; never silently adopt a new metered
provider.

## Instance: openai-codex (gpt-5.6 family; AA snapshot 2026-07-10, max-effort variants)

| Model | Intel | Speed | TTFT @ max | $/1M in/out | Eval verbosity | Context | Herdr tab |
|---|---:|---:|---:|---:|---:|---:|---|
| `openai-codex/gpt-5.6-sol` (FRONTIER) | 59 (#2/186) | 78 t/s | 195s | $5 / $30 | 70M tokens, concise | 1M | `Thinkers` |
| `openai-codex/gpt-5.6-terra` (WORKHORSE) | 55 (#6) | 144 t/s | 139s | $2.50 / $15 | 96M tokens | 1M | `Thinkers` |
| `openai-codex/gpt-5.6-luna` (FAST) | 51 (#15) | 204 t/s (#7) | 100s | $1 / $6 | 130M tokens, verbose | 1M | `Fast&Dumb` |

Cost-to-run per variant (same eval workload; THE cost-per-task data):

| Variant | Intel | Cost to run | Tokens spent | TTFT |
|---|---:|---:|---:|---:|
| sol:max | 59 | $2,824 | 70M | 195s |
| terra:max | 55 | $1,754 | 96M | 139s |
| luna:max | 51 | $870 | 130M | 100s |
| sol:high | 56 | $956 | 21M | 7.0s |
| terra:high | 49 | $496 | 24M | 2.1s |
| luna:high | 46 | $275 | 37M | 4.7s |

Read-offs: sol:high (56, $956) beats terra:max (55, $1,754) on BOTH axes —
before raising any model to max, first price the next model up at high. Smarter
tiers spend FEWER tokens on the same work (sol 21M < terra 24M < luna 37M at
high). Minutes-long TTFTs exist only at max.

Family quirks: `minimal` maps to `low` on this provider; `ultra` DOES NOT EXIST
in pi (ChatGPT-app feature only). Luna long-context guardrail: 41.3% MRCR vs
sol 91.5% / terra 89.6 — never give luna wide many-file context. Quota shape:
sol ≈15-90 msgs/5h (scarce), terra ≈20-110 (abundant), luna ≈50-280.

Interleaved escalation ladder (one rung per escalation):

| Rung | Setting | Intel | Use when |
|---|---|---:|---|
| 1 | `terra:off`/`terra:low` | ~45-47 est | mechanical edits, extractions, bounded reads |
| 2 | `terra:medium` | ~48 est | routine implementation, tests, docs |
| 3 | `terra:high` | 49 | multi-file logic, tricky bugs, fragile files |
| 4 | `sol:medium` | ~52-54 est | load-bearing code where terra:high failed review |
| 5a | `terra:max` | 55 | deep reasoning, sol window tight, latency tolerant |
| 5b | `sol:high` | 56 | same class as 5a but fast; sol quota |
| 6 | `sol:xhigh` | 58 | hardest reasoning short of max |
| 7 | `sol:max` | 59 | the summit; correctness over wall-clock |

(est = family-scaling inference; AA publishes per-level Intel for sol only.)

## Instance: openrouter/x-ai (grok family; metered — AA snapshot 2026-07-12)

| Model | Intel | Speed | TTFT | $/1M in/out (cache) | Context | Tier |
|---|---:|---:|---:|---:|---:|---|
| `openrouter/x-ai/grok-4.5` | 54 (#8) high only | 113.8 t/s | 12.75s | $2 / $6 ($0.50) | 500k | WORKHORSE |
| `openrouter/x-ai/grok-4.3` | 38 high / 36 med | ~108 t/s | 13-24s | $1.25 / $2.50 | 1M | below-WORKHORSE |
| `openrouter/x-ai/grok-4-fast-reasoning` | 27 | n/p | n/p | $0.20 / $0.50 | 2M | FAST |
| `openrouter/x-ai/grok-4.1-fast` (non-reasoning) | 17 | n/p | n/p | $0.20 / $0.50 | 2M | FAST (trivia) |

grok-4.5 AA eval: $600.92 / 60M output tokens at high. Intel 54 places it
between terra (55) and luna (51) — genuine terra-parity workhorse, NOT a sol
substitute. **AA published ONLY the (high) variant**; medium/low exist as xAI
reasoning-effort params (confirmed in xAI docs) and cut token spend, but their
intelligence isn't benchmarked — grok-4.3's high38/med36 gap implies grok-4.5
med≈52, low≈50 (inference, not measured). Level mapping: high=workhorse-max
(multi-file logic, careful code, review-lite only when codex sol is quota-dry),
medium=everyday implementation/tests, low=grunt/mechanical. 500k context is
half codex's 1M — for >250k-token sweeps prefer a 1M-context model.
This is a METERED provider (real $/token): watch the `orch status` COST column
and prefer bounded one-shot dispatches over long steered sessions.
Observed 2026-07-12 (first fleet day): grok-4.5:high shipped infra-grade
extension code (event-API archaeology + correct handler); medium shipped
targeted drizzle + lint fixes — all first-pass accepted, consistent with Intel 54.

## Session hygiene (provider-independent)

- Unrelated new task → `--fresh` / `orch new`: stale context degrades output and re-bills every accumulated token each turn.
- Related follow-up (SAME task) → same session, steer at most once.
- `/new` clears the session but KEEPS the pane's model+thinking setting.
- A user-aborted or wedged session (turns increment, zero tool calls, empty replies) is dead: `--fresh` it before reuse; see SKILL.md dispatch-ack rules.

Keep this matrix current against [Artificial Analysis](https://artificialanalysis.ai/):
instance tables refresh from AA; the abstraction and roster only change on
operator order.
