# Which help to read

`orch help <command>` (or `orch <command> -h`) matches the installed build. Where this file and
help disagree, help is right.

| Situation | Read |
|---|---|
| Sizing and naming a wave, tabs, one file or model per agent, headless | `orch help spawn` |
| Picking or changing a model, short names, refusals | `orch help model`, `orch help models` |
| Sending a task, quoting the prompt, `--with`, Delivered vs Queued | `orch help dispatch` |
| Fan-out where any idle agent may take any task | `orch help queue`, `orch help work` |
| Arming the watch, what it shows, silence | `orch help monitor`, `orch help events` |
| One look at the fleet, the capacity line, `--json` fields | `orch help status` |
| An agent is asking | `orch help questions`, `orch help answer` |
| Correcting a running agent | `orch help steer`, `orch help broadcast` |
| An agent stuck in one tool call | `orch help abort` |
| Diagnosing an agent without a peek | `orch help tail`, `orch help runs`, `orch help logs` |
| One blocking checkpoint on one agent | `orch help wait` |
| New code (`reload`), new session (`reset`), new process (`restart`) | `orch help reload`, `orch help reset`, `orch help restart` |
| Handing one result to another agent | `orch help pipe` |
| Collecting a done worktree | `orch help review` |
| Ending agents, `--all` | `orch help close` |
| Tabs and panes for a script | `orch help tab`, `orch help pane` |
| A setting name, mail routing, notifications | `orch help settings` |
| What a target is | `orch help help` |

## Steering and layout

Steer a running agent once. A second correction is a new dispatch.

`tile`, `move`, `zoom`, `tab` and `space` arrange panes and leave the user's view where it is.
Only `focus`, `tab focus` and `space focus` move the user's view.
