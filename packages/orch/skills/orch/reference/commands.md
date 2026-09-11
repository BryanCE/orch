# Command surface

`orch help` is the authoritative map. `orch help <command>` carries the flags.

## Spawn

```bash
orch spawn api-types api-routes api-guards --tab api
```

Opens one tab of N balanced-tiled agents. Never steals focus. Every name is validated before
any tab or pane is created, so a refused spawn leaves nothing behind.

Four settings can refuse it, and the refusal names the one that fired:
`fleet.max_agents_per_pack`, `fleet.max_agents_per_space.<space>`, `fleet.max_agents_total`,
and `fleet.max_depth` for how deep a spawner may itself have been spawned. Read the remaining
headroom with `orch status --capacity` before you size a fleet, not after a spawn burns.

- The positionals name the agents, one per agent; `--tab` names the tab. There is no
  `--name` flag, no count argument and no `<prefix>-N` numbering.
- `--worktree` only when parallel agents would otherwise edit the same files. Collect with
  `orch review`.
- `--prompt <text>` gives every agent its first task, or repeat it once per agent.
  `--file <path>` (or `--file -`) reads that one task from disk or stdin, and `--with <path>`
  points the agents at a file or directory of context they open on demand, once per path.
  A spawn gets to work right away.
- Spawn waits for every bridge to attach before it returns; an unattached agent prints
  `STALLED <handle>  <name> - bridge never attached; try: orch restart <name>` and exits 1.
- Outside every plexer, spawn defaults to headless. `--backend <plexer>` names a plexer and
  opens its own home behind a user grant. `--backend headless` runs detached and needs
  `--prompt` or `--file`. The agent runs the task and exits, with nowhere to steer it.

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
orch dispatch api-types --file slice.md   # or --file - to read the spec from stdin
orch dispatch api-types --file slice.md --with src/api/types.ts --with src/api/schema.ts
orch dispatch api-types "one more line in the same thread" --keep-context
```

**Dispatch clears the context first.** It clears the session, re-pins the model, then
sends. That is the default, so a new task never stacks on a used session and you never
pair `orch reset` with it yourself. `--keep-context` sends onto the session the agent
already has: use it only to add to work already in flight.

`--with <path>` points the agent at context: a spec, a docs directory, a set of source files,
anything it needs to do the task well. One flag per path. The agent gets the absolute path and
an instruction to open it only when the task needs it. Nothing is inlined, so a big docs tree
costs nothing until the agent reads a file from it. orch checks the path exists at dispatch and
dies on a missing one; it never reads the content. Use `--with` for what the agent may need to
look at, and put what it must know into the prompt itself.

### Quote the spec correctly. This is yours, not orch's.

The shell splits argv before orch runs, so orch only ever receives the finished string. A
mangled spec is a quoting mistake in whatever shell you typed it into, never an orch bug, and
`--file` is not the fix for one — it is for a spec too long to want on one line.

**Single-quote the spec.** It is the one rule that holds in every shell orch runs under:
inside single quotes bash, zsh and PowerShell all treat every character literally, so `$VAR`,
backticks, `"` and `;` are just text.

```sh
orch dispatch api-types 'keep $ORCH_DIR and `backticks` literal; say "done" when finished'
```

Only a literal apostrophe differs, and only in how it is escaped: `'\''` in bash and zsh,
doubled `''` in PowerShell. Double quotes differ far more — bash makes `$`, a backtick, `\`
and `"` special, PowerShell makes `$` and a backtick special — so reach for them only when the
text contains an apostrophe and no `$`.

Durable and returns fast: the write lands in the daemon's outbox and survives a restart. It
prints a dispatch id, and `orch status --json` echoes it as `.dispatchId` once the agent is
actually running that prompt. That is how you prove the pane runs what this command sent
rather than trusting that it looks busy.

`--model` and `--agent` pin the model or route through a different harness for one dispatch.
`--raw` skips the composed worker contract header.

