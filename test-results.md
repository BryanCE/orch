bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.98ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.18ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.03ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.32ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.20ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.34ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.14ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.14ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [3.33ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [20.39ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [6.93ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [2.11ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.03ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.28ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.13ms]
(pass) PiAdapter > reads state from the presence status through store helpers [19.59ms]
(pass) PiAdapter > appends a steer message to the presence inbox [19.39ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [30.95ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [28.52ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.55ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [36.69ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [17.15ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-yp3sXe (EBUSY persisted past deadline)
(fail) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [10090.00ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-4cU9Ph (EBUSY persisted past deadline)
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [10111.58ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [28.82ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-GMn70c (EBUSY persisted past deadline)
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [10084.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.43ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [0.99ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [55.00ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [81.25ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [54.83ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [58.47ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [21.70ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [16.03ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.81ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.37ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.08ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.12ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.05ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.04ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.09ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.15ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.17ms]
(pass) TmuxBackend > reports tmux availability [6.28ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.12ms]
(pass) TmuxBackend > reflects the TMUX environment [0.14ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.08ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.76ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.23ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [3.61ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.37ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [53.30ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.23ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.21ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.17ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.29ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.07ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.26ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.10ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.38ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.13ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.28ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-jlpEnb (EBUSY persisted past deadline)
(fail) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [10063.63ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-coEKSh (EBUSY persisted past deadline)
(fail) broker daemon hardening > a throwing delivery is retried and does not poison later messages [10075.31ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-sSqrjx (EBUSY persisted past deadline)
(fail) broker daemon hardening > concurrent drains do not redeliver one message id [10085.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.39ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [19.76ms]

test\broker-governance.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-DqTi1A (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > an unscoped actor is refused on an owned target [10071.33ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-yWg4gx (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > an unscoped actor may write to an unowned target [10065.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-E2aQLT (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > owner may write to its own agent [10073.69ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-OpwBoL (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > a foreign owner in the same workspace is refused [10072.50ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-pxz7Vd (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [10062.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-xTmDNN (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [10072.02ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-2XrYCv (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > --steal transfers ownership to the actor [10078.07ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-5JWmpI (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [10063.61ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-hluMDq (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [10061.39ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-0Ux9oE (EBUSY persisted past deadline)
(fail) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [10060.62ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\broker-ownership.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-ownership-Pg5f6g (EBUSY persisted past deadline)
(fail) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [10136.40ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.43ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-ownership-VgSUVg (EBUSY persisted past deadline)
(fail) broker ownership and workspace governance > work-loop selection stays within the origin workspace [10085.47ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\broker-routing.test.ts:
64 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
65 | 
66 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
67 | 
68 |     expect(result.status).not.toBe(0);
69 |     expect(`${result.stdout}\n${result.stderr}`).toContain("orch daemon start");
                                                      ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nwrite 81fa7ec3-842c-48a6-879f-cb9b862fbbd5 was not applied or acknowledged for target agent-alpha\n"

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:69:50)
45 | 
46 | afterEach(() => {
47 |   // Windows releases the CLI child's handles (sqlite WAL mappings, AV scans)
48 |   // seconds after spawnSync returns; a retried rm keeps that lag from failing
49 |   // the test as EBUSY. ~5s of retry covers the worst observed lag.
50 |   while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
                                   ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-broker-routing-lKzyE5'
      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:50:31)
(fail) broker CLI routing > write refuses when the daemon socket is unavailable [395.07ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [194.41ms]
87 | 
88 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
89 |     const output = `${result.stdout}\n${result.stderr}`;
90 | 
91 |     expect(result.status).not.toBe(0);
92 |     expect(output).toContain("orch daemon start");
                        ^
error: expect(received).toContain(expected)

Expected to contain: "orch daemon start"
Received: "\nwrite bb16963c-712e-4522-bab8-741ab9465daf was not applied or acknowledged for target agent-alpha\n"

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:92:20)
45 | 
46 | afterEach(() => {
47 |   // Windows releases the CLI child's handles (sqlite WAL mappings, AV scans)
48 |   // seconds after spawnSync returns; a retried rm keeps that lag from failing
49 |   // the test as EBUSY. ~5s of retry covers the worst observed lag.
50 |   while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
                                   ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-broker-routing-HbWleF'
      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:50:31)
(fail) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [404.77ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.12ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.48ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.13ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.33ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.56ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.06ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.16ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.05ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [7.12ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.13ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.50ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.36ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.15ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.13ms]
(pass) Claude adapter > detects state from a live presence status [14.56ms]
(pass) Claude adapter > extracts result.json before transcript and native output [18.00ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.62ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [120.00ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [354.01ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [73.13ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [80.77ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [112.08ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [110.00ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [104.23ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [93.99ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [72.02ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [78.07ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [3225.57ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1884.46ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.40ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.19ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.24ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.15ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.49ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.20ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [18.88ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.26ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [60.28ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.35ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [215.24ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.35ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.16ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.23ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [14.81ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.19ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.17ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.19ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.05ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [6.77ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.31ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.14ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.43ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-close-always-cTNESr (EBUSY persisted past deadline)
(fail) close always works > closes a foreign-workspace target by name, key, or pane id [10120.12ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-close-always-FkBXWy (EBUSY persisted past deadline)
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [10240.78ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) close always works > steer remains blocked by the workspace wall [0.54ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [16.83ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [0.67ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.38ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [12.74ms]
(pass) command lock > second acquire blocks until first releases [60.08ms]
(pass) command lock > dead-pid lock is reaped [23.57ms]
(pass) command lock > release with wrong pid refuses [13.49ms]
bun test held by agent-a (pid 20600)
(pass) command lock > matches locked command prefixes and probes settings [12.65ms]
(pass) command lock > run propagates the child exit code [28.67ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.19ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.20ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.44ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [2.94ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [2.43ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [154.21ms]

test\command-workspace-fields.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-workspace-zrN2Du (EBUSY persisted past deadline)
(fail) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [10077.01ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-workspace-AzmSDO (EBUSY persisted past deadline)
(fail) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [10096.38ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [15.97ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.24ms]
(pass) commands/control > parses --then destination and note [0.04ms]
(pass) commands/control > adds worker header unless raw [0.09ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.19ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [6.40ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [0.18ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.31ms]
(pass) commands/events > rejects malformed event and labels sinks [0.16ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.04ms]
(pass) commands/index > reads a package version string [0.28ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.30ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.10ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.35ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.08ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.03ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.06ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.03ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.05ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.03ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.10ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.09ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.27ms]
(pass) orch models --json > emits the pinned harness/model shape [0.07ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.05ms]
(pass) commands/panes > exports the pane listing command directly [0.03ms]

test\commands-queue.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-queue-fmuv00 (EBUSY persisted past deadline)
(fail) commands/queue > round-trips add/list/cancel on an isolated store [10067.74ms]
  ^ this test timed out after 5000ms.
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.29ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.24ms]
(pass) commands/results > formats invalid and recent timestamps [0.17ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-result-KIjMML (EBUSY persisted past deadline)
(fail) commands/results > routes a seeded result.json through the command module [10098.24ms]
  ^ this test timed out after 5000ms.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-tail-fDSibv (EBUSY persisted past deadline)
(fail) commands/results > orch tail resolves a non-pi target through that adapter's session view [10117.46ms]
  ^ this test timed out after 5000ms.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-zkk4D4 (EBUSY persisted past deadline)
(fail) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [10103.46ms]
  ^ this test timed out after 5000ms.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-CgPbLc (EBUSY persisted past deadline)
(fail) commands/results > orch tail -n keeps last-N rendered entries for a pi session [10086.30ms]
  ^ this test timed out after 5000ms.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-SCsrqD (EBUSY persisted past deadline)
(fail) commands/results > orch session reports the pi entry count [10098.57ms]
  ^ this test timed out after 5000ms.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-session-1INUkE (EBUSY persisted past deadline)
(fail) commands/results > orch session shows zero entries for an adapter view without them [10097.36ms]
  ^ this test timed out after 5000ms.

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.23ms]
(pass) commands/review > falls back to branch then pane [0.10ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.20ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.62ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.22ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.29ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.14ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [1.00ms]
(pass) commands/status > marks dead presence as exited [0.21ms]
(pass) commands/status > shared status row carries presence-derived fields [0.31ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.10ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.05ms]
(pass) commands/status > formats workspace labels and warnings [0.10ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.14ms]
(pass) commands/target > extracts target and joined prompt [0.13ms]
(pass) commands/target > reads only structured result text [0.03ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.10ms]
(pass) commands/target > lists only live serialized identity presence entries [26.91ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [6.77ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [17.67ms]
(pass) config precedence > uses env over config and flag over env [5.08ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [8.90ms]
(pass) config precedence > reports a helpful validation error for invalid config [4.57ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [69.55ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [419.98ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [37.32ms]
(pass) watchConfig > stop prevents further callbacks [408.65ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [2.28ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [18.57ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [4.42ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [3.42ms]
(pass) loadConfig > reads the declared runtime [3.17ms]
(pass) loadConfig > parses every supported settings section [25.80ms]
(pass) loadConfig > rejects a file without the current schemaVersion [4.29ms]
(pass) loadConfig > rejects invalid JSON loudly [3.03ms]
(pass) loadConfig > names the key path for invalid fields [4.76ms]
(pass) loadConfig > rejects unknown settings keys [3.95ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [4.64ms]
(pass) loadConfig > rejects old settings keys [29.14ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [28.99ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [4.80ms]
(pass) loadConfig > rejects a host without dest [15.93ms]
(pass) loadConfig > rejects an unknown id in installed.adapters [4.95ms]
(pass) loadConfig > rejects defaults.adapter not present in installed.adapters [5.52ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [2.60ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [1.22ms]
(pass) allowedModelPatterns > returns the configured patterns when set [3.80ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or installed entry [4.40ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [6.98ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [6.86ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [7.98ms]
(pass) reapUnreadableSettings > leaves a readable file alone [3.45ms]
(pass) writeSettingsInstalled > round-trips both provider arrays [19.58ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [13.51ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [14.58ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [25.58ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [4.60ms]
(pass) writeSettingsDefault > switches defaults.adapter between two installed ids and loads clean [18.69ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [4.82ms]
(pass) config precedence > uses the settings.json value over the fallback [4.98ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [7.30ms]
(pass) config precedence > uses an explicit flag override over the environment [0.32ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.28ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.13ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [18.96ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [5.40ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [56.09ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [11.40ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [66.22ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [19.42ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [21.48ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-OPbUbu (EBUSY persisted past deadline)
(fail) deliverControl > warns and succeeds when claude keys fallback delivers [10075.58ms]
  ^ a beforeEach/afterEach hook timed out for this test.
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-Jax3Js (EBUSY persisted past deadline)
(fail) deliverControl > fails when claude keys fallback cannot deliver [10081.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [5.87ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-03vAl5 (EBUSY persisted past deadline)
(fail) deliverControl > requires presence for inbox delivery [10068.81ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-uwLlEf (EBUSY persisted past deadline)
(fail) deliverControl > refuses inbox delivery to an agent whose bridge never registered [10069.78ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-j3wJ4k (EBUSY persisted past deadline)
(fail) deliverControl > refuses inbox delivery to an agent whose process is gone [10076.13ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [32.28ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.24ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [70.43ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [20.53ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [59.56ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [1212.65ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [819.86ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [1096.04ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [366.50ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [13.93ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [351.67ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [363.50ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prettier             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  remove    underscore           Remove a dependency from package.json (bun rm)
  update    @shumai/shumai       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      hono                 Display package metadata from the registry
  why       react                Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [97.99ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [338.40ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         eslint               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  remove    left-pad             Remove a dependency from package.json (bun rm)
  update    @shumai/shumai       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      hono                 Display package metadata from the registry
  why       react                Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [1376.78ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [1073.43ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [40.95ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [12.98ms]
(pass) daemon RPC > returns an error for an unknown method [9.75ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [21.53ms]
(pass) daemon RPC > delivers pushed subscription events [14.60ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [730.99ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.60ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [109.69ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [5.58ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [10.61ms]
(pass) doctor backend and presence checks > passes with herdr active while an installed tmux sits outside a session [0.08ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.11ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.09ms]
(pass) doctor backend and presence checks > fails when any installed backend is unavailable, active or not [0.17ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.08ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [6.14ms]

test\doctor-checks.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-cQbiwp (EBUSY persisted past deadline)
(fail) doctor notification-sink checks > reports no sinks as healthy [10069.81ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [5.32ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-EeCJTO (EBUSY persisted past deadline)
(fail) doctor notification-sink checks > warns for a command binary missing from PATH [10090.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
76 |     fs.writeFileSync(bash, "#!/bin/sh\n");
77 |     fs.chmodSync(bash, 0o755);
78 |     writeConfig(directory, { notify: [{ id: "command", command: ["bash"] }] });
79 | 
80 |     const result = await withPath(binDir, async () => notifyResult(await runDoctor(directory)));
81 |     expect(result).toMatchObject({ status: "ok", detail: "1 configured sink look deliverable" });
                        ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": "1 configured sink look deliverable",
-   "status": "ok",
+   "detail": "undeliverable: command sink #1 binary "bash" is not on PATH",
+   "id": "notify-sinks",
+   "label": "Notification sinks",
+   "status": "warn",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (C:\dev\personal\orch\test\doctor-checks.test.ts:81:20)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-5OJOGq (EBUSY persisted past deadline)
(fail) doctor notification-sink checks > accepts a command binary present on the injected PATH [10097.57ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [64.97ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [42.34ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [59.47ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [32.14ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [42.83ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [34.82ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [33.07ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [20.57ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [44.86ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.56ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.10ms]

test\doctor-hosts.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-ci7B7B (EBUSY persisted past deadline)
(fail) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [10084.59ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-4XZbNg (EBUSY persisted past deadline)
(fail) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [10293.82ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-MpYH9A (EBUSY persisted past deadline)
(fail) doctor remote host checks > flags a remote orch version/schema mismatch in detail [10082.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-z81nZP (EBUSY persisted past deadline)
(fail) doctor remote host checks > reports no remote hosts configured as healthy [10068.09ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [4.33ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [3.27ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [3.72ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [4.02ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [3.86ms]
(pass) shebangRuntime > returns null for a file with no shebang [3.14ms]
(pass) shebangRuntime > returns null for an unreadable path [0.88ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.13ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [4.53ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [3.42ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [3.85ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [3.73ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [3.85ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [4.78ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [3.78ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [4.14ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [3.55ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.91ms]

test\doctor-stale-presence.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-AHHJlr (EBUSY persisted past deadline)
(fail) doctor stale presence safety > describes a dead agent by name and project, not a bare key [10095.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-QSh9VV (EBUSY persisted past deadline)
(fail) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [10076.77ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-SHFc8I (EBUSY persisted past deadline)
(fail) doctor stale presence safety > no dead agents leaves nothing to remove [10096.94ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\doctor-unscoped-tasks.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-v37xZG (EBUSY persisted past deadline)
(fail) doctor unscoped queue tasks > only scoped tasks pass [10084.72ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-3tPRJK (EBUSY persisted past deadline)
(fail) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [10101.96ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-rhkxW5 (EBUSY persisted past deadline)
(fail) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [10102.16ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-ONAxgF (EBUSY persisted past deadline)
(fail) doctor unscoped queue tasks > the check is wired into runDoctor [10113.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.19ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-TfK9M1 (EBUSY persisted past deadline)
(fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [10086.44ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-yAgA9V (EBUSY persisted past deadline)
(fail) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [10069.20ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-e9MviV (EBUSY persisted past deadline)
(fail) runDoctor > reports an absent daemon as optional [10069.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-d8RDp7 (EBUSY persisted past deadline)
(fail) runDoctor > reports and fixes a stale daemon lock [10083.45ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-FqZBkq (EBUSY persisted past deadline)
(fail) runDoctor > accepts a live daemon and an answerable socket [10150.91ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-czWGmi (EBUSY persisted past deadline)
(fail) runDoctor > warns when the live daemon code hash is stale [10090.67ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-iiwoYy (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-cIqJdr (EBUSY persisted past deadline)
(fail) runDoctor > fails on an invalid lock and an unanswerable live socket [20156.85ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [76.13ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [4.27ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [3.82ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-86NRID (EBUSY persisted past deadline)
(fail) runDoctor > reports a dead presence pid and corrupt spawn registry lines [10092.26ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-PTA1BY (EBUSY persisted past deadline)
(fail) runDoctor > bins check is driven by the installed set and offers no fix [10066.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) runDoctor > applyFixes reports exactly the changes it applies [3.91ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-pD2Yuj (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-3H9W0s (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-tSUH8U (EBUSY persisted past deadline)
(fail) runDoctor > validates configured notifier adapters [30291.75ms]
  ^ a beforeEach/afterEach hook timed out for this test.
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hT5Cs0\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-aIcova (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hT5Cs0 (EBUSY persisted past deadline)
(fail) runDoctor > reports invalid config and accepts missing config [20145.85ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-t5gr5F (EBUSY persisted past deadline)
(fail) runDoctor > never throws when individual checks encounter broken inputs [10192.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.33ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-event-identity-7cZytq (EBUSY persisted past deadline)
(fail) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [10200.63ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [5.03ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.08ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.26ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.16ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.03ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.25ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.06ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.03ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.02ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [5.89ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.13ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.48ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.68ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.16ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.05ms]
(pass) malformed input > rejects wrong segment count [0.12ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or id on serialize [0.05ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.02ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.15ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.21ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.09ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [3.62ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [4.71ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [1.48ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.96ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.29ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.32ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [45.34ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [7.56ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.57ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.16ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.24ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.08ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.47ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.28ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.05ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [49.68ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [19.97ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [17.22ms]
(pass) notify > delivers only to sinks whose on filter matches the event [53.33ms]
(pass) notify > command sink writes the event payload as JSON on stdin [35.86ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.23ms]
(pass) notify > webhook failure is non-fatal and reports a warning [25.51ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [305.36ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1026.71ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.12ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [2.24ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [29.21ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [7.56ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [17.01ms]

test\outbox-replay.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-replay-uBVkWf (EBUSY persisted past deadline)
(fail) outbox restart replay > replays failed messages after restart without duplicates [10077.16ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\outbox.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-bNkx6a (EBUSY persisted past deadline)
(fail) outbox delivery > selects pending messages and delivers each message once [10077.31ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-XfB0EE (EBUSY persisted past deadline)
(fail) outbox delivery > keeps failed messages pending until their backoff expires [10068.68ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [24.38ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-yjW9Rr (EBUSY persisted past deadline)
(fail) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [10083.92ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [122.42ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-31ee2a (EBUSY persisted past deadline)
(fail) fleet ownership scoping > close --all leaves foreign-owned records untouched [10083.49ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-WaHyGY (EBUSY persisted past deadline)
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [10297.56ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-fohGE5 (EBUSY persisted past deadline)
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [10417.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-eTdn2b (EBUSY persisted past deadline)
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [10862.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-SjgU7t (EBUSY persisted past deadline)
(pass) fleet ownership scoping > --force allows an explicit foreign target [10245.51ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [27.65ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-h6acaR (EBUSY persisted past deadline)
(fail) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [10189.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-k1S7Cd (EBUSY persisted past deadline)
(fail) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [10248.82ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-WAbO19 (EBUSY persisted past deadline)
(fail) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [10204.60ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-RhtLBA (EBUSY persisted past deadline)
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [10207.12ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\ownership.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-mJyB2G (EBUSY persisted past deadline)
(fail) agent ownership > round-trips an owner [10098.36ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-g7FOpo (EBUSY persisted past deadline)
(fail) agent ownership > allows unowned and same-owner writes [10068.02ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-E0bf3b (EBUSY persisted past deadline)
(fail) agent ownership > denies foreign writes and supports stealing [10070.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.06ms]
(pass) <host>/<target> grammar > parses configured host prefixes [1.48ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.16ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.05ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.10ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [15.96ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [4.45ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [4.18ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [14.09ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [3.81ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.09ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.05ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.45ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.63ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.61ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.16ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [15.84ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2033.17ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [12.65ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.11ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [50.43ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [39.90ms]
(pass) presence status schema > status and list report the same agent identity [72.77ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [39.27ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [39.38ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [40.25ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [39.76ms]
(pass) presence status schema > persists the complete spawned identity record [28.45ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-presence-schema-vppEMQ (EBUSY persisted past deadline)
(fail) (unnamed) [10028.28ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\queue-workspace-replay.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-9EZcob (EBUSY persisted past deadline)
(fail) queue workspace replay > persists workspace through append-only replay [10061.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-OvjB7v (EBUSY persisted past deadline)
(fail) queue workspace replay > a malformed null-workspace row replays but is never claimable [10085.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-FmyRDy (EBUSY persisted past deadline)
(fail) queue workspace replay > replays separate workspace values for multiple tasks [10066.89ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-SMdBSm (EBUSY persisted past deadline)
(fail) queue workspace replay > selects only tasks eligible for the requested workspace [10089.37ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\queue.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-F6pAuQ (EBUSY persisted past deadline)
(fail) queue > add then list shows a queued task [10077.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-o3KDs0 (EBUSY persisted past deadline)
(fail) queue > exactly one claimer wins, including parallel attempts [10083.52ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-hGe0ql (EBUSY persisted past deadline)
(fail) queue > replays done, failed, and retry transitions [10086.84ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-Ls4ZrV (EBUSY persisted past deadline)
(fail) queue > cancels queued tasks and returns an error result for claimed tasks [10075.59ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-3Xmik0 (EBUSY persisted past deadline)
(fail) queue > picks queued tasks FIFO, honoring the agent constraint [10084.01ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-c0TuBM (EBUSY persisted past deadline)
(fail) queue > caps retries: requeue below the cap, terminal failed at it [10085.99ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-X2vrdn (EBUSY persisted past deadline)
(fail) queue > settles a claimed task to done and blocks any later claim [10081.75ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-7yAOe1 (EBUSY persisted past deadline)
(fail) queue > exactly one of two racing claimers wins [10077.73ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-HK1PGX (EBUSY persisted past deadline)
(fail) queue > rejects an unscoped task at enqueue [10068.40ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-U1en8X (EBUSY persisted past deadline)
(fail) queue > a malformed null-workspace row is skipped at claim, never dispatched [10087.24ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.12ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [150.89ms]
(pass) async remote fan-out > returns a typed dead-host failure [93.67ms]
(pass) async remote fan-out > returns a typed timeout failure [519.58ms]
(pass) async remote fan-out > returns a typed non-JSON failure [94.66ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [542.29ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.12ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.08ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-WkZH4Z (EBUSY persisted past deadline)
(fail) review plumbing > lists only done worktree agents with commits ahead [11176.96ms]
  ^ a beforeEach/afterEach hook timed out for this test.
Preparing worktree (new branch 'orch/iterate-1')
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-DBYHvV (EBUSY persisted past deadline)
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [11972.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-W3RH47 (EBUSY persisted past deadline)
(fail) review plumbing > approve merges and removes the worktree and branch [11311.03ms]
  ^ a beforeEach/afterEach hook timed out for this test.
Preparing worktree (new branch 'orch/conflict-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
hint: Disable this message with "git config set advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [1089.58ms]
Preparing worktree (new branch 'orch/merge-1')
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint: 	git merge --no-ff
hint:
hint: or:
hint:
hint: 	git rebase
hint:
hint: Disable this message with "git config set advice.diverging false"
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [1023.12ms]

test\routing-hardening.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-store-LsmrWX (EBUSY persisted past deadline)
(fail) store hardening > stores hostile values as data and preserves origin workspace selection [10088.89ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-schema-IMmoYy (EBUSY persisted past deadline)
(fail) store hardening > a fresh store creates the full current schema with WAL enabled [10083.22ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-owner-1FooC8 (EBUSY persisted past deadline)
(fail) store hardening > a steal updates ownership only when the observed owner still matches [10074.61ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-claim-shpEVL (EBUSY persisted past deadline)
(fail) store hardening > the conditional claim is exactly once [10084.41ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) CLI offline routing > status --offline does not start or contact orchd [132.16ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [94.57ms]
(pass) orch settings > --json reports env as the winning source over settings.json [87.55ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-umgZWO\settings.json: defaults.adapter: "codex" is not an installed adapter - installed: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between installed ids and rejects a non-installed id [257.09ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [99.40ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-o7pBMU\config.toml: legacy config.toml detected - settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-o7pBMU\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [84.25ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [2.35ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.25ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [2.79ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.28ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.41ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.10ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.14ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.13ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.30ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.07ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.21ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.07ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.66ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [88.88ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [141.83ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1173.02ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-skew-guard-z3J8Y3 (EBUSY persisted past deadline)
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [10618.53ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1377.26ms]

test\spawn-identity.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-6574ZA (EBUSY persisted past deadline)
(fail) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [10088.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-QZyiPf (EBUSY persisted past deadline)
(fail) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [10086.87ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-58iYiy (EBUSY persisted past deadline)
(fail) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [10088.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [3.85ms]
(pass) spawn limits > rejects invalid cap %s with file and key [15.16ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.46ms]
(pass) spawn limits > rejects invalid cap %s with file and key [3.81ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [2.52ms]
(pass) spawn limits > global boundary refusal data counts the whole request [24.14ms]
(pass) spawn limits > one workspace may use the full global allotment [5.37ms]
(pass) spawn limits > workspace cap is independent of global headroom [4.34ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [4.48ms]
(pass) spawn limits > dead pid records free capacity [3.64ms]
(pass) spawn limits > foreign panes never count [3.13ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-limits-frPguO (EBUSY persisted past deadline)
(fail) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [10093.09ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-limits-Mw60g2 (EBUSY persisted past deadline)
(fail) spawn limits > doctor accepts satisfiable limits [10111.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\spawn-preferred-models.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-preferred-models-BI6BJJ (EBUSY persisted past deadline)
(fail) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [10071.39ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-preferred-models-xLJgSA (EBUSY persisted past deadline)
(fail) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [10096.34ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [1.14ms]
182 |       throw new Error(`adapter ${String(adapter.id)} returned an invalid headless command`);
183 |     }
184 | 
185 |     mkdirSync(logDirectory(directory), { recursive: true });
186 |     const logPath = join(logDirectory(directory), logFileName(key, Date.now()));
187 |     const logFd = openSync(logPath, "a");
                        ^
error: ENOENT: no such file or directory, open 'C:\Users\Bryan\AppData\Local\Temp\orch-preferred-models-zNQuNX\logs\headless:local:quick-1787341350969.log'
      at spawn (C:\dev\personal\orch\src\backends\headless\index.ts:187:19)
      at <anonymous> (C:\dev\personal\orch\test\spawn-preferred-models.test.ts:124:27)
(fail) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [3.02ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.24ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.24ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.21ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.12ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.10ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.07ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.18ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.05ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.40ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.06ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.04ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.14ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.17ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.01ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.02ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [14.10ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [70.53ms]

test\worker-prompt.test.ts:
(skip) worker prompt capability composition > work loop gives codex the base header without orch_ask
(skip) worker prompt capability composition > work loop gives pi the orch_ask header clause
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.18ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.05ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.31ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.16ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.07ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.16ms]
(pass) workspace policy > resolves workspace names through records and functions [0.07ms]
(pass) workspace policy > compares serialized keys by their workspace [0.04ms]
(pass) workspace policy > enforces the workspace wall [0.07ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.11ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.02ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-workspace-policy-XjRPLt (EBUSY persisted past deadline)
(fail) workspace policy > 2.7 status displays the reported workspace identity field [10076.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-workspace-policy-HgnkGy (EBUSY persisted past deadline)
(fail) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [10071.53ms]
  ^ a beforeEach/afterEach hook timed out for this test.

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.20ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.11ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [11.63ms]
(pass) workspace wall writes > allows a write within the same workspace [0.10ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.06ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.38ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.04ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.03ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.18ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.03ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.30ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [512.03ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [655.97ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [539.26ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [35.75ms]

5 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(skip) worker prompt capability composition > work loop gives codex the base header without orch_ask
(skip) worker prompt capability composition > work loop gives pi the orch_ask header clause


110 tests failed:
(fail) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [10090.00ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [10111.58ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [10084.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [10063.63ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker daemon hardening > a throwing delivery is retried and does not poison later messages [10075.31ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker daemon hardening > concurrent drains do not redeliver one message id [10085.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > an unscoped actor is refused on an owned target [10071.33ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > an unscoped actor may write to an unowned target [10065.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > owner may write to its own agent [10073.69ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > a foreign owner in the same workspace is refused [10072.50ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [10062.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [10072.02ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > --steal transfers ownership to the actor [10078.07ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [10063.61ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [10061.39ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [10060.62ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [10136.40ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker ownership and workspace governance > work-loop selection stays within the origin workspace [10085.47ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) broker CLI routing > write refuses when the daemon socket is unavailable [395.07ms]
(fail) broker CLI routing > dispatch failure is daemon-absent, not herdr-not-found [404.77ms]
(fail) close always works > closes a foreign-workspace target by name, key, or pane id [10120.12ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [10240.78ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [10077.01ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [10096.38ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) commands/queue > round-trips add/list/cancel on an isolated store [10067.74ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > routes a seeded result.json through the command module [10098.24ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > orch tail resolves a non-pi target through that adapter's session view [10117.46ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [10103.46ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > orch tail -n keeps last-N rendered entries for a pi session [10086.30ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > orch session reports the pi entry count [10098.57ms]
  ^ this test timed out after 5000ms.
(fail) commands/results > orch session shows zero entries for an adapter view without them [10097.36ms]
  ^ this test timed out after 5000ms.
(fail) deliverControl > warns and succeeds when claude keys fallback delivers [10075.58ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) deliverControl > fails when claude keys fallback cannot deliver [10081.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) deliverControl > requires presence for inbox delivery [10068.81ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) deliverControl > refuses inbox delivery to an agent whose bridge never registered [10069.78ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) deliverControl > refuses inbox delivery to an agent whose process is gone [10076.13ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor notification-sink checks > reports no sinks as healthy [10069.81ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor notification-sink checks > warns for a command binary missing from PATH [10090.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor notification-sink checks > accepts a command binary present on the injected PATH [10097.57ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [10084.59ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [10293.82ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor remote host checks > flags a remote orch version/schema mismatch in detail [10082.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor remote host checks > reports no remote hosts configured as healthy [10068.09ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor stale presence safety > describes a dead agent by name and project, not a bare key [10095.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [10076.77ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor stale presence safety > no dead agents leaves nothing to remove [10096.94ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor unscoped queue tasks > only scoped tasks pass [10084.72ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [10101.96ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [10102.16ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) doctor unscoped queue tasks > the check is wired into runDoctor [10113.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > runs on an unconfigured install without failing for want of settings.json [10086.44ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [10069.20ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > reports an absent daemon as optional [10069.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > reports and fixes a stale daemon lock [10083.45ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > accepts a live daemon and an answerable socket [10150.91ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > warns when the live daemon code hash is stale [10090.67ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > fails on an invalid lock and an unanswerable live socket [20156.85ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > reports a dead presence pid and corrupt spawn registry lines [10092.26ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > bins check is driven by the installed set and offers no fix [10066.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > validates configured notifier adapters [30291.75ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > reports invalid config and accepts missing config [20145.85ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) runDoctor > never throws when individual checks encounter broken inputs [10192.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [10200.63ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) outbox restart replay > replays failed messages after restart without duplicates [10077.16ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) outbox delivery > selects pending messages and delivers each message once [10077.31ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) outbox delivery > keeps failed messages pending until their backoff expires [10068.68ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [10083.92ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) fleet ownership scoping > close --all leaves foreign-owned records untouched [10083.49ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [10417.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [10862.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [10189.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [10248.82ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [10204.60ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [10207.12ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) agent ownership > round-trips an owner [10098.36ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) agent ownership > allows unowned and same-owner writes [10068.02ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) agent ownership > denies foreign writes and supports stealing [10070.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) (unnamed) [10028.28ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue workspace replay > persists workspace through append-only replay [10061.98ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue workspace replay > a malformed null-workspace row replays but is never claimable [10085.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue workspace replay > replays separate workspace values for multiple tasks [10066.89ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue workspace replay > selects only tasks eligible for the requested workspace [10089.37ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > add then list shows a queued task [10077.15ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > exactly one claimer wins, including parallel attempts [10083.52ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > replays done, failed, and retry transitions [10086.84ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > cancels queued tasks and returns an error result for claimed tasks [10075.59ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > picks queued tasks FIFO, honoring the agent constraint [10084.01ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > caps retries: requeue below the cap, terminal failed at it [10085.99ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > settles a claimed task to done and blocks any later claim [10081.75ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > exactly one of two racing claimers wins [10077.73ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > rejects an unscoped task at enqueue [10068.40ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) queue > a malformed null-workspace row is skipped at claim, never dispatched [10087.24ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) review plumbing > lists only done worktree agents with commits ahead [11176.96ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [11972.79ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) review plumbing > approve merges and removes the worktree and branch [11311.03ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) store hardening > stores hostile values as data and preserves origin workspace selection [10088.89ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) store hardening > a fresh store creates the full current schema with WAL enabled [10083.22ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) store hardening > a steal updates ownership only when the observed owner still matches [10074.61ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) store hardening > the conditional claim is exactly once [10084.41ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [10618.53ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [10088.76ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [10086.87ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [10088.32ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [10093.09ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) spawn limits > doctor accepts satisfiable limits [10111.06ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [10071.39ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [10096.34ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [3.02ms]
(fail) workspace policy > 2.7 status displays the reported workspace identity field [10076.93ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [10071.53ms]
  ^ a beforeEach/afterEach hook timed out for this test.

 517 pass
 5 skip
 110 fail
 2302 expect() calls
Ran 632 tests across 99 files. [1180.16s]
