$ bun run --parallel --no-exit-on-error check:orch check:web
check:web  | orch-web check: lint | Found 0 warnings and 0 errors.
check:web  | orch-web check: lint | Finished in 83ms on 102 files with 96 rules using 24 threads.
check:web  | orch-web check: lint | Done in 287ms
check:orch | @bryance/orch check: check:bridge | check:bridge OK (1462 files scanned)
check:orch | @bryance/orch check: check:bridge | Done in 1.17s
check:orch | @bryance/orch check: lint         | Found 0 warnings and 0 errors.
check:orch | @bryance/orch check: lint         | Finished in 2.7s on 552 files with 65 rules using 24 threads.
check:orch | @bryance/orch check: lint         | Done in 2.95s
check:orch | @bryance/orch check: tc           | Done in 2.98s
check:orch | @bryance/orch check: Exited with code 0
check:orch | Done in 3.11s
check:web  | orch-web check: tc   | Done in 3.20s
check:web  | orch-web check: Exited with code 0
check:web  | Done in 3.32s
