$ bun --filter @bryance/orch check
@bryance/orch check: check:bridge | check:bridge OK (1608 files scanned)
@bryance/orch check: check:bridge | Done in 703ms
@bryance/orch check: tc           | Done in 1.85s
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x eslint(no-unused-vars): Type 'BackendHandle' is imported but never used.
@bryance/orch check: lint         |     ,-[src/entities/lifecycle.ts:12:24]
@bryance/orch check: lint         |  11 | import type { PresenceEntry } from "../types/presence.ts";
@bryance/orch check: lint         |  12 | import type { Backend, BackendHandle } from "../types/backend.ts";
@bryance/orch check: lint         |     :                        ^^^^^^|^^^^^^
@bryance/orch check: lint         |     :                              `-- 'BackendHandle' is imported here
@bryance/orch check: lint         |  13 | import type { OrchSettings } from "../types/settings.ts";
@bryance/orch check: lint         |     `----
@bryance/orch check: lint         |   help: Consider removing this import.
@bryance/orch check: lint         | 
@bryance/orch check: lint         |   x typescript(no-floating-promises): Promises must be awaited, add void operator to ignore.
@bryance/orch check: lint         |      ,-[test/commands-lease.test.ts:155:20]
@bryance/orch check: lint         |  154 |     expect(headlessBackend.agentInput).toBeNull();
@bryance/orch check: lint         |  155 |     expect(() => { cmdAbort(services(dir), [key, "--json"]); }).not.toThrow();
@bryance/orch check: lint         |      :                    ^^^^^^^^^^^^^^^^^^^^|^^^^^^^^^^^^^^^^^^^^
@bryance/orch check: lint         |      :                                        `-- This unhandled promise-like value has type `Promise<void>`.
@bryance/orch check: lint         |  156 |     expect(currentLease(dir, key)?.orchId).toBe("foreign-orch");
@bryance/orch check: lint         |      `----
@bryance/orch check: lint         |   help: The promise must end with a call to .catch, or end with a call to .then with a rejection handler, or be explicitly marked as ignored with the `void` operator.
@bryance/orch check: lint         | 
@bryance/orch check: lint         | Found 0 warnings and 2 errors.
@bryance/orch check: lint         | Finished in 1.9s on 590 files with 65 rules using 24 threads.
@bryance/orch check: lint         | Exited with code 1
@bryance/orch check: Exited with code 1
error: script "check:orch" exited with code 1
