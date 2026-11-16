Watch every state change as it happens, mid-turn flips included, when you debug an agent.
To drive a fleet, arm `orch monitor` instead: the same stream without the mid-turn flips.

    orch events --agent api-types

Bare `orch events` shows the agents your session holds. A plain shell holds none and sees
every agent. Each line is one event: `transition`, `asking` (blocked on a question),
`message` (mail sent to you that skipped your input: from a worker, or from another orch with
`orch message`), `closed`, or `task` (a queue task changed). A message longer than
`monitor.summary_chars` is cut, and its line opens with `orch message read <code>`, which
prints all of it.

A new stream starts with live events. To catch up after a disconnect, pass the last `seq` you
saw to `--since-seq`; resume by seq, since a clock-time cutoff drops events to clock skew.
The history survives daemon restarts. A resume older than the events retention window
(`retention.events_days`) prints a gap line and continues from the oldest kept event.
