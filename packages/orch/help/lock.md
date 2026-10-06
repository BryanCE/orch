Run one shell command once orchd allows it. You rarely type this: a harness rewrites every
command that matches `locked_commands.commands` or `gated_commands` into `orch lock`.

    orch lock -- 'bun test test/spawn.test.ts'

What each answer asks of you:
- `waiting for "<pattern>"`: another process runs that command. Let it wait.
- `gave up on "<pattern>"`: the command did not run. Do your other work, then run it again.
- `needs the human's approval`: ask the human to run `orch grant <id>`, then run the exact
  same command again.
- `is in denied_commands`: the command did not run. Run it over only the files you changed,
  or leave it to the human.
