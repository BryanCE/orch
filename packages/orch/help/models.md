List every model each enabled harness reports it can run. The quicklist never hides the
rest. Lists only; records nothing. `orch settings models` is what records.

Every harness names models in its own vocabulary. `models.allowed.<harness>` gates what may
launch. `models.preferred.<harness>` is only the quicklist that harness's picker cycles. A
model missing from the quicklist is still launchable.
