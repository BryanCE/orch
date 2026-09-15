Check the install: runtime, composition, backends, daemon, presence, sinks, hosts. Doctor
verifies what `settings.json` declares against what is on the machine.

On a TTY, plain `doctor` and `doctor --fix` open a menu to pick fixes when fixes exist.
`-y` applies every fix unattended, which is how CI and non-TTY repairs run. A broken
install is `orch doctor -y`.
