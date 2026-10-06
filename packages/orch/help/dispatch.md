Send an agent its next task. Dispatch clears the session, keeps the model, then sends, so
every task starts clean with no `orch reset` before it. Reach for `--keep-context` only to add
to work already in flight.

    orch dispatch api-types 'keep $ORCH_DIR and `backticks` literal; say "done" when finished'
    orch dispatch api-types --rename api-worker 'keep $ORCH_DIR and `backticks` literal; say "done" when finished'

Single-quote the prompt: bash, zsh, and PowerShell keep everything inside single quotes
literal. Write an apostrophe as `'\''` in bash and zsh, `''` in PowerShell. Use `--file` for a
prompt longer than one line.

`Delivered` means the agent took the prompt. `Queued` means orchd holds it and delivers it
when the bridge connects. `orch status --json` shows the id as `.dispatchId` once the agent
runs it.

orch puts the worker header ahead of every prompt, so send the task alone. Put what the agent
must know in the prompt, and files it may want to open behind `--with`.
