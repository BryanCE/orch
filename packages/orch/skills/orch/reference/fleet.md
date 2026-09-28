# Fleet shape and cadence

## Tabs are domains, panes are workers

A tab holds one domain (`server`, `client`). A pane is a named worker on one slice of that
domain. A tab holds at most `fleet.max_agents_per_tab` panes, and orch refuses a spawn or
tile that would overfill it before anything opens. The human watches panes by eye, and a
crammed tab shows nothing.

```bash
orch spawn slice-1 slice-2 --tab <domain> --with tasks/W1.md \
  --prompt "Do section T1 of tasks/W1.md. Only that section." \
  --prompt "Do section T2 of tasks/W1.md. Only that section."
```

`--tab <label>` fills the tab that already carries that label, so a second spawn for a domain
lands in its tab. `orch tile <tab|pane> <name>` adds one named pane. `orch move <target> --tab
<tab_id|label>` fixes a pane in the wrong tab. Pass the tab id from `orch tabs` when the label
is not unique, and leave `--split` off so the pane lands balanced. Move skips the tab cap, so
move only into a tab with room.

Fill a tab before you open another. A domain that outgrows its tab gets an overflow tab named
`<domain>-02`, then `-03`. A spawn that would overfill is refused whole, so split it yourself
across `--tab api` and `--tab api-02`. Give every tab a unique label, and open a new tab for a
new domain.

## Size the fleet to the slices

Scale panes to the number of slices that touch different files, up to
`fleet.max_agents_per_pack`. Fewer panes than slices makes you the bottleneck. A handful of
related edits in the same files is one worker doing them in order, and that beats three
workers plus the coordination.

Read the capacity line before each spawn wave. Bare `orch status` ends with it,
`orch status --capacity` prints it alone, and `orch help status` explains each entry. It names
the free slots and the orchestrators that hold the rest. Packs never sum: two orchestrators at
5 and 8 are both under a cap of 10.

## Slice small, refill fast

You do the thinking. Each dispatch hands a worker one small, exact change, usually one to
three related edits. A worker that has to design the approach got an under-specced task, and
the fix is a sharper task. Lookups hand out well too ("list every caller of Y", "which table
holds Z") when the task names the topic and the answer shape.

Split by role as well as by size. Moving a file, changing its consumers, and checking the
result are three workers at once, each on its own files.

The loop is small change, land, check, next dispatch. The moment a worker lands, its pane gets
the next slice. A big fleet of fast small tasks beats a small fleet of big ones. A worker whose
slice is too big reports that, and you split it.

## Keep the pane, rename the work

Reuse an agent between tasks: `orch dispatch` gives it fresh context with its name and model
intact. Spawn a replacement only after a dispatch to the idle agent errors, then close the one
it replaces. `orch reset <target>` clears the context without new work. Close a tab when its
domain is done. A close-and-respawn cycle each round costs time and leaves dead panes that look
idle.

Name each pane for its slice (`mcp-types`, `mcp-tools`, `mcp-guards`) and rename it when the
slice changes, in the same message as the dispatch. `orch rename <target> <name>` sets the NAME
column and the pane border together (`--pane` sets only the border) and leaves pane, context
and model alone. A stale name lies, and an ordinal like `worker-2` says nothing. Renaming keeps
the watch, since the monitor scope filters on `spawnedBy`.

## Another session's agents

Their lease is not yours. Every verb that drives or reads an agent (`dispatch`, `steer`,
`answer`, `model`, `reset`, `reload`, `restart`, `rename`, `result`, `broadcast`, `move`,
`zoom`, `focus`, `keys`) refuses a live foreign holder. From a harness session a foreign agent
does not resolve at all (`No target matches "<t>"`), and `close` refuses with
`cannot close <name>: it belongs to <owner>`. `orch detach` releases your own lease, and
`orch adopt` takes an unleased agent.

Their orchestrator can close them at any moment, so plan only on your own agents. When the
pack cap blocks a spawn, spawn what fits now, hold the rest, and retry on any event that frees
capacity.

## The cadence

The fleet idles when you read, write one task, dispatch one pane, and repeat. What keeps it
busy, in order of effect:

- One command per wave. Write the whole wave first, then one `orch spawn` with N `--file`
  flags (or the wave file in `--with` and N `--prompt` pointers) and N `--model` flags. On the
  next wave, send all the renames in one message and all the dispatches in the next.
- Review as diffs land. Do it yourself, or keep a reviewer pane on a stronger model when the
  volume outruns you. Each finding goes into the task list as a task: file:line and the
  smallest fix.
- Report before a wide change. When a change crosses many files and you lack the map, one
  read-only pane can list every consumer, call site and fixture into a report file. Later tasks
  point `--with` at it.
- Verify at stopping points. Idle panes run the verify commands over their own slice's files.
  Gated commands stay with the user.

## The task list

The task list lives in a scratch directory for the job: one index file, plus one file per task
or one file per wave with a section per task. Each task carries everything the worker needs.
Write it once, then append as findings come back.

```bash
orch dispatch w1 --file tasks/T1.md --with notes/readers.md
orch dispatch w2 "Do section T2 of tasks/W1.md. Only that section." --with tasks/W1.md
```

The index:

```markdown
# <job>  (notes: notes/readers.md)

## Wave 1: tasks/W1.md  (files: src/a.ts | src/b.ts | test/a.test.ts)
- T1   owner: src/a.ts     <one-line title>
- T2   owner: src/b.ts     <one-line title>

## CHECKPOINT 1
verify: src/a.ts src/b.ts test/a.test.ts
user: report progress, do what the user asked for at checkpoints.
```

One task, as `tasks/T1.md` or as a section of `tasks/W1.md`:

```markdown
## T1 Rename foo to bar
Edit src/a.ts:
- L42 `export function foo(x: string): Foo` → rename to `bar`, same signature.
- Remove the import of `oldThing` at L3.
Verify: src/a.ts test/a.test.ts
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
```

A task dispatches cleanly when it is:

- Exact. Paths, line numbers, the current and target signatures, the names to use.
- Small. One to three edits, 1 to 3 minutes of work.
- Owned. No other task in the wave touches its files. You decide ownership here, and the
  worker never has to.
- Self-checking. The task names the files to verify. The worker header carries the commands.
- Answerable in one line. The report shape is in the task, so you refill without reading a
  page.

A read-only task has the same shape with no edits: a topic, an answer shape, one report file,
and the reply "report written".
