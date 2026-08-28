bun test v1.3.14 (0d9b296a)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.15ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.11ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.07ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.06ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.20ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.06ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.07ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.63ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.12ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.10ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.07ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [2.22ms]

test/orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [425.54ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1199.39ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.12ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.29ms]
Selection recorded in /tmp/orch-setup-characterization-Z0N6Wj/settings.json:
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
  /tmp/orch-setup-characterization-Z0N6Wj/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  ok      orch  (/home/bryan/.local/bin/orch)
  ok      pif  (/home/bryan/.local/bin/pif)
Running doctor checks...
Doctor: 27/30 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a backend workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [203.96ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.29ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [155.09ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [129.72ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [4.97ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [144.15ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [157.32ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [154.28ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [167.94ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.24ms]
(pass) daemon RPC > refuses a hello without its environment [5.45ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [159.37ms]
(pass) daemon RPC > refuses a TCP hello without a token [8.14ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [5.30ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.26ms]
(pass) daemon RPC > returns an error for an unknown method [5.15ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [15.17ms]
(pass) daemon RPC > delivers pushed subscription events [176.91ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [430.96ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [148.96ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [7.98ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.65ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [104.93ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.07ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [0.92ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.45ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.60ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.36ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.03ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
(pass) assistantText > undefined for non-assistant roles [0.03ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [451.58ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [264.27ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [320.04ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [566.98ms]
(pass) review plumbing > approve merges and removes the worktree and branch [349.73ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [50.37ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [42.95ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.46ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.78ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.67ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.69ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.41ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [85.94ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [167.81ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [164.65ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [149.90ms]
(pass) daemon presence events > a status without a dispatch id does not write history [128.68ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [145.42ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.43ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.10ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.07ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [160.56ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [127.24ms]
(pass) daemon presence events > an asking transition drives command sink delivery [158.44ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [15.17ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [57.73ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.20ms]
(pass) commands/panes > exports the pane listing command directly [0.06ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [138.14ms]
(pass) run rows > upsert updates a row while preserving its original start time [134.33ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [144.86ms]
(pass) run rows > omits absent optional fields instead of returning null [125.60ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [139.16ms]
(pass) run rows > stays readable after the agent presence directory is deleted [140.62ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.41ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.26ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.17ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.14ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.17ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.16ms]
(pass) shebangRuntime > returns null for an unreadable path [0.14ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.41ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.20ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.16ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [0.29ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [0.23ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.31ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.40ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.29ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.28ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.25ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.48ms]
 98 |   });
 99 | 
100 |   test("falls back to a real name when an adapter id is blank", () => {
101 |     const blankAdapter = { ...adapter, id: "" as AgentAdapter["id"] };
102 |     new HerdrBackend().spawn(blankAdapter, { workspace: "ws-test" });
103 |     expect(lastCall("pane", "rename")?.[3]).toBe("agent-agent");
                                                  ^
error: expect(received).toBe(expected)

Expected: "agent-agent"
Received: "-agent"

      at <anonymous> (/home/bryan/orch/test/herdr-notify-hardening.test.ts:103:45)
(fail) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.27ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.19ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [195.02ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [129.01ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [127.53ms]
(pass) store hardening > the attempt insert claim is exactly once [143.97ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [228.76ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [137.56ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [125.81ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > matches a stale bare pane row by its handle without parsing pane as an identity [0.09ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.11ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.06ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.06ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.43ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.11ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.15ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.15ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.19ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.21ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.10ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.59ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [0.99ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.27ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [23.98ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [26.39ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [22.73ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [30.37ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [25.49ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [27.79ms]
(skip) claude-hooks shim tests need the dist bundle

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.19ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.18ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.08ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.34ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.08ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.11ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.06ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [8.50ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.16ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.02ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.84ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.13ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.05ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.61ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.09ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.32ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.19ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [15.31ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.42ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.05ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [139.73ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.16ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [121.80ms]
(pass) rebuild schema > schema stamp and foreign keys are enabled [164.69ms]
(pass) rebuild schema > documented column declarations are exact [130.81ms]
(pass) rebuild schema > all satellite overlap triggers use documented keys [1362.90ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [1713.64ms]
(pass) rebuild schema > enforces foreign keys and agent checks [152.95ms]
(pass) rebuild schema > requires exactly one task scope [180.31ms]
(pass) rebuild schema > allows one open attempt only [155.63ms]
(pass) rebuild schema > enforces lease checks and one lease [151.54ms]
(pass) rebuild schema > rejects overlapping closed intervals [138.97ms]
(pass) rebuild schema > STRICT rejects text in integer instant [134.30ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [155.19ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [301.89ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [7.24ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [151.07ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [152.07ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [147.90ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.31ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [0.71ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [127.65ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [135.92ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [198.16ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [163.36ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [2.71ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.13ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.08ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.12ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.05ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.08ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.03ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.70ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.12ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.05ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.03ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [138.50ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [154.02ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [144.81ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [146.99ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [152.99ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [141.00ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [150.28ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [170.90ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [236.18ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [144.10ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [139.89ms]
(pass) queue facade storage > retention never removes a queued task based on its age [136.25ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [135.67ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [139.84ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [167.49ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [162.01ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.40ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.11ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.28ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.10ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.04ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.58ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.16ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.06ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.76ms]
pi extensions:
  /home/bryan/.pi/agent/extensions/pi-bridge.js -> /home/bryan/orch/dist/extensions/pi-bridge.js
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [4746.87ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.11ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.06ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.06ms]
(pass) Claude adapter > detects state from a live presence status [0.59ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.50ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.35ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [50.31ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [134.35ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [28.49ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [33.97ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [104.46ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.18ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.22ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.47ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.26ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.09ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.03ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.11ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.07ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.06ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.10ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.09ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.08ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [131.74ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.42ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [122.41ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.25ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.11ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [10.77ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.27ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.19ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [0.49ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [147.41ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.15ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.07ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [122.60ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.42ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.23ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [1.01ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [127.38ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [123.45ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [170.50ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.60ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [143.23ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [132.93ms]
(pass) commands/runs > running rows render as running, not zero duration [0.26ms]
(pass) commands/runs > result falls back to durable run history after presence reap [138.58ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [82.83ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [298.22ms]
(pass) orch settings notify > accepts asking as a first-class sink state [95.58ms]
(pass) orch settings notify > remove drops only the named sink [193.30ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [196.01ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.45ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [1.03ms]
(pass) notify > delivers only to sinks whose on filter matches the event [26.03ms]
(pass) notify > command sink writes the event payload as JSON on stdin [21.03ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.18ms]
(pass) notify > webhook failure is non-fatal and reports a warning [28.03ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [1.69ms]
(pass) TmuxBackend > reports tmux availability [0.29ms]
(pass) TmuxBackend > workspaceNames is empty — tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.06ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.07ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.81ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.16ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.38ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.10ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [250.95ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.11ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.15ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.16ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.26ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.05ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.34ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.09ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.39ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.18ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.05ms]
(pass) malformed input > rejects wrong segment count [0.10ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or id on serialize [0.06ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.03ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [162.18ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [166.25ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [171.26ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [160.00ms]
(pass) lease commands > reap refuses while the recorded process is alive [151.70ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [187.20ms]
{"target":"abort-handle","aborted":true}
(pass) lease commands > abort proceeds with a foreign live-holder lease [710.30ms]
{"closed":["close-handle"],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [138.82ms]
{"target":"headless~workspace~reap-worker","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [141.61ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [144.05ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.29ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [257.42ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.18ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.05ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.53ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.38ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.25ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.72ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.09ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.71ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.47ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.53ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.23ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.37ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.27ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.29ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         nuxi                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       react                Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
  update    lyra                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [41.22ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.20ms]
(pass) daemon lifecycle > rejects a recycled pid identity [0.52ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prettier             Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @shumai/shumai       Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
  update    hono                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      react                Display package metadata from the registry
  why       lyra                 Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.35ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.21ms]

test/port-seam-errors.test.ts:
19 | }
20 | 
21 | describe("port seam error contract", () => {
22 |   test("provider mutation errors preserve argv, exit status, stderr, and stdout", () => {
23 |     failHerdr();
24 |     expect(() => herdrAck(["pane", "rename", "p1", "new name"])).toThrow(
                                                                      ^
error: expect(received).toThrow(expected)

Expected pattern: /herdr pane rename p1 new name failed: exit status 23; stderr: real stderr; stdout: real stdout/

Received function did not throw
Received value: undefined

      at <anonymous> (/home/bryan/orch/test/port-seam-errors.test.ts:24:66)
(fail) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [1.39ms]
26 |     );
27 |   });
28 | 
29 |   test("provider query errors throw instead of returning a sentinel", () => {
30 |     failHerdr();
31 |     expect(() => herdrPanes()).toThrow(/herdr pane list failed: exit status 23; stderr: real stderr; stdout: real stdout/);
                                    ^
error: expect(received).toThrow(expected)

Expected pattern: /herdr pane list failed: exit status 23; stderr: real stderr; stdout: real stdout/

Received function did not throw
Received value: [
  {
    pane_id: "w6:p9",
    workspace_id: "ws-test",
  }
]

      at <anonymous> (/home/bryan/orch/test/port-seam-errors.test.ts:31:32)
(fail) port seam error contract > provider query errors throw instead of returning a sentinel [0.19ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [138.74ms]
(pass) agent lease rows > a second open lease is rejected [129.67ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [149.42ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [133.14ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [139.57ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [149.59ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [136.73ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [145.58ms]
(pass) agent lease rows > an agent cannot lease itself [125.52ms]
(pass) agent lease rows > expiry inserts nothing new [131.86ms]
(pass) agent lease rows > reads return only open rows [132.94ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [125.97ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.92ms]

test/queue-workspace-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [132.16ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [137.00ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [157.28ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.11ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.24ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.06ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.04ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.07ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.03ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.10ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.07ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.08ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [122.77ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.61ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.17ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.38ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.15ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.28ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.16ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.15ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.07ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.23ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.37ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [128.07ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [120.47ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [122.43ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [134.50ms]
(pass) event store rows > pruned sequence numbers are never reused [210.58ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [136.77ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [149.86ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.41ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.68ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [1.74ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [0.27ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [130.83ms]
(pass) fleet ownership scoping > close --all works without an owner token [218.96ms]
{"closed":["mine","foreign"],"requested":2,"ok":2,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [134.97ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [294.48ms]
193 |         schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
194 |       }));
195 |       recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
196 |       const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
197 |       expect(result.status).not.toBe(0);
198 |       expect(result.output).toContain("other-orchestrator");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\nTarget \"headless~local~foreign-dispatch\" has no pane.\n"

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:198:29)
(fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [257.17ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [324.35ms]
