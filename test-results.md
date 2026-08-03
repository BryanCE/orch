bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [1.60ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.25ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.08ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.06ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.27ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.24ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [3.06ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [9.09ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [4.43ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.51ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.25ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.11ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.09ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.34ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.35ms]
(pass) PiAdapter > reads state from the presence status through store helpers [3.54ms]
(pass) PiAdapter > appends a steer message to the presence inbox [2.34ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.18ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [10.80ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [4.92ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [3.05ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [5.08ms]
100 |     process.env.ORCH_DIR = directory;
101 |     const agentKey = key("local", "socket-answer");
102 |     seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
103 |     await startAnswerServer(directory);
104 | 
105 |     expect(rpcCall(directory, "answer", { target: agentKey, text: "delivered" })).resolves.toEqual({ ok: true });
                                                                                                 ^
error: 

Expected promise that resolves
Received promise that rejected: Promise { <rejected> }

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:105:92)
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [21.55ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-UklrQU)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [15.37ms]
error: No such built-in module: node:sqlite
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [4.09ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.29ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [77.20ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [126.95ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [105.79ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [113.24ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [3.57ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.24ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.62ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.53ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.20ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.23ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.26ms]
(pass) TmuxBackend > reports tmux availability [31.33ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.16ms]
(pass) TmuxBackend > reflects the TMUX environment [0.16ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.12ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.98ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.25ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.49ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.46ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [52.27ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.16ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.18ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.19ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.34ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.17ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.69ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.22ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.53ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at insertOutboxMessage (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:442:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-daemon-hardening.test.ts:36:5)
(fail) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [2.23ms]
error: No such built-in module: node:sqlite
(fail) broker daemon hardening > a throwing delivery is retried and does not poison later messages [1.59ms]
error: No such built-in module: node:sqlite
(fail) broker daemon hardening > concurrent drains do not redeliver one message id [1.59ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.23ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [39.84ms]

test\broker-governance.test.ts:
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:23:5)
(fail) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [3.31ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:30:5)
(fail) daemon governWrite enforcement > owner may write to its own agent [1.60ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:36:5)
(fail) daemon governWrite enforcement > a foreign owner in the same workspace is refused [1.43ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:42:5)
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [1.56ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:48:5)
(fail) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [1.28ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:54:5)
(fail) daemon governWrite enforcement > --steal transfers ownership to the actor [1.31ms]
56 |     expect(getOwner(dir, "herdr~wA~p1")).toBe("herdr~wA~p2");
57 |   });
58 | 
59 |   test("an unowned target is writable by any same-workspace actor", () => {
60 |     const dir = freshDir();
61 |     expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~p9", text: "hi" })).not.toThrow();
                                                                                                 ^
error: expect(received).not.toThrow()

Thrown value: error: No such built-in module: node:sqlite

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-governance.test.ts:61:93)
(fail) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [2.75ms]

test\broker-ownership.test.ts:
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at setOwner (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:241:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-ownership.test.ts:25:5)
(fail) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [1.67ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.23ms]
73 | const require = createRequire(import.meta.url);
74 | 
75 | /** node:sqlite is the one driver, under every runtime. Required lazily rather than
76 |  *  imported so a node too old to ship it fails here, not at module load. */
77 | function createDatabase(path: string): DatabaseLike {
78 |   const nodeSqlite = require("node:sqlite") as { DatabaseSync: new (file: string) => DatabaseSync };
                          ^
ResolveMessage: No such built-in module: node:sqlite
      at createDatabase (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:78:22)
      at openStore (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:166:12)
      at insertQueueTask (C:\Users\Bryan\Documents\orch\src\store\sqlite.ts:216:3)
      at addTask (C:\Users\Bryan\Documents\orch\src\queue.ts:67:3)
      at <anonymous> (C:\Users\Bryan\Documents\orch\test\broker-ownership.test.ts:52:20)
(fail) broker ownership and workspace governance > work-loop selection stays within the origin workspace [1.53ms]

test\broker-routing.test.ts:
