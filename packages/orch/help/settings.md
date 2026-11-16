Read or change orch's configuration. Bare `orch settings` prints every effective setting and
where its value came from (settings.json or default); on a terminal it opens the
editor. Two words set one key:

    orch settings fleet.max_agents_per_tab 6

The file is `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON the user
may edit by hand. Every number orch uses is a setting there.

An agent may write only the keys the user granted it: by default `workers.verify_commands`
and `locked_commands.commands`. A refusal names the keys it may set. To widen that, ask the
user to run `orch settings grant <key>`.

Mail routing is three keys, one per direction, each `prompt`, `prompt-unless-focused` or
`events`: `mail.to_spawner` (a worker to the agent that spawned it), `mail.to_orch` (one
leading orch to another, with `orch message`), and `mail.to_worker` (every other mail).
`prompt` types the mail into the recipient's input; `events` makes it a MESSAGE line on
`orch monitor`; `prompt-unless-focused` types it unless the plexer shows the recipient's pane
now, and then makes it a MESSAGE line. `fleet.orch_peers` lets leading orchs list and message
each other. `monitor.on` picks the states `orch monitor` shows, and `monitor.summary_chars` is
where a line is cut; a cut message line names `orch message read <code>`, and
`retention.outbox_days` is how long that read works. `orch help message` has the whole route.

Reach for a subcommand to re-pick models (`models`), set thinking effort (`thinking`),
install skills (`skills`), or change where notifications go (`notify`). After `notify add`,
confirm delivery with `orch notify test`.
