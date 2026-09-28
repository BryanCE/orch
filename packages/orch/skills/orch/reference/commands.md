# Which help to read

`orch help` is the map. `orch help <command>` (or `orch <command> -h`) carries the usage line,
every flag with its default, and the output format, and it matches the installed build. When
this file and help disagree, help is right.

| Situation | Read |
|---|---|
| Sizing and naming a wave, `--tab`, `--file`/`--model` per agent, headless vs a plexer | `orch help spawn` |
| Picking or changing a model, short names, refusals, escalation | `orch help model`, `orch help models` |
| Sending a task, quoting the prompt, `--with`, Delivered vs Queued, proof of delivery | `orch help dispatch` |
| Fan-out where any idle agent may take any task | `orch help queue`, `orch help work` |
| Arming the watch, scope rings, the preflight, silence | `orch help monitor`, `orch help events` |
| One look at the fleet, the capacity line, `--json` fields | `orch help status` |
| A worker is asking | `orch help answer`, `orch help questions` |
| Correcting a running worker | `orch help steer`, `orch help broadcast` |
| A worker stuck in one tool call | `orch help abort` |
| Diagnosing a worker without a peek | `orch help tail`, `orch help runs`, `orch help logs` |
| One blocking checkpoint on one worker | `orch help wait` |
| New code (`reload`), new session (`reset`), new process (`restart`) | `orch help reload`, `orch help reset`, `orch help restart` |
| Handing one result to another agent | `orch help pipe` |
| Collecting a done worktree | `orch help review` |
| Ending a pane, `--all`, killing your own stream | `orch help close` |
| A setting name, mail routing, notify sinks | `orch help settings` |

## Targets

A target is an agent name, an identity key or pane id, or a unique suffix of one. A running
agent's name wins over a stopped one's. A session resolves only the agents it holds a lease on.
`result`, `reset`, `reload`, `restart` and `close` take `<target>...`, and `broadcast` takes
`"<text>" <target>...`. `dispatch`, `steer`, `abort`, `model` and `rename` take one target.

## Steering and layout

Steer a running agent once. A second correction is a new dispatch.

`tile`, `move`, `zoom`, `tab` and `space` arrange panes and leave the user's view where it is.
Only the `focus` verbs move the user's view.
