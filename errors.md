$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1614 files scanned)
@bryance/orch check: check:bridge | Done in 626ms
@bryance/orch check: tc           | Done in 2.07s
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Variable 'testLogger' is declared but never used. Unused variables should start with a '_'.
@bryance/orch check: lint         |     ,-[test/daemon-renags-questions.test.ts:61:17]
@bryance/orch check: lint         |  60 | 
@bryance/orch check: lint         |  61 | const { logger: testLogger } = recordingLogger();
@bryance/orch check: lint         |     :                 ^^^^^|^^^^
@bryance/orch check: lint         |     :                      `-- 'testLogger' is declared here
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this declaration.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'daemonRuntimeFiles' is imported but never used.
@bryance/orch check: lint         |     ,-[src/daemon/client/reach.ts:24:10]
@bryance/orch check: lint         |  23 | } from "./process.ts";
@bryance/orch check: lint         |  24 | import { daemonRuntimeFiles } from "./runtime-files.ts";
@bryance/orch check: lint         |     :          ^^^^^^^^^|^^^^^^^^
@bryance/orch check: lint         |     :                   `-- 'daemonRuntimeFiles' is imported here
@bryance/orch check: lint         |  25 | import { isLogRecord, logFile } from "../../log.ts";
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Parameter 'context' is declared but never used. Unused parameters should start with a '_'.
@bryance/orch check: lint         |      ,-[src/daemon/server/handlers/write.ts:131:85]
@bryance/orch check: lint         |  130 |  * through here at all. */
@bryance/orch check: lint         |  131 | export function governWrite(state: DaemonState, target: string, params: Governance, context: LogContext = {}): void {
@bryance/orch check: lint         |      :                                                                                     ^^^|^^^
@bryance/orch check: lint         |      :                                                                                        `-- 'context' is declared here
@bryance/orch check: lint         |  132 |   const directory = state.directory;
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: Consider removing this parameter.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'daemonRuntimeFiles' is imported but never used.
@bryance/orch check: lint         |     ,-[src/commands/daemon.ts:14:10]
@bryance/orch check: lint         |  13 | } from "../daemon/client/process.ts";
@bryance/orch check: lint         |  14 | import { daemonRuntimeFiles } from "../daemon/client/runtime-files.ts";
@bryance/orch check: lint         |     :          ^^^^^^^^^|^^^^^^^^
@bryance/orch check: lint         |     :                   `-- 'daemonRuntimeFiles' is imported here
@bryance/orch check: lint         |  15 | import { DaemonAbsentError, DaemonUnreachableError } from "../daemon/client/wire.ts";
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 4 errors.
@bryance/orch check: lint         | Finished in 2.0s on 596 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
