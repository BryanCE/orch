Print each effective setting with the source that won (flag > env > settings.json >
default). On a TTY, bare `orch settings` opens the editor. `orch settings <key> <value>`
writes one setting. `--harness` and `--plexer` switch the active default among the enabled
set.

Config is `$ORCH_DIR/settings.json` (default `~/.orch/settings.json`), plain JSON you may
edit by hand. Every number orch uses is a setting there. The names that bite a fleet most:
`fleet.max_agents_per_tab`, `fleet.max_agents_per_pack`, `fleet.max_depth`,
`fleet.worker_peer_tools`, `fleet.cross_space`, `monitor.on`, `defaults.models`,
`defaults.thinking`, `models.allowed`, `questions.renag_ms`, `timeouts.dispatch_ack_ms`,
`daemon.outbox_drain_ms`, `daemon.work_tick_ms`, `queue.dispatch_concurrency`.

`mail.to_spawner` and `mail.to_worker` say where mail lands, per direction. `prompt` types
the mail into the recipient's input as it arrives. `events` publishes it as a `message`
line on `orch monitor` and `orch events` and leaves the input alone; set that when a human
types at the same prompt. The daemon reads them per delivery, so a change applies at once.

Subcommands:

- `models`: re-pick, per enabled harness, the launch model, the picker quicklist
  (`models.preferred`), and the launchable set (`models.allowed`). `--refresh` asks the
  harnesses again rather than using the stored catalogues, for a model installed since the
  last refresh.
- `thinking`: thinking effort for every launch, independent of the model: off, minimal,
  low, medium, high, xhigh, max. Bare prints the current value; a level sets the global
  default; `--harness=<id>` sets that harness's override and `--clear --harness=<id>`
  removes it.
- `skills`: turn the skill install on or off and choose where it writes. `--install` writes
  every packaged skill now; `--no-install` records the refusal and leaves files already
  there alone. `--store` is the one directory holding the real files; `--link` names the
  harness directories symlinked into it. A leading `~` expands to your home directory.
- `notify`: the sinks orchd delivers through. `sound`, `desktop`, and `herdr` take no
  fields; `webhook` needs `--url`; `command` needs `--command` and gets the event JSON on
  stdin. `--on` defaults to `blocked,error,done`. A sink already configured is replaced,
  keeping the fields this call does not name. Verify with `orch notify test`.
