A whole fleet is one command. The positional arguments are the names, one per agent, and
how many you give is how many panes you get. There is no default name, no numbering, and
no `--name` flag. Name each agent for the slice it holds.

    orch spawn api-types api-routes api-guards --tab api \
      --file specs/types.md --file specs/routes.md --file specs/guards.md \
      --model luna:high --model luna:low --model luna:high

`--prompt`, `--file`, and `--model` each take one value for every agent or exactly N, one
per agent in positional order. Per-agent specs are N `--file` flags, not N dispatches.
Mixed models are N `--model` flags, not two spawns.

A tab is a domain (`server`, `client`). Always pass `--tab`. Without it the tab takes the
first agent's name, which is a worker name on a domain tab. An existing tab with that label
is filled, so a second spawn for the same domain lands where it belongs.

The tab is tiled balanced: 2 side-by-side, 3 as 2+1, 4 as 2x2. Every name and every model
is validated before any tab or pane exists, so a refused spawn leaves nothing behind. Five
settings can refuse a spawn, and the refusal names the one that fired:
`fleet.max_agents_per_pack`, `fleet.max_agents_per_tab` (what the tab holds plus what you
asked for), `fleet.max_agents_per_space.<space>`, `fleet.max_agents_total`, and
`fleet.max_depth` (how deep a spawner may itself have been spawned). Read `orch status
--capacity` before sizing.

Spawn returns only after each agent's bridge attached to orchd. Never sleep after it. A
dispatch sent before attach is queued, not dropped: orchd re-pushes it on attach. It prints:

    ok      <handle>  <name>
    STALLED <handle>  <name> - bridge never attached; try: orch restart <name>

A stall exits 1; the other agents are fine. A stalled agent still gets its `--file` or
`--prompt` dispatch: spawn prints `queued <name> <id>` and orchd delivers it on attach. Only
the model pin is skipped (`not pinned: <name> bridge not attached`); `orch model <name>
<model>` pins it after. An adapter with no bridge prints
`warning: <adapter> writes no presence record at session start - <count> agent(s)
UNVERIFIED; check 'orch status' before dispatching`.

`--with <path>` hands every agent in the spawn that path for context. `--with
<name>=<path>` hands it only to the agent with that name; repeat it for more. A prefix that
names no agent in the spawn is part of the path, so a mistyped name fails as a missing path.

An agent starts where you spawned it. `--dir <path>` when a slice belongs somewhere else. A
repo path typed into a prompt is text, not a boundary.

Inside a plexer pane the fleet lands as a new tab in your space, with no grant. Outside
every plexer the default is headless, and headless needs `--prompt` or `--file`: a detached
agent runs the task and exits with nowhere to steer it. `--backend <plexer>` opens that
plexer's own home, which a human approves with `orch grant`. `--space <name>` files the
fleet in an orch space the user created (`orch space list`); a space is never a plexer's
own grouping id.

`--worktree` only when parallel agents would otherwise edit the same files. Collect with
`orch review`.

Reuse before you spawn. `orch dispatch` gives an idle agent the next task on a fresh
context, name and model intact. Spawn a replacement only after a dispatch to the idle
agent errors, then close the one it replaces.
