Print each target's result: `results.jsonl`, else the session's last assistant text.
Several targets print under `== <target>` headers, or as one JSON array with `--json`.

`done` is a claim, not a verification. Read the diff before you build on it.

Closing does not discard the work. `orch close` ends the process and keeps the agent's row
and its history, so `orch result` and `orch tail` still answer afterwards. Only `orch reap`
deletes.
