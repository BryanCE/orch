The watch an orchestrating agent arms. The same stream as `orch events`, kept to the states
you act on (`monitor.on`: asking, waiting, blocked, done, error, aborted, exited by default)
plus every message an agent sends you. Arm it through your harness's Monitor tool, in the
same message as the spawn:

    orch monitor

A message sent to you comes here as a MESSAGE line while the user is in your pane and this
watch is open. With no watch open, it arrives as a prompt, so you never need a watch only to
get mail. With no agents, the stream says so at start, and only mail sent to you arrives on it.

Each line is one event. A message is `MESSAGE [space] <text>`, and the text opens with who sent
it and the command to reply with. A message longer than `monitor.summary_chars` is cut, and its
line opens with the command that prints all of it. Read it before you act:

    MESSAGE (read all: orch message read 42447aaf) [from orch lead-h16tjo02 ...] ...
    orch message read 42447aaf

Traps:
- Arm it only through the Monitor tool. A stream behind `&`, `nohup`, or run_in_background
  never wakes you, and a finished fleet looks busy.
- orch never ends the stream; only `orch close --stream` or the user does. Arm it with no
  timeout when your Monitor tool allows that, or with its longest. A tool with a time limit
  stops it there, and that stop wakes you with nothing to do. When it expires and an agent you
  wait on still works, arm it again in that same turn. When you wait on nothing, let it lapse.
- Arm one watch. `pgrep -fa "orch (monitor|events)"` printing a line means one is armed and
  survives a context compaction. If it names agents that are gone, kill that pid and arm fresh.
- Default scope is the agents you spawned or lease, including ones you dispatch to later.
  Reach for `--all` only when two orchestrators in one space coordinate.
- Silence means no agent in your scope changed state and no one sent you mail. `orch status`
  shows where each agent is.
