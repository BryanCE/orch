List the other live leading orchs: the harness sessions a human started, not the agents
orch spawned. Each row names the orch, its harness, space and host, and the project it works
in. Use a name or a project from this list with `orch message`.

    orch orchs
    orch orchs --json

Only a leading orch may ask. The list is empty unless the user turned peers on:

    orch settings fleet.orch_peers true

Turn it off with `orch settings fleet.orch_peers false`. Off refuses `orch orchs` and
`orch message` between leading orchs. The list holds the orchs registered with this machine's orchd.
