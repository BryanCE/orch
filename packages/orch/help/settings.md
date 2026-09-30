Read or change orch's configuration. Bare `orch settings` prints every effective setting and
where its value came from (flag, env, settings.json, default); on a terminal it opens the
editor. Two words set one key:

    orch settings fleet.max_agents_per_tab 6

The file is `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON the user
may edit by hand. Every number orch uses is a setting there.

An agent may write only the keys the user granted it: by default `workers.verify_commands`
and `locked_commands.commands`. A refusal names the keys it may set. To widen that, ask the
user to run `orch settings grant <key>`.

Reach for a subcommand to re-pick models (`models`), set thinking effort (`thinking`),
install skills (`skills`), or change where notifications go (`notify`). After `notify add`,
confirm delivery with `orch notify test`.
