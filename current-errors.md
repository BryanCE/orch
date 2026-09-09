$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1257 files scanned)
@bryance/orch check: check:bridge | Done in 668ms
@bryance/orch check: tc           | test/doctor-checks.test.ts(131,77): error TS2739: Type 'CheckResult' is missing the following properties from type 'Promise<unknown>': then, catch, [Symbol.toStringTag], finally
@bryance/orch check: tc           | test/doctor-checks.test.ts(162,103): error TS2739: Type 'CheckResult' is missing the following properties from type 'Promise<CheckResult>': then, catch, [Symbol.toStringTag], finally
@bryance/orch check: tc           | test/doctor-checks.test.ts(178,49): error TS2739: Type 'CheckResult' is missing the following properties from type 'Promise<unknown>': then, catch, [Symbol.toStringTag], finally
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | Found 0 warnings and 0 errors.
@bryance/orch check: lint         | Finished in 1.4s on 502 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Done in 1.55s
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
