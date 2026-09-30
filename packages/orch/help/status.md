One look at your fleet: every agent you spawned or lease, with state, cost, and context. A
person at a plain terminal leases nothing and sees the whole machine.

    orch status --hide cost,done

Read `state` for completion; it is what the agent reports about itself. `--hide` takes
column headers and states in one list; any word that is not a column drops rows in that
state.

The last line is capacity: your fleet, other orchestrators' fleets, the space, and the
machine, each against its limit. Read it before every spawn wave.

To follow changes, arm `orch monitor`. It pushes each change the moment it happens, so
status stays a single look, never a loop.
