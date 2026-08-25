bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.39ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.02ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.13ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.08ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.84ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [14.41ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [12.20ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.26ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.02ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.23ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.07ms]
(pass) PiAdapter > reads state from the presence status through store helpers [11.58ms]
(pass) PiAdapter > appends a steer message to the presence inbox [10.13ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [22.75ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [21.68ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.34ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [20.79ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [12.06ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-yuvoyJ (EBUSY persisted past deadline)
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [2062.82ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-WsfqNF (EBUSY persisted past deadline)
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [2084.08ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [10.45ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-answer-bnwuOz (EBUSY persisted past deadline)
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [2057.61ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.18ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [0.29ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [37.63ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [76.18ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [38.20ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [34.21ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [14.80ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [13.13ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.67ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.29ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.08ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.18ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.06ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.04ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.10ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.10ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.13ms]
(pass) TmuxBackend > reports tmux availability [3.97ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.09ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.07ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.52ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.13ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [11.49ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.46ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [65.05ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.65ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.30ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.20ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.53ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.10ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.22ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.07ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.25ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.09ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.17ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-WSFy3Z (EBUSY persisted past deadline)
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [2052.32ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-Satdug (EBUSY persisted past deadline)
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [2057.35ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-hardening-7ONUGi (EBUSY persisted past deadline)
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [2061.63ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.26ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [11.37ms]

test\broker-governance.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-ouYB5f (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [2049.29ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-9ZbKR2 (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [2054.85ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-IpI31j (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > owner may write to its own agent [2064.28ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-5zWnWg (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [2056.39ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-cvKLjM (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [2056.79ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-vyTH1J (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [2056.21ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-ZeOkT3 (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [2055.44ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-tusFpA (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [2062.41ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-l7nhjk (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [2063.65ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-gov-oQTtOE (EBUSY persisted past deadline)
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [2052.36ms]

test\broker-ownership.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-ownership-KyKe4t (EBUSY persisted past deadline)
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [2072.23ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.25ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-ownership-D0X8vX (EBUSY persisted past deadline)
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [2066.77ms]

test\broker-routing.test.ts:
62 |     seedAgent(orchDir);
63 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
64 | 
65 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
66 | 
67 |     expect(result.status).not.toBe(0);
                                   ^
error: expect(received).not.toBe(expected)

Expected: not 0

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:67:31)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-routing-51JfQC (EBUSY persisted past deadline)
(fail) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [2288.91ms]
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [133.17ms]
85 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
86 | 
87 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
88 |     const output = `${result.stdout}\n${result.stderr}`;
89 | 
90 |     expect(result.status).not.toBe(0);
                                   ^
error: expect(received).not.toBe(expected)

Expected: not 0

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:90:31)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-broker-routing-IF7cVb (EBUSY persisted past deadline)
(fail) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [2242.83ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.15ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.64ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.15ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.44ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.62ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.14ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.04ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [8.31ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.18ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.03ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.62ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.34ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.11ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.22ms]
(pass) Claude adapter > detects state from a live presence status [15.90ms]
(pass) Claude adapter > extracts result.json before transcript and native output [15.43ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [16.15ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [104.75ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [371.86ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [58.36ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [69.64ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [95.43ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [79.86ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [81.59ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [56.35ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [51.01ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [57.74ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [2286.67ms]
Preparing worktree (new branch 'orch/discard')
fatal: 'refs/heads/orch/discard' - not a valid ref
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1166.53ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.34ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.14ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.13ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.10ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.35ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.15ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [16.99ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.44ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [36.17ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.53ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [122.38ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.25ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.11ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.17ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [11.46ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.15ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.12ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.20ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.07ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [5.85ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.22ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.26ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.35ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-close-always-F7aDXu (EBUSY persisted past deadline)
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [2109.76ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-close-always-cQNLIb (EBUSY persisted past deadline)
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [2198.29ms]
(pass) close always works > steer remains blocked by the workspace wall [0.20ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [19.14ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [1.54ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.79ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [12.53ms]
(pass) command lock > second acquire blocks until first releases [63.30ms]
(pass) command lock > dead-pid lock is reaped [28.30ms]
(pass) command lock > release with wrong pid refuses [15.19ms]
bun test held by agent-a (pid 31904)
(pass) command lock > matches locked command prefixes and probes settings [25.51ms]
(pass) command lock > run propagates the child exit code [26.48ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.17ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.17ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.37ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [8.91ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [10.85ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [134.42ms]

test\command-workspace-fields.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-workspace-jh36Eh (EBUSY persisted past deadline)
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [2067.13ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-workspace-2jKkcH (EBUSY persisted past deadline)
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [2074.89ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [19.68ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.18ms]
(pass) commands/control > parses --then destination and note [0.04ms]
(pass) commands/control > adds worker header unless raw [0.09ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.17ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [32.87ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [0.33ms]
(pass) commands/events > parses the wake-up flags [0.06ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.35ms]
(pass) commands/events > rejects malformed event and labels sinks [0.18ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.06ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.09ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.04ms]
(pass) commands/index > reads a package version string [0.20ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.37ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.10ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.41ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.09ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.04ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.04ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.06ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.02ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.09ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.04ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.27ms]
(pass) orch models --json > emits the pinned harness/model shape [0.07ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.07ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test\commands-queue.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-queue-vbdG1D (EBUSY persisted past deadline)
(pass) commands/queue > round-trips add/list/cancel on an isolated store [2059.12ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.26ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [2.70ms]
(pass) commands/results > formats invalid and recent timestamps [0.19ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-result-3Mt3T3 (EBUSY persisted past deadline)
(pass) commands/results > routes a seeded result.json through the command module [2078.73ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-tail-ws8tvT (EBUSY persisted past deadline)
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [2080.26ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-YiRBJL (EBUSY persisted past deadline)
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [2081.37ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-TBRyWz (EBUSY persisted past deadline)
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [2082.10ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-pitail-nxbbpm (EBUSY persisted past deadline)
(pass) commands/results > orch session reports the pi entry count [2083.87ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-command-session-ThlE9p (EBUSY persisted past deadline)
(pass) commands/results > orch session shows zero entries for an adapter view without them [2079.37ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.09ms]
(pass) commands/review > falls back to branch then pane [0.04ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.18ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.53ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.18ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.29ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.12ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.78ms]
(pass) commands/status > marks dead presence as exited [0.22ms]
(pass) commands/status > shared status row carries presence-derived fields [0.30ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.15ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.13ms]
(pass) commands/status > formats workspace labels and warnings [0.12ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.05ms]
(pass) commands/target > extracts target and joined prompt [0.07ms]
(pass) commands/target > reads only structured result text [0.02ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.08ms]
(pass) commands/target > lists only live serialized identity presence entries [13.66ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [11.64ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [25.13ms]
(pass) config precedence > uses env over config and flag over env [3.88ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [18.06ms]
(pass) config precedence > reports a helpful validation error for invalid config [12.40ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [48.26ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [400.59ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [27.10ms]
(pass) watchConfig > stop prevents further callbacks [414.10ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.51ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [13.58ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [10.80ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [13.86ms]
(pass) loadConfig > reads the declared runtime [10.76ms]
(pass) loadConfig > parses every supported settings section [16.40ms]
(pass) loadConfig > rejects a file without the current schemaVersion [11.08ms]
(pass) loadConfig > rejects invalid JSON loudly [2.91ms]
(pass) loadConfig > names the key path for invalid fields [12.35ms]
(pass) loadConfig > rejects unknown settings keys [13.75ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [13.33ms]
(pass) loadConfig > rejects old settings keys [44.92ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [23.15ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [4.04ms]
(pass) loadConfig > rejects a host without dest [15.42ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [13.21ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [12.06ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [1.96ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [1.80ms]
(pass) allowedModelPatterns > returns the configured patterns when set [11.08ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [13.51ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [6.41ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [11.26ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [6.51ms]
(pass) reapUnreadableSettings > leaves a readable file alone [3.60ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [12.97ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [36.82ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [23.61ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [25.08ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.74ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [19.18ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [3.87ms]
(pass) config precedence > uses the settings.json value over the fallback [4.13ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [3.21ms]
(pass) config precedence > uses an explicit flag override over the environment [0.14ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.11ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.10ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [11.70ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [12.44ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [49.96ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [30.67ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [38.66ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [14.61ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [17.55ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-uEDt8N (EBUSY persisted past deadline)
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [2057.30ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-Yo3xCz (EBUSY persisted past deadline)
(pass) deliverControl > fails when claude keys fallback cannot deliver [2071.26ms]
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(pass) deliverControl > fails unsupported steer and setModel capabilities [7.40ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-hw97nk (EBUSY persisted past deadline)
(pass) deliverControl > requires presence for inbox delivery [2056.31ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-Ib7jT9 (EBUSY persisted past deadline)
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [2060.39ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-control-dispatch-bWNvqM (EBUSY persisted past deadline)
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [2058.63ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [32.86ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.54ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.29ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.14ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.19ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [47.23ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [20.29ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [61.59ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.07ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [928.13ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [459.58ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [684.05ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [238.86ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [5.77ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [219.46ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [229.21ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         vite                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       lyra                 Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    @remix-run/dev       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @evan/duckdb         Display package metadata from the registry
  why       @zarfjs/zarf         Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [66.66ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [225.37ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         next                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @zarfjs/zarf         Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
  update    zod                  Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      tailwindcss          Display package metadata from the registry
  why       elysia               Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [937.15ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [719.33ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [16.74ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [13.57ms]
(pass) daemon RPC > returns an error for an unknown method [10.59ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [20.98ms]
(pass) daemon RPC > delivers pushed subscription events [15.49ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [463.41ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.04ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [111.12ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [2.73ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [9.51ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.09ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.07ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.05ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.04ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [13.05ms]

test\doctor-checks.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-2vuBFU (EBUSY persisted past deadline)
(pass) doctor notification-sink checks > reports no sinks as healthy [2298.17ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [14.99ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-VlvWJQ (EBUSY persisted past deadline)
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [2096.08ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-checks-CydpDG (EBUSY persisted past deadline)
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [2086.67ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [39.30ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [29.90ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [40.11ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [37.44ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [27.65ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [22.95ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [22.43ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [22.86ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [44.39ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.55ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [12.22ms]

test\doctor-hosts.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-2Vc5dv (EBUSY persisted past deadline)
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [2127.33ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-QiEjQq (EBUSY persisted past deadline)
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [2114.81ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-xESmlW (EBUSY persisted past deadline)
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [2090.41ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hosts-hyjzDq (EBUSY persisted past deadline)
(pass) doctor remote host checks > reports no remote hosts configured as healthy [2077.54ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [11.04ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [19.21ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [9.51ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [11.89ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [12.23ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [13.68ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [13.46ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [11.37ms]
(pass) shebangRuntime > returns null for a file with no shebang [17.28ms]
(pass) shebangRuntime > returns null for an unreadable path [2.07ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.11ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [3.20ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [2.59ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.77ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [1.65ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [1.67ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [1.44ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [1.40ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [2.79ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [3.34ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.93ms]

test\doctor-stale-presence.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-SUdBoC (EBUSY persisted past deadline)
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [2086.29ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-vf7B83 (EBUSY persisted past deadline)
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [2101.33ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-stale-KdlELo (EBUSY persisted past deadline)
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [2082.05ms]

test\doctor-unscoped-tasks.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-JbOCTY (EBUSY persisted past deadline)
(pass) doctor unscoped queue tasks > only scoped tasks pass [2058.50ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-8ssdqZ (EBUSY persisted past deadline)
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [2091.73ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-SoTz3C (EBUSY persisted past deadline)
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [2080.62ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-unscoped-IKsHDR (EBUSY persisted past deadline)
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [2110.51ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.17ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-umDx58 (EBUSY persisted past deadline)
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [2074.42ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-QgGlBk (EBUSY persisted past deadline)
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2080.33ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-gmVu7L (EBUSY persisted past deadline)
(pass) runDoctor > reports an absent daemon as optional [2083.53ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-KFfcxK (EBUSY persisted past deadline)
(pass) runDoctor > reports and fixes a stale daemon lock [2082.35ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-Eq2UmE (EBUSY persisted past deadline)
(pass) runDoctor > accepts a live daemon and an answerable socket [2147.94ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-yxJYTA (EBUSY persisted past deadline)
(pass) runDoctor > warns when the live daemon code hash is stale [2079.01ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-dRGCPF (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-v0O4UQ (EBUSY persisted past deadline)
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [4154.62ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.50ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [2.16ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [2.52ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-qYG3wS (EBUSY persisted past deadline)
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [2098.43ms]
197 |     const directory = tempDir();
198 |     const previousPath = process.env.PATH;
199 |     try {
200 |       process.env.PATH = path.join(directory, "empty-bin");
201 |       const bins = check(await runDoctor(directory), "bins");
202 |       expect(bins).toMatchObject({ status: "ok", detail: "no adapters enabled" });
                         ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": "no adapters enabled",
+   "detail": "no adapters installed",
+   "id": "bins",
+   "label": "Required binaries",
    "status": "ok",
  }

- Expected  - 1
+ Received  + 3

      at <anonymous> (C:\dev\personal\orch\test\doctor.test.ts:202:20)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-XUlgla (EBUSY persisted past deadline)
(fail) runDoctor > bins check is driven by the enabled set and offers no fix [2067.67ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [16.34ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-IJ84Ml (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-4KPN0M (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-hs3oH0 (EBUSY persisted past deadline)
(fail) runDoctor > validates configured notifier adapters [6293.67ms]
  ^ a beforeEach/afterEach hook timed out for this test.
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-EXyJFs\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-5n2eN1 (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-EXyJFs (EBUSY persisted past deadline)
(pass) runDoctor > reports invalid config and accepts missing config [4146.50ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-G22wYG (EBUSY persisted past deadline)
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-doctor-t7THdW (EBUSY persisted past deadline)
(pass) runDoctor > never throws when individual checks encounter broken inputs [4151.43ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.30ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-event-identity-Vw7zqA (EBUSY persisted past deadline)
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [2182.08ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [1.69ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.05ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.17ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.09ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.01ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.15ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.02ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.01ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.01ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [6.78ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.16ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [41.61ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.54ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.14ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.12ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.06ms]
(pass) malformed input > rejects wrong segment count [0.17ms]
(pass) malformed input > rejects empty key [0.03ms]
(pass) malformed input > rejects empty backend or id on serialize [0.05ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.04ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.12ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.19ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.11ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [3.09ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [8.34ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [1.67ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.30ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.13ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.30ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [29.82ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [6.87ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.38ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.09ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.15ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.08ms]
69 |       const delivered = await deliverToSink({ type: "webhook", on: ["done"], url: "https://example.test/hook" }, event());
70 |       expect(delivered).toBe(true);
71 |     } finally {
72 |       globalThis.fetch = originalFetch;
73 |     }
74 |     expect(JSON.parse(body)).toEqual({
                                  ^
error: expect(received).toEqual(expected)

  {
    "agent": "w-2",
    "body": 
  "DONE [w6] w-2: build the thing
  Workspace: w6 (#2563eb)
  Task: build the thing"
  ,
    "cost": null,
    "host": null,
    "key": "herdr~w6~p21",
    "lastError": null,
    "model": null,
+   "name": null,
    "newState": "done",
    "oldState": "working",
    "seq": null,
    "tab": null,
    "task": "build the thing",
    "title": "DONE [w6] w-2: build the thing",
    "ts": "2026-01-01T00:00:00.000Z",
    "workspace": "w6",
    "workspaceColor": "#2563eb",
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\test\notify-events-format.test.ts:74:30)
(fail) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.68ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.35ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.07ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [31.12ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [11.65ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [12.47ms]
(pass) notify > delivers only to sinks whose on filter matches the event [26.60ms]
124 |     };
125 | 
126 |     expect(await deliverToSink(sink, event)).toBe(true);
127 |     await waitForFile(output);
128 | 
129 |     expect(JSON.parse(readFileSync(output, "utf8"))).toEqual({
                                                           ^
error: expect(received).toEqual(expected)

  {
    "agent": "worker",
    "body": 
  "ERROR [task-1] worker: boom
  Workspace: task-1 (#db2777)
  Tab: workers
  Model: terra:medium
  Task: run tests
  Cost: $1.25"
  ,
    "cost": 1.25,
    "host": "gpu1",
    "key": "task-1",
    "lastError": "boom",
    "model": "terra:medium",
+   "name": null,
    "newState": "error",
    "oldState": "working",
    "seq": null,
    "tab": "workers",
    "task": "run tests",
    "title": "ERROR [task-1] worker: boom",
    "ts": "2026-01-01T00:00:00.000Z",
    "workspace": "task-1",
    "workspaceColor": "#db2777",
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\test\notify.test.ts:129:54)
(fail) notify > command sink writes the event payload as JSON on stdin [30.45ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.20ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.13ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [283.96ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1021.83ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.12ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [0.32ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [28.33ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [5.43ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [14.84ms]

test\outbox-replay.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-replay-TxHMyg (EBUSY persisted past deadline)
(pass) outbox restart replay > replays failed messages after restart without duplicates [2058.24ms]

test\outbox.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-UZsbVb (EBUSY persisted past deadline)
(pass) outbox delivery > selects pending messages and delivers each message once [2064.39ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-outbox-8Euuxq (EBUSY persisted past deadline)
(pass) outbox delivery > keeps failed messages pending until their backoff expires [2062.83ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [10.46ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-wnkM5M (EBUSY persisted past deadline)
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [2052.61ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [86.63ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-X6sTzA (EBUSY persisted past deadline)
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [2072.43ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-5YyWgy (EBUSY persisted past deadline)
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [2185.55ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-54TMsg (EBUSY persisted past deadline)
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [2257.23ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-xlySx7 (EBUSY persisted past deadline)
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [2580.87ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-wv0sj4 (EBUSY persisted past deadline)
(pass) fleet ownership scoping > --force allows an explicit foreign target [2181.04ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [0.25ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-yQJsZF (EBUSY persisted past deadline)
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [2132.74ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-tSu5J4 (EBUSY persisted past deadline)
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [2185.77ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-LpFwy1 (EBUSY persisted past deadline)
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [2175.16ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-owner-scope-jOiopv (EBUSY persisted past deadline)
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [2181.93ms]

test\ownership.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-TeqQ2S (EBUSY persisted past deadline)
(pass) agent ownership > round-trips an owner [2054.83ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-zGpQDx (EBUSY persisted past deadline)
(pass) agent ownership > allows unowned and same-owner writes [2056.34ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-ownership-DMADhy (EBUSY persisted past deadline)
(pass) agent ownership > denies foreign writes and supports stealing [2048.39ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.05ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.05ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.02ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [1.11ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.54ms]
(pass) spawner identity > a Claude Code session exporting its session id gets a per-session key [0.47ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [10.81ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-peer-identity-BYQJOV (EBUSY persisted past deadline)
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [2061.12ms]
(pass) spawner identity > agentIdentityEnv stamps the name and falls back to the owner token as address [0.47ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.23ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-peer-identity-XHE2uy (EBUSY persisted past deadline)
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [2049.06ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [31.40ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [9.13ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [10.30ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.59ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [10.86ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [2.49ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [2.23ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [9.95ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [3.98ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.08ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.01ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.03ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.28ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [4.07ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.93ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.09ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [10.59ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2017.49ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [10.84ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.14ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [32.63ms]
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [29.08ms]
(pass) presence status schema > status and list report the same agent identity [70.00ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [28.62ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [28.21ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [28.20ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [29.03ms]
(pass) presence status schema > persists the complete spawned identity record [29.60ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-presence-schema-P0YQNX (EBUSY persisted past deadline)

test\queue-workspace-replay.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-Ud4v00 (EBUSY persisted past deadline)
(pass) queue workspace replay > persists workspace through append-only replay [2059.68ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-ghi0vk (EBUSY persisted past deadline)
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [2075.93ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-Q6mWK5 (EBUSY persisted past deadline)
(pass) queue workspace replay > replays separate workspace values for multiple tasks [2053.30ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-workspace-XfhmCx (EBUSY persisted past deadline)
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [2092.90ms]

test\queue.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-Zfgr4G (EBUSY persisted past deadline)
(pass) queue > add then list shows a queued task [2048.90ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-TlLctT (EBUSY persisted past deadline)
(pass) queue > exactly one claimer wins, including parallel attempts [2063.23ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-mYWhtm (EBUSY persisted past deadline)
(pass) queue > replays done, failed, and retry transitions [2070.57ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-oSMWoV (EBUSY persisted past deadline)
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [2056.08ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-Kxl8rB (EBUSY persisted past deadline)
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [2061.27ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-JlP1CR (EBUSY persisted past deadline)
(pass) queue > caps retries: requeue below the cap, terminal failed at it [2061.21ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-Q61Cbt (EBUSY persisted past deadline)
(pass) queue > settles a claimed task to done and blocks any later claim [2061.00ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-HMoZBd (EBUSY persisted past deadline)
(pass) queue > exactly one of two racing claimers wins [2058.46ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-CbeU2L (EBUSY persisted past deadline)
(pass) queue > rejects an unscoped task at enqueue [2057.67ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-dNGf8K (EBUSY persisted past deadline)
(pass) queue > a claim stamps the dispatch id the settle path verifies against [2062.92ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-nZ0LTf (EBUSY persisted past deadline)
(pass) queue > a once-claimed task is only ever offered back to its own agent [2055.45ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-eSy2AQ (EBUSY persisted past deadline)
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [2068.47ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-queue-4dcgSt (EBUSY persisted past deadline)
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [2108.53ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.06ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.01ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.03ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [115.39ms]
(pass) async remote fan-out > returns a typed dead-host failure [72.24ms]
(pass) async remote fan-out > returns a typed timeout failure [514.13ms]
(pass) async remote fan-out > returns a typed non-JSON failure [69.03ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [534.00ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.08ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.04ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-cLGZwa (EBUSY persisted past deadline)
(pass) review plumbing > lists only done worktree agents with commits ahead [2854.89ms]
Preparing worktree (new branch 'orch/iterate-1')
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-cBM3Hd (EBUSY persisted past deadline)
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [3460.05ms]
Preparing worktree (new branch 'orch/approve-1')
fatal: 'refs/heads/orch/approve-1' - not a valid ref
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-review-dir-Ov5VPj (EBUSY persisted past deadline)
(pass) review plumbing > approve merges and removes the worktree and branch [3005.07ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [945.97ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [822.59ms]

test\routing-hardening.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-store-Ubgp0x (EBUSY persisted past deadline)
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [2047.68ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-schema-DLBS7f (EBUSY persisted past deadline)
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [2063.90ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-owner-fsqh8l (EBUSY persisted past deadline)
(pass) store hardening > a steal updates ownership only when the observed owner still matches [2054.15ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-routing-claim-9CAxJZ (EBUSY persisted past deadline)
(pass) store hardening > the conditional claim is exactly once [2059.31ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [130.84ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [83.44ms]
(pass) orch settings > --json reports env as the winning source over settings.json [80.24ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-T3s3KW\settings.json: defaults.adapter: "codex" is not an enabled adapter - enabled: pi, claude; re-run orch setup
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [244.64ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [87.81ms]
C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-XusA4N\config.toml: legacy config.toml detected - settings now live in C:\Users\Bryan\AppData\Local\Temp\orch-settings-cmd-XusA4N\settings.json; re-run orch setup (the old values are not read)
(pass) orch settings > a load error surfaces loudly with no partial table [75.70ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [1.61ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.14ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [8.87ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.24ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.38ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.09ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.11ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.09ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.24ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.05ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.15ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.04ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.56ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [75.35ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [117.81ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1164.18ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-skew-guard-Lc5Ro9 (EBUSY persisted past deadline)
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [2604.09ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1308.80ms]

test\spawn-identity.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-Ra7LST (EBUSY persisted past deadline)
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [2062.62ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-EvX7vS (EBUSY persisted past deadline)
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [2092.30ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-identity-8T8wEB (EBUSY persisted past deadline)
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [2086.84ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [11.00ms]
(pass) spawn limits > rejects invalid cap %s with file and key [11.70ms]
(pass) spawn limits > rejects invalid cap %s with file and key [9.07ms]
(pass) spawn limits > rejects invalid cap %s with file and key [10.26ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [2.01ms]
(pass) spawn limits > global boundary refusal data counts the whole request [13.43ms]
(pass) spawn limits > one workspace may use the full global allotment [2.96ms]
(pass) spawn limits > workspace cap is independent of global headroom [2.22ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [1.54ms]
(pass) spawn limits > dead pid records free capacity [1.78ms]
(pass) spawn limits > foreign panes never count [2.02ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-limits-das0e8 (EBUSY persisted past deadline)
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [2083.33ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-limits-jL5Xfb (EBUSY persisted past deadline)
(pass) spawn limits > doctor accepts satisfiable limits [2092.38ms]

test\spawn-names.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-names-I76Q67 (EBUSY persisted past deadline)
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [2050.51ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-names-YpWmVE (EBUSY persisted past deadline)
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [2067.98ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-names-O95WKD (EBUSY persisted past deadline)
(pass) spawn name numbering > a dead agent frees its name and its index [2061.83ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-names-8GQKik (EBUSY persisted past deadline)
(pass) spawn name numbering > another workspace's fleet never affects numbering [2056.29ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-spawn-names-WfusNc (EBUSY persisted past deadline)
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [2054.13ms]

test\spawn-preferred-models.test.ts:
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-preferred-models-WQDPiL (EBUSY persisted past deadline)
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [2062.93ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-preferred-models-N5mc0Q (EBUSY persisted past deadline)
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [2074.53ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [1.06ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [206.99ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.21ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.18ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [1.96ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.07ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.03ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.02ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.08ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.03ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.02ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.19ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.04ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.02ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.02ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.60ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.18ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.04ms]
(pass) assistantText > reads role-tagged records [0.01ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message
(pass) assistantText > undefined for non-assistant roles
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.02ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [7.09ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.12ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-work-loop-binding-6zqL7m (EBUSY persisted past deadline)
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [2076.80ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-work-loop-binding-ecepCs (EBUSY persisted past deadline)
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [2065.06ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-work-loop-binding-QNDxV6 (EBUSY persisted past deadline)
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [2069.31ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [304.05ms]

test\worker-prompt.test.ts:
(skip) worker prompt capability composition > work loop gives codex the base header without orch_ask
(skip) worker prompt capability composition > work loop gives pi the orch_ask header clause
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.09ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.03ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.01ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.24ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.07ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.01ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.10ms]
(pass) workspace policy > resolves workspace names through records and functions [0.05ms]
(pass) workspace policy > compares serialized keys by their workspace [0.04ms]
(pass) workspace policy > enforces the workspace wall [0.05ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.03ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.01ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-workspace-policy-g9h9LM (EBUSY persisted past deadline)
(pass) workspace policy > 2.7 status displays the reported workspace identity field [2059.16ms]
removeTempDir: leaking C:\Users\Bryan\AppData\Local\Temp\orch-workspace-policy-RmGOh8 (EBUSY persisted past deadline)
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [2050.51ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [1.15ms]
(pass) workspace helpers > derives an entity workspace from the identity key [2.90ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [6.00ms]
(pass) workspace wall writes > allows a write within the same workspace [0.06ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.03ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.10ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.01ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.02ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.07ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.03ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.03ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [442.64ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [603.98ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [437.03ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [25.52ms]

5 tests skipped:
(skip) claude-hooks shim tests need the dist bundle
(skip) deliverControl > executes codex steer command and accepts exit zero
(skip) deliverControl > treats a nonzero codex command exit as failure
(skip) worker prompt capability composition > work loop gives codex the base header without orch_ask
(skip) worker prompt capability composition > work loop gives pi the orch_ask header clause


6 tests failed:
(fail) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [2288.91ms]
(fail) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [2242.83ms]
(fail) runDoctor > bins check is driven by the enabled set and offers no fix [2067.67ms]
(fail) runDoctor > validates configured notifier adapters [6293.67ms]
  ^ a beforeEach/afterEach hook timed out for this test.
(fail) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.68ms]
(fail) notify > command sink writes the event payload as JSON on stdin [30.45ms]

 660 pass
 5 skip
 6 fail
 2398 expect() calls
Ran 671 tests across 105 files. [299.55s]
