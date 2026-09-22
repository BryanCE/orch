The orch's watch. The same stream, scope, and flags as `orch events`, kept to the lines
you act on: a transition into a state listed in `monitor.on` (asking, blocked, done, error,
aborted, exited by default) and every `message` a worker sends you. A mid-turn flip
(working, idle, a blocked signal and release) never reaches it. `closed` and `task`
bookkeeping stays on `orch events`. Change the states with `orch settings monitor.on`.

Arm it bare, through the Monitor tool (persistent), in the same message as the spawn.
Never `&`, `nohup`, or run_in_background: a stream that never exits never wakes the
harness, and the silence looks like "still working". An unwatched fleet finishes and sits
done while you believe it is busy.

Before arming, check for one already armed. It reads the OS, not your memory, so it
survives a context compaction:

    pgrep -fa "orch (monitor|events)" | grep -v pgrep

Non-empty means a watch is armed; do not arm another. If it names agents that no longer
exist, kill that pid and arm one fresh.

Scope is three rings and you are in the first. Default is the agents this session owns,
matched on `spawnedBy` and the open lease, and it follows agents you dispatch to later.
`--space-wide` widens to the rest of your space, for two orchs coordinating. Past that is
the wall, and nothing lifts it. `--agent=<name>` narrows to one. Reach for either only when
told to.

Silence has three causes, and orch names the first for you: you own no agents yet, the fleet
is mid-turn with no state change, or your scope excludes the agents that did.
`timeout 6 orch monitor --since-seq 0` replays past transitions as a smoke test.

`orch help events` describes the line shapes.
