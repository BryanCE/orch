# orch

orch runs a fleet of coding agents. You spawn several agents, give each one a task, watch
their state as it changes, and collect their results. A small daemon (`orchd`) keeps the
record of every agent and every task, so work survives a closed terminal or a restart.

The usual driver of orch is another agent. orch ships a skill that teaches Claude Code (or
any harness that reads skills) to run the loop: spawn, dispatch, watch, collect. You can
also drive it by hand. It is a normal CLI, and every command takes `--json`.

orch works with these coding agents (orch calls them **harnesses**):

- `claude` (Claude Code)
- `codex` (OpenAI Codex CLI)
- `pi` (pi coding agent)
- `omp` (oh-my-pi)

It runs them in one of these places (orch calls them **plexers**):

- `herdr` or `tmux`: visible panes that you can watch and type into
- `orca`: orca panes
- `headless`: a detached process with no pane

## Requirements

- Node.js 22.13 or later (orch can also run under bun or deno; `orch setup` asks)
- At least one harness from the list above, installed and signed in
- For visible panes: `herdr` or `tmux`. For `--backend headless`, nothing else.
- Linux, macOS, or Windows through WSL

## Install

```sh
npm install -g @bryance/orch
orch setup
```

Or with bun:

```sh
bun add -g @bryance/orch
orch setup
```

`orch setup` is a short wizard. It asks:

1. Which harnesses and plexers you use. The first one of each becomes the default.
2. Which JS runtime runs orch (`node`, `bun`, or `deno`).
3. The default model for each harness. The list comes from the harness itself.
4. Whether to install the `orch` skill for your agents.

It then installs what is missing, connects each harness to orch, and writes
`~/.orch/settings.json`. Until setup has run once, most commands refuse and tell you to run it.

For a non-interactive install (CI, scripts):

```sh
orch setup --yes --agent claude,pi --backend tmux,headless --runtime node
```

Check the install at any time:

```sh
orch doctor        # report problems
orch doctor -y     # fix every problem it can
```

### Harness installs

`orch setup` offers to install a missing harness. To do it yourself:

