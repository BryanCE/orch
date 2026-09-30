Print what each agent reported when it finished: its reported result, else the session's
last reply. Collect this way once monitor says `done`.

    orch result api-types api-routes

`done` is the agent's claim. Read the diff before you build on it. To read an agent another
orchestrator leases, add `--steal`. `orch close` keeps the result readable; only `orch reap`
deletes it.
