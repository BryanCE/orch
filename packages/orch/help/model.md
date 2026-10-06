Change a running agent's model. A short name is enough: `luna:high` expands to the one
allowed model the harness lists that contains `luna`. spawn, tile, dispatch, and reset take
the same short names, and `orch models` lists what each harness offers.

    orch model api-routes luna:high

The agent keeps this model through later dispatch, reset, and restart until a command names
another. Where the harness cannot switch a live session (Claude Code, for one), use
`orch reset <target> --model <model>`. Move up one model at a time, and only after the task
failed on the current one.

Refusals:
- `matches several ... models`: send one of the specs the refusal names.
- `does not list model`: paste the spec the hint carries, or find one with `orch models --harness <harness>`.
- `is not in models.allowed.<harness>`: the user's allowlist excludes it. Ask the user to change it.
