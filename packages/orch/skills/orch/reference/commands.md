# Command surface

`orch help` is the authoritative map. `orch help <command>` carries the flags.

## Spawn

```bash
orch spawn api-types api-routes api-guards --tab api --cwd "$(git rev-parse --show-toplevel)"
```

Opens one tab of N balanced-tiled agents. Never steals focus. Cap is `fleet.spawn_cap`
(default 8). Every name is validated before any tab or pane is created, so a refused spawn
leaves nothing behind.

- `--tab` names the tab, `--name` names the agents. Each falls back to the other.
- `--worktree` only when parallel agents would otherwise edit the same files. Collect with
  `orch review`.
- `--backend headless` runs detached and requires `--prompt`. The agent runs it and exits,
  with no pane to steer.

### Spaces

Inside a herdr pane (`HERDR_PANE_ID` set) the fleet lands as a new tab in your space, with no
grant and no `--space`. A refusal reading "not running inside a herdr pane ... `orch grant
<id>`" means the installed build predates the U7 fix (2026-08-29): ask the user to rebuild.
Never chase it with `orch space create` or `--space`.

`--space <name>` files the fleet in an orch space the user created (`orch space list`). A
space is optional and is never a plexer workspace id like `w7`. Manage them with `orch space
create|list|rename|delete`. There is no `orch ws`.

## Models

Every harness names models in its own vocabulary, so there is no global model string. `orch
models` lists what each enabled harness reports. `--search` filters, `--pick` prints one
exact spec for scripting.

- The launch model comes from `defaults.models.<harness>` in settings.json. Pass `--model`
  only for a deliberate one-off, then verify the MODEL column in `orch status`.
- Escalate one rung at a time, and only when the task failed at the current rung, then
  re-dispatch. A capable model with a complete prompt (exact files, signatures, DON'Ts) beats
  a stronger model with a vague one. Spend the effort on the prompt.
- Never send a shorthand or a half-remembered name. orch fuzzy-matches an unrecognized spec
  onto whatever is closest, which silently lands an agent on a model you did not choose.
  Resolve the exact spec first with `orch models --pick`, send it whole, and confirm the
  MODEL column after every spawn and pin.
- `orch model <target> <model[:thinking]>` retargets a live agent, but only where
  `caps.setModel` is true. Where it is not (Claude Code, for one), pin at spawn or use `orch
  reset --model`.
- `models.allowed.<harness>` gates what may launch at all. `models.preferred.<harness>` is
  only the quicklist that harness's picker cycles. Different lists. `orch settings models`
  re-picks both.

## Dispatch

```bash
orch dispatch api-types "<the full task spec>"
```

Durable and returns fast: the write lands in the daemon's outbox and survives a restart. It
prints a dispatch id, and `orch status --json` echoes it as `.dispatchId` once the agent is
actually running that prompt. That is how you prove the pane runs what this command sent
rather than trusting that it looks busy.

Ack: anything other than a transition into `working` means it never started. Redispatch once.

`--model` and `--agent` pin the model or route through a different harness for one dispatch.
`--raw` skips the composed worker contract header.

## Queue

For fan-out where you do not care which agent takes which task:

```bash
orch queue add "<task>"       # repeat per task; prints an id
orch work                     # assign queued tasks to idle agents
```

`orch work --once` does a single pass. `orch queue list|history|cancel <id>` manage it.
Failed tasks retry up to `queue.max_retries` (default 1).

## Watch

```bash
orch events --all --status done,error,blocked,asking
```

Each line becomes a wake-up. No `jq`, no `--json`.

- **Preflight before arming, every time.** This survives a context compaction because it reads
  the OS instead of your memory:

  ```bash
  pgrep -fa "orch events" | grep -v pgrep
  ```

  Non-empty means a watch is already armed, so do not arm another. If it names panes that no
  longer exist (compare to `orch status`), `kill` that pid and arm one fresh.
- **Smoke-test before arming.** `timeout 6 orch events --all --since-seq 0 --status done` must
  print past transitions. A silent stream means the scope is wrong, not that nothing
  happened.
- **Scope.** The default is the agents this session spawned, matched on `spawnedBy`, and it
  covers panes you dispatch to later without re-arming. Other sessions run workers in the
  same fleet; their transitions belong to their orchestrator and every stray alert burns a
  wake-up. `--any-agent` lifts that scope. `--agent=<name>` or `--agent-id=<id>` narrows to
  one. `--all` covers every workspace. `--once` exits after the first match.
- **No dedupe needed.** The daemon suppresses an identical `(key, oldState->newState,
  dispatchId, task)` for 120s at the publish point, so a flapping status file produces one
  event, not fifteen. `seq` is that agent's transition ordinal, and `(key, seq)` identifies an
  event if you want certainty you acted once.
- **No timestamp floor needed.** A fresh subscribe receives live events only. History comes
  back solely via `--since-seq <n>`. A `date`-based floor only risks dropping real events to
  clock skew.
- Event fields: `key, agent, name, tab, model, oldState, newState, seq, streamSeq, task,
  cost, ts, workspace, workspaceName, dispatchId, spawnedBy, spawnedByLabel`.

An attached stream counts as daemon usage, so `orchd` will not idle-shut-down beneath it.
The daemon delivers notifications to sounds, desktops, webhooks and commands from the `notify` sinks in
settings.json whether or not anyone is streaming. `orch events --notify` only renders them
locally. `orch notify test` fires a synthetic transition through every sink.

`orch wait <target> --status done --timeout <ms>` blocks. One deliberate checkpoint, never a
substitute for the stream.

## Targets

A target is an agent name (`api-types`), a pane id, or an agent key. All three resolve to the
same agent. Names are the readable option, so keep them meaningful.

## Steering and arrangement

Steer a running agent at most once with `orch steer <target> "<text>"`. It arrives mid-turn.
A doctrine change big enough to need explaining twice is a reset plus a new dispatch. A pane
in `asking` refuses a steer and names `orch answer`: answering a pending question is a
different operation, and a steer aimed at one is accepted by the inbox and then lost inside
the blocked turn.

`orch broadcast "<text>" [targets...|--all]` steers several and reports which refused rather
than failing the whole fan-out. `orch abort <target>` cancels the current turn.

`orch pipe <src> <dst> "<instruction>"` hands one agent's finished result to another.

Arrange panes without stealing focus: `orch tile`, `orch move`, `orch zoom`, `orch tab
new|rename|close`, `orch space list|create|rename|delete`. Only the `focus` commands jump the
user's view.

`orch close --all` sweeps only panes orch spawned, never the user's own. `--stream` kills
this session's events stream at the same time.

## Worktree review

With `--worktree`, each agent commits on its own branch. Then:

```bash
orch review list                      # done agents with commits ahead of base
orch review approve <target>          # merge the branch, remove the worktree
orch review reject <target> -m "..."  # re-dispatch feedback into the same worktree
```

Bare `orch review` walks it interactively.

## Settings

`orch settings` prints every effective setting with the source that won (flag, then env,
then settings.json, then default). `orch settings --harness=<id>` and `--plexer=<id>` switch
the active default among the enabled set.

`orch settings notify` lists the sinks orchd delivers through. `add <sink> [--<field>=...]
[--on=<state,...>]` upserts one, keeping fields the call omits. `remove <sink>` drops it.
`on` defaults to `blocked,error,done`.

Sinks: `sound` plays a ding on this machine, `desktop` raises a desktop notification, `herdr`
posts in the plexer - none of the three take fields, so they are checkboxes on the `notify` row
of the `orch settings` editor and toggles in the setup wizard. `webhook` needs `--url`,
`command` needs `--command` and runs it with the event JSON on stdin. The packaged `orch-ding`
bin is the worked example for `command`; it makes the same noise the `sound` sink does.

Enter on the `notify` row opens the sink picker: `space` turns a sink on or off, `e` edits what
the focused sink carries - the command it runs, the URL it posts to - `w` picks which agent
states it fires on, and `enter` saves. Both are shown beside the checkbox. A sink that names no
states fires on `blocked,error,done`. The value input starts on whatever is already recorded and
never on a suggestion, so nothing is written that nobody typed.
