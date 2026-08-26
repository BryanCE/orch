$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (734 files scanned)
check:bridge | Done in 624ms
tc           | src/daemon/work-loop.ts(117,5): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
tc           |   Type 'null' is not assignable to type 'string | undefined'.
tc           | src/daemon/work-loop.ts(223,9): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string | undefined'.
tc           |   Type 'null' is not assignable to type 'string | undefined'.
tc           | Exited with code 1
lint         | 
lint         |   x eslint(no-unused-vars): Parameter 'workspace' is declared but never used. Unused parameters should start with a '_'.
lint         |     ,-[test/close-always.test.ts:40:77]
lint         |  39 | 
lint         |  40 | function writeStatus(dir: string, key: string, handle: string, pid: number, workspace: string): void {
lint         |     :                                                                             ^^^^|^^^^
lint         |     :                                                                                 `-- 'workspace' is declared here
lint         |  41 |   const agentDir = join(dir, "agents", key);
lint         |     `----
lint         |   help: Consider removing this parameter.
lint         | 
lint         | Found 0 warnings and 1 error.
lint         | Finished in 1.6s on 256 files with 65 rules using 24 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
