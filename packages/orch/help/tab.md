Manage tabs. A tab resolves by id or by a label no other tab carries. Keep one area of work
per tab (server, client), and relabel it with `rename` when that work changes.

    orch tab new --label api --space billing

- `list` prints id, label, number, pane count, and state. Pass the id wherever two tabs
  share a label.
- `new` prints the root pane id and leaves the user's view where it is.
- `focus` moves the user's view to the tab.
