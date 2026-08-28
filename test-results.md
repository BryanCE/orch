bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.35ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.02ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.11ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.75ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [2.35ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.73ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [5.51ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [2.71ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [41.68ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.03ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.17ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.11ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.04ms]
(pass) PiAdapter > reads state from the presence status through store helpers [12.03ms]
(pass) PiAdapter > appends a steer message to the presence inbox [10.12ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [19.68ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [11.03ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.31ms]

test\agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [0.94ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.36ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.39ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.37ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [19.48ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [9.62ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [49.92ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [74.97ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [60.03ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [56.96ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.17ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [30.98ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [31.06ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [63.00ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [41.09ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [41.71ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [5.31ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [4.36ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.09ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.49ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.07ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.05ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.02ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.04ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.02ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.07ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.14ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.05ms]
(pass) HerdrBackend > a pane split off the caller's own pane is moved into the fleet's tab [0.14ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.04ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.03ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.07ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.08ms]
(pass) HerdrBackend > pane input submits through pane run [0.02ms]
(pass) HerdrBackend > waitAgentStatus uses agent wait --until, not the removed top-level wait [0.04ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.12ms]
(pass) TmuxBackend > reports tmux availability [3.75ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.08ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.04ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.50ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.12ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [2.11ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.15ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [254.68ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.32ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.31ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.28ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.35ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.06ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.22ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.07ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.31ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.12ms]

test\bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [15.38ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [15.38ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [15.63ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.87ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [53.55ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [52.94ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [54.08ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [46.38ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [11.21ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [46.56ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [37.02ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [50.64ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [50.82ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [54.23ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [54.63ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [53.26ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [56.58ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [51.10ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [37.51ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [59.32ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [55.15ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [53.66ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [60.29ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [167.56ms]

test\build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [12.35ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.21ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.17ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.06ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.01ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.29ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.08ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [4.78ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.09ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.91ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.49ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.08ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.01ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.34ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.16ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [11.84ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.19ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.07ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.08ms]
(pass) Claude adapter > detects state from a live presence status [11.51ms]
(pass) Claude adapter > extracts result.json before transcript and native output [9.97ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [2.45ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [71.27ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [208.92ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [42.13ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [46.37ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [46.22ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [47.20ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [52.27ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [34.13ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [32.97ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [40.80ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
