Send a message to another leading orch. Name it by its name, its id, or the project it works
in (a path, or the directory's name). The text lands in that orch's input the way mail lands
for a spawned agent, through its plexer pane or its bridge, as `mail.to_worker` says.

    orch message claude-3f9a2c1d Is the auth refactor on main yet?
    orch message billing-api "I changed the invoice schema. Pull before you touch it."

The message opens with the sender's name and directory, and the command to reply with.
Both ends must be leading orchs, and the user must have turned peers on:

    orch settings fleet.orch_peers true

The space wall does not apply between two leading orchs; the switch alone governs them. A
target that names several orchs is refused with the list; name one. Run `orch orchs` to see
who is live.
