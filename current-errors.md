$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1273 files scanned)
@bryance/orch check: check:bridge | Done in 845ms
@bryance/orch check: tc           | src/__probe.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.
@bryance/orch check: tc           | Exited with code 1
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Variable 'x' is declared but never used. Unused variables should start with a '_'.
@bryance/orch check: lint         |    ,-[src/__probe.ts:1:7]
@bryance/orch check: lint         |  1 | const x: number = "boom";
@bryance/orch check: lint         |    :       |
@bryance/orch check: lint         |    :       `-- 'x' is declared here
@bryance/orch check: lint         |    `----
@bryance/orch check: lint         |   help: Consider removing this declaration.
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 1 error.
@bryance/orch check: lint         | Finished in 1.6s on 502 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
