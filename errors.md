$ bun run --parallel --no-exit-on-error check:orch check:web
check:web  | orch-web check: lint | Found 0 warnings and 0 errors.
check:web  | orch-web check: lint | Finished in 107ms on 102 files with 95 rules using 8 threads.
check:web  | orch-web check: lint | Done in 174ms
check:orch | @bryance/orch check: check:bridge | check:bridge OK (1625 files scanned)
check:orch | @bryance/orch check: check:bridge | Done in 1.09s
check:web  | orch-web check: tc   | Done in 4.98s
check:web  | orch-web check: Exited with code 0
check:web  | Done in 4.99s
check:orch | @bryance/orch check: tc           | Done in 5.28s
check:orch | @bryance/orch check: lint         | Found 0 warnings and 0 errors.
check:orch | @bryance/orch check: lint         | Finished in 5.3s on 601 files with 65 rules using 8 threads.
check:orch | @bryance/orch check: lint         | Done in 5.34s
check:orch | @bryance/orch check: Exited with code 0
check:orch | Done in 5.34s
