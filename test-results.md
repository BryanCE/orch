$ bun test --parallel
bun test v1.4.0 (34cbb9a40) 24x PARALLEL

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.30ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.04ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.10ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [2.04ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [6.23ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [18.42ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.21ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [16.01ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [1.66ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.12ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [29.93ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.43ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.19ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.45ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [36.32ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [33.74ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.64ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [3.59ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.46ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.06ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.04ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [14.35ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.07ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [40.94ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [147.02ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [4.53ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.36ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.49ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [29.40ms]

test\notifier-adapters.test.ts:
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [5.54ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.58ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [8.38ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.56ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [52.23ms]

test\commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.14ms]
(pass) commands/events > parses filters and scope flags [0.09ms]
(pass) commands/events > parses the wake-up flags [0.02ms]
(pass) commands/events > names one agent by name or by identity key [0.04ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.79ms]
(pass) commands/events > rejects malformed event and labels sinks [0.33ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.07ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [1.30ms]

test\commands-help.test.ts:
(pass) per-command help topics > aliases resolve to their command's topic [0.04ms]
(pass) per-command help topics > an unknown name has no topic [0.02ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.09ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.30ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.13ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [6.34ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.98ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [29.12ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.34ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.11ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.30ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.24ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.16ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.12ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.10ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.04ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [119.31ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.23ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.72ms]

test\commands-setup.test.ts:
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.68ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.25ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.32ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.24ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.29ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.20ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.16ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.17ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.10ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.38ms]
(pass) orch models --json > emits the pinned harness/model shape [0.22ms]

test\config-precedence.test.ts:
(pass) config precedence > applies defaults when config, env, and flag are absent [15.47ms]
(pass) config precedence > uses env over config and flag over env [24.64ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [30.95ms]
(pass) config precedence > reports a helpful validation error for invalid config [12.00ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [106.71ms]

test\notifier-adapters.test.ts:
notify: bad sink failed
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [39.03ms]
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.69ms]

test\outbox.test.ts:
(pass) outbox delivery > keeps failed messages pending until their backoff expires [137.74ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [132.02ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.20ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [1.99ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.16ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.06ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.20ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [25.07ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [164.13ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.24ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.59ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.22ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.83ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [3.07ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.28ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [52.32ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.65ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.05ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.06ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.04ms]
(pass) worker prompt capability composition > events strip both worker header variants [6.02ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.29ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.07ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.12ms]
(pass) commands/index > reads a package version string [0.52ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [29.77ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [4.88ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [9.34ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [6.28ms]
(pass) shebangRuntime > returns null for a file with no shebang [7.58ms]
(pass) shebangRuntime > returns null for an unreadable path [1.96ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.19ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [30.16ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [22.21ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [38.16ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [7.60ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [7.84ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [11.34ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [8.18ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [8.17ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [10.19ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [5.99ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.55ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.19ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.19ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.20ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.38ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.23ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a blocked transition drives command sink delivery [117.67ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.43ms]
(pass) commands/panes > exports the pane listing command directly [0.03ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > declares its lifecycle slash-commands [1.31ms]
(pass) PiAdapter > reads state from the presence status through store helpers [20.27ms]
(pass) PiAdapter > appends a steer message to the presence inbox [31.56ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [41.67ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [25.33ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.56ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [0.55ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [3.74ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [415.77ms]

test\setup-wizard.test.ts:
(pass) setup model picker > keeps the compact selector for small catalogues [0.48ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.27ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.10ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.36ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [1.47ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [1.27ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [4.87ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [4.83ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [263.64ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [1.93ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.29ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [50.36ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [61.84ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [4.82ms]
(pass) commands/status > marks dead presence as exited [0.20ms]
(pass) commands/status > shared status row carries presence-derived fields [0.30ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.09ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.06ms]
(pass) commands/status > formats workspace labels and warnings [0.08ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [161.78ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [64.48ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.19ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [28.30ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [212.69ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [57.46ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [280.29ms]

test\event-identity.test.ts:
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [370.95ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [67.33ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [385.59ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.66ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.54ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > returns an error for an unknown method [49.20ms]

test\commands-target.test.ts:
(pass) commands/target > extracts target and joined prompt [0.10ms]
(pass) commands/target > reads only structured result text [0.05ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.21ms]
(pass) commands/target > lists only live serialized identity presence entries [70.33ms]

test\notify-sinks.test.ts:
(pass) notify sinks > loadSinks parses command and webhook declarations [25.79ms]

test\peer-identity.test.ts:
(pass) spawner identity > a Claude Code session names itself through its env marker [2.24ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [1.21ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [24.69ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [145.88ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.37ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.25ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [119.35ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [1.93ms]
(pass) the spawner address invariant > a bare operator stamps no address [1.22ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [16.25ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [41.79ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [42.78ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [30.94ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [1.89ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.10ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.03ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > reports malformed lines and keeps the connection alive [30.16ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.22ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.11ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.33ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.07ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.05ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.03ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [5.99ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.12ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [164.35ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [161.96ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > delivers pushed subscription events [22.60ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [26.90ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [34.73ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [45.03ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [207.36ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [4.47ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [28.22ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [15.89ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.30ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [217.40ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [217.79ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the TCP fallback transport [45.13ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.27ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.13ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.09ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.06ms]
(pass) malformed input > rejects wrong segment count [0.18ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or id on serialize [0.07ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.04ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.04ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [228.72ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.35ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [217.02ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.18ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [40.52ms]

test\notify.test.ts:
(pass) notify > delivers only to sinks whose on filter matches the event [101.34ms]

test\workspace-policy.test.ts:
(pass) workspace policy > resolves workspace names through records and functions [0.19ms]
(pass) workspace policy > compares serialized keys by their workspace [0.08ms]
(pass) workspace policy > enforces the workspace wall [0.12ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.12ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.05ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [190.86ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [149.36ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [199.36ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [156.19ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [170.05ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [1.11ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [28.43ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [18.17ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [27.84ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [22.95ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.48ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.13ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.01ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.38ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.48ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.77ms]

test\config-watch.test.ts:
(pass) watchConfig > keeps the last-good config, warns once, and recovers [469.67ms]

test\notify.test.ts:
(pass) notify > command sink writes the event payload as JSON on stdin [60.80ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.44ms]

test\pi-model-control.test.ts:
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [20.93ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.56ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.15ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.13ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [26.79ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [16.75ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [10.06ms]

test\notify.test.ts:
(pass) notify > webhook failure is non-fatal and reports a warning [26.03ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [111.91ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [0.88ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.17ms]

test\config-watch.test.ts:
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [45.43ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.09ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.12ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.17ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [147.03ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > derives an entity workspace from the identity key [0.13ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [33.13ms]
(pass) workspace wall writes > allows a write within the same workspace [0.17ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.07ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.23ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.04ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.13ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.43ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.09ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [1.90ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [115.72ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [251.16ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [157.94ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [107.17ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [166.39ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [36.04ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [104.17ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > builds the interactive Claude launch command [0.57ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.64ms]
(pass) Claude adapter > detects state from a live presence status [30.37ms]
(pass) Claude adapter > extracts result.json before transcript and native output [22.78ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [16.75ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [142.70ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [430.60ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [126.29ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [70.07ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [624.31ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [18.85ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [67.30ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.22ms]
(pass) commands/control > parses --then destination and note [0.04ms]
(pass) commands/control > adds worker header unless raw [0.13ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [197.16ms]

test\presence-schema.test.ts:
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [118.27ms]
(pass) presence status schema > status and list report the same agent identity [238.55ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [76.89ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [99.25ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [56.11ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [123.49ms]
(pass) presence status schema > persists the complete spawned identity record [103.44ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [60.04ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.38ms]

test\close-always.test.ts:
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [616.27ms]
(pass) close always works > steer remains blocked by the workspace wall [0.30ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [203.96ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > reads a lock pid only from a complete lock record [27.96ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [24.73ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [23.55ms]
(pass) HeadlessBackend > never signals an unrecorded pid [2.76ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [3.65ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.47ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.19ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.28ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.31ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.05ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.14ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.12ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [148.38ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [136.60ms]

test\config-watch.test.ts:
(pass) watchConfig > stop prevents further callbacks [436.28ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [36.18ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > reports tmux availability [13.61ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.20ms]
(pass) TmuxBackend > reflects the TMUX environment [0.20ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.11ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.67ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [1.24ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [10.86ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.54ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [71.63ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.33ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.55ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.37ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.62ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.24ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.53ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.33ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.93ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.35ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed dead-host failure [261.38ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [7.25ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [44.94ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [155.16ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [1.41ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [32.34ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.26ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.35ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.20ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.14ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.10ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.07ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.20ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.09ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.07ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.43ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.10ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.04ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.86ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [1.86ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [1.37ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.22ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [75.60ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [32.83ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1068.60ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.27ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [0.96ms]

test\cmd-lock.test.ts:
(pass) command lock > second acquire blocks until first releases [81.94ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [1.34ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.07ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.15ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.05ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.05ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.19ms]

test\owner-scoping.test.ts:
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [217.93ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [267.73ms]
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [167.85ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.18ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.10ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [3.23ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.41ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.08ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [3.31ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [2.66ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [1.80ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.09ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [13.14ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.25ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.03ms]
(pass) 10.4 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [5.78ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [168.64ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [136.32ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [164.52ms]

test\cmd-lock.test.ts:
bun test held by agent-a (pid 6440)
(pass) command lock > dead-pid lock is reaped [35.58ms]
(pass) command lock > release with wrong pid refuses [19.46ms]
(pass) command lock > matches locked command prefixes and probes settings [71.52ms]
(pass) command lock > run propagates the child exit code [85.03ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [146.16ms]

test\commands-results.test.ts:
(pass) commands/results > formats invalid and recent timestamps [0.22ms]
(pass) commands/results > routes a seeded result.json through the command module [229.95ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [179.40ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [169.38ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [170.03ms]
(pass) commands/results > orch session reports the pi entry count [165.47ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [162.22ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [45.82ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.06ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.07ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.14ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.10ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.08ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [19.34ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed timeout failure [555.22ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [288.87ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [141.74ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.18ms]
(pass) commands/review > falls back to branch then pane [0.08ms]

test\claude-hooks-shim.test.ts:
malformed identity key: expected 3 segments, got 1: "garbage"
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [200.95ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [150.35ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [114.52ms]
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [81.94ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [151.11ms]
(skip) claude-hooks shim tests need the dist bundle

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.17ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.44ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [135.14ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.06ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.90ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [1.03ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.26ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.62ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [41.89ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.27ms]

test\control-dispatch.test.ts:
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [34.91ms]
(pass) deliverControl > still answers a pane awaiting an answer [27.86ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [32.15ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [119.60ms]
(pass) deliverControl > fails when claude keys fallback cannot deliver [114.53ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [17.55ms]
(pass) deliverControl > requires presence for inbox delivery [115.17ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [131.21ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [111.93ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [76.00ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.17ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.06ms]

test\config.test.ts:
(pass) loadConfig > requires a top-level runtime and never defaults it [46.66ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [11.83ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [10.62ms]
(pass) loadConfig > reads the declared runtime [18.07ms]
(pass) loadConfig > parses every supported settings section [13.15ms]
(pass) loadConfig > rejects a file without the current schemaVersion [22.45ms]
(pass) loadConfig > rejects invalid JSON loudly [10.76ms]
(pass) loadConfig > names the key path for invalid fields [17.22ms]
(pass) loadConfig > rejects unknown settings keys [5.86ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [5.71ms]
(pass) loadConfig > rejects old settings keys [25.27ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [33.89ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [19.87ms]
(pass) loadConfig > rejects a host without dest [13.15ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [7.13ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [20.16ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [4.78ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [1.46ms]
(pass) allowedModelPatterns > returns the configured patterns when set [6.56ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [22.95ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [15.28ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [17.45ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [33.85ms]
(pass) reapUnreadableSettings > leaves a readable file alone [7.72ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [32.92ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [29.68ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [14.54ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [62.70ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [8.46ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [9.83ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [8.76ms]
(pass) config precedence > uses the settings.json value over the fallback [19.33ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [6.90ms]
(pass) config precedence > uses an explicit flag override over the environment [0.29ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.20ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.12ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [7.86ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [7.33ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [57.58ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [21.02ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [59.36ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [5.99ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [136.02ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [133.16ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [113.13ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [126.92ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [129.91ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [114.20ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [138.82ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [123.30ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [134.62ms]

test\cli-backends-herdr-headless.test.ts:
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [132.76ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.94ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [154.24ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [163.23ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [388.36ms]
(pass) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [734.70ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed non-JSON failure [331.86ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [132.30ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [151.24ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1723.02ms]
(pass) daemon RPC > has a catchable absent-daemon error [2.38ms]

test\cli-backends-herdr-headless.test.ts:
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [285.55ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.32ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.11ms]

test\ownership.test.ts:
(pass) agent ownership > allows unowned and same-owner writes [133.80ms]
(pass) agent ownership > denies foreign writes and supports stealing [113.53ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > calls a slow daemon unreachable, not absent [137.38ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [19.36ms]

test\routing-hardening.test.ts:
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [133.12ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [97.42ms]
(pass) store hardening > the conditional claim is exactly once [121.65ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [86.28ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [158.71ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [78.57ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [84.81ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [62.49ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [48.61ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [73.07ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [85.93ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.97ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.65ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [2304.32ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [1863.09ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [565.44ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [153.10ms]
(pass) spawn name numbering > a dead agent frees its name and its index [134.26ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [94.58ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [88.10ms]

test\pi-model-control.test.ts:
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2049.20ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [17.88ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [1909.49ms]

test\routing-hardening.test.ts:
(pass) CLI offline routing > status --offline does not start or contact orchd [432.82ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [2926.95ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [2584.23ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports env as the winning source over settings.json [279.27ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [713.11ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [205.94ms]
(pass) orch settings > a load error surfaces loudly with no partial table [164.40ms]

test\queue.test.ts:
(pass) queue > exactly one claimer wins, including parallel attempts [138.72ms]
(pass) queue > replays done, failed, and retry transitions [188.86ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [167.08ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [129.84ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [126.06ms]
(pass) queue > settles a claimed task to done and blocks any later claim [86.13ms]
(pass) queue > exactly one of two racing claimers wins [66.02ms]
(pass) queue > rejects an unscoped task at enqueue [60.82ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [84.30ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [112.21ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [71.27ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [93.15ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [2477.25ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/feature')
Preparing worktree (new branch 'orch/remove-me')
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > detects commits ahead of a base branch [1108.31ms]
(pass) worktree primitives > removes an agent worktree [817.33ms]
(pass) worktree primitives > rejects a non-repository path with a clear error [74.59ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [625.29ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [1253.64ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1509.18ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [178.46ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [150.80ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [2558.43ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > --force allows an explicit foreign target [353.76ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [3.51ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [297.02ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [293.30ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [298.35ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [307.42ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [5459.11ms]

test\spawn-limits.test.ts:
(pass) spawn limits > rejects invalid cap %s with file and key [12.41ms]
(pass) spawn limits > rejects invalid cap %s with file and key [22.50ms]
(pass) spawn limits > rejects invalid cap %s with file and key [22.18ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [8.57ms]
(pass) spawn limits > global boundary refusal data counts the whole request [51.67ms]
(pass) spawn limits > one workspace may use the full global allotment [12.44ms]
(pass) spawn limits > workspace cap is independent of global headroom [9.75ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [7.56ms]
(pass) spawn limits > dead pid records free capacity [8.46ms]
(pass) spawn limits > foreign panes never count [7.07ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [3366.01ms]
(pass) spawn limits > doctor accepts satisfiable limits [2163.24ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [1252.34ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [1660.28ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [2242.00ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [2594.82ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [433.81ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1406.81ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [2312.09ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [2742.08ms]

test\daemon-lifecycle.test.ts:
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
  add       @remix-run/dev       Add a dependency to package.json (bun a)
  remove    underscore           Remove a dependency from package.json (bun rm)
  update    @evan/duckdb         Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @zarfjs/zarf         Display package metadata from the registry
  why       zod                  Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1368.11ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [1806.15ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [566.16ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [7.66ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [468.25ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [414.77ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [18.41ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [17.61ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [367.82ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [313.24ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [3350.46ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [2141.76ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [1132.84ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [126.33ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1610.44ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [2247.90ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [2382.27ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [957.18ms]

test\doctor.test.ts:
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [3204.06ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [2065.89ms]
(pass) runDoctor > reports an absent daemon as optional [1113.84ms]
(pass) runDoctor > reports and fixes a stale daemon lock [931.89ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/iterate-1')
Preparing worktree (new branch 'orch/approve-1')
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
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [2987.93ms]
(pass) review plumbing > approve merges and removes the worktree and branch [1807.00ms]
(pass) review plumbing > conflicting approval aborts without changing either branch [1127.69ms]
(pass) review plumbing > non-fast-forward approval creates a merge commit [1119.05ms]

test\doctor.test.ts:
(pass) runDoctor > accepts a live daemon and an answerable socket [1987.64ms]

test\daemon-lifecycle.test.ts:
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
  add       zod                  Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
  update    tailwindcss          Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      elysia               Display package metadata from the registry
  why       @shumai/shumai       Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [419.86ms]
(pass) daemon lifecycle > rejects a recycled pid identity [1431.51ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [1042.50ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [4.99ms]

test\doctor.test.ts:
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-Shod4s\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > warns when the live daemon code hash is stale [995.94ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1266.06ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.53ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [2.96ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [2.38ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [607.78ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [74.24ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [6.81ms]
(pass) runDoctor > validates configured notifier adapters [1786.08ms]
(pass) runDoctor > reports invalid config and accepts missing config [1163.14ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [1168.51ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle

 681 pass
 1 skip
 0 fail
 2439 expect() calls
Ran 682 tests across 105 files. [18.00s]
