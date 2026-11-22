Read or change orch's configuration. Bare `orch settings` prints every effective setting and
where its value came from (project, install or default); on a terminal it opens the editor,
where `Tab` switches between the Project and the Install view. Two words set one key:

    orch settings fleet.max_agents_per_tab 6

Two files hold settings, both plain JSON the user may edit by hand. The install file,
`$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), holds every setting and serves
every project on the machine. A project file, `.orch/settings.json` in a project's directory
(the `project.file` setting), holds that project's own values, and each key set there
overrides the install's. A project is the directory a lead orch or the human runs orch in;
an agent belongs to its spawner's project, wherever it launches. A subdirectory is its own
project. Install-only keys, the ones about the machine, the install or orchd itself, live
only in the install file.

A write lands in the project file of the directory you are in, and an install-only key in
the install file. `--install` writes the install file's value of a project key, the one every
project without its own inherits. `--clear` removes a key so it falls back: from the project
file, or with `--install` from the install file.

    orch settings workers.verify_commands '["bunx oxlint"]'
    orch settings workers.verify_commands --clear

An agent may write only the keys the user granted it: by default `workers.verify_commands`
and `locked_commands.commands`. Its write lands in its own project's file, so it changes no
other project. A refusal names the keys it may set. To widen that, ask the user to run
`orch settings grant <key>`. `--install` is the user's alone.

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