| Harness | Install | Sign in |
| --- | --- | --- |
| `claude` | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| `codex` | see [openai/codex](https://github.com/openai/codex) | `codex login` |
| `pi` | `bun add -g @earendil-works/pi-coding-agent` | `pi auth` |
| `omp` | `bun add -g @oh-my-pi/pi-coding-agent` | `omp setup` |

## Quick start

Spawn two agents, give each a task, watch them, and read the results:

```sh
orch spawn api-types api-routes
orch dispatch api-types "add a FooBar type to src/types/core.ts and export it"
orch dispatch api-routes "add a GET /foo route that returns a FooBar"
orch monitor                 # one line each time an agent needs you or finishes
orch result api-types
orch result api-routes
orch close --all
```

- `spawn` opens one tab with one pane per name. It never takes focus from you. Each agent
  starts in your current directory; `--dir <path>` starts it somewhere else.
- `dispatch` sends a task on a clean session. For a long task, use `--file task.md`.
- `monitor` is a stream. It prints a line when an agent asks a question, is blocked,
  finishes, or fails. Press Ctrl+C to stop it.
- `result` prints what the agent reported at the end of its turn.
- `orch status` (or just `orch`) shows every agent in a table.

With no plexer, run a detached agent. A headless spawn needs `--prompt`:

```sh
orch spawn tests --backend headless --prompt "run the unit tests and report failures"
orch status
orch result tests
```

### Talking to a running agent

```sh
orch questions                          # agents that are waiting on a question
orch answer api-types "use a string id"  # answer that question
orch steer api-routes "also add a test"  # a new instruction in the middle of a turn
orch abort api-routes                    # stop the current turn
orch reset api-types                     # fresh context, same pane, same name and model
```

`steer` and `answer` are different. When an agent asks a question, orch refuses a `steer`
and tells you to use `answer`.

## Letting an agent drive orch

This is the main use of orch. Install the skill (setup asks; you can also do it later):

```sh
orch settings skills --install
```

The skill files go to `~/.agents/skills/orch`. Each directory in `skills.link` (by default
`~/.claude/skills`) gets a symlink to them, so every harness reads the same copy.

Then ask your agent to use orch, for example: "use orch to split this refactor across four
agents". The skill tells the agent how to size the fleet, split the work, watch with
`orch monitor`, and collect with `orch result`. Read
[`skills/orch/SKILL.md`](skills/orch/SKILL.md) to see exactly what it tells the agent.

### What a worker gets

Each dispatch starts with a short worker header, unless you pass `--raw`. The header tells
the worker that nobody watches its pane, that it must not start its own sub-agents, and
which commands verify its work (`workers.verify_commands`).

A worker also gets orch's tools inside its harness:

| Tool | What it does |
| --- | --- |
| `orch_ask` | Ask the orchestrator a question and wait for the answer. It shows in `orch questions`. Always on. |
| `orch_agents` | List the other live agents. Needs `fleet.worker_peer_tools`. |
| `orch_send` | Send a message to another agent, or to `"spawner"`. Needs `fleet.worker_peer_tools`. |
| `orch_read` | Read another agent's latest result. Needs `fleet.worker_peer_tools`. |

`fleet.worker_peer_tools` is off by default.

## Commands

Run `orch help` for the full list, and `orch help <command>` for every flag of one command.

| Area | Commands |
| --- | --- |
| Watch | `status`, `monitor`, `events`, `questions`, `runs`, `logs` |
| Give work | `dispatch`, `run`, `answer`, `steer`, `broadcast`, `pipe`, `model`, `wait` |
| Read results | `result`, `tail`, `peek`, `session` |
| Queue | `queue add\|list\|history\|cancel\|edit`, `work`, `review` |
| Agents | `spawn`, `tile`, `rename`, `reset`, `restart`, `reload`, `abort`, `close`, `adopt`, `detach`, `reap`, `grant`, `lock` |
| Panes and tabs | `panes`, `tabs`, `tab`, `focus`, `zoom`, `move`, `keys`, `space` |
| Install | `setup`, `doctor`, `settings`, `models`, `notify`, `daemon`, `clean`, `version` |

Some useful ones:

- `orch runs -n 20`: the history of dispatches, newest first
- `orch wait <agent>`: block until the agent is `done`
- `orch pipe <from> <to>`: hand one agent's result to another agent
- `orch queue add "<task>"` then `orch work`: a durable queue that gives tasks to idle agents
- `orch spawn <names> --worktree`: give each agent its own git worktree, then merge with `orch review`

## Concepts

**Agent.** Each agent has an id that never changes. Its environment (directory, branch,
plexer, pane) is stored beside the id, not inside it. You name agents at spawn time, and a
command takes a name, an id, or a unique end part of an id.

**Leases.** The orchestrator that drives an agent holds a lease on it. While a live
orchestrator holds the lease, another one cannot `dispatch`, `steer`, `model`, or `reset`
that agent. `abort`, `close`, and `reap` always work, so a human can always stop an agent.
`orch detach` releases a lease, and `orch adopt` takes one.

**Work survives its spawner.** When an orchestrator ends, its agents keep running. Another
orchestrator can adopt them.

**Spaces.** A space is orch's own group of agents. `orch space create|list|rename|delete|focus`
manages them. A spawn from outside a pane asks a human to approve a new space with
`orch grant`.

**The daemon.** `orchd` owns the database (`~/.orch/orch.db`) and pushes state changes to
`orch monitor` and `orch events`. orch starts it when a command needs it. Use
`orch daemon status` to check it and `orch daemon stop` to stop it.

## Configuration

The settings file is `~/.orch/settings.json`. Set `ORCH_DIR` to use a different directory.
`orch settings` opens an editor for it on a terminal and prints every value with its source.
A flag beats an `ORCH_*` environment variable, which beats the file, which beats the default.

The file is strict: an unknown key or a wrong type stops orch with the file path and the
reason. A short example:

```json
{
  "schemaVersion": 1,
  "runtime": "node",
  "enabled": { "adapters": ["claude", "pi"], "backends": ["tmux", "headless"] },
  "defaults": {
    "adapter": "claude",
    "backend": "tmux",
    "models": { "claude": "sonnet", "pi": "openai-codex/gpt-5.6-luna" },
    "thinking": "medium"
  },
  "fleet": { "max_agents_per_pack": 10, "worker_peer_tools": false },
  "workers": { "verify_commands": ["npm test"] },
  "notify": [{ "id": "desktop", "on": ["blocked", "error", "done"] }],
  "locked_commands": { "commands": ["npm test"], "applies_to": ["orch", "slave"] }
}
```

### Models

Each harness names its models in its own way, so each model setting is per harness:

| Setting | What it does |
| --- | --- |
| `defaults.models.<harness>` | The model a new agent starts on. |
| `models.preferred.<harness>` | The short list the harness's own model picker cycles through. |
| `models.allowed.<harness>` | Globs. A spawn on any other model is refused. Empty allows every model. |

```sh
orch models                             # every model each harness reports
orch models --agent pi --search sonnet  # search one harness
orch settings models                    # pick the defaults and the lists
orch settings thinking high             # thinking effort for every harness
orch settings thinking high --harness claude
```

`--model <model[:thinking]>` sets both for one spawn or dispatch.

### Commands that agents run

- `workers.verify_commands`: the commands the worker header tells a worker to run to check
  its work. `{cwd}` and `{wincwd}` are replaced with the agent's directory.
- `locked_commands`: commands that only one agent on the machine may run at a time (for
  example a test suite). orch holds the others until the lock is free.
- `gated_commands`: commands an agent may run only after a human approves with `orch grant`.
- `denied_commands`: commands an agent may never run.

`applies_to` names the roles a rule covers: `orch` (an orchestrating agent) and `slave` (a
worker).

## Notifications

`orch monitor` and `orch events` are streams for whoever watches the fleet. Notifications
are different: orchd sends them even when nobody watches.

```sh
orch settings notify                                   # what is configured
orch settings notify add desktop --on=blocked,error,done
orch settings notify add webhook --url=https://example.org/hook
orch settings notify add command --command="notify-send orch"
orch settings notify remove webhook
orch notify test --state blocked                       # send a test event now
```

The sinks:

- `desktop`: an OS notification (`notify-send`, or a Windows toast on WSL)
- `herdr`: a herdr notification (orchd must run inside herdr)
- `webhook`: a POST of the event as JSON
- `command`: runs your command with the event JSON on stdin

Each sink fires on `blocked`, `error`, and `done` unless you set `on`. `orch doctor` shows
which sinks can deliver on this machine.

## Files

Everything lives under `~/.orch` (or `$ORCH_DIR`):

```
~/.orch/
├── settings.json     your settings
├── orch.db           the SQLite database that orchd owns
├── orch.log          the log of the CLI and the daemon (read it with orch logs)
├── orchd.*           daemon runtime files: socket, port, token, lock
├── logs/             output of headless agents
└── agents/<id>/      history that orchd appends for each agent
```

Deleting `agents/` loses history only. To copy the database, stop the daemon first
(`orch daemon stop`), then copy `orch.db`.

## Uninstall

```sh
orch close --all
orch daemon stop
npm uninstall -g @bryance/orch
rm -rf ~/.orch
```

`orch setup` also added orch's hook to `~/.claude/settings.json` (for Claude Code) and the
orch skill to `~/.agents/skills`. Remove those by hand if you want them gone.

## License

MIT
