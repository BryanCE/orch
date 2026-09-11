$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1283 files scanned)
@bryance/orch check: check:bridge | Done in 1.03s
@bryance/orch check: tc           | src/agent/daemon-client.ts(179,5): error TS2353: Object literal may only specify known properties, and 'messageIdOf' does not exist in type 'DaemonClient'.
@bryance/orch check: tc           | test/bridge-apply.test.ts(69,5): error TS2353: Object literal may only specify known properties, and 'messageIdOf' does not exist in type 'DaemonClient'.
@bryance/orch check: tc           | test/helpers/daemon-client.ts(21,5): error TS2353: Object literal may only specify known properties, and 'messageIdOf' does not exist in type 'DaemonClient'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | Found 0 warnings and 0 errors.
@bryance/orch check: lint         | Finished in 1.9s on 501 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Done in 2.07s
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
