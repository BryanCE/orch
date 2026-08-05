$ bun run lint && bunx tsc --noEmit && bun run check:bridge
$ oxlint bin src test extensions scripts

  x eslint(no-unused-vars): Identifier 'spawnedRecords' is imported but never used.
    ,-[src/daemon/orchd.ts:29:10]
 28 | import { fleetStatusRows, type StatusRow } from "../commands/status.ts";
 29 | import { spawnedRecords } from "../presence/store.ts";
    :          ^^^^^^^|^^^^^^
    :                 `-- 'spawnedRecords' is imported here
 30 | 
    `----
  help: Consider removing this import.

Found 0 warnings and 1 error.
Finished in 3.7s on 200 files with 65 rules using 8 threads.
error: script "lint" exited with code 1
error: script "check" exited with code 1
