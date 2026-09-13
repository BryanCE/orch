bun test v1.4.0 (34cbb9a40)

packages/orch/integration/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [2.90ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [1.01ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [3.44ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.86ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [1.00ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [1.00ms]

packages/orch/integration/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.80ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.10ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.76ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.73ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.54ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [58.54ms]

packages/orch/integration/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [48.23ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [27.45ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [34.95ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [41.04ms]
(pass) store hardening > the attempt insert claim is exactly once [41.53ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [159.02ms]

packages/orch/integration/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [141.40ms]

packages/orch/integration/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.15ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.06ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.07ms]
(pass) Claude adapter > detects state from a live presence status [20.85ms]
(pass) Claude adapter > extracts results.jsonl before transcript and native output [1.00ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.54ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [25.49ms]
138 |     expect(status.lastText).toBe(adapterText);
139 |   }, 20_000);
140 | 
141 |   test("maps Claude hook events to presence states and schema", () => {
142 |     const key = "claude-hooks";
143 |     expect(runHook("SessionStart", { pid: process.pid, session_id: "s1" })).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "claude", key: fakeKey, pid: process.pid, state: "working" });
                                                                                  ^
error: expect(received).toMatchObject(expected)

  {
    "agent": "claude",
+   "branch": null,
+   "cost": 0,
+   "cwd": "/home/bryan/orch",
    "key": "vesg2vg03z",
-   "pid": 30998,
+   "label": null,
+   "project": "/home/bryan/orch",
    "schema": 1,
+   "sessionId": "s1",
+   "spawnedBy": null,
+   "spawnedByLabel": null,
+   "startedAt": "2026-09-13T04:38:22.728Z",
    "state": "working",
+   "tabLabel": null,
+   "tokens": {
+     "cacheRead": 0,
+     "cacheWrite": 0,
+     "input": 0,
+     "output": 0,
+   },
+   "turns": 0,
+   "updatedAt": "2026-09-13T04:38:22.728Z",
+   "worktree": null,
  }

- Expected  - 1
+ Received  + 19

      at <anonymous> (/home/bryan/orch/packages/orch/integration/claude-adapter.test.ts:143:77)
(fail) Claude adapter > maps Claude hook events to presence states and schema [19.43ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [17.54ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [16.46ms]

packages/orch/integration/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.19ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.08ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.11ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.13ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.06ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.18ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.17ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.08ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [52.48ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.40ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [145.71ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.24ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.03ms]

packages/orch/integration/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [1.12ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [55.72ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.45ms]

packages/orch/integration/owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [101.47ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [22.20ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [52.26ms]
