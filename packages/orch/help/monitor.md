The watch an orchestrating agent arms. The same stream as `orch events`, kept to the states
you act on (`monitor.on`: asking, waiting, blocked, done, error, aborted, exited by default)
plus every message an agent sends you. Arm it through your harness's persistent Monitor
tool, in the same message as the spawn:

    orch monitor

Traps:
- Arm it only through the Monitor tool. A stream behind `&`, `nohup`, or run_in_background
  never wakes you, and a finished fleet looks busy.
- Arm one watch. `pgrep -fa "orch (monitor|events)"` printing a line means one is armed and
  survives a context compaction. If it names agents that are gone, kill that pid and arm fresh.
- Default scope is the agents you spawned or lease, including ones you dispatch to later.
  Reach for `--all` only when two orchestrators in one space coordinate.
- Silence means no agent in your scope changed state. `orch status` shows where each one is.
