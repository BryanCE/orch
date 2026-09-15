Onboarding wizard. Multi-select the adapters and backends you use, record them to
`~/.orch/settings.json`, install missing deps, and wire every selected adapter's shim. The
first id of each list becomes the active default. Prompts interactively on a TTY when a
selection is omitted.

Non-interactive: `orch setup --yes --agent <ids> --backend <ids>`.

Repeat `--model` with `<harness>=<model>` to choose per harness. A bare model is applied
only where that harness lists it.

Setup asks before installing skills. The real files go to `~/.agents/skills`, the
cross-harness standard, and each harness that reads its own directory gets a symlink into
that store. Change the answer later with `orch settings skills`.

Every command except `setup`, `doctor`, `settings`, `status`, `help`, and `version`
refuses until setup has run once, naming the fix.
