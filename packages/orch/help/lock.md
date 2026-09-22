Run one shell command once orchd allows it. You rarely type this: a harness that gates
commands rewrites every match of `locked_commands` or `gated_commands` into `orch lock --
'<command>'` before it runs.

A `locked_commands` match waits while another live process holds that pattern, then runs;
one run of each pattern at a time, machine-wide. The wait gives up after
`timeouts.command_lock_ms`. A `gated_commands` match is refused with a request id until the
human approves that exact command in that directory with `orch grant <id>`; run the exact
same command again after. A nested `orch lock` never waits on a pattern its parent holds.
