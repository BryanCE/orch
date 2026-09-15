# Command doctrine

`orch help` is the map. `orch help <command>` (or `orch <command> -h`) carries the usage
line, the doctrine, every flag with its default, and the output format, and it is always
current with the installed build. Read it before the first use of a command in a session.
If anything here disagrees with help, help wins.

## Which help to read, and when

| Situation | Read |
|---|---|
| Sizing and naming a wave, `--tab`, `--file`/`--model` per agent, headless vs a plexer | `orch help spawn` |
| Picking or changing a model, short names, refusals, escalation | `orch help model`, `orch help models` |
| Sending a task, quoting the prompt, `--with`, Delivered vs Queued, proving delivery | `orch help dispatch` |
| Fan-out where any idle agent may take any task | `orch help queue`, `orch help work` |
| Arming the watch, scope rings, the preflight, silence | `orch help monitor`, `orch help events` |
| One look at the fleet, the capacity line, `--json` fields | `orch help status` |
| A worker is asking | `orch help answer`, `orch help questions` |
| Correcting a running worker | `orch help steer`, `orch help broadcast` |
| Handing one result to another agent | `orch help pipe` |
| Collecting a done worktree | `orch help review` |
| Ending a pane, `--all`, killing your own stream | `orch help close` |
| A setting name, mail routing, notify sinks | `orch help settings` |

## What help does not repeat

A target is an agent name, an identity key, or a unique handle suffix, and every command
resolves all three the same way. Names are the readable option; name each agent for the
slice it holds. `result`, `reset`, `reload`, `restart`, and `close` take `<target>...`.

Reuse before you spawn. Dispatch gives an idle agent the next task on a fresh context, name
and model intact. Spawn a replacement only after a dispatch to the idle agent errors, then
close the one it replaces.

Steer at most once per running agent; a second correction is a new dispatch. Never pair
dispatch with reset: dispatch already clears the session.

Arrange without stealing focus: `tile`, `move`, `zoom`, `tab`, `space`. Only the `focus`
verbs jump the user's view.

Every number orch uses is a setting in `settings.json`. A refusal that names a setting is
the user's choice, not a typo. Ask; never edit it yourself.
