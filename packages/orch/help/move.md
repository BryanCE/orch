Move an agent's pane into another tab when it sits in the wrong one. To place a fleet from the
start, use `orch spawn --tab <tab>` instead. The move leaves the user's view where it is.

    orch move api-guards --tab api

When two tabs share a label, pass the tab id from `orch tab list`.
