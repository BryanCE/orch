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

`orch host` lists each host: its link, which machine answered, when it was last seen, and
why a link is not up. `orch host check work` brings the link up now, or says why the host is offline.

A link reads `connecting` while orch dials, `synchronizing` once the host answered and orch
is catching up on its agents there, and `up` when the two are in step. A link that dropped
or could not be dialed reads `reconnecting`, with the reason and when the next dial is due:
orch redials on its own, sooner after a working link drops and later each time a dial
fails. `blocked` means a redial cannot fix it and it waits for you. A link that is up on
another orch build says so in the same column.

orch asks every linked host to answer each `links.ping_interval_ms`, and drops and redials
a link whose host sent nothing for `links.silence_timeout_ms`.

`orch host key work` prints the setup script to paste there by hand, for when the login cannot run it.

The first machine that answers on a name keeps it. If a different machine answers later, orch
refuses the link rather than talk to the wrong box; `orch host forget work` clears the name
after you replaced that machine.

Every machine runs its own orchd, and a link joins two of them: `orch host serve` on the host
starts that host's orchd if it is down and pipes the link into it.

While a host's link is up, agents run there for this machine: `orch spawn <name> --host work --dir <path there> --prompt "<task>"`. That host's orchd starts the agent headless, runs it and keeps its records and logs; the agent reports to that orchd. It shows in `orch status` here, and you close it from here.

This machine keeps only a reference to such an agent: its id, who spawned it, and the host it runs on. Its state comes from the events that host's orchd sends over the link, and it ends here when that host says it closed or exited. When the link is down, orch cannot ask, so the agent keeps the state its host last reported, marked with `?`, beside the note that the host is offline and when it was last seen. It never shows as exited: nothing is reaped, closed or handed to another agent until the host answers again. When the link comes back, orch resumes that host's events from where it left off, or reloads the state of its agents there when it cannot.

A verb that changes an agent on a host, such as `dispatch`, `steer`, `answer` or a worktree land, is done there once. If the link drops before the answer arrives, orch sends the same request again when the link is back, for up to `links.deliver_timeout_ms`, and the host answers with what it did the first time.

An agent's own `ssh`, `scp`, `sftp` and `rsync` wait for your `orch grant` by default.
