---
name: pi-agent
description: Drive the `pi` coding agent CLI from Claude Code to run prompts through Bryan's OpenAI-subscription models (gpt-5.6 via openai-codex OAuth). Use to get a second-model opinion, offload a self-contained task, or cross-check work with GPT. Trigger on "ask pi", "ask gpt", "use pi", "get gpt-5.6's take", "second opinion from pi".
allowed-tools: Bash, Read, Write
model: sonnet
---

# Using the `pi` Coding Agent

`pi` is a local terminal coding agent wired to Bryan's **OpenAI subscription**
(the gpt-5.6 family via openai-codex OAuth, no API credits spent). Use it for a
second-model opinion, a cross-check on load-bearing work, or a self-contained
offload.

Binary: `pi` (on PATH, e.g. `~/.bun/bin/pi`). Config: `~/.pi/agent/`.

## The command

```bash
pif -p --no-session --model "openai-codex/<exact-id>:<effort-from-model-matrix>" "YOUR PROMPT"
```

`pif` = pi run under bun with extension DISCOVERY off but the two control-plane
extensions (`herdr-agent-state`, `orchestrator-bridge`) ALWAYS loaded: same CLI,
faster startup, and every run stays visible/steerable via `orch` (status, result,
inbox steering). `PIF_BARE=1 pif ...` strips all extensions — rare fire-and-forget
one-offs only, never the default. ALWAYS dispatch with `pif`; plain `pi` is only
for Bryan's interactive TUI. `-p` prints and exits; `--no-session` leaves no session file.
Read the output yourself, never ask Bryan to paste it. `@file` / `@img.png`
before the prompt attaches files; pipe stdin (`git diff | pif -p --no-session --model "openai-codex/<exact-id>:<effort-from-model-matrix>" "..."`).

## You orchestrate, pi does the work

pi on an appropriately routed model moves ~10x your speed on grunt coding and
gives a free second opinion on design. Token efficiency is also a primary reason
to delegate; current evidence and settings live only in
`reference/model-matrix.md`. The moment a task is "read these N files and report", "make
this mechanical edit", or "sanity-check this approach", it goes to pi, NOT your
own Grep/Read/Edit loop. You stay light: dispatch, wait for the ping, make the
final call. Tool scoping by task shape: repo investigation
needs `--tools read` (with `--no-tools` pi has NO file access and refuses —
verified 2026-07-08); `--no-tools` ONLY when the full input is inline in the
prompt or piped via stdin; `--approve --tools read,edit` only when editing is
explicitly the point. pi never writes code unless editing IS the task.

**Your context is a token budget, not a container to fill.** Fable's system prompt opens
with an explicit budget for exactly this reason. Every whole-file Read, every "let me
double-check", every line of narration between tool calls is budget spent. Spend it on
DISPATCH and INTEGRATION; make the agents spend theirs on the reading and typing.

## The nine rules (each one cost a session to learn)

1. **Act on what you already verified. NEVER delegate confirmation of a fact you know.**
   If you already read the code and know the answer, say it and move. Spawning an agent
   to "double-check" something you proved yourself is burned time and burned trust. The
   only reason to dispatch research is that YOU do not yet know the answer.

2. **Fan out immediately, in ONE message.** The moment a task splits into independent
   slices, dispatch ALL of them at once (multiple tool calls / `herdr pane run` in one
   turn). Do not set them up one at a time across turns. Serial setup of parallel work
   is the #1 thing that makes you look slow.

3. **Split by NON-COLLIDING slice.** No two agents may write the same file. The natural
   roles almost never collide:
   - **implement** (writes the source) — exactly ONE agent owns each file
   - **review** — the Claude orchestrator itself reviews the design and diff; a pi review pane runs only on explicit operator instruction
   - **test** (writes a NEW test file) — different file, no collision
   - **baseline/verify** — the Claude orchestrator gathers facts and verifies; pi agents implement, not verify
   A single-file change can use implementation and test slices; the Claude orchestrator reviews the result itself.

