Run doctor after an install or an update, or when a command refuses because something is
missing. It checks what `settings.json` declares against the machine: harnesses, plexers,
the daemon, notification sinks, and hosts.

    orch doctor -y

On a terminal, plain `orch doctor` opens a menu of fixes. `-y` applies them all without
asking, which is how scripts and CI repair an install.
