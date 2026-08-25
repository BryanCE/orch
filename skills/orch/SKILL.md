---
name: orch
description: Drive the orch CLI to run a fleet of coding agents in visible panes - spawn, dispatch work, watch state transitions, and collect results. Use for any multi-agent dispatch, for spawn/tile/close/reset lifecycle, for the durable task queue, or when an orch command errors.
allowed-tools: Bash, Read
---

# orch — a fleet of agents you dispatch to and collect from

`orch` runs coding agents (the *harnesses*: `pi`, `omp`, `claude`, `codex`) inside a
terminal multiplexer (the *plexers*: `herdr`, `tmux`, or detached `headless`). Each agent
lives in a pane you can see. A resident daemon (`orchd`) brokers every write, so a
dispatch survives restarts and state changes arrive as a push stream instead of a poll.

Config lives in `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), which is
plain JSON you may edit by hand. `orch help` is the authoritative command map;
`orch help <command>` (or `orch <command> -h`) carries the flag detail.

## Before anything else

`orch setup` must have run once. Every command except `setup`, `doctor`, `status`,
`help`, and `version` refuses to run until it has, naming the fix. If a command reports
a broken install, run `orch doctor` — with `-y` it applies every fix unattended.

## The loop: spawn → dispatch → watch → collect

### 1. Spawn a tab of agents

```bash
orch spawn 2 --name api --cwd "$(git rev-parse --show-toplevel)"
```

Opens one tab holding N balanced-tiled agents named `<prefix>-1..N` (`api-1`, `api-2`).
Never steals focus. The cap is `fleet.spawn_cap` (default 8).

- **`--cwd` is the only sandbox orch offers.** It defaults to the directory you ran the
  command in, and it is recorded per agent. Naming the repo in the prompt text is not a
  boundary — nothing stops a worker editing a different tree. Pass it explicitly.
- **`--tab <label>` joins an existing tab** when one already carries that label; otherwise
  it opens a new one. `--tab` names the *tab*, `--name` names the *agents*; each falls
  back to the other so one flag still produces a sensibly-labeled tab.
- **Spawning under a live prefix grows that fleet** — numbering continues past the highest
  live `<prefix>-<n>` and the new panes land in its tab. So a second `orch spawn 2 --name
  api` gives you `api-3` and `api-4` beside the first two, not a rival tab.
- Every name is validated before any tab or pane is created: a refused spawn leaves
  nothing behind.
- `--worktree` gives each agent its own git worktree. Use it when parallel agents would
  otherwise edit the same files; collect the work with `orch review`.
- `--backend headless` runs detached and **requires `--prompt`**: the agent runs that
  prompt and exits. This is the non-interactive path, with no pane to steer.

To add one pane to a tab that already exists, use `orch tile <tab|pane> --name <name>`
rather than a second spawn.

### 2. Dispatch work

```bash
orch dispatch api-1 "<the full task spec>"
```

The write lands in the daemon's outbox and survives a restart. It returns fast and prints
a dispatch id; `orch status --json` echoes that id as `.dispatchId` once the agent is
actually running that prompt — which is how you prove the pane is running what *this*
command sent, rather than trusting that the pane looks busy.

Send the task and only the task. orch composes the worker contract itself — the pane is
unattended, heavy commands are gated behind `orch lock run`, the worker does not fan out
subagents or shell out to `orch` — and prepends it to every dispatch. That contract lives in
exactly one file, `src/worker-prompt.ts`, and it is written per adapter from that adapter's
declared capabilities. **Never hand-write any of it into your prompt:** a typed near-copy
delivers the rule twice in two wordings, and the two drift. A rule the header is missing gets
added to `src/worker-prompt.ts`, never pasted around it.

- `--raw` sends the exact prompt with no worker header.
- `--model` / `--agent` pin the model or route through a different harness for this one
  dispatch.
- **Ack check:** anything other than a transition into `working` means it never started.
  Redispatch once.

For fan-out where you do not care which agent takes which task, use the durable queue
instead of hand-assigning:

```bash
orch queue add "<task>"       # repeat per task; prints an id
orch work                     # assign queued tasks to idle agents
```

`orch work --once` does a single assignment pass instead of the continuous loop.
`orch queue list|history|cancel <id>` manage it. Failed tasks retry up to
`queue.max_retries` (default 1).

### 3. Watch — push, never poll

`orch events` is a daemon push stream: transitions arrive the instant they happen.

```bash
orch events --mine --status done,error,blocked,asking --json
```

**Never wrap `orch status` in a polling loop.** `orch status` is for one-shot inspection.

- `--mine` limits the stream to agents *this session spawned*. Other sessions run workers
  in the same fleet; their transitions are somebody else's to collect.
- `--status` filters to transitions into those states.
- `--json` emits one event per line with the fields: `key, agent, name, tab, model,
  oldState, newState, seq, streamSeq, task, cost, ts, workspace, workspaceName,
  dispatchId, spawnedBy, spawnedByLabel`.
- **You do not need to dedupe.** The daemon suppresses an identical
  `(agent, transition, dispatch, task)` repeat for 120 seconds, so a flapping status file
  produces one event, not fifteen. `seq` is that agent's transition ordinal — `(key, seq)`
  identifies an event if you want to be certain you act on it once.
- **You do not need a timestamp floor.** A fresh subscribe receives live events only.
  History is replayed *only* when you ask for it with `--since-seq <n>`.
- `--once` exits after the first matching event. `--all` covers every workspace.

Arm one stream per session and leave it running — it covers dispatches made later.
An attached stream counts as daemon usage, so `orchd` will not idle-shut-down beneath it.

Notifications to Slack/webhooks/commands are delivered by the daemon from the `notify`
sinks in settings.json whether or not anyone is streaming; `orch events --notify` only
renders them locally. `orch notify test` fires a synthetic transition through every sink.

`orch wait <target> --status done --timeout <ms>` blocks — use it as a deliberate single
checkpoint, not as a substitute for the stream.

### 4. Collect

```bash
orch result <target>          # result.json, else the session's last assistant text
orch tail <target> -n 40      # last N session entries, human-readable
orch peek <target>            # what is literally on the pane screen right now
orch questions                # every agent currently blocked on a question
orch answer <target> "<text>" # unblock one
```

**`done` is a claim, not a verification.** Read the diff yourself before you believe it.

`orch pipe <src> <dst> "<instruction>"` hands one agent's finished result to another.

## Targets

A target is an agent name (`api-1`), a pane id, or an agent key. Names are the readable
option, so keep them meaningful: `orch rename <target> <name>` costs nothing and leaves
the pane, its context, and its model untouched. A name describing the *slice* (`auth-db`,
`auth-routes`) stays useful; a spawn ordinal stops being informative by round two, and a
name left over from a previous task actively misleads. Rename in the same breath as you
redispatch. `--pane` renames the pane border label instead of the agent.

## Models

Every harness names models in its own vocabulary, so there is no single global model
string. `orch models` lists what each enabled harness reports it can run; `--search`
filters, `--pick` prints one exact spec for scripting.

- The launch model comes from `defaults.models.<harness>` in settings.json. Pass `--model`
  only for a deliberate one-off.
- `orch model <target> <model[:thinking]>` retargets a live agent — but only for harnesses
  whose `caps.setModel` is true. Where it is not (Claude Code, for one), pin the model at
  spawn or `orch reset --model` instead.
- Always pass the harness's exact spec. A partial or invented name can fuzzy-match onto
  something you did not intend. Confirm the MODEL column in `orch status` after any spawn
  or pin.
- `models.allowed.<harness>` gates what may launch at all; `models.preferred.<harness>` is
  only the quicklist that harness's own picker cycles. They are different lists.
  `orch settings models` re-picks both.

## Lifecycle

| verb | what it does | when |
|---|---|---|
| `orch reset <target>` (alias `new`) | fresh session/context, same pane, model re-pinned | **before every new task** |
| `orch reload <target>` | live-reload code in place after a rebuild | you rebuilt orch or an extension |
| `orch restart <target>` | full harness process relaunch | reset and reload both failed |
| `orch close <target>` (alias `kill`) | close the pane | that work is finished for good |

**Reuse before you spawn.** A pane you already have is a `reset` away from being a fresh
worker. Close-and-respawn cycles cost time and leave dead panes that look idle.
`orch close --all` sweeps only panes orch spawned, never the user's own; add `--stream` to
kill this session's events stream at the same time.

Arrange panes without stealing focus: `orch tile`, `orch move`, `orch zoom`,
`orch tab new|rename|close`, `orch ws`. Only the `focus` commands jump the user's view —
`orch focus <target>` and `orch tab focus`.

Steer a running agent at most once with `orch steer <target> "<text>"`; it arrives mid-turn.
A change of direction big enough to need explaining twice is a `reset` plus a new dispatch.
`orch broadcast "<text>" [targets...|--all]` steers several. `orch abort <target>` cancels
the current turn.

## Worktree review

With `--worktree`, each agent commits on its own branch. Then:

```bash
orch review list                      # done agents with commits ahead of base
orch review approve <target>          # merge the branch, remove the worktree
orch review reject <target> -m "..."  # re-dispatch feedback into the same worktree
```

Bare `orch review` walks it interactively.

## Sizing a fleet

Parallel workers pay off only for **file-disjoint slices large enough that the split saves
real time**. A handful of related edits is one worker doing them in sequence — faster than
three workers plus the coordination. Split by domain, then name each pane for its slice.

Write the full spec into the dispatch: exact files, signatures, and the things not to do.
A capable model with a complete prompt beats a stronger model with a vague one, so spend
the effort on the prompt before reaching for a bigger model.

## When something is wrong

- `orch doctor` — checks runtime, composition, backends, daemon, presence, sinks, hosts.
  On a TTY it offers fixes; `-y` applies them all unattended.
- `orch daemon status` — trust the RPC answer, not the existence of a pid file. A hung
  daemon: `orch daemon stop`, kill the pid, `orch daemon start`.
- **After rebuilding or reinstalling orch, `orch daemon reload`** re-execs the daemon on
  the new code. This is the fix for a CLI/daemon hash-skew refusal.
- **A daemon bounce deafens live bridges** — they do not reconnect. After any daemon
  stop/start, respawn the fleet and smoke-test one trivial dispatch before fanning out.
- `orch clean` reaps dead agent dirs; `--worktrees` also clears orphaned worktrees
  (`--force` discards unmerged work).
- `orch status --json` is a **top-level array** — filter with `.[]`, there is no `.agents`
  key. Row fields: `key, paneId, managed, name, owner, tab, agent, model, modelShort,
  state, cost, ctxPercent, tokens, turns, task, lastText, alive, exited, dispatchId,
  sessionPath, presenceDir, workspace`.
- Reads default to the current workspace. A workspace-wall error means "not from here" —
  it is not an invitation to retry with `--all`.
- `orch settings` prints every effective setting with the source that won
  (flag > env > settings.json > default). `orch settings --harness=<id>` /
  `--plexer=<id>` switches the active default among the enabled set.