4. **Smarter model at low thinking beats dumber model at high thinking.** Read
   `reference/model-matrix.md`, the single routing authority, and use its exact
   task-shape setting. Set both model and effort before dispatch. Do not recreate
   its ladder in this file.

5. **Carry the taste IN the prompt.** Agents execute taste, they do not have it. Every
   dispatch names the exact files, the exact function signature, the helpers to reuse,
   and the explicit DON'Ts (no `as` casts, no barrels, no behavior change, no running
   typecheck/build). A vague prompt gets vague slop back; fix the prompt, redispatch.

6. **Review is the Claude orchestrator's job.** A pi review pane runs only when the
   operator explicitly orders that review dispatch. Otherwise, the orchestrator attacks
   the DESIGN (the approach, hidden coupling, ordering, blast radius) and performs the
   narrow correctness pass on the actual diff.

7. **You verify on disk yourself. Never trust "done".** After an agent reports success:
   read the actual diff, run the behavior-lock tests, run fallow/complexity. An agent
   saying "Implemented, no behavior change" is a claim, not proof. On mission-critical
   code (payroll cascade, snapshot writes) this is non-negotiable.

8. **Keep yourself light.** Dispatch → `herdr wait agent-status <pane> --status idle`
   (or the background-agent notification) → read the distilled result → integrate. Do
   not sit in the loop narrating every agent's transcript into your own context.

9. **Decide, do not survey.** If grep/investigation answers a question, answer it and
   act. No multi-choice menus for things you can verify. Frustration from the user is
   almost always "you are being slow and indecisive," not "you did the wrong thing."

## Scale the fan-out to the task — the effort ladder

Fable scales tool calls to question difficulty; you scale agents to task size. Read the
task, pick the rung, commit. Under-investing (one agent on a 4-slice job) and
over-investing (four agents to confirm a one-line fact) are both wrong.

| Task size | Response |
|---|---|
| Single known fact | Answer directly. Zero tools, zero agents. |
| One lookup | One tool call (grep/read/one dispatch). Do NOT fan out. |
| Medium change | 3-5 calls, or a small fan-out of non-colliding slices. |
| Deep change | 5-10 calls, implement/test fan-out; the Claude orchestrator reviews and verifies. |
| 20+ calls of work | Stop hand-driving. Escalate to a heavier harness (Workflow fan-out, `deep-research`, orchestrator-led ultra review). |

