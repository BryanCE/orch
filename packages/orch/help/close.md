Close an agent when its part of the job is done. The process ends; `orch result` and
`orch tail` still answer until `orch reap` deletes the record. Closing an agent that already
exited succeeds. Between tasks, keep the agent and send the next one with `orch dispatch`.

    orch close api-types api-routes

Close ignores leases: the human can always kill. `--all` from a plain shell sweeps every
agent orch spawned. From an agent or a harness session it sweeps that caller, what it
spawned, and what it adopted; a named agent outside that set is refused with its owner.
