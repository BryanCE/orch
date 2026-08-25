# Orchestrating pi — pick the transport FIRST, then fan out, distill

## 🚦 STOP — `echo $HERDR_ENV` decides the transport

- **`1` → in herdr. Run pi in panes per PATH A in SKILL.md. Everything below does NOT apply.**
- **empty → not in herdr. Use the background wrapper (this whole file).**

## The background sub-agent pattern (ONLY when not in herdr)

Everything below is the off-herdr path. Not a raw `pi -p ...` in the main loop.

## The three non-negotiables (govern every dispatch)

Everything below is mechanics. These three are the discipline that makes the
mechanics pay off. The how-hard-to-go ladder lives in the skill's "You orchestrate"
section; these are the rules you apply once you have picked a rung.

1. **Act on what you already know. Never dispatch to confirm a proven fact.** The
   only reason to spawn a pi agent is that YOU do not yet know the answer. If a grep
   or a read already showed you the answer, say it and move — spawning a "double
   check" is burned budget and burned trust. Your context is a token budget, not a
   container to fill: spend it on DISPATCH and INTEGRATION, make pi spend its budget
   on the reading and typing.
2. **Verify the diff yourself. Never trust a distilled "done".** After pi reports an
   edit, read the actual diff, run the behavior-lock tests, run fallow. "Implemented,
   no behavior change" is a claim, not proof — non-negotiable on mission-critical
   code (payroll cascade, snapshot writes).
3. **Dispatch, do not narrate the dispatch.** Pick the agent and go; do not announce
   which one you picked or offer the one you did not. No commentary between tool
   calls. And never rationalize grinding a slice solo because it feels "too delicate
   to delegate". If it is agent-shaped, it goes to an agent. The lowest
   appropriate rung drafts first; the next rung checks.

## DRAFT -> CHECK -> MANAGE

**Tradeoff rule:** a smarter model at low thinking beats a dumber model at high
thinking.

| Rung | Model + effort | Use |
|---|---|---|
| 1 | luna high | Trivial only: pure mechanical reformatting and tiny extractions. |
| 2 | terra low | Default grunt: reads, summaries, reports, docs, boilerplate, mechanical edits. |
| 3 | terra medium/high | Everyday implementation, review, and tests. |
| 4 | sol low/medium | Hard implementation and difficult correctness work. |
| 5 | sol high/xhigh | Architecture, adversarial review, and security-sensitive work. |

The cheaper appropriate rung DRAFTS; the next rung CHECKS. Claude MANAGES by
scoping, dispatching, monitoring, inspecting diffs on disk, and integrating. It
never drafts what pi can draft.

## The chain

```
you = orchestrator + FINAL code author / decision maker
   └─ pi-dispatch sub-agent(s) = run the pif command(s) FOREGROUND, distill
        └─ pi (sol / terra / luna) = heavy investigation / grunt / second opinion
   └─ distilled answer back to you
you → make the final edit or decision from the distilled knowledge
```

- pi's raw transcript NEVER touches your context — only the sub-agent reads it.
- You keep working; each sub-agent pings you when its answer lands.
- YOU orchestrate BOTH levers per dispatch: the wrapper's Claude model AND pi's
  tier+thinking. NEVER haiku for anything. NEVER batch-task as the pi wrapper.
- The saved pi default may be stale. EVERY pif dispatch passes an explicit combined
  `--model openai-codex/<gpt-5.6-sol|gpt-5.6-terra|gpt-5.6-luna>:<effort>`;
  never rely on the default.

## One pi task → one background `pi-dispatch` agent

Spawn the dedicated **`pi-dispatch`** agent with `run_in_background: true`. It
is a THIN wrapper — it does not investigate the repo itself, it drives pif in
FOREGROUND Bash (no sleep, no polling) and summarizes. Pick its model per task:

- **Single relay** (run one pif command, distill): leave the agent's default
  (`opus`, low effort — beats sonnet on cost/quality per model-matrix.md).
- **Sequential batch** (one wrapper told to run 2-4 pif commands one after
  another, e.g. investigate → then edit → then verify): pass `model: sonnet`
  on the Agent call so medium-tier judgment carries the sequence.

Template prompt for the pi-dispatch agent:

```
Run exactly, in order (foreground Bash, generous timeout, never sleep/poll):
1. pif -p --no-session --no-tools --model "openai-codex/<exact-gpt-5.6-id>:<effort>" "<pi prompt 1>"
2. pif -p --no-session --model "openai-codex/<exact-gpt-5.6-id>:<effort>" ... "<pi prompt 2>"   (only if a sequence)

Then return ONLY a distilled answer, no preamble:
## Answer
- <the key findings / root cause, a few lines>
## Fix / next step
- <specific, if applicable>
```

pi shares the repo working dir, so it already sees CLAUDE.md, `.claude/rules/*`,
and skills — do NOT re-explain repo conventions in the pi prompt. pi is bound by
those rules too (no `script:prod`, no mutating DB scripts, no barrels, dates).

## Fan out N in parallel

When the work splits — several independent questions, several files, several
slices of one investigation — spawn several background `pi-dispatch` agents in
ONE message so they run concurrently. Each wraps its own pi call. Collect the distilled
results as they notify, dedupe, then you act.

Good fan-out shapes:
- **N questions:** one sub-agent per question.
- **N files:** one sub-agent per file, same question ("any bug in this file?").
- **N angles on one thing:** correctness / perf / edge-cases as separate pi
  calls, so each answer is focused instead of one sprawling reply.
