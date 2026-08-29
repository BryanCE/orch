---
name: orch
description: Drive the orch CLI to run a fleet of coding agents in visible panes - spawn, dispatch work, watch state transitions, and collect results. The moment you are told to use orch, use it, or spawn agents, your FIRST action is `orch spawn` - one command, no preflight, no driving the plexer yourself, no asking. Then dispatch async and watch the push stream; never babysit with a blocking wait. Use for any multi-agent dispatch, for spawn/tile/close/reset lifecycle, for the durable task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch — tabs are domains, panes are workers you keep

`orch` runs coding agents (the *harnesses*: `pi`, `omp`, `claude`, `codex`) inside a
terminal multiplexer (the *plexers*: `herdr`, `tmux`, or detached `headless`). Each agent
lives in a pane you can see. A resident daemon (`orchd`) brokers every write, so a
dispatch survives restarts and state changes arrive as a push stream instead of a poll.

Everything goes through `orch` — never drive the plexer directly. Config lives in
`$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON you may edit by
hand. `orch help` is the authoritative command map; `orch help <command>` carries the flags.

## Before anything else

`orch setup` must have run once. Every command except `setup`, `doctor`, `status`, `help`,
and `version` refuses until it has, naming the fix. If a command reports a broken install,
run `orch doctor` — with `-y` it applies every fix unattended.

## Fleet model

- **Tab = domain** (`server`, `client`). First need in a domain: `orch spawn <name> <name>
  --tab <domain>` → new tab, panes stacked. Cap 4 panes per tab.
- **Pane = a named worker for one subtask** of that domain. `--tab <label>` FILLS a tab that
  already carries the label, and spawning under a live `<prefix>` grows that fleet in ITS
  tab (numbering continues past the highest live `<prefix>-<n>`), so a second spawn for the
  same domain lands where it belongs without a move. `orch tile <tab|pane> <name>` adds
  exactly ONE pane. Use `orch move <pane> --tab <tab_id from orch tabs> --split down` only
  when a pane is already in the wrong tab — there, pass the tab ID, never the label.
- **A tab is one real domain and every pane in it belongs to that domain. FILL a tab to its
  4-pane cap before creating a new one.** When a domain needs more than 4, create an overflow
  tab named `<domain>-02` (then `-03`) holding more agents of the SAME domain. Never scatter
  one domain across misc tabs; never label two tabs identically. A new tab is justified only
  when every existing tab is full AND the work is a genuinely different domain. Reaching for
  `orch spawn` without `--tab` while a tab has room is wrong. Five tabs where two domains
  would fit in two is wrong.
- **Default fleet size is ~6-8 panes when the work slices that thin.** Scale panes to the
  number of file-disjoint slices, not to comfort. Fewer panes than disjoint slices means the
  orchestrator is the bottleneck. But a handful of *related* edits is one worker doing them
  in sequence — that beats three workers plus the coordination.
- **Slice small, dispatch fast, refill instantly.** The orchestrator is the MIND: it does the
  thinking and hands each worker one small, precisely-specced change (one to at most three
  tiny related edits per dispatch). Workers execute mechanically — they never design, never
  explore, never think through a system. A dispatch that needs a worker to "figure out" the
  approach is under-specced; fix the prompt. The loop is small change → land → green-check →
  next small dispatch. Idle panes are waste: the moment a worker lands, its pane gets the
  next slice. A big fleet of fast small tasks beats a small fleet of big thinking tasks.
- **Keep the tab open while the domain probably has more work.** Between tasks reuse the
  pane: `orch reset <target>` gives fresh context in the same pane, name and model intact.
  `orch close` a tab only when that domain is DONE. Close/respawn cycles per round waste
  time and leave dead panes that look idle.
- **Name panes for the work, and rename when the work changes.** `orch rename <target>
  <name>` sets the NAME column (`--pane` sets the border label instead) and costs nothing —
  pane, context and model are untouched. A spawn-ordinal name (`recon-2`) says nothing about
  what that worker holds; by round three you cannot tell which pane owns which slice and
  every event line becomes unreadable. Name by SLICE: `mcp-types`, `mcp-tools`, `mcp-guards`.
  After a `reset` onto a new slice, rename in the same breath — a stale name is worse than an
  ordinal because it actively lies. Renaming does NOT break the watch: the scope filters on
  `spawnedBy`, not on the name.
- **Reuse before spawn, always.** Next task in a domain: `orch reset <idle-pane>`, then
  dispatch to it. Spawn a replacement ONLY after that dispatch actually errors, spawn it INTO
  the same tab, and immediately `orch close` the zombie it replaces. Never spawn while an
  addressable idle pane exists.

## The cadence — how an orchestrator stays fast

The failure mode is always the same: the fleet idles while the orchestrator reads, writes
one spec, dispatches one pane, and repeats. The fixes, in order of leverage:

- **Batch the wave.** When N panes are free, send ALL their `reset` + `rename` calls in one
  shot, then ALL N dispatches in the next. One pane at a time is the bottleneck wearing a
  process hat.
- **Keep one reviewer pane on a stronger model.** A `checker` pane (one tier up) does
  nothing but verify landed work against its specs and WRITE its findings to a report file
  (e.g. `recon/wave-review.md`): per slice PASS/ISSUES, file:line, smallest fix. The next
  fix wave dispatches by pointing at that file — the orchestrator rules on conflicts
  instead of re-deriving every finding.
- **Recon before rewire.** Before a cross-cutting change, spend one pane on a READ-ONLY
  inventory (every consumer, every call site, every fixture — file:line) written to a
  report file. Dispatches then cite the report instead of restating it; the orchestrator
  stops being the spec-writing bottleneck.
- **Answer `asking` within seconds.** `orch questions` → `orch answer` the moment the watch
  fires. A blocked pane is the most expensive kind of idle, and a steer aimed at it is lost.
- **Verify at stopping points with scoped runs.** Turn idle panes into verifiers that run
  ONLY their slice's test files: `orch lock run -- bun test <files>`. The lock serializes
  heavy runs machine-wide (waiters sleep-poll until it frees, dead holders are evicted), so
  a 12-pane fleet cannot stampede the machine. Full-suite gates stay with the user.
- **`done` is a claim.** Check the diff or route it through the reviewer pane before
  building on it; a $0.02 "done" on a big slice is a tell.
- **Redispatch once on error, then escalate the model** — not the other way around.
- **Self-hosting boundary:** changes to orch's own code bite only after rebuild + daemon
  reload + respawn; bridges reconnect to a restarted daemon on their own.

## Spawn

```bash
orch spawn api-types api-routes --cwd "$(git rev-parse --show-toplevel)"
```

Told to use orch → spawn is your first tool call. No status preflight, no asking. Opens one
tab of N balanced-tiled agents named `<prefix>-1..N`. Never steals focus. Cap is
`fleet.spawn_cap` (default 8).

- **ALWAYS pass `--cwd "$(git rev-parse --show-toplevel)"`.** Omitting it does not fail
  loudly: `--cwd` silently defaults to whatever directory you ran `orch spawn` from and
  records THAT as the agent's cwd, so `orch status` shows a confident path that is simply the
  wrong repo. Writing "Repo: /path/to/x" at the top of a dispatch is TEXT IN A PROMPT, not a
  boundary — nothing stops a worker editing an unrelated repo, and a worker that wanders has
  no error to hit. `--cwd` is the only sandbox orch offers; a spawn without it is unscoped.
  (Real cost: a fleet spawned for one repo edited a different repo's source instead. Every
  dispatch named the right repo; none of them were confined to it.)
- **Naming is part of creating.** The positional arguments ARE the agent names, one per
  pane, and how many you give is how many panes you get. There is no `--name` flag, no
  default name and no `<prefix>-<n>` numbering: name each pane for the SLICE it holds
  (`mcp-types`, `mcp-tools`, `mcp-guards`), and you never pay for a rename afterwards.
  Renaming is for when the WORK changes, never for creation.
- `--tab` names the *tab*; an unnamed tab borrows the first agent's name.
- Every name is validated before any tab or pane is created: a refused spawn leaves nothing.
- `--worktree` only when parallel agents would otherwise edit the same files; collect with
  `orch review`.
- `--backend headless` runs detached and **requires `--prompt`** — the agent runs it and
  exits. No pane to steer.

## Models

Every harness names models in its own vocabulary, so there is no global model string.
`orch models` lists what each enabled harness reports; `--search` filters, `--pick` prints
one exact spec for scripting.

- The launch model comes from `defaults.models.<harness>` in settings.json. Pass `--model`
  only for a deliberate one-off, then verify the MODEL column in `orch status`.
- **Escalate one rung at a time, and only when the task actually failed at the current
  rung** — then re-dispatch. A capable model with a complete prompt (exact files, signatures,
  DON'Ts) beats a stronger model with a vague one. Spend the effort on the prompt.
- **Never send a shorthand or a half-remembered name.** orch fuzzy-matches an unrecognized
  spec onto whatever is closest, which silently lands an agent on a model you did not choose.
  Resolve the exact spec first (`orch models --pick`), send it whole, and confirm the MODEL
  column after every spawn and pin.
- `orch model <target> <model[:thinking]>` retargets a live agent, but only where
  `caps.setModel` is true. Where it is not (Claude Code, for one), pin at spawn or
  `orch reset --model`.
- `models.allowed.<harness>` gates what may launch at all; `models.preferred.<harness>` is
  only the quicklist that harness's picker cycles. Different lists. `orch settings models`
  re-picks both.

## Dispatch

```bash
orch dispatch api-1 "<the full task spec>"
```

Durable and returns fast: the write lands in the daemon's outbox and survives a restart. It
prints a dispatch id, and `orch status --json` echoes it as `.dispatchId` once the agent is
actually running that prompt — which is how you prove the pane runs what *this* command
sent rather than trusting that it looks busy.

**Send the task and only the task.** orch composes the worker contract itself — the pane is
unattended, heavy commands are gated behind `orch lock run`, the worker does not fan out
subagents or shell out to `orch` — and prepends it to every dispatch, written per adapter
from that adapter's declared capabilities. Never hand-write any of it into your prompt: a
typed near-copy delivers the rule twice in two wordings, and the two drift. A rule the
header is missing gets added to the header, never pasted around it. `--raw` opts out
entirely.

- A worker whose slice feels too big for one pane reports that back. The ORCHESTRATOR splits
  the work, never the worker.
- **Ack:** anything other than a transition into `working` means it never started.
  Redispatch once.
- `--model` / `--agent` pin the model or route through a different harness for one dispatch.

For fan-out where you do not care which agent takes which task:

```bash
orch queue add "<task>"       # repeat per task; prints an id
orch work                     # assign queued tasks to idle agents
```

`orch work --once` does a single pass. `orch queue list|history|cancel <id>` manage it.
Failed tasks retry up to `queue.max_retries` (default 1).

## Watch — push, never poll

**Arm the monitor in the SAME message as your first dispatch. Not after it, not once the
first agent goes quiet.** Dispatching with no watch armed is the single most expensive
mistake in this skill: the fleet runs, finishes, and sits done while you believe it is still
working, because nothing told you otherwise. `orch status` cannot save you — you only run it
if you already suspect something, and the whole failure mode is that you do not. If you have
sent `orch spawn` or `orch dispatch` and have not armed a watch, you are not orchestrating,
you are guessing.

**Never wrap `orch status` in a `while true` loop.** `orch events` is a daemon PUSH stream:
transitions arrive the instant they happen — no sleep interval, no diffing, no wasted
wake-ups. A poll loop is worse in every dimension. `orch status` is for one-shot inspection.

**`orch events` as a backgrounded shell command is a watch that never fires.** A harness
that wakes on task *completion* never wakes for a stream that never exits: the lines land in
an output file nobody is awake to read, and it looks identical to "still working". Do not
run it with Bash `run_in_background`, `&`, `nohup`, or any shell backgrounding.

Arm it through your harness's own streaming-watch facility — the one whose contract is "one
notification per output line" (in Claude Code that is the **Monitor tool**, `persistent:
true`). Command:

```bash
orch events --status done,error,blocked,asking
```

Each line becomes a wake-up. No `jq`, no `--json`, no scope flag: bare `orch events` already
emits one readable line per transition, scoped to the agents THIS session spawned.

- **Preflight before arming, every time.** This survives a context compaction because it
  reads the OS instead of your memory — after a compaction you will not remember arming a
  monitor, and this is how you find out:

  ```bash
  pgrep -fa "orch events" | grep -v pgrep
  ```

  Non-empty = a watch is ALREADY ARMED; do not arm another. If it names panes that no longer
  exist (compare to `orch status`), `kill` that pid and arm one fresh.
- **Smoke-test it before arming.** Run the line backgrounded for ~4s and confirm plausible
  output. A watch that never fires looks exactly like "still working".
- **The default scope is the agents THIS session spawned** (matched on `spawnedBy`), and it
  covers panes you dispatch to later without re-arming — unlike a hand-kept list. Other
  sessions run workers in the same fleet; their transitions are their orchestrator's to
  collect and every stray alert burns a wake-up. `--any-agent` lifts that scope; `--agent=<name>`
  or `--agent-id=<id>` narrows to one.
- **No dedupe needed.** The daemon suppresses an identical `(key, oldState→newState,
  dispatchId, task)` for 120s at the publish point, so a flapping status file produces one
  event, not fifteen. `seq` is that agent's transition ordinal — `(key, seq)` identifies an
  event if you want certainty you acted once.
- **No timestamp floor needed.** A fresh subscribe receives live events only; history comes
  back solely via `--since-seq <n>`. A `date`-based floor now only risks dropping real events
  to clock skew.
- Event fields: `key, agent, name, tab, model, oldState, newState, seq, streamSeq, task,
  cost, ts, workspace, workspaceName, dispatchId, spawnedBy, spawnedByLabel`.
- `--once` exits after the first match; `--all` covers every workspace.

An attached stream counts as daemon usage, so `orchd` will not idle-shut-down beneath it.
Notifications to Slack/webhooks/commands are delivered by the daemon from the `notify` sinks
in settings.json whether or not anyone is streaming; `orch events --notify` only renders them
locally. `orch notify test` fires a synthetic transition through every sink.

`orch wait <target> --status done --timeout <ms>` blocks — one deliberate checkpoint, never
a substitute for the stream.

## Collect

```bash
orch result <target>          # result.json, else the session's last assistant text
orch tail <target> -n 40      # last N session entries, human-readable
orch peek <target>            # what is literally on the pane screen right now
orch questions                # every agent currently blocked on a question
orch answer <target> "<text>" # unblock one
```

**`done` is a CLAIM, not a verification.** Read the diff yourself before you believe it.

`orch pipe <src> <dst> "<instruction>"` hands one agent's finished result to another.

## Targets

A target is an agent name (`api-1`), a pane id, or an agent key — all three resolve to the
same agent. Names are the readable option, so keep them meaningful (see renaming, above).

## Lifecycle

| verb | what it does | when |
|---|---|---|
| `orch reset <target>` (alias `new`) | fresh session/context, same pane, model re-pinned | **before every new task** |
| `orch reload <target>` | live-reload code in place after a rebuild | you rebuilt orch or an extension |
| `orch restart <target>` | full harness process relaunch | reset and reload both failed |
| `orch close <target>` (alias `kill`) | close the pane | that DOMAIN is finished for good |

`orch close --all` sweeps only panes orch spawned, never the user's own; `--stream` kills
this session's events stream at the same time.

Arrange panes without stealing focus: `orch tile`, `orch move`, `orch zoom`,
`orch tab new|rename|close`, `orch space`. Only the `focus` commands jump the user's view.

Steer a running agent **at most once** with `orch steer <target> "<text>"`; it arrives
mid-turn. A doctrine change big enough to need explaining twice is a `reset` plus a new
dispatch. **A pane in `asking` refuses a steer** and names `orch answer` — answering a
pending question is a different operation, and a steer aimed at one is accepted by the
inbox and then lost inside the blocked turn. `orch broadcast "<text>" [targets...|--all]`
steers several and reports which refused rather than failing the whole fan-out;
`orch abort <target>` cancels the current turn.

## Worktree review

With `--worktree`, each agent commits on its own branch. Then:

```bash
orch review list                      # done agents with commits ahead of base
orch review approve <target>          # merge the branch, remove the worktree
orch review reject <target> -m "..."  # re-dispatch feedback into the same worktree
```

Bare `orch review` walks it interactively.

## Facts that bite

- **Daemon first, spawn last.** Bridges reconnect to a restarted daemon on their own.
  After any daemon stop/start or rebuild: respawn the fleet, then smoke-test ONE trivial
  dispatch before fanning out. Trust `orch daemon status` (the RPC answer), not the existence
  of a pid file; a hung daemon means stop, kill the pid, start.
- **After rebuilding or reinstalling orch, `orch daemon reload`** re-execs the daemon on the
  new code. This is the fix for a CLI/daemon hash-skew refusal.
- **Stale claimed queue tasks retry into new panes with the same name.** Check `orch queue
  list` before reusing fleet names and cancel leftovers.
- **Known bug:** after a pane's first completed dispatch, control targets can go ambiguous
  (`ambiguous: <agent-key>, <pane-id>`) and even reset may not clear it. This is NOT a licence
  to skip reuse — attempt reset+dispatch on the idle pane FIRST (it costs one command), and
  only on the actual error spawn a replacement, `orch move` it into the domain tab by tab ID,
  and close the zombie.
- **`orch status --json` is a TOP-LEVEL ARRAY** — filter with `.[]`, there is no `.agents`
  key. Row fields: `key, paneId, managed, name, owner, tab, agent, model, modelShort, state,
  cost, ctxPercent, tokens, turns, task, lastText, alive, exited, cwd, dispatchId,
  backendStatus, sessionPath, presenceDir, workspace, spawnedBy`. Two settle arguments: `cwd`
  is the repo the worker is actually confined to, and `dispatchId` diffed against the id
  `orch dispatch` printed proves the pane runs the prompt YOU sent. `state` is what the agent
  says about itself; `backendStatus` is what the plexer says about the pane and it LAGS —
  read `state` for completion, never `backendStatus`.
- **Workspace walls:** reads default to the current workspace. A wall error on housekeeping
  means "not from here" — skip it, do not chase it with `--all`.
- `orch doctor` diagnoses (`-y` unattended). `orch clean` reaps dead-pid presence;
  `--worktrees` also clears orphaned worktrees (`--force` discards unmerged work).
- `orch settings` prints every effective setting with the source that won
  (flag > env > settings.json > default). `orch settings --harness=<id>` / `--plexer=<id>`
  switches the active default among the enabled set.
- `orch settings notify` lists the sinks orchd delivers through; `add <sink> [--<field>=…]
  [--on=<state,…>]` upserts one (fields the call omits are kept), `remove <sink>` drops it.
  `on` defaults to `blocked,error`, so a sink that should announce completions needs
  `--on=blocked,error,done`.
- `$ORCH_DIR/agents/` is the store. `orch help` is authoritative for the full surface.
