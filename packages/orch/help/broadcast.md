Send one mid-run instruction to several agents at once. The output names every agent that
refused it.

    orch broadcast "Commit what you have and stop at the next checkpoint." api-types api-routes

A plain shell holds no leases, so `--all` from it reaches nobody and is refused. Spawn or
adopt the agents first, or name them.
