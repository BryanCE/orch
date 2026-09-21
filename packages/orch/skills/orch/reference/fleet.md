# Fleet shape and cadence

## Tabs are domains, panes are workers

A tab is one domain (`server`, `client`). A pane is a named worker on one subtask of that
domain. Cap is `fleet.max_agents_per_tab` panes per tab, 4 by default. orch enforces it: a
spawn or tile that would overfill a tab is refused before anything opens. The human watches
panes by eye, and a crammed tab shows nothing.

First need in a domain:

```bash
orch spawn slice-1 slice-2 --tab <domain> --file tasks/T1.md --file tasks/T2.md
```

`--tab <label>` fills a tab that already carries that label, so a second spawn for the same
domain lands where it belongs without a move. There is no implicit "grow under a prefix"
path: names are per-slice and unnumbered. `orch tile <tab|pane> <name>` adds exactly one
pane, named. Use `orch move <pane> --tab <tab_id from orch tabs> --split down` only when a
pane is already in the wrong tab, and there pass the tab ID, never the label.

Fill a tab to its cap before creating a new one. When a domain needs more, create an
overflow tab named `<domain>-02` (then `-03`) holding more agents of the same domain. A spawn
that would overfill is refused outright: split it into `--tab api` and `--tab api-02`
yourself. Never scatter one domain across misc tabs. Never label two tabs identically. A new
tab is justified only when every existing tab is full and the work is a different domain.

## Size the fleet to the slices

Default is roughly 6 to 8 panes when the work slices that thin. Scale panes to the number of
file-disjoint slices, not to comfort. Fewer panes than disjoint slices means the
orchestrator is the bottleneck. But a handful of related edits is one worker doing them in
sequence, and that beats three workers plus the coordination.

Size against the capacity footer, not hope. Bare `orch status` ends with one line, and
`orch status --capacity` prints it alone; `orch help status` explains each entry. Read it
before every spawn wave. It names how many slots are free and which orchestrators hold the
rest, so a cap refusal is never a surprise and a foreign fleet is never invisible. Packs never
sum: two orchestrators at 5 and 8 are both under a cap of 10.

## Slice small, dispatch fast, refill instantly

The orchestrator is the mind. It does the thinking and hands each worker one small,
precisely-specced change, one to at most three tiny related edits per dispatch. Workers
execute mechanically. They never design, never pick an approach, never think through a
system. A dispatch that needs a worker to figure out the approach is under-specced, so fix
the prompt. Lookups are fine to hand out: "find the doc for X", "list every caller of Y",
"which table holds Z" are mechanical when the topic and the answer shape are named.

Split a job by role, not by size. Moving a file, changing the code that consumes it, and
checking the result are three workers running at once, each on its own files, not one
worker reading a four-section spec.

The loop is small change, land, green-check, next small dispatch. Idle panes are waste: the
moment a worker lands, its pane gets the next slice. A big fleet of fast small tasks beats a
small fleet of big thinking tasks.

A worker whose slice feels too big for one pane reports that back. The orchestrator splits
the work, never the worker.

## Keep the pane, rename the work

Keep the tab open while the domain probably has more work. Between tasks reuse the agent:
`orch dispatch` gives the next task fresh context in the same agent, name and held model
intact. `orch reset <target>` does the clear alone, when you want the context gone and send
no work. `orch close` a tab only when that domain is done. Close-and-respawn cycles per round
waste time and leave dead panes that look idle.

Name panes for the work, and rename when the work changes. `orch rename <target> <name>`
sets the NAME column (`--pane` sets the border label instead) and costs nothing: pane,
context and model are untouched. A spawn-ordinal name like `recon-2` says nothing about what
that worker holds. Name by slice: `mcp-types`, `mcp-tools`, `mcp-guards`. After a dispatch
onto a new slice, rename in the same breath. A stale name is worse than an ordinal because it
actively lies. Renaming does not break the watch, since the scope filters on `spawnedBy`.

