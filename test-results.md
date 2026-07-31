bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.91ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.22ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.10ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.08ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.29ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.23ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [4.07ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [9.83ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [6.05ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.70ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.78ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.14ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.07ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.17ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.49ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.18ms]
(pass) PiAdapter > reads state from the presence status through store helpers [4.43ms]
(pass) PiAdapter > appends a steer message to the presence inbox [3.10ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.52ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [4.77ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [7.55ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [4.25ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [27.82ms]
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
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [18.71ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-RdyMlj)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [14.86ms]
129 |     setOwner(directory, agentKey, key("wA", "owner"));
130 |     await startAnswerServer(directory);
131 | 
132 |     expect(
133 |       rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: key("wA", "intruder") }),
134 |     ).rejects.toThrow(/owned by/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /owned by/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-E75IA2)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:134:15)
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [35.39ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.36ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [104.03ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [133.85ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [104.20ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [115.87ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [2.71ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [2.26ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.85ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.37ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.22ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.16ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.23ms]
(pass) TmuxBackend > reports tmux availability [33.49ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.24ms]
(pass) TmuxBackend > reflects the TMUX environment [0.22ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.11ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.33ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [1.36ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [4.46ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.67ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [52.13ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.21ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.28ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.26ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.43ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.22ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.71ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.24ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.50ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [24.04ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [26.30ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [31.69ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.35ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [52.53ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [70.26ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [59.85ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [53.88ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [52.20ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [68.95ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [63.67ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [57.90ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [54.53ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.97ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [67.10ms]

test\broker-routing.test.ts:
