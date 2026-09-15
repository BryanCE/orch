With no argument, the command map. With a command name, that command's usage, this text,
and its flag table. `orch <command> -h` prints the same. Help never needs setup, a daemon,
or a current install to read.

A target is an agent name, an identity key, or a unique handle suffix. All resolve to the
same agent. `control target <name> is ambiguous: <key>, <key>` means two live agents answer
to that name; address the one you mean by its key, then `orch rename` one of them.
