bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.31ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [2.49ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [5.30ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [3.39ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [61.08ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.01ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.19ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.07ms]
(pass) PiAdapter > reads state from the presence status through store helpers [13.16ms]
(pass) PiAdapter > appends a steer message to the presence inbox [12.06ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [24.35ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [14.25ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.39ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [24.82ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [12.45ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [65.32ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [91.12ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [74.19ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [75.38ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.15ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [50.13ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [35.38ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [66.36ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [37.12ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [33.28ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [5.04ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [3.97ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.25ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [260.70ms]
(pass) HerdrBackend > orch launches its own command line; herdr never picks the executable [250.35ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [264.41ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [252.61ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [252.77ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.19ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [264.03ms]
(pass) HerdrBackend > a pane split off the caller's own pane is moved into the fleet's tab [264.61ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.07ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.06ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.10ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.10ms]
(pass) HerdrBackend > deliver submits with agent prompt, not the removed agent send [0.04ms]
(pass) HerdrBackend > a run payload still goes through pane run [0.01ms]
(pass) HerdrBackend > waitAgentStatus uses agent wait --until, not the removed top-level wait [0.04ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.20ms]
(pass) TmuxBackend > reports tmux availability [8.02ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.15ms]
(pass) TmuxBackend > reflects the TMUX environment [0.12ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.06ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.52ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.11ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [1.72ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.14ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [255.20ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.22ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.20ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.19ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.30ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.07ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.25ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.07ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.33ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.10ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.22ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [72.33ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [67.73ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [63.96ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [57.14ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [9.84ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [57.99ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [55.56ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [61.94ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [57.84ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [72.11ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [57.89ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [60.29ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [62.90ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [63.85ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [60.23ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [64.79ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [65.08ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [65.77ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [64.52ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [65.07ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [140.26ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.18ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.14ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.26ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.03ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [3.54ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.05ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.64ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.08ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.08ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [0.79ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.04ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.15ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.16ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.06ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.06ms]
(pass) Claude adapter > detects state from a live presence status [7.53ms]
(pass) Claude adapter > extracts result.json before transcript and native output [2.25ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [1.61ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [38.41ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [145.44ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [27.66ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [29.52ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [46.02ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [46.37ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [49.36ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [28.97ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [27.68ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [33.57ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [1842.52ms]
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [815.03ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.22ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.08ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.15ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.06ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.18ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.09ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [7.46ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.12ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [55.22ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.48ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [94.81ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.14ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.07ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.07ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [5.05ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.04ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.06ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.07ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.01ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [2.41ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.07ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.04ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [66.52ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [91.08ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [162.11ms]
(pass) close always works > steer remains blocked by the workspace wall [57.90ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [12.85ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [0.50ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [0.31ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [8.83ms]
(pass) command lock > second acquire blocks until first releases [58.59ms]
(pass) command lock > dead-pid lock is reaped [18.64ms]
(pass) command lock > release with wrong pid refuses [8.55ms]
bun test held by agent-a (pid 22028)
(pass) command lock > matches locked command prefixes and probes settings [11.42ms]
(pass) command lock > run propagates the child exit code [19.26ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.10ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.11ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.26ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.40ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [1.10ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [66.62ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [78.70ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [64.85ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [59.62ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.14ms]
(pass) commands/control > parses --then destination and note [0.02ms]
(pass) commands/control > adds worker header unless raw [0.06ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.12ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [3.33ms]

test\commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.08ms]
(pass) commands/events > parses filters and scope flags [0.04ms]
(pass) commands/events > parses the wake-up flags [0.01ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.02ms]
(pass) commands/events > names one agent by name or by identity key [0.02ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.13ms]
(pass) commands/events > rejects malformed event and labels sinks [0.06ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.02ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.01ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.04ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.03ms]
(pass) commands/index > reads a package version string [0.13ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.16ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.03ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.18ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.04ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.02ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.06ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.02ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.04ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.01ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.05ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.02ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.12ms]
(pass) orch models --json > emits the pinned harness/model shape [0.05ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.03ms]
(pass) commands/panes > exports the pane listing command directly

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [61.22ms]
(pass) commands/queue > renders empty queues without throwing [0.10ms]
No queue tasks.

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.07ms]
(pass) commands/results > formats invalid and recent timestamps [0.11ms]
(pass) commands/results > routes a seeded result.json through the command module [75.15ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [73.08ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [74.02ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [74.92ms]
(pass) commands/results > orch session reports the pi entry count [73.36ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [78.40ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.06ms]
(pass) commands/review > falls back to branch then pane [0.02ms]

test\commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [64.96ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [78.13ms]
(pass) commands/runs > running rows render as running, not zero duration [0.16ms]
(pass) commands/runs > result falls back to durable run history after presence reap [59.48ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.10ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.23ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.09ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.12ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.04ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [0.33ms]
(pass) commands/status > marks dead presence as exited [0.07ms]
(pass) commands/status > shared status row carries presence-derived fields [0.12ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.03ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.01ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.03ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.03ms]
(pass) commands/status > formats workspace labels and warnings [0.04ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.03ms]
(pass) commands/target > extracts target and joined prompt [0.05ms]
(pass) commands/target > reads only structured result text [0.01ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.03ms]
(pass) commands/target > lists only live serialized identity presence entries [7.52ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [2.06ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [1.40ms]
(pass) config precedence > uses env over config and flag over env [1.41ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [7.49ms]
(pass) config precedence > reports a helpful validation error for invalid config [1.85ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [24.91ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [399.84ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [24.96ms]
(pass) watchConfig > stop prevents further callbacks [412.18ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.84ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [2.27ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [2.59ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [1.54ms]
(pass) loadConfig > reads the declared runtime [1.44ms]
(pass) loadConfig > parses every supported settings section [11.75ms]
(pass) loadConfig > rejects a file without the current schemaVersion [2.21ms]
(pass) loadConfig > rejects invalid JSON loudly [1.59ms]
(pass) loadConfig > names the key path for invalid fields [1.59ms]
(pass) loadConfig > rejects unknown settings keys [9.07ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [2.09ms]
(pass) loadConfig > rejects old settings keys [7.30ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [11.08ms]
(pass) loadConfig > applies every settings default when sections are absent [7.24ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [5.09ms]
(pass) loadConfig > rejects a host without dest [3.73ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [1.72ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [1.50ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.74ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.44ms]
(pass) allowedModelPatterns > returns the configured patterns when set [10.56ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [2.62ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [3.05ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [2.66ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [2.72ms]
(pass) reapUnreadableSettings > leaves a readable file alone [1.31ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [2.26ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [4.14ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [10.47ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [11.58ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [2.12ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [4.12ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [3.27ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [1.61ms]
(pass) config precedence > uses the settings.json value over the fallback [1.39ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [1.39ms]
(pass) config precedence > uses an explicit flag override over the environment [0.05ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.04ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [1.41ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [1.38ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [5.29ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [3.96ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [4.89ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [1.29ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [10.19ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [10.51ms]
(pass) deliverControl > still answers a pane awaiting an answer [10.88ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [10.39ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [61.12ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [55.94ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [3.19ms]
(pass) deliverControl > requires presence for inbox delivery [56.58ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [59.14ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [58.25ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [84.57ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [84.06ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [95.15ms]
(pass) daemon presence events > a status without a dispatch id does not write history [70.63ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [83.67ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.43ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.05ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [57.61ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [104.04ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [18.51ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [58.01ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.06ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.01ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [774.40ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [465.82ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [643.64ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [220.55ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [3.29ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [211.38ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [215.09ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         bun-repl             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       lyra                 Add a dependency to package.json (bun a)
  remove    browserify           Remove a dependency from package.json (bun rm)
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [59.14ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [215.04ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         nuxi                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  remove    @parcel/core         Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [894.24ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [693.77ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [3.29ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [7.66ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [71.12ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [70.33ms]
(pass) daemon RPC > refuses a hello that reports no session pid [11.51ms]
(pass) daemon RPC > refuses a hello without a process start time [9.59ms]
(pass) daemon RPC > issues a new identity when a pid is recycled [71.58ms]
(pass) daemon RPC > refuses a TCP hello without a token [6.68ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [8.26ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [8.84ms]
(pass) daemon RPC > returns an error for an unknown method [6.97ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [18.81ms]
(pass) daemon RPC > delivers pushed subscription events [72.71ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [344.79ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [64.98ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [711.66ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.76ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [108.29ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.62ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [5.71ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.04ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.03ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.03ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.02ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [3.20ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [139.77ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.85ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [2.20ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [134.10ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [141.40ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [386.29ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [362.70ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [358.72ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [15.84ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [15.52ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [21.03ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [12.41ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [14.51ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [15.08ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [9.98ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [8.56ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [23.92ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.30ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.86ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [362.10ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [383.05ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [367.08ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [342.95ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [288.24ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [279.50ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [281.36ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [1.62ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [1.22ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [1.08ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [1.22ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [1.17ms]
(pass) shebangRuntime > returns null for a file with no shebang [1.13ms]
(pass) shebangRuntime > returns null for an unreadable path [0.36ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.37ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.17ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.20ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [1.34ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [1.28ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [1.36ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [1.36ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.26ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.23ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.40ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [386.23ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [350.83ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [364.07ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [64.21ms]
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [62.54ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [60.42ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [363.04ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.14ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [360.38ms]
(pass) runDoctor > checks a healthy store [376.83ms]
(pass) runDoctor > warns when the store is absent [0.57ms]
(pass) runDoctor > fails when the store schema stamp is wrong [73.59ms]
(pass) runDoctor > fails and names a missing store table [70.05ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [349.98ms]
(pass) runDoctor > reports an absent daemon as optional [346.91ms]
(pass) runDoctor > reports and fixes a stale daemon lock [348.17ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [707.32ms]
(pass) runDoctor > warns when the live daemon code hash is stale [351.71ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [717.38ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [6.91ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [8.10ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [7.61ms]
(pass) runDoctor > reports a dead presence pid [356.08ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [126.02ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.57ms]
(pass) runDoctor > validates configured notifier adapters [1055.87ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-TlIAgO\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [700.18ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [698.77ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.25ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [190.38ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [255.18ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [255.60ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.59ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.89ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.03ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.42ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.06ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.05ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.04ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [6.05ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.08ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.88ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.37ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.09ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.15ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.04ms]
(pass) malformed input > rejects wrong segment count [0.16ms]
(pass) malformed input > rejects empty key [0.03ms]
(pass) malformed input > rejects empty backend or id on serialize [0.12ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.02ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.14ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.15ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.06ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.01ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [3.25ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [3.00ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.90ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.31ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.15ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.37ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [26.83ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [12.39ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.33ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.10ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.10ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.03ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.09ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.39ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [56.46ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [59.90ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [28.75ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [2.69ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [2.57ms]
(pass) notify > delivers only to sinks whose on filter matches the event [26.45ms]
(pass) notify > command sink writes the event payload as JSON on stdin [28.50ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.15ms]
(pass) notify > webhook failure is non-fatal and reports a warning [25.30ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [354.93ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1097.14ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [60.97ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [65.02ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [75.98ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [54.15ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2138.36ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [103.26ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [8.82ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [15.03ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [70.65ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [62.83ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [63.07ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [61.07ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [13.00ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [62.93ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [92.07ms]
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [74.03ms]
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [188.30ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [283.75ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [578.75ms]
(pass) fleet ownership scoping > --force allows an explicit foreign target [216.31ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [1.30ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [138.82ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [167.76ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [157.05ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [163.97ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [57.24ms]
(pass) agent ownership > allows unowned and same-owner writes [56.62ms]
(pass) agent ownership > denies foreign writes and supports stealing [58.03ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.04ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.02ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.86ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.54ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.53ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [8.71ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [70.68ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.23ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.09ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [62.00ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.85ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.55ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [3.36ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [79.13ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [64.11ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [57.31ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.81ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [66.32ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [56.19ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [61.83ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [63.86ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [55.88ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.10ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.29ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [4.51ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.76ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.19ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [9.22ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2020.57ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [21.99ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.31ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.06ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.07ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.08ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [31.96ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [28.79ms]
(pass) presence status schema > status and list report the same agent identity [80.93ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [28.72ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [28.74ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [26.96ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [28.22ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [28.85ms]
(pass) presence status schema > persists the complete spawned identity record [27.92ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [58.15ms]
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [58.29ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [60.82ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [57.88ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [55.95ms]
(pass) queue > exactly one claimer wins, including parallel attempts [65.91ms]
(pass) queue > replays done, failed, and retry transitions [73.10ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [61.96ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [63.08ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [63.12ms]
(pass) queue > settles a claimed task to done and blocks any later claim [60.73ms]
(pass) queue > exactly one of two racing claimers wins [59.93ms]
(pass) queue > rejects an unscoped task at enqueue [57.20ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [56.98ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [63.97ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [61.85ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [58.12ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [1.97ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.09ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [81.79ms]
(pass) async remote fan-out > returns a typed dead-host failure [71.35ms]
(pass) async remote fan-out > returns a typed timeout failure [513.67ms]
(pass) async remote fan-out > returns a typed non-JSON failure [76.17ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [532.19ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.10ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.06ms]

test\retention.test.ts:
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [110.78ms]
(pass) retention sweep > returns zero counts when every row is inside its window [57.03ms]
Warning: retention sweep queue failed: no such table: queue
(pass) retention sweep > continues sweeping when one table delete fails [63.91ms]
(pass) retention sweep > reaps only old dead presence dirs through clean's shared path [69.08ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [61.72ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [61.76ms]
(pass) retention sweep > does not sweep again one minute after the first tick [58.39ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [648.62ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [1179.12ms]
Preparing worktree (new branch 'orch/approve-1')
(pass) review plumbing > approve merges and removes the worktree and branch [920.98ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [668.35ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [690.77ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [71.65ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [56.84ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [62.92ms]
(pass) store hardening > the conditional claim is exactly once [60.23ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [143.73ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [73.61ms]
(pass) orch settings > --json reports env as the winning source over settings.json [70.15ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [211.78ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [74.68ms]
(pass) orch settings > a load error surfaces loudly with no partial table [65.39ms]

test\settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [10.96ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [7.97ms]
(pass) orch settings notify > remove drops only the named sink [6.24ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [5.17ms]
(pass) orch settings notify > an empty notify array lists as none configured [1.33ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [1.14ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.08ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.05ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.47ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.10ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.26ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.06ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.09ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.08ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.19ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.04ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.12ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.04ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.41ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [78.40ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [150.66ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1178.38ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [946.06ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [1201.15ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [81.85ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [70.96ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [75.37ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [3.54ms]
(pass) spawn limits > rejects invalid cap %s with file and key [2.76ms]
(pass) spawn limits > rejects invalid cap %s with file and key [6.79ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.78ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [1.54ms]
(pass) spawn limits > global boundary refusal data counts the whole request [9.50ms]
(pass) spawn limits > one workspace may use the full global allotment [2.96ms]
(pass) spawn limits > workspace cap is independent of global headroom [1.78ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [1.21ms]
(pass) spawn limits > dead pid records free capacity [1.35ms]
(pass) spawn limits > foreign panes never count [1.29ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [426.09ms]
(pass) spawn limits > doctor accepts satisfiable limits [374.22ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [54.99ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [64.25ms]
(pass) spawn name numbering > a dead agent frees its name and its index [58.93ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [60.97ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [67.61ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [71.25ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [64.83ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.37ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [59.88ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.17ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.13ms]

test\store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [57.36ms]
(pass) catalogue rows > write then read round-trips at and stdout [60.60ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [56.81ms]
(pass) catalogue rows > an entry with empty stdout is not stored [53.08ms]
(pass) catalogue rows > clearCatalogues empties the store [56.86ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [66.97ms]

test\store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [62.47ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [93.38ms]
(pass) event store rows > pruned sequence numbers are never reused [69.99ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [64.58ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [66.98ms]

test\store-identity.test.ts:
(pass) identity store rows > accepts session identity values and rejects malformed values [2.41ms]
(pass) identity store rows > reuses an identity for the same process start and replaces it after pid recycling [63.09ms]
(pass) identity store rows > deletes identities older than the cutoff [65.74ms]

test\store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [57.68ms]
(pass) outbox store rows > reports one message's pending state [60.70ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [58.56ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [65.37ms]

test\store-queue.test.ts:
(pass) queue store rows > countTasksInState returns a count per state and zero for an empty state [66.04ms]
(pass) queue store rows > selectTasksInStates returns only named states in created-at order [63.92ms]
(pass) queue store rows > deleteSettledTasksBefore removes only old settled rows and returns the number removed [72.00ms]
(pass) queue store rows > withTransaction commits every write on normal return [60.98ms]
(pass) queue store rows > withTransaction rolls back every write when the body throws [55.02ms]
(pass) queue store rows > selectQueueTask finds a claimed row without scanning settled rows [158.12ms]

test\store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [55.13ms]
(pass) run rows > upsert updates a row while preserving its original start time [60.87ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [61.24ms]
(pass) run rows > omits absent optional fields instead of returning null [57.85ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [64.06ms]
(pass) run rows > stays readable after the agent presence directory is deleted [87.12ms]

test\store-spawned.test.ts:
(pass) spawned and ownership store rows > ownership table has no workspace column [57.13ms]
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner in one query [140.36ms]
(pass) spawned and ownership store rows > writeSpawnedName updates an existing pane and reports missing panes [57.63ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [63.01ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [63.01ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [63.99ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [62.29ms]

test\store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.04ms]
(pass) store row values > sets only non-null fields [0.03ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.07ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.05ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.03ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.02ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.06ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.02ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.03ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.14ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.03ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.02ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.02ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.28ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.12ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.02ms]
(pass) assistantText > reads role-tagged records
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message
(pass) assistantText > undefined for non-assistant roles
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.01ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [6.12ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.10ms]
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [81.75ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [64.60ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [68.00ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [107.58ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.09ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.03ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.02ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox
(pass) worker prompt capability composition > events strip both worker header variants [54.11ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.10ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.01ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [63.34ms]
(pass) workspace policy > resolves workspace names through records and functions [0.18ms]
(pass) workspace policy > compares serialized keys by their workspace [65.70ms]
(pass) workspace policy > enforces the workspace wall [65.97ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [58.06ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.59ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [72.17ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [67.68ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > reads workspace ids from the spawned registry [1.51ms]
(pass) workspace helpers > derives an entity workspace from the registry [0.28ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [6.22ms]
(pass) workspace wall writes > allows a write within the same workspace [0.20ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.11ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.54ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.08ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.07ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.07ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.03ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.04ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [245.26ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [399.14ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [260.20ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [23.21ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle

 781 pass
 1 skip
 0 fail
 4045 expect() calls
Ran 782 tests across 116 files. [57.48s]
