$ bun test --parallel
bun test v1.4.0 (34cbb9a40) 24x PARALLEL

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.31ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.33ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [1.27ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [13.11ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.16ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [9.61ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.63ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.54ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [9.13ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.20ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.09ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [0.29ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [13.75ms]

test\commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.15ms]
(pass) commands/events > parses filters and scope flags [0.12ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > names one agent by name or by identity key [0.04ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.69ms]
(pass) commands/events > rejects malformed event and labels sinks [0.10ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.04ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.02ms]
(pass) per-command help topics > an unknown name has no topic [0.03ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.06ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [33.26ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.20ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.95ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [99.71ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [44.80ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.86ms]

test\notifier-adapters.test.ts:
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [7.65ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [2.11ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.54ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [42.00ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [13.23ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [3.98ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.39ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.43ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.18ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.07ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.01ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [23.41ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.05ms]

test\config-precedence.test.ts:
(pass) config precedence > applies defaults when config, env, and flag are absent [25.30ms]
(pass) config precedence > uses env over config and flag over env [6.18ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [18.57ms]
(pass) config precedence > reports a helpful validation error for invalid config [4.32ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [50.65ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.43ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [19.79ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [112.15ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.73ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.24ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.06ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.19ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.10ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.12ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.28ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.92ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [2.18ms]
(pass) orch models --json > emits the pinned harness/model shape [0.31ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [96.41ms]

test\notifier-adapters.test.ts:
notify: bad sink failed
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [13.50ms]
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.41ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.46ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.09ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.12ms]

test\outbox.test.ts:
(pass) outbox delivery > keeps failed messages pending until their backoff expires [100.99ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned namespaced identity with backend, workspace, handle, and adapter [94.87ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [4.94ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [19.01ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [15.66ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [5.31ms]
(pass) shebangRuntime > returns null for a file with no shebang [26.18ms]
(pass) shebangRuntime > returns null for an unreadable path [0.88ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.11ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [28.81ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [4.29ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [3.61ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [3.07ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [3.52ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [2.66ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [2.58ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [4.06ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [4.18ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.98ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [10.06ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [4.26ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [1.67ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.18ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.11ms]
(pass) commands/index > reads a package version string [0.61ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.43ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.79ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [41.46ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.40ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [79.34ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.15ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.13ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.10ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.14ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.13ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.09ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.27ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.16ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.31ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.24ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.63ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.43ms]
(pass) commands/panes > exports the pane listing command directly [0.05ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [1.29ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.30ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a blocked transition drives command sink delivery [132.38ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.51ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.32ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.10ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.05ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.05ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.03ms]
(pass) worker prompt capability composition > events strip both worker header variants [2.48ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.18ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.04ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [23.39ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [126.83ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [350.74ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.20ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.66ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.08ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.14ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [1.04ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [1.52ms]
(pass) notification and presence event formatting > derivePresenceTransition derives workspace from identity keys [0.18ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [30.59ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [42.64ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [281.84ms]

test\event-identity.test.ts:
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [255.29ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [1.16ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from serialized identity keys [1.17ms]

test\commands-status.test.ts:
(pass) commands/status > marks dead presence as exited [0.39ms]
(pass) commands/status > shared status row carries presence-derived fields [1.44ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.26ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.12ms]
(pass) commands/status > formats workspace labels and warnings [0.20ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [134.02ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.10ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.51ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.54ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.32ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.27ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.19ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [200.56ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.65ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.43ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [4.26ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [3.27ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [302.69ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.40ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.08ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.20ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.07ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.17ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.19ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [71.83ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.03ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.29ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.05ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.03ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.02ms]
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [5.77ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.16ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.18ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [57.39ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > declares its lifecycle slash-commands [0.55ms]
(pass) PiAdapter > reads state from the presence status through store helpers [18.77ms]
(pass) PiAdapter > appends a steer message to the presence inbox [26.25ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [36.78ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [36.96ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.84ms]

test\commands-target.test.ts:
(pass) commands/target > extracts target and joined prompt [0.18ms]
(pass) commands/target > reads only structured result text [0.06ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.12ms]
(pass) commands/target > lists only live serialized identity presence entries [23.12ms]

test\notify-sinks.test.ts:
(pass) notify sinks > loadSinks parses command and webhook declarations [26.84ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [41.73ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.15ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.14ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [11.99ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.08ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.17ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.07ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.03ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.01ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.20ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.06ms]
(pass) malformed input > rejects wrong segment count [0.19ms]
(pass) malformed input > rejects empty key [0.26ms]
(pass) malformed input > rejects empty backend or id on serialize [0.08ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.09ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [37.17ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [160.63ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [3.08ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [225.94ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [23.32ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the TCP fallback transport [48.33ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [22.84ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.91ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.39ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.13ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [12.41ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [8.62ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [4.78ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [162.21ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [148.10ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [187.80ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.12ms]

test\notify.test.ts:
(pass) notify > delivers only to sinks whose on filter matches the event [93.02ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [146.64ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [0.38ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [29.27ms]

test\peer-identity.test.ts:
(pass) spawner identity > a Claude Code session names itself through its env marker [3.96ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [17.19ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [23.31ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [126.37ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.29ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.18ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [167.34ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [1.70ms]
(pass) the spawner address invariant > a bare operator stamps no address [1.14ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [7.21ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [32.72ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [19.33ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [32.94ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [1.46ms]

test\config-watch.test.ts:
(pass) watchConfig > keeps the last-good config, warns once, and recovers [417.71ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [234.97ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [218.01ms]

test\workspace-policy.test.ts:
(pass) workspace policy > resolves workspace names through records and functions [0.22ms]
(pass) workspace policy > compares serialized keys by their workspace [0.09ms]
(pass) workspace policy > enforces the workspace wall [0.11ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [0.17ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.06ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [190.05ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [133.62ms]

test\config-watch.test.ts:
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [30.59ms]

test\notify.test.ts:
(pass) notify > command sink writes the event payload as JSON on stdin [86.06ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [167.94ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [137.79ms]

test\notify.test.ts:
(pass) notify > titles lead with exactly one terminal state and agent [0.65ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [199.69ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [156.91ms]

test\notify.test.ts:
(pass) notify > webhook failure is non-fatal and reports a warning [28.11ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [181.56ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > extracts workspace ids only from identity keys [0.17ms]
(pass) workspace helpers > derives an entity workspace from the identity key [0.10ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [16.74ms]
(pass) workspace wall writes > allows a write within the same workspace [0.12ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.05ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [2.88ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.06ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.04ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.26ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.10ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [1.23ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [31.89ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [38.50ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [182.26ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [186.65ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [171.11ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [198.27ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [71.60ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [1.59ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [142.68ms]

test\close-always.test.ts:
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [483.37ms]
(pass) close always works > steer remains blocked by the workspace wall [0.21ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [66.40ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [12.59ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [51.76ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [25.66ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [22.63ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.12ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [116.20ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.01ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.32ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.27ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.59ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [1.11ms]
(pass) commands/control > parses --then destination and note [0.16ms]
(pass) commands/control > adds worker header unless raw [0.19ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed dead-host failure [249.99ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > builds the interactive Claude launch command [5.63ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [1.75ms]
(pass) Claude adapter > detects state from a live presence status [18.74ms]
(pass) Claude adapter > extracts result.json before transcript and native output [38.36ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.41ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [183.55ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [406.85ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [104.82ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [96.16ms]

test\pi-model-control.test.ts:
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [34.21ms]

test\presence-schema.test.ts:
(pass) presence status schema > orch status JSON exposes the complete spawned identity fields [90.80ms]
(pass) presence status schema > status and list report the same agent identity [229.27ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same identity field set [93.04ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [75.10ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [105.35ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [96.06ms]
(pass) presence status schema > persists the complete spawned identity record [106.96ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [160.96ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.70ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [20.08ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.20ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.20ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.15ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.29ms]

test\tiling.test.ts:
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.09ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.05ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.11ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.04ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.07ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.59ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.10ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.04ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.06ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.23ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [127.94ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.32ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > reads a lock pid only from a complete lock record [34.14ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [28.45ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [160.27ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [3.19ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [1.16ms]

test\config-watch.test.ts:
(pass) watchConfig > stop prevents further callbacks [420.65ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [82.68ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [33.00ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [2.96ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [40.70ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > reports tmux availability [8.97ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.22ms]
(pass) TmuxBackend > reflects the TMUX environment [0.22ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.10ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.95ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.29ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [15.54ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.30ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [56.96ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.27ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.22ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.22ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [1.87ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.41ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.42ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.36ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [1.23ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.23ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [21.07ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.08ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.05ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.14ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.04ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [22.03ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [145.08ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [97.33ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [191.26ms]

test\cmd-lock.test.ts:
(pass) command lock > second acquire blocks until first releases [84.77ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.74ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [66.69ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [21.15ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [24.65ms]
(pass) HeadlessBackend > never signals an unrecorded pid [7.70ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.18ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.07ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.03ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.59ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.17ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.25ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.09ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.09ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.19ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.20ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1050.49ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [0.14ms]
(pass) orchd RPC replay buffer > drops the oldest events and reports a replay gap [1.31ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [1130.44ms]

test\owner-scoping.test.ts:
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [183.42ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [278.27ms]
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [205.60ms]

test\cmd-lock.test.ts:
bun test held by agent-a (pid 16976)
(pass) command lock > dead-pid lock is reaped [31.78ms]
(pass) command lock > release with wrong pid refuses [15.45ms]
(pass) command lock > matches locked command prefixes and probes settings [31.90ms]
(pass) command lock > run propagates the child exit code [108.81ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.12ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed timeout failure [534.01ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.42ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.21ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.11ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.67ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [1.42ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.30ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.16ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.06ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [11.45ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.31ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.04ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [2.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.26ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.27ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.05ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [7.45ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.22ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.03ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [1.10ms]

test\commands-results.test.ts:
(pass) commands/results > formats invalid and recent timestamps [0.18ms]
(pass) commands/results > routes a seeded result.json through the command module [163.14ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [197.76ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [185.34ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [108.75ms]
(pass) commands/results > orch session reports the pi entry count [127.17ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [166.62ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [138.32ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.14ms]
(pass) commands/review > falls back to branch then pane [0.15ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [282.80ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [35.98ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [156.17ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [142.83ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [156.30ms]

test\daemon-rpc.test.ts:
433 | }
434 | 
435 | function responseError(response: RpcResponse): RpcError {
436 |   const error = response.error;
437 |   if (typeof error === "string") return new RpcError("RPC_ERROR", error);
438 |   return new RpcError(error?.code ?? "RPC_ERROR", error?.message ?? "RPC request failed", error?.data);
               ^
RpcError: Could not read unix peer credentials
 data: undefined,
 code: "IDENTITY_UNAVAILABLE"

      at responseError (C:\dev\personal\orch\src\daemon\rpc.ts:438:10)
      at rpcCall (C:\dev\personal\orch\src\daemon\rpc.ts:625:45)
      at async <anonymous> (C:\dev\personal\orch\test\daemon-rpc.test.ts:93:25)
(fail) daemon RPC > issues one session identity to sequential connections from one ancestor [12.91ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed non-JSON failure [190.24ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [0.43ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [113.33ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [91.06ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [127.32ms]

test\daemon-rpc.test.ts:
75 |   return server;
76 | }
77 | 
78 | afterEach(async () => {
79 |   while (servers.length) await servers.pop()!.close();
80 |   while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
                           ^
EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-rpc-aboxFw'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-rpc-aboxFw",
 syscall: "rm",
   errno: -4082,
    code: "EBUSY"

      at <anonymous> (C:\dev\personal\orch\test\daemon-rpc.test.ts:80:23)
(fail) daemon RPC > a TCP hello with the daemon token gets an identity [154.64ms]
(pass) daemon RPC > refuses a TCP hello without a token [14.98ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [14.00ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [121.35ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [134.52ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [122.90ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [80.12ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [82.13ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [95.31ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [133.60ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [84.41ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [127.53ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [114.00ms]

test\daemon-rpc.test.ts:
126 |     const dir = tempOrchDir();
127 |     const server = await startRpcServer(dir, {}, { tcpPort: 0 });
128 |     servers.push(server);
129 |     const tokenFile = daemonRuntimeFiles(dir).token;
130 |     expect(readFileSync(tokenFile, "utf8").trim()).toMatch(/^[0-9a-f]{64}$/);
131 |     expect(statSync(tokenFile).mode & 0o777).toBe(0o600);
                                                   ^
error: expect(received).toBe(expected)

Expected: 384
Received: 438

      at <anonymous> (C:\dev\personal\orch\test\daemon-rpc.test.ts:131:46)
(fail) daemon RPC > writes the TCP token with owner-only permissions [28.14ms]

test\control-dispatch.test.ts:
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [29.02ms]
(pass) deliverControl > still answers a pane awaiting an answer [25.99ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [44.20ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [123.85ms]
(pass) deliverControl > fails when claude keys fallback cannot deliver [152.67ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [16.41ms]
(pass) deliverControl > requires presence for inbox delivery [99.16ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [122.50ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [106.93ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > returns an error for an unknown method [20.10ms]

test\claude-hooks-shim.test.ts:
malformed identity key: expected 3 segments, got 1: "garbage"
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [181.17ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [135.55ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [90.42ms]
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [131.81ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [120.24ms]
(skip) claude-hooks shim tests need the dist bundle

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.12ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > reports malformed lines and keeps the connection alive [20.94ms]
(pass) daemon RPC > delivers pushed subscription events [18.02ms]

test\config.test.ts:
(pass) loadConfig > requires a top-level runtime and never defaults it [22.92ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [22.28ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [5.92ms]
(pass) loadConfig > reads the declared runtime [4.93ms]
(pass) loadConfig > parses every supported settings section [25.86ms]
(pass) loadConfig > rejects a file without the current schemaVersion [17.27ms]
(pass) loadConfig > rejects invalid JSON loudly [6.57ms]
(pass) loadConfig > names the key path for invalid fields [19.10ms]
(pass) loadConfig > rejects unknown settings keys [17.79ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [19.32ms]
(pass) loadConfig > rejects old settings keys [49.13ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [34.25ms]
(pass) loadConfig > applies timeout defaults and disables cross-workspace writes by default [4.08ms]
(pass) loadConfig > rejects a host without dest [18.65ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [4.70ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [18.40ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [2.79ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [3.53ms]
(pass) allowedModelPatterns > returns the configured patterns when set [23.35ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [6.05ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [22.40ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [14.35ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [14.90ms]
(pass) reapUnreadableSettings > leaves a readable file alone [5.55ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [10.28ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [66.09ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [23.99ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [37.97ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.61ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [25.91ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [4.37ms]
(pass) config precedence > uses the settings.json value over the fallback [16.58ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [5.91ms]
(pass) config precedence > uses an explicit flag override over the environment [0.20ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.26ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.12ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [19.39ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [3.55ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [57.56ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [46.55ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [43.02ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [16.34ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.81ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.28ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.32ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.40ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.47ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.41ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [21.55ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.23ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [63.71ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [1.06ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [185.01ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [1281.82ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [173.59ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [149.58ms]

test\cli-backends-herdr-headless.test.ts:
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [123.42ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.30ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.13ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [1449.10ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [63.82ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [70.74ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [51.53ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [65.57ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [52.71ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [39.03ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [38.45ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [75.18ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.55ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [16.46ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [578.12ms]

test\ownership.test.ts:
(pass) agent ownership > allows unowned and same-owner writes [117.28ms]
(pass) agent ownership > denies foreign writes and supports stealing [133.79ms]

test\routing-hardening.test.ts:
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [193.81ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [109.85ms]
(pass) store hardening > the conditional claim is exactly once [101.96ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [177.21ms]
(pass) spawn name numbering > a dead agent frees its name and its index [107.80ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [95.67ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [103.28ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [2154.49ms]

test\routing-hardening.test.ts:
(pass) CLI offline routing > status --offline does not start or contact orchd [248.13ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [2556.48ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports env as the winning source over settings.json [295.00ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [595.49ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [221.92ms]
(pass) orch settings > a load error surfaces loudly with no partial table [184.04ms]

test\pi-model-control.test.ts:
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2033.54ms]

test\queue.test.ts:
(pass) queue > exactly one claimer wins, including parallel attempts [103.06ms]
(pass) queue > replays done, failed, and retry transitions [110.41ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [178.51ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [161.49ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [114.03ms]
(pass) queue > settles a claimed task to done and blocks any later claim [100.76ms]
(pass) queue > exactly one of two racing claimers wins [61.10ms]
(pass) queue > rejects an unscoped task at enqueue [64.08ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [70.04ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [73.12ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [65.03ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [104.63ms]

test\pi-model-control.test.ts:
(pass) createModelControl.applyControlCommand > applies a thinking command directly [17.40ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1251.91ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.38ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [113.41ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [7.66ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [1999.56ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [125.84ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [177.07ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [1406.23ms]

test\spawn-limits.test.ts:
(pass) spawn limits > rejects invalid cap %s with file and key [9.35ms]
(pass) spawn limits > rejects invalid cap %s with file and key [17.30ms]
(pass) spawn limits > rejects invalid cap %s with file and key [16.40ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [10.26ms]
(pass) spawn limits > global boundary refusal data counts the whole request [35.05ms]
(pass) spawn limits > one workspace may use the full global allotment [6.19ms]
(pass) spawn limits > workspace cap is independent of global headroom [3.45ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [2.74ms]
(pass) spawn limits > dead pid records free capacity [2.40ms]
(pass) spawn limits > foreign panes never count [2.49ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [1108.80ms]
(pass) spawn limits > doctor accepts satisfiable limits [1517.25ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/feature')
Preparing worktree (new branch 'orch/remove-me')
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > detects commits ahead of a base branch [932.17ms]
(pass) worktree primitives > removes an agent worktree [619.66ms]
(pass) worktree primitives > rejects a non-repository path with a clear error [58.71ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [461.63ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [759.77ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1374.62ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [20.19ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [22.57ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [312.04ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [292.85ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [1057.88ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [1314.52ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [690.90ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [2076.47ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [710.95ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [632.55ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [518.21ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > --force allows an explicit foreign target [286.81ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [2.32ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [239.66ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [262.59ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [249.77ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [243.48ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [1482.91ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [692.49ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [613.63ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [4381.15ms]

test\doctor.test.ts:
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [2048.37ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [700.49ms]
(pass) runDoctor > reports an absent daemon as optional [1250.52ms]
(pass) runDoctor > reports and fixes a stale daemon lock [434.87ms]

test\broker-routing.test.ts:
69 |     writeFileSync(join(orchDir, "orchd.lock"), JSON.stringify({ pid: process.pid }));
70 | 
71 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
72 | 
73 |     expect(result.status).not.toBe(0);
74 |     expect(`${result.stdout}\n${result.stderr}`).toContain("was not applied or acknowledged");
                                                      ^
error: expect(received).toContain(expected)

Expected to contain: "was not applied or acknowledged"
Received: "\norch daemon unavailable; run 'orch daemon start': orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-broker-routing-Ayhh9u)\n"

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:74:50)
(fail) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [5363.70ms]

test\daemon-lifecycle.test.ts:
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
  add       react                Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @remix-run/dev       Display package metadata from the registry
  why       @evan/duckdb         Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1031.39ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [1299.95ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [378.95ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [2.89ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [327.19ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [369.74ms]
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [87.90ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1181.88ms]

test\doctor.test.ts:
(pass) runDoctor > accepts a live daemon and an answerable socket [1120.37ms]

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
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [2199.59ms]
(pass) review plumbing > approve merges and removes the worktree and branch [1259.85ms]
(pass) review plumbing > conflicting approval aborts without changing either branch [823.57ms]
(pass) review plumbing > non-fast-forward approval creates a merge commit [862.03ms]

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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    backbone             Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [314.71ms]
(pass) daemon lifecycle > rejects a recycled pid identity [1085.33ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [823.17ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [12.04ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [411.95ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1495.46ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [791.17ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [5401.23ms]

test\broker-routing.test.ts:
93 | 
94 |     const result = runCli(orchDir, ["dispatch", "agent-alpha", "hello"]);
95 |     const output = `${result.stdout}\n${result.stderr}`;
96 | 
97 |     expect(result.status).not.toBe(0);
98 |     expect(output).toContain("was not applied or acknowledged");
                        ^
error: expect(received).toContain(expected)

Expected to contain: "was not applied or acknowledged"
Received: "\norch daemon unavailable; run 'orch daemon start': orchd daemon is absent (C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-broker-routing-5NYn5z)\n"

      at <anonymous> (C:\dev\personal\orch\test\broker-routing.test.ts:98:20)
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [181.19ms]
(fail) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [5207.91ms]

test\doctor.test.ts:
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-62EQVu\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > warns when the live daemon code hash is stale [660.82ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1295.13ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.65ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [2.25ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [2.81ms]
(pass) runDoctor > reports a dead presence pid and corrupt spawn registry lines [341.55ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [92.04ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [4.06ms]
(pass) runDoctor > validates configured notifier adapters [1103.89ms]
(pass) runDoctor > reports invalid config and accepts missing config [656.77ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [665.50ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


5 tests failed:
(fail) daemon RPC > issues one session identity to sequential connections from one ancestor [12.91ms]
(fail) daemon RPC > a TCP hello with the daemon token gets an identity [154.64ms]
(fail) daemon RPC > writes the TCP token with owner-only permissions [28.14ms]
(fail) broker CLI routing > an unprovable foreign lock is never signalled; dispatch starts a fresh daemon and fails on delivery [5363.70ms]
(fail) broker CLI routing > dispatch failure is a delivery verdict, never herdr-not-found [5207.91ms]

 690 pass
 1 skip
 5 fail
 3921 expect() calls
Ran 696 tests across 105 files. [11.88s]
error: script "test" exited with code 1
