Check that notifications reach the user. `test` sends a fake state change through every
notification channel configured in `settings.json`.

    orch notify test --state done

Add, change, or remove a channel with `orch settings notify`.
