List the other live leading orchs: the harness sessions a human started, not the agents
orch spawned. Each row names the orch, its harness, space and host, and the project it works
in. Use a name or a project from this list with `orch message`.

    orch orchs
    orch orchs --json

Only a leading orch may ask. The list holds the orchs registered with this machine's orchd.
`orch orchs` and `orch message` between leading orchs are refused unless the user turned
peers on:

    orch settings fleet.orch_peers true

Turn them off with `orch settings fleet.orch_peers false`.

While peers are on, each orch keeps `orch monitor` armed, even with no agents of its own. A
message from another orch lands as `mail.to_orch` says: by default typed into the input when
the user is not in that orch's pane, and a MESSAGE line on `orch monitor` when the user is.
`orch help message` has the whole route, and `orch message read <code>` for a cut line.
