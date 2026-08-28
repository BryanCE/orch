bun test v1.3.14 (0d9b296a)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.14ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.08ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.06ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.11ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.04ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.47ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.14ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.06ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.07ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.73ms]

test/orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [428.87ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1171.45ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.17ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.45ms]
Selection recorded in /tmp/orch-setup-characterization-k9AYix/settings.json:
  runtime           = node
  adapters          = pi
  default adapter   = pi
  backends          = headless
  default backend   = headless
  model (pi)          = (none)  picker: none, allowed: all offered
Prerequisites:
  ok      pi  (/home/bryan/.bun/bin/pi)
  ok      headless
Presence dir:
  /tmp/orch-setup-characterization-k9AYix/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  ok      orch  (/home/bryan/.local/bin/orch)
  ok      pif  (/home/bryan/.local/bin/pif)
Running doctor checks...
Doctor: 27/30 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a backend workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [344.68ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.36ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [147.25ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [139.04ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [2.86ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [143.23ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [178.19ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [206.26ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [158.94ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.72ms]
(pass) daemon RPC > refuses a hello without its environment [6.14ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [163.72ms]
(pass) daemon RPC > refuses a TCP hello without a token [6.35ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [3.85ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.03ms]
(pass) daemon RPC > returns an error for an unknown method [2.62ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [15.15ms]
(pass) daemon RPC > delivers pushed subscription events [171.24ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [483.61ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [172.04ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [8.83ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.74ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [104.27ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.57ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [2.01ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.87ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [1.63ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.67ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.05ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.07ms]
(pass) assistantText > reads role-tagged records [0.06ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.04ms]
(pass) assistantText > undefined for non-assistant roles [0.04ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.07ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [399.01ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [283.51ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [341.43ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [500.23ms]
(pass) review plumbing > approve merges and removes the worktree and branch [305.81ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [37.81ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [45.05ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.77ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.62ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.52ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.57ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.33ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [86.37ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [235.11ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [142.40ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [139.29ms]
(pass) daemon presence events > a status without a dispatch id does not write history [127.38ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [149.42ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.46ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.09ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.07ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [128.77ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [144.58ms]
(pass) daemon presence events > an asking transition drives command sink delivery [177.29ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [16.96ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [58.61ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.26ms]
(pass) commands/panes > exports the pane listing command directly [0.03ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [139.59ms]
(pass) run rows > upsert updates a row while preserving its original start time [133.30ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [134.82ms]
(pass) run rows > omits absent optional fields instead of returning null [130.82ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [132.03ms]
(pass) run rows > stays readable after the agent presence directory is deleted [141.92ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.49ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.32ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.20ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.17ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.21ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.19ms]
(pass) shebangRuntime > returns null for an unreadable path [0.20ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.40ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.24ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.22ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [0.26ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [0.24ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.35ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.30ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.33ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.34ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.27ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.45ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.13ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [193.48ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [138.59ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [135.02ms]
(pass) store hardening > the attempt insert claim is exactly once [133.70ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [237.49ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [141.04ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [143.57ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > matches a stale bare pane row by its handle without parsing pane as an identity [0.08ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.11ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.07ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.10ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.05ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.07ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.54ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.13ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.19ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.18ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.17ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.22ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.08ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.53ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.03ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.30ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [33.91ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [30.82ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [33.81ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [29.24ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [28.63ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [28.11ms]
(skip) claude-hooks shim tests need the dist bundle

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.17ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.15ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.31ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.16ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.38ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.08ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.16ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.07ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [7.28ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.10ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.03ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.84ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.13ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.13ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.04ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.31ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.06ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.36ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.21ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.07ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.07ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [11.07ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.73ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.08ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [142.54ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.44ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [141.34ms]
(pass) rebuild schema > schema stamp and foreign keys are enabled [203.41ms]
(pass) rebuild schema > documented column declarations are exact [160.54ms]
(pass) rebuild schema > all satellite overlap triggers use documented keys [1459.00ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [1421.68ms]
(pass) rebuild schema > enforces foreign keys and agent checks [128.70ms]
(pass) rebuild schema > requires exactly one task scope [128.11ms]
(pass) rebuild schema > allows one open attempt only [135.35ms]
(pass) rebuild schema > enforces lease checks and one lease [160.78ms]
(pass) rebuild schema > rejects overlapping closed intervals [137.17ms]
(pass) rebuild schema > STRICT rejects text in integer instant [139.15ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [219.31ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [163.46ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [8.47ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [142.40ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [149.72ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [140.29ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.33ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [0.72ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [128.69ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [157.27ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [147.30ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [145.47ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [2.59ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.13ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.10ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.08ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.14ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.06ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.08ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.06ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.41ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.08ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [136.01ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [146.64ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [162.64ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [149.47ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [148.16ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [173.55ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [158.02ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [138.36ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [227.46ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [151.80ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [139.54ms]
(pass) queue facade storage > retention never removes a queued task based on its age [134.59ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [222.74ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [139.03ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [139.49ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [141.67ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.36ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.08ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.17ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.07ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.04ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.55ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.12ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.05ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.74ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [2716.84ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.10ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.05ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.05ms]
(pass) Claude adapter > detects state from a live presence status [0.53ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.49ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.37ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [38.31ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [150.45ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [29.42ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [28.87ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [98.46ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.15ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.19ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.40ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.23ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.08ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.04ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.11ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.07ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.10ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.16ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.10ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.07ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [130.67ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.45ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [114.57ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.19ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.07ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [14.93ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.36ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.23ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [0.61ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [130.71ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.16ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.06ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [135.28ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.45ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.19ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [0.96ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [139.11ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [148.24ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [136.44ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.38ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [135.71ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [147.80ms]
(pass) commands/runs > running rows render as running, not zero duration [0.27ms]
(pass) commands/runs > result falls back to durable run history after presence reap [138.77ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [113.35ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [333.84ms]
(pass) orch settings notify > accepts asking as a first-class sink state [178.11ms]
(pass) orch settings notify > remove drops only the named sink [305.79ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [201.03ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.46ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [0.85ms]
(pass) notify > delivers only to sinks whose on filter matches the event [25.75ms]
(pass) notify > command sink writes the event payload as JSON on stdin [19.19ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.17ms]
(pass) notify > webhook failure is non-fatal and reports a warning [27.94ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [2.18ms]
(pass) TmuxBackend > reports tmux availability [0.22ms]
(pass) TmuxBackend > workspaceNames is empty — tmux sessions have no names distinct from ids [0.08ms]
(pass) TmuxBackend > reflects the TMUX environment [0.11ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.08ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.90ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.13ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.49ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.13ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.28ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.21ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.20ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.17ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.34ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.06ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.26ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.10ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.42ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.16ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.07ms]
(pass) malformed input > rejects wrong segment count [0.09ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or id on serialize [0.06ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.04ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [182.91ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [157.83ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [150.66ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [144.38ms]
(pass) lease commands > reap refuses while the recorded process is alive [144.91ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [141.59ms]
{"target":"abort-handle","aborted":true}
(pass) lease commands > abort proceeds with a foreign live-holder lease [650.20ms]
{"closed":["close-handle"],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [143.90ms]
{"target":"headless~workspace~reap-worker","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [139.21ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [140.94ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.23ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [289.07ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [2.35ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.15ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.08ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.98ms]
(pass) PiAdapter > appends a steer message to the presence inbox [1.26ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [1.10ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.98ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.11ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.78ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.70ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.65ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.30ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.52ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.36ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.43ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         next                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       lyra                 Add a dependency to package.json (bun a)
  remove    underscore           Remove a dependency from package.json (bun rm)
  update    @remix-run/dev       Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
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
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [79.29ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [2.70ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         eslint               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       hono                 Add a dependency to package.json (bun a)
  remove    jquery               Remove a dependency from package.json (bun rm)
  update    react                Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      lyra                 Display package metadata from the registry
  why       @remix-run/dev       Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    next-app             Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [1.39ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.67ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.37ms]

test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [3.20ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.24ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [167.30ms]
(pass) agent lease rows > a second open lease is rejected [146.89ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [149.06ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [140.55ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [134.54ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [139.45ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [136.17ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [158.56ms]
(pass) agent lease rows > an agent cannot lease itself [132.59ms]
(pass) agent lease rows > expiry inserts nothing new [138.59ms]
(pass) agent lease rows > reads return only open rows [138.95ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [120.30ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.54ms]

test/queue-workspace-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [148.42ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [144.55ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [167.12ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.30ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.51ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.08ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.10ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.13ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.04ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.19ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.12ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.18ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [160.69ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.64ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.17ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.31ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.13ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.28ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.58ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.23ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.06ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.17ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.39ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [134.60ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [128.70ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [133.36ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [143.30ms]
(pass) event store rows > pruned sequence numbers are never reused [137.01ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [130.74ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [149.58ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.68ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.87ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [2.10ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [0.38ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [154.92ms]
(pass) fleet ownership scoping > close --all works without an owner token [225.39ms]
{"closed":["mine","foreign"],"requested":2,"ok":2,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [141.63ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [313.85ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [1871.40ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [795.18ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1889.29ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [1230.61ms]
{"closed":["{\"pid\":5133,\"key\":\"headless~local~mismatched\"}"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [577.83ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [3.28ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [541.75ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps every managed spawn [667.43ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [541.38ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [496.63ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.91ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [2.35ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [1.62ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [2.37ms]
(pass) loadConfig > reads the declared runtime [0.84ms]
(pass) loadConfig > parses every supported settings section [4.11ms]
(pass) loadConfig > rejects a file without the current schemaVersion [1.05ms]
(pass) loadConfig > rejects invalid JSON loudly [0.49ms]
(pass) loadConfig > names the key path for invalid fields [0.87ms]
(pass) loadConfig > rejects unknown settings keys [0.60ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [0.62ms]
(pass) loadConfig > rejects old settings keys [1.84ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [1.96ms]
(pass) loadConfig > applies every settings default when sections are absent [0.66ms]
(pass) loadConfig > preserves configured values while defaulting each missing section value [0.79ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [1.18ms]
(pass) loadConfig > rejects a host without dest [0.68ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [0.73ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [0.55ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.41ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.24ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.47ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.48ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.86ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.72ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [1.14ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.42ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.82ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [2.24ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [1.11ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [1.59ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.65ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [1.00ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [1.65ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.64ms]
(pass) config precedence > uses the settings.json value over the fallback [0.57ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.51ms]
(pass) config precedence > uses an explicit flag override over the environment [0.06ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.09ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.08ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [0.37ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.33ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [5.21ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [1.67ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [2.27ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.38ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [4.24ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.56ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [590.93ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.81ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [236.08ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [2.62ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.82ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.75ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.01ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.29ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.38ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.22ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.11ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.05ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.05ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.05ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.04ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.06ms]
(pass) worker prompt capability composition > events strip both worker header variants [147.62ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.42ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.80ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [0.86ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [137.94ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.16ms]
(pass) commands/target > extracts target and joined prompt [0.15ms]
(pass) commands/target > reads only structured result text [0.05ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.11ms]
(pass) commands/target > lists only live serialized identity presence entries [1.42ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [151.34ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [133.27ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [136.38ms]

test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [123.96ms]

test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [165.17ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [143.66ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.25ms]

test/store-task-rows.test.ts:
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [141.77ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [149.66ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [150.90ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [155.47ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [159.87ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [188.94ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [157.51ms]

test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.18ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.11ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.10ms]

test/command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [126.93ms]
(pass) command workspace fields > skipBackends keeps the authoritative presence entity shape [125.98ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [135.35ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [14.08ms]
(pass) worktree primitives > detects commits ahead of a base branch [25.80ms]
(pass) worktree primitives > removes an agent worktree [18.99ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.92ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [40.02ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [36.14ms]
(pass) presence status schema > status and list report the same agent identity [173.38ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [37.05ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [28.18ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [33.15ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [33.45ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [31.99ms]
(pass) presence status schema > persists the complete spawned identity record [24.58ms]

test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.12ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.04ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.08ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [36.51ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [1.22ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [1.95ms]
(pass) command lock > second acquire blocks until first releases [41.97ms]
(pass) command lock > dead-pid lock is reaped [0.70ms]
(pass) command lock > release with wrong pid refuses [0.61ms]
bun test held by agent-a (pid 3125)
(pass) command lock > matches locked command prefixes and probes settings [1.75ms]
(pass) command lock > run propagates the child exit code [24.68ms]

test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.16ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.11ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [151.18ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [146.28ms]

test/cmd-lock-bridge.test.ts:
94 |       toolCallId,
95 |       args: { command: LOCKED_COMMAND },
96 |     });
97 | 
98 |     const held = readCommandLock(orchDir);
99 |     expect(held).not.toBeNull();
                          ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (/home/bryan/orch/test/cmd-lock-bridge.test.ts:99:22)
(fail) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [1.73ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [0.71ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.58ms]
143 |       toolName: "bash",
144 |       toolCallId: "tc-concurrent-1",
145 |       args: { command: LOCKED_COMMAND },
146 |     });
147 |     const held = readCommandLock(orchDir);
148 |     expect(held?.pid).toBe(process.pid);
                            ^
error: expect(received).toBe(expected)

Expected: 3125
Received: undefined

      at <anonymous> (/home/bryan/orch/test/cmd-lock-bridge.test.ts:148:23)
(fail) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [0.60ms]
179 |           args: { command: LOCKED_COMMAND },
180 |         });
181 |         throw new Error("expected broken settings to reject");
182 |       } catch (error: unknown) {
183 |         if (!(error instanceof Error)) throw error;
184 |         expect(error.message).toContain(join(orchDir, "settings.json"));
                                    ^
error: expect(received).toContain(expected)

Expected to contain: "/tmp/orch-cmd-lock-bridge-kH1v2v/settings.json"
Received: "expected broken settings to reject"

      at <anonymous> (/home/bryan/orch/test/cmd-lock-bridge.test.ts:184:31)
(fail) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [0.96ms]

test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [2.28ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [5.58ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.36ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [142.98ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [0.91ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [0.84ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [131.86ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [136.68ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [207.15ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [191.20ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [190.86ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [149.15ms]
(pass) agent ownership > allows unowned and same-owner writes [128.96ms]
(pass) agent ownership > denies foreign writes and supports stealing [254.19ms]

test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.06ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.05ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.09ms]

test/spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [150.23ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [144.37ms]
(pass) spawn name numbering > a dead agent frees its name and its index [140.52ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [137.25ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [134.62ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [144.57ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [136.07ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [148.24ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [156.36ms]

test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [147.35ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [146.53ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.32ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [132.85ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.19ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.14ms]

test/store-spawned.test.ts:
(pass) spawned and ownership store rows > ownership table has no workspace column [122.74ms]
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner in one query [199.26ms]
(pass) spawned and ownership store rows > writeSpawnedName updates an existing pane and reports missing panes [138.52ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [153.34ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [154.60ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [214.52ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [155.05ms]

test/cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [948.93ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [1.20ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1343.30ms]
(pass) command lock serialization > release refuses a different process instance token [0.63ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [28.88ms]
(pass) async remote fan-out > returns a typed dead-host failure [28.45ms]
(pass) async remote fan-out > returns a typed timeout failure [503.72ms]
(pass) async remote fan-out > returns a typed non-JSON failure [30.72ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [506.31ms]

test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.12ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.04ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.30ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.05ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.04ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.06ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.49ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.10ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [41.79ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.93ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.18ms]

test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [159.94ms]
(pass) spawn agent registration > headless writes no plexer or handle row [142.33ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [156.90ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [174.37ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty — headless has no name concept [0.12ms]
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [120.30ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [32.71ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [58.27ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [34.85ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [55.53ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [4.98ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [3.24ms]
(pass) HeadlessBackend > never signals an unrecorded pid [0.39ms]

test/commands-spawn.test.ts:
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [2847.66ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [2758.06ms]
(pass) commands/spawn > preserves the existing named-spawn path [0.11ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.15ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [137.07ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [122.91ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [128.09ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [123.34ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [131.38ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [131.77ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [154.17ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [138.29ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [143.19ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [137.81ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [130.80ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [138.58ms]

test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [123.23ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [278.07ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1332.49ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [2836.85ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [567.64ms]

test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [152.72ms]
(pass) catalogue rows > write then read round-trips at and stdout [156.66ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [162.46ms]
(pass) catalogue rows > an entry with empty stdout is not stored [152.34ms]
(pass) catalogue rows > clearCatalogues empties the store [184.90ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [247.68ms]

test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [1.16ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.13ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.85ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.72ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.55ms]
(pass) spawn limits > global boundary refusal data counts the whole request [4.65ms]
(pass) spawn limits > one workspace may use the full global allotment [1.69ms]
(pass) spawn limits > workspace cap is independent of global headroom [1.26ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [1.07ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [1.29ms]
(pass) spawn limits > dead pid records free capacity [0.31ms]
(pass) spawn limits > foreign panes never count [0.28ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [174.56ms]
(pass) spawn limits > doctor accepts satisfiable limits [169.64ms]

test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.09ms]
(pass) store row values > sets only non-null fields [0.13ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [25.44ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [398.89ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [22.02ms]
(pass) watchConfig > stop prevents further callbacks [406.83ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [211.27ms]

test/seat-index.test.ts:
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [3.96ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.29ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.20ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [6.44ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [9.43ms]

test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.16ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.05ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.59ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [5.52ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [1.43ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.16ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [1.40ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2011.26ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [0.69ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [0.37ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.10ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.08ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.06ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.16ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.06ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.92ms]

test/commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.13ms]
(pass) commands/events > parses filters and scope flags [0.07ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.03ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
(pass) commands/events > does not use spawnedBy as a fallback when an agent is unleased [0.03ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.06ms]
(pass) commands/events > names one agent by name or by identity key [0.06ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.16ms]
(pass) commands/events > rejects malformed event and labels sinks [0.12ms]

test/store-interval-rows.test.ts:
(pass) interval satellites > closeThenOpen is atomic [141.92ms]
(pass) interval satellites > only one open interval is allowed [137.52ms]
(pass) interval satellites > closed process intervals cannot overlap [133.13ms]
(pass) interval satellites > closed space intervals cannot overlap [135.54ms]
(pass) interval satellites > half-open adjacency is legal [134.17ms]
(pass) interval satellites > clearSpace closes without opening [138.94ms]
(pass) interval satellites > agent plexer is immutable one-shot [163.79ms]
(pass) interval satellites > process restart history closes at the successor since [136.41ms]
(pass) interval satellites > process rows carry host and process identity [135.45ms]
(pass) interval satellites > nullable process start_token round-trips as null [132.13ms]
(pass) interval satellites > space move history closes at the successor since [153.26ms]
(pass) interval satellites > tuning change history closes at the successor since [136.60ms]
(pass) interval satellites > handle history preserves each renumbered handle [135.17ms]
(pass) interval satellites > interval instants are stored as INTEGER values [147.93ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [159.64ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [134.46ms]
(pass) interval satellites > tuning carries model and nullable thinking [135.99ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.18ms]
(pass) commands/control > parses --then destination and note [0.05ms]
(pass) commands/control > adds worker header unless raw [0.04ms]

test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [126.63ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [128.62ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.25ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.63ms]

test/store-connection-guards.test.ts:
(pass) store schema guards > a slave cannot recreate a mismatched store and leaves its bytes unchanged [130.18ms]
(pass) store schema guards > refuses schema-mismatch recreation while any live presence exists [198.90ms]

test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [141.03ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [198.97ms]
(pass) retention sweep > returns zero counts when every row is inside its window [142.19ms]
Warning: retention sweep queue failed: no such table: tasks
(pass) retention sweep > continues sweeping when one table delete fails [138.72ms]
(pass) retention sweep > reaps expired agents with no presence dir and releases registry/name reservation [156.71ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [149.46ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [123.43ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [126.65ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [137.18ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [138.85ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [126.03ms]
(pass) retention sweep > does not sweep again one minute after the first tick [140.17ms]

test/web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.33ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer workspace id [0.08ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.07ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.20ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.14ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.09ms]
(pass) commands/review > falls back to branch then pane [0.03ms]

test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.07ms]
(pass) commands/status > dead rows never display stale live state [0.06ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.06ms]
(pass) commands/status > default status reads span every workspace [0.16ms]
(pass) commands/status > derives view fields from seeded presence [0.80ms]
(pass) commands/status > marks dead presence as exited [7.63ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.59ms]
(pass) commands/status > shared status row carries presence-derived fields [0.36ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.51ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.33ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.69ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, unleased, and legacy rows [147.50ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [7.98ms]
(pass) commands/status > formats workspace labels and warnings [0.19ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [169.02ms]
(pass) workspace policy > resolves workspace names through records and functions [0.57ms]
(pass) workspace policy > compares serialized keys by their workspace [151.17ms]
(pass) workspace policy > enforces the workspace wall [143.22ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [151.14ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.31ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [129.50ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [208.97ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [131.45ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [126.55ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [129.03ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [0.91ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.49ms]
(pass) config precedence > uses env over config and flag over env [0.37ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.55ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.51ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.13ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [135.67ms]
(pass) runDoctor > checks a healthy store [171.57ms]
(pass) runDoctor > warns when the store is absent [0.53ms]
(pass) runDoctor > fails when the store schema stamp is wrong [133.47ms]
(pass) runDoctor > fails and names a missing store table [125.15ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [121.24ms]
(pass) runDoctor > reports an absent daemon as optional [126.38ms]
(pass) runDoctor > reports and fixes a stale daemon lock [121.67ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [132.78ms]
(pass) runDoctor > warns when the live daemon code hash is stale [127.10ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [310.91ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [1.41ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.72ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.66ms]
(pass) runDoctor > reports a dead presence pid [145.67ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [179.48ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.60ms]
(pass) runDoctor > validates configured notifier adapters [564.35ms]
notify: could not load settings.json: /tmp/orch-doctor-01Up1w/settings.json: this settings file has invalid values: ✖ Invalid input: expected number, received string → at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [396.14ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [267.96ms]

test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.19ms]

test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [144.33ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [153.54ms]
(pass) agent store rows > liveAgents excludes agents with an ending [194.84ms]
(pass) agent store rows > packMembers selects the materialized root [156.54ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [137.14ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [120.03ms]
(pass) agent store rows > label maps both null and a value [135.90ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [132.74ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [133.95ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [144.23ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [133.06ms]
(pass) agent store rows > childrenOf returns direct descendants [143.84ms]

test/close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [179.84ms]
Could not close headless~foreign~pane-survives; process or pane remains registered.
{"closed":[],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [201.06ms]
Could not close headless~foreign~signal-failed; process or pane remains registered.
{"closed":[],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [137.49ms]
{"closed":["headless~foreign~presence-only"],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and reaps [152.62ms]
{"closed":["headless~foreign~owned"],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [125.55ms]
{"target":"headless~foreign~abort","aborted":true}
(pass) close always works > abort ignores owner gate [629.70ms]
{"closed":["headless~foreign~duplicate"],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [144.03ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [288.61ms]
(pass) close always works > steer remains blocked by the workspace wall [135.25ms]

test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [0.88ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.23ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.20ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.17ms]

test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.15ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.53ms]

test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.31ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.11ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.06ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.07ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.11ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.07ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.30ms]
(pass) orch models --json > emits the pinned harness/model shape [0.09ms]

test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [128.48ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [127.79ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [152.09ms]

test/commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.18ms]
(pass) commands/results > formats invalid and recent timestamps [0.18ms]
(pass) commands/results > routes a seeded result.json through the command module [135.99ms]
(no result.json - falling back to adapter-extracted session text)
(pass) commands/results > falls back to adapter session text when result.json is absent [137.87ms]
(pass) commands/results > uses result.json even when the presence status has no agent [130.22ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [136.39ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [133.15ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [129.86ms]
(pass) commands/results > orch session reports the pi entry count [129.79ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [169.41ms]

test/workspace-walls.test.ts:
(pass) workspace helpers > reads workspace ids from the spawned registry [0.20ms]
(pass) workspace helpers > derives an entity workspace from the registry [0.16ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.09ms]
(pass) workspace wall writes > allows a write within the same workspace [0.07ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.08ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.24ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.06ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.05ms]

test/control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [135.14ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [1.10ms]
(pass) deliverControl > still answers a pane awaiting an answer [0.86ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [210.94ms]
error: 

Expected promise that rejects
Received promise that resolved: Promise { <resolved> }

(fail) deliverControl > does not fall back from a keys strategy to the orch channel [208.98ms]
105 |     process.env.ORCH_DIR = directory;
106 |     const key = target("headless", "claude-fail");
107 |     presence(directory, key, "claude");
108 |     recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });
109 | 
110 |     expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/no pane input role/);
                                                                                       ^
error: 

Expected promise that rejects
Received promise that resolved: Promise { <resolved> }

      at <anonymous> (/home/bryan/orch/test/control-dispatch.test.ts:110:82)
(fail) deliverControl > fails when claude keys fallback cannot deliver [201.74ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [1.93ms]
(pass) deliverControl > requires presence for inbox delivery [218.24ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [196.65ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [203.52ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.30ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.10ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.05ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.04ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.08ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.13ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.08ms]
(pass) HerdrBackend > a pane split off the caller's own pane is moved into the fleet's tab [0.18ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.07ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.07ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.13ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.10ms]
(pass) HerdrBackend > pane input submits through pane run [0.04ms]
(pass) HerdrBackend > waitAgentStatus uses agent wait --until, not the removed top-level wait [0.07ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.28ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [171.72ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [124.11ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [138.61ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [125.48ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [8.39ms]

test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [207.58ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [203.06ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [172.06ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [170.94ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [194.72ms]

test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.15ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.05ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.43ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.20ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.36ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [16.36ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [0.78ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.56ms]

test/settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [100.30ms]
(pass) orch settings > --json reports env as the winning source over settings.json [109.76ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [318.97ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [106.63ms]
(pass) orch settings > a load error surfaces loudly with no partial table [122.35ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [209.82ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [145.51ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [126.42ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [119.01ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [1539.99ms]

test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.09ms]
(pass) commands/index > reads a package version string [0.16ms]
(pass) commands/index > announces unleased agents once per session [0.12ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [1.04ms]

test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [131.62ms]
(pass) outbox store rows > reports one message's pending state [136.99ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [141.67ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [132.35ms]

test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.13ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.15ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.15ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.06ms]

test/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [5.02ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [1.90ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [1.67ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


5 tests failed:
(fail) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [1.73ms]
(fail) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [0.60ms]
(fail) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [0.96ms]
(fail) deliverControl > does not fall back from a keys strategy to the orch channel [208.98ms]
(fail) deliverControl > fails when claude keys fallback cannot deliver [201.74ms]

 938 pass
 1 skip
 5 fail
 4606 expect() calls
Ran 944 tests across 143 files. [91.24s]
