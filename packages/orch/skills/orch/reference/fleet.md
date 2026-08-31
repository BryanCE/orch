# Fleet shape and cadence

## Tabs are domains, panes are workers

A tab is one domain (`server`, `client`). A pane is a named worker on one subtask of that
domain. Cap is 4 panes per tab.

First need in a domain:

```bash
orch spawn slice-1 slice-2 --tab <domain> --cwd "$(git rev-parse --show-toplevel)"
```

`--tab <label>` fills a tab that already carries that label, so a second spawn for the same
domain lands where it belongs without a move. There is no implicit "grow under a prefix"
path: names are per-slice and unnumbered. `orch tile <tab|pane> <name>` adds exactly one
pane, named. Use `orch move <pane> --tab <tab_id from orch tabs> --split down` only when a
pane is already in the wrong tab, and there pass the tab ID, never the label.

Fill a tab to its 4-pane cap before creating a new one. When a domain needs more than 4,
create an overflow tab named `<domain>-02` (then `-03`) holding more agents of the same
domain. Never scatter one domain across misc tabs. Never label two tabs identically. A new
tab is justified only when every existing tab is full and the work is a different domain.
Reaching for `orch spawn` without `--tab` while a tab has room is wrong. Five tabs where two
domains would fit in two is wrong.

## Size the fleet to the slices

Default is roughly 6 to 8 panes when the work slices that thin. Scale panes to the number of
file-disjoint slices, not to comfort. Fewer panes than disjoint slices means the
orchestrator is the bottleneck. But a handful of related edits is one worker doing them in
sequence, and that beats three workers plus the coordination.

Size against the capacity footer, not hope. Bare `orch status` ends with one line:

```
pack 7/10 (you 5, claude-xyz 2) · space main 4/6 · machine 7/unlimited
```

`orch status --capacity` prints it alone, `--json --capacity` for the object. Read it before
every spawn wave. It names how many slots are free and which orchestrators hold the rest, so
a cap refusal is never a surprise and a foreign fleet is never invisible.

## Slice small, dispatch fast, refill instantly

The orchestrator is the mind. It does the thinking and hands each worker one small,
precisely-specced change, one to at most three tiny related edits per dispatch. Workers
execute mechanically. They never design, never explore, never think through a system. A
dispatch that needs a worker to figure out the approach is under-specced, so fix the prompt.

The loop is small change, land, green-check, next small dispatch. Idle panes are waste: the
moment a worker lands, its pane gets the next slice. A big fleet of fast small tasks beats a
small fleet of big thinking tasks.

A worker whose slice feels too big for one pane reports that back. The orchestrator splits
the work, never the worker.

## Keep the pane, rename the work

Keep the tab open while the domain probably has more work. Between tasks reuse the pane:
`orch reset <target>` gives fresh context in the same pane, name and model intact. `orch
close` a tab only when that domain is done. Close-and-respawn cycles per round waste time
and leave dead panes that look idle.

Name panes for the work, and rename when the work changes. `orch rename <target> <name>`
sets the NAME column (`--pane` sets the border label instead) and costs nothing: pane,
context and model are untouched. A spawn-ordinal name like `recon-2` says nothing about what
that worker holds. By round three you cannot tell which pane owns which slice and every
event line becomes unreadable. Name by slice: `mcp-types`, `mcp-tools`, `mcp-guards`. After
a reset onto a new slice, rename in the same breath. A stale name is worse than an ordinal
because it actively lies. Renaming does not break the watch, since the scope filters on
`spawnedBy`.

## Another session's panes are never yours

You do not own their lease. `reset` and `dispatch` against a live foreign holder are
refused, and that fleet's orchestrator may close its panes at any moment, so a plan built on
claiming them stalls forever when they vanish. If the pack cap blocks your spawn, spawn as
many as do fit now, queue or hold the rest, and retry the spawn on any event that frees
capacity. Waiting for a foreign fleet to finish is never the plan.

## The cadence

The failure mode is always the same: the fleet idles while the orchestrator reads, writes
one spec, dispatches one pane, and repeats. The fixes, in order of leverage:

- **Batch the wave.** When N panes are free, send all their `reset` and `rename` calls in one
  shot, then all N dispatches in the next. One pane at a time is the bottleneck wearing a
  process hat.
- **Keep one reviewer pane on a stronger model.** A `checker` pane, one tier up, does nothing
  but verify landed work against its specs and write findings to a report file such as
  `recon/wave-review.md`: per slice PASS or ISSUES, file:line, smallest fix. The next fix
  wave dispatches by pointing at that file, so the orchestrator rules on conflicts instead of
  re-deriving every finding.
- **Recon before rewire.** Before a cross-cutting change, spend one pane on a read-only
  inventory (every consumer, every call site, every fixture, file:line) written to a report
  file. Dispatches then cite the report instead of restating it.
- **Verify at stopping points with scoped runs.** Turn idle panes into verifiers that run only
  their slice's test files: `orch lock run -- bun test <files>`. The lock serializes heavy
  runs machine-wide (waiters sleep-poll until it frees, dead holders are evicted), so a
  12-pane fleet cannot stampede the machine. Full-suite gates stay with the user.
- **Self-hosting boundary.** Changes to orch's own code bite only after rebuild, daemon
  reload, and respawn. Bridges reconnect to a restarted daemon on their own.
