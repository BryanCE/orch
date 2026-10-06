Close an agent when its part of the job is done. The process ends; `orch result` and
`orch tail` still answer until `orch reap` deletes the record. Closing an agent that already
exited succeeds. Between tasks, keep the agent and send the next one with `orch dispatch`.

    orch close api-types api-routes

Close ignores leases: the human can always kill. From a plain shell, a named agent always
closes. `--all` sweeps only your own tree, from any caller: what you spawned or adopted, at
any depth, and never you. An agent or a harness session that names an agent outside its
tree is refused with the owner. To close another terminal's workers, name them, or
`orch adopt` them first.
