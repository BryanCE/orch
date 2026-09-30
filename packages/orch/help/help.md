Read a command's help before you first use it. `orch help` prints the map; `orch help <command>`
or `orch <command> -h` prints its usage, its guidance, and its flags. Help works without setup
or a daemon.

    orch help dispatch

`control target <name> is ambiguous: <key>, <key>` means two live agents share that name.
Name the one you mean by its key, then `orch rename` one of them.

Words orch uses:
- agent: one coding session orch drives. An orchestrator is an agent too.
- target: how a command names an agent: its name, its identity key, or a unique handle suffix.
- harness: the coding tool an agent runs in: pi, omp, claude, or codex.
- plexer: the terminal multiplexer that shows agents: herdr, tmux, orca, or headless.
- pane: one agent's area on screen.
- tab: a group of panes in the plexer, named by id or label.
- space: orch's grouping of related work. Commands reach agents in your own space.
- lease: which session drives an agent. Drive verbs refuse a live holder that is not you.
- pack: an orch and every agent it spawned, at any depth.
- orch, slave: the two roles settings name. An orch is a session orch did not spawn, the root
  of a pack; a slave is an agent orch spawned.
- operator: a plain shell with no harness session, meaning the human. Operator-only flags
  refuse agents and harness sessions.
- orchd: the orch daemon. Every command talks to it.
- bridge: orch's link inside a harness that carries prompts and state to and from orchd.
- worker header: the instructions orch puts ahead of every dispatched prompt.
- sink: a destination orchd sends notifications to, set with `orch settings notify`.