The last rung is the one people miss: past a certain size, driving it turn-by-turn
yourself is the slow path. Hand it to the harness. (Fable's tell: "suggest the Research
feature" instead of grinding 20+ searches by hand.)

## Anti-patterns (the exact mistakes that trigger "why aren't you delegating")

- Reading/editing a single file yourself for 5 turns while 4 agents sit idle.
- Dispatching a "research" agent for something you already confirmed on disk.
- Setting up agents serially, one per turn, instead of one fan-out message.
- Trusting an agent's "done" and reporting complete without reading the diff.
- Giving a thin prompt, getting slop, and blaming the model instead of the prompt.
- Surveying the user with options when a grep would decide it.
- Narrating the routing decision. Fable selects the tool and produces; it never says "per
  my guidelines" or explains which agent it picked or offers the one it didn't. Dispatch,
  do not announce the dispatch. No commentary between tool calls.
- Rationalizing doing it yourself when an agent fits the category. Fable's rule is "category
  match, not style preference": if a slice is agent-shaped, do not subdivide it into a
  special sub-case ("this one's too delicate to delegate") to justify grinding it solo. The
  matrix-selected cheaper setting drafts first; the Claude orchestrator checks the output itself.

## Routing centerpiece: DRAFT -> CHECK -> MANAGE

**Single routing authority:** read **`reference/model-matrix.md`** before every
dispatch. Its task-shape table owns all model and effort choices. Never copy or
reconstruct that table here.

- **DRAFT:** use the matrix-prescribed cheaper setting for the first version.
- **CHECK:** the Claude orchestrator verifies the draft itself; a checking agent runs only on explicit operator order.
- **MANAGE:** Claude NEVER drafts what a pane can draft. Scope slices, dispatch,
  read `orch status`, inspect final diffs on disk, integrate, and make the final
  call.

The governing tradeoff remains: smarter model at low thinking beats dumber model
at high thinking.

## 🚦 ONE check picks the path: `echo $HERDR_ENV`

There are exactly TWO ways to run pi, and this decides it. No third option, no mixing.

- **`1` → herdr is open. Use PATH A (herdr panes) below.**
- **empty → no herdr. Use PATH B (background wrapper) below.**

If the SessionStart hook said `HERDR_ENV=1`, it is `1`. The PreToolUse skill-gate hook
injects this same verdict every time you invoke `/pi-agent` or `/codex`.

## PATH A — herdr is open (this is the whole procedure, inline)

Everything you need is here; you do not need to go read another skill first. pi/codex
run in herdr PANES; **`orch` is the single controller** — the whole loop needs no raw
`herdr` subcommands. NEVER the `pi-dispatch` wrapper.

**HARD MODEL-TIER ROUTING GATE:** first read the task-shape row in
`reference/model-matrix.md`, then run `orch status` and read the `NAME`, `TAB` and
`MODEL` columns. The matrix selects the setting; set it with `orch model`, which
routes through the bridge to pi's real APIs (`setModel`/`setThinkingLevel`),
supports the combined `provider/id:thinking` form, and prints old → new so the
switch is verified. **NEVER send `/model <x>:<y>` into a pane with `pane run`:**
pi's `/model` is a fuzzy SEARCH — a non-matching string opens a selector overlay
that wedges the pane (Escape dismisses it).

**FIRST THING ON SKILL ACTIVATION — arm the event stream (do this before any dispatch).**
`orch events` is a native, forever-running, all-panes transition stream (one line
per state change: working/idle/done/blocked/error/aborted/exited, with `lastError`
text on error/aborted). Start ONE persistent Monitor on it the moment this skill
activates and keep it up for the whole session; it is the orchestrator's ONLY
wake channel for the fleet:
```
Monitor(command: "orch events --status working,idle,done,blocked,error,aborted,exited",
        persistent: true, timeout_ms: 3600000)
```
One stream covers every pane for the whole session — never poll status.json in
a bash loop and never background a per-fan-out watcher; this is the single wake
channel. TaskStop it only when the fleet work is fully done and panes are torn
down. If it dies, restart the same Monitor. Do NOT start a second one — a single
stream reports all panes.

**The dispatch loop, in order every time. No alternatives to weigh:**
```bash
orch status                                          # 1. instant fleet context: NAME/TAB/MODEL/STATE/COST/CTX/TASK/LAST
orch spawn <N> --tab work --name job                 # 2. only if panes are needed: fresh tab, N NAMED agents, balanced auto-tiling
orch tile <tab> --name extra                         #    (or add ONE balanced pane to an existing tab)
orch model <target> "openai-codex/<exact-id>:<effort>"  # 3. per the matrix; verified old → new
orch dispatch <target> 'FULL PROMPT: exact files, helpers, DON-Ts' [--then <dst> "note"]  # 4. ALL slices in ONE turn
# 5. (nothing to arm per fan-out — the session-long `orch events` Monitor pings every transition)
orch result <target>                                 # 6. read the final text
orch new <target>                                    # 7. clear the session before the next assignment
```
Mid-flight: `orch steer <target> "correction"` (delivered as a steer while working);
`orch pipe <src> <dst> ["instruction"]` feeds one agent's result to another;
`orch broadcast "<text>" --all` steers the whole fleet. `orch restart <target>|--all`
reloads extensions in place via `/reload` (same pid, session intact) — `--hard`
full restart is only for pi version upgrades. `orch tail`/`orch session` read pi's
own session files; `orch tabs/tab/focus/zoom/move/rename/kill/clean` are the rest
of the CRUD. Targets accept pane ids, unique suffixes (`p3`), or herdr agent names.

**Agent-to-agent:** every bridged pi agent has tools `orch_agents` (discover live
peers), `orch_send` (drop a message in a peer's inbox), `orch_read` (read a peer's
result) — write handoffs INTO the dispatch prompt, or wire them mechanically with
`--then` / `orch pipe`. Bryan's manual equivalents inside a pane: `/peers` and
`/tell <target> <msg>`.

NEVER `herdr pane read` an agent (it scrapes the TUI and lies) — `orch status`
lastText, `orch result`, and `orch tail` are the channel (`orch peek` exists as a
labelled eyeball-only escape hatch). If a pane is missing from `orch status`, its
pi predates the bridge — `orch restart <target>` it (`--hard` after extension-file
changes; plain restart = in-place `/reload`).

**Dispatch ack (2026-07-12 quota incident):** `orch dispatch` prints the
pane's status — `→ status: working` is the ack; `→ status: idle` means the
turn never started, and waiting on it is pure loss. Causes seen: a provider
usage limit (codex 5h window) killing the pane's run mid-turn, an operator
model switch mid-run, or chaining `orch new && orch dispatch` sub-second into
a brand-new session ("No session file" from `orch tail` = zero turns yet, not
necessarily a broken bridge). Remedy ladder: redispatch once into the settled
pane; if it still doesn't ack `working`, `orch restart <target>` then
redispatch. After any quota abort or manual mid-run model change, expect the
next dispatch to need this. A killed run leaves the PREVIOUS `done` state +
result in `orch status`, so always verify claimed work on disk.

## Orchestrator-as-advisor discipline

The orchestrator IS the advisor. Workers NEVER invoke side-model advisor agents.

Every `orch run` and `orch dispatch` prompt carries the worker escalation rule
automatically; use `--raw` only when the exact unheaded prompt is intentionally
required. Workers decide facts they can verify, then call `orch_ask` for
orchestrator decisions. Workers NEVER use ask-user tools: no human watches
worker panes. The NEEDS ANSWER toasts (bottom-left, re-nag every 60s) are the
operator's visibility feed only — the operator is never the answerer; the
orchestrator escalates to the operator through its own question UI only for
genuinely operator-owned calls.

The session-long `orch events` Monitor (armed on activation, see the dispatch
loop) is what surfaces blocked/error/done — no per-fan-out watcher.
Answer questions promptly via `orch questions` and `orch answer <target> "text"`.
A blocked agent is the highest-priority interrupt — clear it before ordinary
completion work.

Escalation ladder:
1. Agent decides what it can verify from code, tools, and evidence.
2. Agent calls `orch_ask` for ambiguous scope, missing direction, or risky choices.
3. Orchestrator decides when it can; operator-owned calls go through the
   orchestrator's own question UI.

Advise mid-flight. Read `orch status` for state, `lastText`, and `currentFile`
drift. Steer early with `orch steer <target> "correction"`; do not wait for
`done` to discover a bad path.

Apply **the nine rules** and the exact setting from **`reference/model-matrix.md`**
to every dispatch. herdr-only mechanic: delegated agents live
on their OWN tab, never yours; never split your own tab. Spawn a fresh delegated tab and
add more panes to it (parse the id out of the JSON each time):
```bash
ROOT=$(herdr tab create --workspace 1 --label work --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])')
herdr pane run "$ROOT" "pi"                      # first agent on the tab
NEXT=$(herdr pane split "$ROOT" --direction right --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEXT" "pi"                      # second agent, same tab
```
Reuse idle panes from `herdr pane list` before spawning new ones. Always `--no-focus`.

**Default pipeline for "refactor/extract X":** fan out non-colliding DRAFT slices
in one message using the task-shape settings from `reference/model-matrix.md`, then
the Claude orchestrator CHECKS each completed draft itself.

Then YOU MANAGE: read the diff, confirm the constraints held, re-run the suite,
and run fallow (dupes + complexity ≤12 + dead-code). Regressed means a follow-up
dispatch, not "done".

## PATH B — no herdr: background sub-agent wrapper

pi is verbose; sitting in the main loop waiting burns Bryan's context on pi's
transcript. **Default (off-herdr):** spawn the **`pi-dispatch`** agent
(`run_in_background: true`) to run the pif command in FOREGROUND Bash and return a
distilled few-line answer. EVERY pif dispatch MUST include an explicit combined
`--model "openai-codex/<id>:<thinking>"`. Never rely on the saved model and never
use a standalone `--thinking` flag as a substitute. Read the task-shape row in
`reference/model-matrix.md` and apply its DRAFT setting exactly; the Claude
orchestrator performs the CHECK itself. NEVER batch-task, NEVER haiku. Wrapper model: opus (default)
for a single relay; `sonnet` when one wrapper runs several pif commands with
judgment between. Fan out SEVERAL in PARALLEL when work splits (multiple
questions/files/slices), all in ONE message. Direct `pif -p ...` in your own Bash
is the exception, only for a single quick call you need inline, and it still
requires explicit `--model ...:thinking`. Full pattern + template:
**`reference/orchestration.md`**.

## Split small, steer hard

One sub-agent = ONE self-contained slice. A prompt joining unrelated asks with
"and" is two agents. Implementation fan-out splits by FILE so no two pi agents
touch the same file; you integrate and review every diff. pi executes taste, it
does not have taste: every prompt carries design direction, exact files, helpers
to reuse, and explicit DON'Ts (no accordion UIs, no barrels, no generic slop).
Bad output = bad steering: fix the prompt, redispatch, fold the lesson into this
skill the same session.

## Review dispatches are adversarial

This section applies ONLY when the operator has explicitly ordered a pi review dispatch; otherwise review is the Claude orchestrator's own job.

pi must be able to kill the approach. **Two dispatches, in order:** (1) approach
attack, user's raw ask + diff only, stance "assume over-engineered, what's the
boring standard way, REJECT unless simpler-is-impossible is proven"; (2) only if
it survives, narrow correctness check. Question 1 is always WHY this code exists,
quote the requirement or call it invented. State as fact only what you directly
verified; everything the author concluded goes to pi as a claim to attack. SOUND
on correctness is not a design sign-off.

## Model + effort mechanics

Provider is always `openai-codex`. NEVER switch to a metered key (`openrouter`, raw
`openai`/`anthropic`). Every pif dispatch uses an explicit GPT-5.6 family model and
effort selected from **`reference/model-matrix.md`**, the single routing authority.

PATH A applies the selected pair with `/model openai-codex/<id>:<level>`. PATH B combines it as
`--model "openai-codex/<id>:<effort>"`.

Pi's native effort controls and syntax are documented in
`reference/thinking-levels.md`; that file does not choose task routing. Never
chain retries with `timeout`/`tee`.

## Reference (read when you need it)

- **`reference/orchestration.md`** — default run pattern + dispatch template. Read before running pi.
- **`reference/thinking-levels.md`** — effort syntax and mechanics only.
- **`reference/model-matrix.md`** — SINGLE routing authority; task shape to exact model + effort.
- **`reference/flags.md`** — tool scoping, steering, sessions, output modes, full flags.
- **`reference/recipes.md`** — copy-paste commands for common jobs.

## Gotchas

- `-p` mode can't answer interactive prompts; use `--approve` if pi must edit.
  Never run interactive `pi` (no `-p`) or `pi --list-models`, the TUI blocks.
- Don't trust the model's self-report ("what model are you" can lie); routing is
  set by config/`--model`.
- Same repo rules apply to pi: no mutating DB scripts, no script runner.
- Verified: `pif -p --no-session --no-tools --model "openai-codex/gpt-5.6-luna:high" "Reply with exactly: PI_OK"` → `PI_OK`.
