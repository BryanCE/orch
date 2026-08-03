bun test v1.3.14 (0d9b296a)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [2.46ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.27ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.09ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.08ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.32ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.21ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [3.50ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [10.91ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [4.94ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [2.64ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [2.41ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.16ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.15ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.30ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.17ms]
(pass) PiAdapter > reads state from the presence status through store helpers [5.85ms]
(pass) PiAdapter > appends a steer message to the presence inbox [4.10ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [2.97ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [4.78ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [5.16ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [2.91ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [40.06ms]
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
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [37.02ms]
115 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
116 |     await startAnswerServer(directory);
117 | 
118 |     expect(
119 |       rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") }),
120 |     ).rejects.toThrow(/workspace wall/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-vdx1qA)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:120:15)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [8.43ms]
129 |     setOwner(directory, agentKey, key("wA", "owner"));
130 |     await startAnswerServer(directory);
131 | 
132 |     expect(
133 |       rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: key("wA", "intruder") }),
134 |     ).rejects.toThrow(/owned by/);
                    ^
error: expect(received).toThrow(expected)

Expected pattern: /owned by/
Received message: "orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-answer-ojBXfN)"

      at <anonymous> (C:\Users\Bryan\Documents\orch\test\answer-dispatch.test.ts:134:15)
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [36.02ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.22ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [84.44ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [140.85ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [75.84ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [77.49ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [2.44ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [1.96ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.83ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.41ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.13ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.18ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.22ms]
(pass) TmuxBackend > reports tmux availability [33.61ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.20ms]
(pass) TmuxBackend > reflects the TMUX environment [0.20ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.14ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.23ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.67ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.57ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.34ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [51.90ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.16ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.20ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.21ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.35ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.18ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.54ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.18ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.37ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [32.95ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [34.59ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [38.39ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.41ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [55.00ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > unscoped actor bypasses ownership and the wall [25.03ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [24.23ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [47.46ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [54.02ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [52.41ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [63.87ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [67.84ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [73.55ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [3.09ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [66.03ms]

test\broker-routing.test.ts:
