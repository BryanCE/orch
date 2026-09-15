Continuous stream of pane state transitions. Requires a running daemon.

Bare `orch events` is every state of every agent this session owns, one readable line
each, enough to act on without a second command. A human at a raw terminal owns none and
sees the whole machine. Every flag deviates from that. An orch arms `orch monitor` instead:
the same stream without the mid-turn flips.

Five event types, each one line:

- `transition`: oldState->newState with dispatchId, task, cost, ctxPercent.
- `asking`: the agent is blocked on a question. `askCount` counts the daemon's re-asks on
  `questions.renag_ms`; `gaveUp` marks the last.
- `message`: mail a worker sent its spawner with `orch_send`; the text is on the line.
  Always here when the direction's mail setting is `events` (`mail.to_spawner` for a worker
  writing its spawner, `mail.to_worker` for every other mail). Under `prompt-unless-focused`
  only while the human is in the recipient's pane. Otherwise only when the recipient has no
  prompt to type into.
- `closed`: the agent ended.
- `task`: a queue task changed state.

A fresh subscribe receives live events only. History comes back only via `--since-seq`. The
sequence survives daemon restarts, but history is bounded by the events retention window; a
pruned range is reported as a gap before retained events replay. `seq` is that agent's transition ordinal and `(key, seq)` identifies an
event. The daemon suppresses an identical repeat of one agent's transition for two minutes,
so no dedupe is needed. Never add a `date`-based floor: it drops real events to clock skew.

Notifications are delivered by orchd from `settings.json` sinks, not by this command. An
attached stream counts as daemon usage: orchd will not idle-shutdown while one is open.
