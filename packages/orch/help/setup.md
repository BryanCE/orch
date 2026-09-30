Run once after install to choose the harnesses and plexers you use, install what they need,
and connect each harness to orch. The first id in each list becomes the default. On a
terminal it asks for anything you leave out; unattended, pass every choice:

    orch setup --yes --harness pi,claude --plexer herdr --model pi=luna:high

Until setup has run, every command except setup, doctor, settings, status, help, and
version refuses and names this fix. Change the skills answer later with
`orch settings skills`.
