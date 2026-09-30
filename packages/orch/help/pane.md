`list` prints one tab-separated line per pane, for a script to parse: pane id, name, tab,
harness, state, session path. For a person or an orchestrating agent, `orch status` is the table.

    orch pane list | cut -f1,2