## Another session's panes are never yours

You do not own their lease. `reset`, `dispatch`, `steer` and `model` against a live foreign
holder are refused, and that fleet's orchestrator may close its panes at any moment, so a
plan built on claiming them stalls forever when they vanish. If the pack cap blocks your
spawn, spawn as many as do fit now, queue or hold the rest, and retry on any event that frees
capacity. Waiting for a foreign fleet to finish is never the plan.

## The cadence

The failure mode is always the same: the fleet idles while the orchestrator reads, writes
one spec, dispatches one pane, and repeats. The fixes, in order of leverage:

- **One command per wave.** Write the whole wave's task files first, then one `orch spawn`
  with N `--file` flags and N `--model` flags launches the whole wave on the right models.
  On the next wave, send all the `rename` calls in one shot, then all N dispatches in the
  next. One pane at a time is the bottleneck wearing a process hat.
- **Keep one reviewer pane on a stronger model.** Give it its own `--model` in the same
  spawn. A `checker` pane, one tier up, does nothing but verify landed work against its specs
  and write findings to a report file such as `recon/wave-review.md`: per slice PASS or
  ISSUES, file:line, smallest fix. The next fix wave dispatches by pointing `--with` at that
  file, so the orchestrator rules on conflicts instead of re-deriving every finding.
- **Recon before rewire.** Before a cross-cutting change, spend one pane on a read-only
  inventory (every consumer, every call site, every fixture, file:line) written to a report
  file. Dispatches then cite the report instead of restating it.
- **Verify at stopping points with scoped runs.** Turn idle panes into verifiers that run
  the verify commands over their slice's files only. Locked commands stay with the user.

## The task list

The task list is the contract between the recon reports and the dispatches. It lives in a
scratch directory for the job: one index file, plus ONE FILE PER TASK. Each task file is a
self-contained spec that an orch receives verbatim through `--file`, so it carries
everything the orch needs and nothing it has to look up. It is written once from the
reports, then only appended to as findings come back.

The task file is the dispatch. Write the task into `tasks/T1.md` when you write the list;
send it with `--file tasks/T1.md`. Never write it into the index and then copy it out into
another file to send: that is the same task written twice.

```bash
orch dispatch w1 --file tasks/T1.md --with recon/readers.md
```

The index:

```markdown
# <job>  (reports: recon/readers.md, recon/daemon.md)

## Wave 1  (files: src/a.ts | src/b.ts | test/a.test.ts)
- tasks/T1.md   owner: src/a.ts     <one-line title>
- tasks/T2.md   owner: src/b.ts     <one-line title>

## CHECKPOINT 1
verify: src/a.ts src/b.ts test/a.test.ts
user: report progress, do what the user asked for at checkpoints.
```

One task file, `tasks/T1.md`:

```markdown
Edit src/a.ts:
- L42 `export function foo(x: string): Foo` → rename to `bar`, same signature.
- Remove the import of `oldThing` at L3.
Verify: src/a.ts test/a.test.ts
Report: one line. "done: <files>, verify clean" or "blocked: <exact error>".
```

What makes a task dispatchable:

- **Exact.** Paths, line numbers from the report, the current signature and the target
  signature, the names to use. The orch pattern-matches; it does not read around.
- **Small.** One to three edits, 1 to 3 minutes. A task that lists five edits is two tasks.
- **Owned.** No two tasks in one wave touch the same file. Ownership is the wave's
  concurrency guarantee, so it is decided here and never by the orch.
- **Self-checking.** The worker header carries the project's verify commands
  (`workers.verify_commands`); the task names only the files to run them over. The orch
  runs them once, after its edits, and puts the result in its report.
- **Answerable in one line.** The report shape is written into the task. A one-line answer
  is what lets the orchestrator refill instantly instead of reading a page.

Recon tasks use the same shape with no edits: a topic, an exact answer shape, one report
file, and the reply "report written". Their reports are what `--with` points at in the
waves that follow.
