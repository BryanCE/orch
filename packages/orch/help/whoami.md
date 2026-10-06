Show who orch sees as the caller in this terminal: the human, a harness session, or a
spawned agent. It names the row orchd holds for the caller, and the process and harness
marker this command sent. Like every command, it registers a caller that has no row first.

    orch whoami
    orch whoami --json

A plain shell is the human (operator), with a row or without one. A row whose harness disagrees with what you run is a
stale registration: close that terminal and open a new one, and orchd reaps the row once
its process is gone.
