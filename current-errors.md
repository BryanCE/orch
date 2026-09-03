$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1252 files scanned)
@bryance/orch check: check:bridge | Done in 687ms
@bryance/orch check: tc           | Done in 1.11s
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'PRESENCE_SCHEMA' is imported but never used.
@bryance/orch check: lint         |    ,-[src/presence/store.ts:3:10]
@bryance/orch check: lint         |  2 | import { join } from "node:path";
@bryance/orch check: lint         |  3 | import { PRESENCE_SCHEMA, STATUS_FILE } from "./schema.ts";
@bryance/orch check: lint         |    :          ^^^^^^^|^^^^^^^
@bryance/orch check: lint         |    :                 `-- 'PRESENCE_SCHEMA' is imported here
@bryance/orch check: lint         |  4 | // The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
@bryance/orch check: lint         |    `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'path' is imported but never used.
@bryance/orch check: lint         |     ,-[src/agent/presence.ts:10:13]
@bryance/orch check: lint         |   9 | import * as fs from "node:fs";
@bryance/orch check: lint         |  10 | import * as path from "node:path";
@bryance/orch check: lint         |     :             ^^|^
@bryance/orch check: lint         |     :               `-- 'path' is imported here
@bryance/orch check: lint         |  11 | import { mintAgentId } from "../backends/identity.ts";
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Identifier 'isRecord' is imported but never used.
@bryance/orch check: lint         |     ,-[src/agent/harness-bridge.ts:17:10]
@bryance/orch check: lint         |  16 | import { registerAgentTools } from "./tools.ts";
@bryance/orch check: lint         |  17 | import { isRecord } from "../util.ts";
@bryance/orch check: lint         |     :          ^^^^|^^^
@bryance/orch check: lint         |     :              `-- 'isRecord' is imported here
@bryance/orch check: lint         |  18 | import type { FleetStatusRenderer, HarnessApi, HarnessBridge, HarnessIdentity } from "../types/agent.ts";
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
@bryance/orch check: lint         |      ,-[src/agent/tools.ts:491:9]
@bryance/orch check: lint         |  490 |       if (presence.hasPendingHandoff() && finalText) {
@bryance/orch check: lint         |  491 |         presence.deliverPendingHandoff(finalText, presence.keyOrCompute(ctx?.hasUI ?? false));
@bryance/orch check: lint         |      :         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |      :                                                   `-- This unhandled promise-like value has type `Promise<void>`.
@bryance/orch check: lint         |  492 |       }
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/peer-lease-visibility.test.ts:77:81]
@bryance/orch check: lint         |  76 | describe("peer summaries carry ownership as a lease", () => {
@bryance/orch check: lint         |  77 |   test("a peer the caller holds reports the caller as the live holder", async () => {
@bryance/orch check: lint         |     :                                                                                 ^^^
@bryance/orch check: lint         |  78 |     const directory = fixture();
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/peer-lease-visibility.test.ts:82:70]
@bryance/orch check: lint         |  81 | 
@bryance/orch check: lint         |  82 |   test("a peer nobody ever took reports no orch driving it", async () => {
@bryance/orch check: lint         |     :                                                                      ^^^
@bryance/orch check: lint         |  83 |     const directory = fixture();
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(require-await): Function has no 'await' expression.
@bryance/orch check: lint         |     ,-[test/peer-lease-visibility.test.ts:87:51]
@bryance/orch check: lint         |  86 | 
@bryance/orch check: lint         |  87 |   test("a dead holder is not a live one", async () => {
@bryance/orch check: lint         |     :                                                   ^^^
@bryance/orch check: lint         |  88 |     const directory = fixture();
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 7 errors.
@bryance/orch check: lint         | Finished in 1.2s on 509 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
