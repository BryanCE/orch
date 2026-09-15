Durably accept a model change through orchd.

Every harness names models in its own vocabulary, so there is no global model string. A
short name is enough: `luna:high` expands to the one listed, allowed model that contains
`luna`. Two matches are refused by name, so you pick one. Zero matches names what the
harness does list. The same rule applies to spawn, tile, dispatch, and reset. `orch models`
lists what each installed harness offers.

Where the harness cannot switch a live session (Claude Code, for one), pin at spawn or use
`orch reset --model`.

The launch model comes from `defaults.models.<harness>`. Pass `--model` for a deliberate
choice, then confirm the MODEL column in `orch status`. An agent keeps the tuning it holds:
dispatch, reset, restart, and settings reloads re-pin what the agent was last given unless
the command names another model.

Escalate one rung at a time, only when the task failed at the current rung, then
re-dispatch. A capable model with a complete prompt beats a stronger model with a vague one.

Refusals:

- `model luna matches several pi models (a, b); name one`: the short name is ambiguous in
  this harness's allowed list. Send one of the named specs.
- `pi does not list model X; it offers ...`: nothing the harness lists contains that name.
  The hint carries a spec to paste; `orch models --agent=pi` lists the rest.
- `model X is not in models.allowed.pi (...)`: the harness lists it and the user's allowlist
  excludes it. That is the user's setting, not a typo. Ask; never edit it yourself.