- **Implementation:** one sub-agent per FILE or per component, never two agents
  on the same file. Draft everyday work on terra medium/high with
  `--approve --tools read,edit` plus an exact spec (see Steering below), then
  check on sol low/medium. Hard implementation drafts on sol low/medium and checks
  on sol high/xhigh. You integrate the reviewed diffs.

## Slice size (split small)

A slice is ONE thing a focused engineer finishes in one sitting: one component,
one route, one service function, one question. If your dispatch prompt needs an
"and" between unrelated asks, that's two agents. Prefer 5 small agents over 1
sprawling one — small slices return faster, fail independently, and are
steerable; a mega-prompt returns one giant unreviewable blob.

## Steering (pi has no taste — you supply it)

pi is a strong executor with generic defaults. An unsteered UI prompt returns
accordion-hidden lists, skeleton spam, and stock layouts. Every dispatch prompt
must include:
- **The direction:** the reference page/pattern to match, exact surface + type
  classes, the interaction model you designed.
- **The DON'Ts:** e.g. no accordions/collapsibles as the primary information
  architecture, no `'use client'` by default, no barrels, no `Date` objects,
  no new utilities that duplicate `src/utils/`.
- **The seams:** exact file paths pi may create/edit, exact existing
  helpers/types/constants to import, the tRPC procedures to call.
When a result comes back wrong, the prompt was wrong: tighten it, redispatch,
and fold the lesson into this file.

## Research agents dump EVERYTHING, once

A web-research or investigation agent gets ONE shot: its prompt must demand the
FULL raw findings (every metric, variant, source URL, partial result), written
to a named scratchpad/notes file, not just the narrow answer asked for. Never
plan a second research pass for data the first pass already had on screen.
Durable research goes into a notes doc in the same turn (see
`feedback_record_web_research_in_notes`).

## Tool scoping (match the task shape, wrong scope = refused dispatch)

pi is for KNOWLEDGE; YOU make the final code change. But scope tools to what
the task needs to KNOW:
- **Repo investigation (any "read these files / sweep src/" task): `--tools
  read`.** With `--no-tools` pi has zero file access and correctly refuses
  instead of guessing (verified 2026-07-08 — four parallel dispatches all
  bounced). Read-only tools ≠ editing; this is still knowledge-only.
- **`--no-tools`** ONLY when the complete input is inline in the prompt or
  piped via stdin (diff reviews, opinion-on-pasted-design, distillation).
- **`--approve --tools read,edit`** only when a contained offloaded edit is
  explicitly the point; review pi's diff after.

## Timebox + re-steer rules (from the 2026-07-08 stall)

- **Grunt dispatch = ~5 min budget, investigation = ~10.** Past that, KILL
  (TaskStop) and redispatch smaller/mechanical — never sit waiting. A stuck
  dispatch is a scoping failure, not something patience fixes.
- **Never send placeholder re-arms** ("re-run the same prompt with flag X").
  Every steering message carries the COMPLETE corrected command verbatim.
  Half the stalled agents on 2026-07-08 were stuck interpreting a placeholder.
- **Grep-shaped work gets a grep-shaped prompt on terra at low effort.** A file
  inventory phrased as an "audit" at high effort runs 10x longer for zero extra
  signal. Reserve high/xhigh for judgment, not enumeration. Luna is only for
  trivial reformatting and tiny extraction; its long-context recall is 41.3%
  MRCR versus sol at 91.5% and terra at 89.6%.
- If the answer is one grep away, DON'T dispatch at all — run the grep.

## When to skip the sub-agent

Direct `pif -p ... --model "openai-codex/<exact-gpt-5.6-id>:<effort>"` in your own Bash is fine
ONLY when it is a single quick call whose short answer you genuinely need inline
right now. Everything else goes through background sub-agent(s): long
investigations, anything you would otherwise wait on, and anything parallelizable.

## Headless is not extensionless: pick extensions per run (updated 2026-07-12)

`pif` turns extension DISCOVERY off for fast startup but ALWAYS loads the two
control-plane extensions via `-e`, so every headless run is observable and
steerable by default. `PIF_BARE=1` strips everything — rare one-offs only.
Three modes:

| Mode | Command | Use |
|---|---|---|
| Default (lean+signals) | `pif -p --no-session --model "openai-codex/<exact-gpt-5.6-id>:<effort>" ...` | any headless dispatch — watchable/steerable via `orch` |
| Bare | `PIF_BARE=1 pif -p --no-session --model "openai-codex/<exact-gpt-5.6-id>:<effort>" ...` | rare fire-and-forget one-shot nobody watches |
| Full | plain `pi` (all extensions: agent-teams, hud) | persistent interactive workers-tab session |

The two signal extensions are the control plane, not decoration:
- **`herdr-agent-state.ts`** — reports working/idle/blocked to herdr's socket, so
  `herdr agent wait --status done` is a real signal, not output-guessing. Inert
  unless `HERDR_ENV=1`, so it costs nothing off-herdr.
- **`orchestrator-bridge.ts`** — writes a per-agent control plane under
  `~/.orch/agents/<KEY>/` (`$ORCH_DIR` overrides `~/.orch`; `<KEY>` uses explicit `ORCH_AGENT_KEY` for headless runs, the interactive pane context when present, or
  `session-<pid>` for a bare pi): `status.json` (state / tokens / cost /
  currentFile / lastText), `result.json` (final text), `inbox.jsonl` (APPEND a
  line to steer the agent mid-run). READ `status.json` to see every agent at
  once as structured JSON; APPEND `inbox.jsonl` to redirect one — both beat
  scraping the rendered TUI / `herdr agent read` tail.