`orch dispatch` prints `Delivered to <recipient> (dispatch <id>)` when the agent applied the
prompt. It prints `Queued to <recipient> (dispatch <id>): no bridge ack within
<timeouts.dispatch_ack_ms>ms` when the daemon accepted a durable write but no bridge ack
arrived before the timeout. Queued writes retry on `daemon.outbox_drain_ms`; watch
`orch events` for the state change.

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
orch events
```

Each line becomes a wake-up. No flags, no `jq`, no `--json`. Bare `orch events` is every
state of every agent you own, in lines complete enough to act on without a second command.
That is what watching a fleet means, and it is the whole of normal use.

`orch events` and `orch status` answer the same scope question in two shapes: events pushes
transitions as they happen, status returns a table right now with cost and context. Both
default to what you own, both take `--space-wide` and `--filter`, and neither sees past the
space wall. `orch status --agent=<name|id>` shows that one agent, exited or not.
`orch status --filter=owner,env,done` filters OUT: a column name drops that column from the
table, from `--json` rows, and from `--live`; any other name drops rows in that state. Every
status flag composes with every other. `orch wait` is the third shape: one blocking checkpoint on one agent.

- **Preflight before arming, every time.** This survives a context compaction because it reads
  the OS instead of your memory:

  ```bash
  pgrep -fa "orch events" | grep -v pgrep
  ```

  Non-empty means a watch is already armed, so do not arm another. If it names panes that no
  longer exist (compare to `orch status`), `kill` that pid and arm one fresh.
- **Smoke-test before arming.** `timeout 6 orch events --since-seq 0` replays past
  transitions. Silence has three causes, and orch names the first one for you: you own no
  agents yet (the stream says so), the fleet is mid-turn and has changed no state, or your
  scope excludes the agents that did. `orch status` tells the second from the third.
- **Scope: three rings, and you are in the first.** The default is the agents this session
  owns, matched on `spawnedBy` and the open lease, and it covers panes you dispatch to later
  without re-arming. Other sessions run workers in the same fleet; their transitions belong
  to their orchestrator and every stray alert burns a wake-up. `--space-wide` widens to the
  rest of your space, for two orchs coordinating, not for normal watching. Past that is the
  wall, and nothing lifts it — a human at a raw terminal sits in no space, so they alone see
  the machine, and an orch never can. `--agent=<name>` or `--agent-id=<id>` narrows to one.
  `--filter=done,error` keeps only those states. `--once` exits after the first match.
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
settings.json whether or not anyone is streaming. There is no `--notify` flag: every `orch events`
line already carries the notification title. `orch notify test` fires a synthetic transition
through every sink.

`orch wait <target> --status done --timeout <ms>` blocks. One deliberate checkpoint, never a
substitute for the stream.

## Targets

A target is an agent name (`api-types`), a pane id, or an agent key. All three resolve to the
same agent. Names are the readable option, so keep them meaningful.

## Answer

```bash
orch answer <target> "<text>"
```

Answer has no force flag. If the target is not asking, orch refuses it by name with
`<target> is not asking a question`. Use `orch answer` for a pending question, not
`orch steer`.

## Steering and arrangement

Steer a running agent at most once with `orch steer <target> "<text>"`. It arrives mid-turn.
A doctrine change big enough to need explaining twice is a new dispatch. An agent in `asking`
refuses a steer and names `orch answer`: answering a pending question is a different operation.
Use `orch answer` instead.

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
of the `orch settings` editor and toggles in the setup wizard. Fields are assignment flags:
`webhook` needs `--url=<value>`, `command` needs `--command=<value>` and runs it with the event
JSON on stdin. The packaged `orch-ding`
bin is the worked example for `command`; it makes the same noise the `sound` sink does.

Enter on the `notify` row opens the sink picker: `space` turns a sink on or off, `e` edits what
the focused sink carries - the command it runs, the URL it posts to - `w` picks which agent
states it fires on, and `enter` saves. Both are shown beside the checkbox. A sink that names no
states fires on `blocked,error,done`. The value input starts on whatever is already recorded and
never on a suggestion, so nothing is written that nobody typed.
