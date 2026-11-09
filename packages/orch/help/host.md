Other machines orch runs agents on. orch reaches them with its own ssh key and its own list
of trusted host keys, both in `$ORCH_DIR/ssh/`. It never reads `~/.ssh/config` or offers your
keys, so it reaches only the hosts you add here.

    orch host add work --dest bryan@100.101.102.103

`add` fetches the host's key, shows its fingerprint, and asks you to confirm it. On a Windows
host it asks whether the orch to run is the one inside WSL or the one on Windows. Then it logs
in to the host once as you, with your own ssh setup or your password, and puts one line in
that account's authorized_keys, replacing any line orch's key had there. The line lets orch's
key run `orch host serve --origin <this machine's host id>` there and nothing else: no shell,
no forwarding. That pins which machine the link speaks for. Never add a machine
you do not want orch on. A port other than 22 takes `--port`; `--shell posix|wsl|windows`
skips the question. Adding a host again keeps its saved destination, port and shell, so
`orch host add work` alone refreshes the line; a flag changes just that setting.

The line starts orch through that account's own shell, the way a terminal there would, so the
orch it runs is the one you get by typing `orch` there. `add` says which orch that is, and
stops if there is none, or if inside WSL the only one is Windows' install.

`orch host` lists each host: whether its link is up, which machine answered, and when it was
last seen. `orch host check work` brings the link up now, or says why the host is offline.
`orch host key work` prints the setup script to paste there by hand, for when the login cannot run it.

The first machine that answers on a name keeps it. If a different machine answers later, orch
refuses the link rather than talk to the wrong box; `orch host forget work` clears the name
after you replaced that machine.

Every machine runs its own orchd, and a link joins two of them: `orch host serve` on the host
starts that host's orchd if it is down and pipes the link into it.

While a host's link is up, agents run there for this machine: `orch spawn <name> --host work --dir <path there> --prompt "<task>"`. That host's orchd starts the agent headless, runs it and keeps its records and logs; the agent reports to that orchd. It shows in `orch status` here, and you close it from here.

Whether such an agent is alive is asked over the link. When the link is down, orch does not know, so the agent shows as `unknown`, never as exited: nothing is reaped, closed or handed to another agent until the host answers again.

An agent's own `ssh`, `scp`, `sftp` and `rsync` wait for your `orch grant` by default.
