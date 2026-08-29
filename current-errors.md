$ bun run --parallel --no-exit-on-error lint tc check:bridge
check:bridge | check:bridge OK (932 files scanned)
check:bridge | Done in 465ms
tc           | Done in 1.69s
lint         | 
lint         |   x eslint(no-unused-vars): Type 'BackendTarget' is imported but never used.
lint         |     ,-[test/owner-scoping.test.ts:13:24]
lint         |  12 | import { openStore } from "../src/store/connection.ts";
lint         |  13 | import type { Backend, BackendTarget } from "../src/backends/backend.ts";
lint         |     :                        ^^^^^^|^^^^^^
lint         |     :                              `-- 'BackendTarget' is imported here
lint         |  14 | import { callerOwnerToken } from "../src/commands/target.ts";
lint         |     `----
lint         |   help: Consider removing this import.
lint         | 
lint         | Found 0 warnings and 1 error.
lint         | Finished in 2.0s on 368 files with 65 rules using 8 threads.
lint         | Exited with code 1
error: script "check" exited with code 1
