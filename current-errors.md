
  x eslint(no-unused-vars): Identifier 'writeRpc' is imported but never used.
    ,-[src/commands/spawn.ts:18:36]
 17 | import { errorMessage } from "../util.ts";
 18 | import { callDaemon, daemonOutage, writeRpc } from "./daemon.ts";
    :                                    ^^^^|^^^
    :                                        `-- 'writeRpc' is imported here
 19 | import { callerOwnerToken, callerWorkspace, die } from "./target.ts";
    `----
  help: Consider removing this import.

  x typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
    ,-[src/commands/daemon.ts:88:65]
 87 |     }
 88 |     return tail.toString("utf8").trimEnd().split(/\r?\n/).pop() || null;
    :                                                                 ^^
 89 |   } catch {
    `----

  x typescript(prefer-optional-chain): Prefer using an optional chain expression instead, as it's more concise and easier to read.
     ,-[src/doctor/runner.ts:140:11]
 139 |       if (diagnosis.status === "ok" || diagnosis.status === "skip") continue;
 140 |       if (!diagnosis.fix || diagnosis.fix.destructive) continue;
     :           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 141 |       diagnosis.fix.apply();
     `----

Found 0 warnings and 3 errors.
Finished in 721ms on 216 files with 65 rules using 24 threads.
