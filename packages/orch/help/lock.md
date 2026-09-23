Run one shell command once orchd allows it. You rarely type this: a harness that gates
commands rewrites every match of `locked_commands.commands` or `gated_commands` into `orch lock --
'<command>'` before it runs.

A `locked_commands.commands` match waits while another live process holds that pattern, then runs;
one run of each pattern at a time, machine-wide. `locked_commands.applies_to` names who
waits: `slave`, `orch`, or both (the default). An agent outside it runs the
command at once. While it waits, the agent's state is
`waiting` and `orch monitor` shows who holds the lock. The wait gives up after
`timeouts.lock_wait_ms` (3 minutes by default): the command does not run, the monitor shows
`gave up on "<pattern>"`, and the agent does its other work and runs the command again
later. `timeouts.lock_poll_ms` sets how often it asks. A `gated_commands` match is refused with a request id until the
human approves that exact command in that directory with `orch grant <id>`; run the exact
same command again after. A nested `orch lock` never waits on a pattern its parent holds.
