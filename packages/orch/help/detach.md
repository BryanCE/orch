Release your lease on an agent and leave it running, to hand it to another orch or the
human, who takes it with `orch adopt`. Detaching an agent nobody leases succeeds.

    orch detach api-types

An agent outlives its spawner, so skip detach when you only want the work to keep going.
