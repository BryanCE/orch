$ bun run --parallel --no-exit-on-error check:orch check:web
check:web  | orch-web check: lint | Found 0 warnings and 0 errors.
check:web  | orch-web check: lint | Finished in 18ms on 102 files with 96 rules using 24 threads.
check:web  | orch-web check: lint | Done in 167ms
check:orch | @bryance/orch check: check:bridge | check:bridge OK (1462 files scanned)
check:orch | @bryance/orch check: check:bridge | Done in 685ms
check:orch | @bryance/orch check: tc           | Done in 1.76s
check:web  | orch-web check: tc   | Done in 1.82s
check:web  | orch-web check: Exited with code 0
check:web  | Done in 1.90s
check:orch | @bryance/orch check: lint         | Found 0 warnings and 0 errors.
check:orch | @bryance/orch check: lint         | Finished in 1.8s on 552 files with 65 rules using 24 threads.
check:orch | @bryance/orch check: lint         | Done in 1.89s
check:orch | @bryance/orch check: Exited with code 0
check:orch | Done in 1.96s
