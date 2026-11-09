Other machines orch runs agents on. orch reaches them with its own ssh key and its own list
of trusted host keys, both in `$ORCH_DIR/ssh/`. It never reads `~/.ssh/config` or offers your
keys, so it reaches only the hosts you add here.

    orch host add work --dest bryan@100.101.102.103

`add` fetches the host's key, shows its fingerprint, and asks you to confirm it. Then it
prints one line to put in `~/.ssh/authorized_keys` on that host. The line lets orch's key run
`orch host serve` there and nothing else: no shell, no forwarding. Never authorize it on a
machine you do not want orch on. A Windows host running orch inside WSL takes `--shell wsl`;
a port other than 22 takes `--port`.

`orch host` lists each host: whether its link is up, which machine answered, and when it was
last seen. `orch host check work` brings the link up now, or says why the host is offline.
`orch host key work` prints the authorized_keys line again.

The first machine that answers on a name keeps it. If a different machine answers later, orch
refuses the link rather than talk to the wrong box; `orch host forget work` clears the name
after you replaced that machine.

An agent's own `ssh`, `scp`, `sftp` and `rsync` wait for your `orch grant` by default.
