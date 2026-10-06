List every model each enabled harness can run. Use it to find the spec to pass to `--model`.

    orch models --harness pi --search luna

It records nothing. `orch settings models` changes the launch model and the models allowed to
launch. A model that `--preferred` leaves out can still launch.
