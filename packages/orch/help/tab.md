Tab management. `new` prints the root pane id and never steals focus; `focus` does. A tab
resolves by id or unique label.

A tab is one domain (`server`, `client`). A pane is a named worker on one subtask of that
domain. The cap is `fleet.max_agents_per_tab` panes per tab, and orch refuses a spawn or
tile that would overfill it before anything opens. Fill a tab to its cap before you create
another. When a domain needs more, the overflow tab is `<domain>-02`, then `-03`. Never
scatter one domain across misc tabs. Never label two tabs the same.

Rename a tab when its domain changes between waves. A tab spawned as `recon` that now holds
`api` workers lies about what is in it.
