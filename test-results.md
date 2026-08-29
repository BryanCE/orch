bun test v1.4.0 (34cbb9a40)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.12ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.07ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.03ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.10ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.03ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.47ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.13ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.06ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.05ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.37ms]

test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.10ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [14.07ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [354.14ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1121.32ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.09ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.26ms]
Selection recorded in /tmp/orch-setup-characterization-fqbqqy/settings.json:
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
  /tmp/orch-setup-characterization-fqbqqy/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  /home/bryan/.local/bin/orch -> /home/bryan/orch/dist/bin/orch.js
  replaced stale bin orch  (/home/bryan/.local/bin/orch)
  /home/bryan/.local/bin/pif -> /home/bryan/orch/bin/pif
  replaced stale bin pif  (/home/bryan/.local/bin/pif)
Running doctor checks...
Doctor: 29/30 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a backend workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [182.56ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.18ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [40.90ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [42.89ms]

test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.37ms]
(pass) notify router > passes typed webhook and command configuration [0.37ms]
(pass) notify router > surfaces notifier errors [0.17ms]

test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [9.84ms]
(pass) status performance seams > resolves orchestrator id once per status call [5.53ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.11ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5026.90ms]
(pass) daemon RPC > a control refusal is not accepted and remains pending in the outbox [231.43ms]
(pass) daemon RPC > round-trips a call over the real unix socket [2.96ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [50.23ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [89.24ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [61.20ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [51.73ms]
(pass) daemon RPC > refuses a hello that reports no session pid [5.03ms]
(pass) daemon RPC > refuses a hello without its environment [4.81ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [63.40ms]
(pass) daemon RPC > refuses a TCP hello without a token [4.20ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.15ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.41ms]
(pass) daemon RPC > returns an error for an unknown method [2.59ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.08ms]
(pass) daemon RPC > delivers pushed subscription events [51.38ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [317.85ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [51.57ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [4.65ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.31ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [105.72ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.41ms]

test/store-instants.test.ts:
(pass) epoch-millisecond store instants > round-trips instants as numbers and orders numerically [63.33ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.58ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [1.56ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.63ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.63ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.82ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.52ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.05ms]
(pass) assistantText > reads role-tagged records [0.03ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.09ms]
(pass) assistantText > undefined for non-assistant roles [0.07ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.05ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [271.39ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [172.99ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [172.47ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [396.60ms]
(pass) review plumbing > approve merges and removes the worktree and branch [233.09ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [32.22ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [31.36ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.15ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.40ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.34ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.32ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.23ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [87.30ms]

test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [2.80ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [51.72ms]
150 |       lastError: "last problem",
151 |     });
152 |     await waitFor(() => events.some((event) => eventState(event) === "done"));
153 | 
154 |     const [run] = selectRuns(orchDir);
155 |     expect(run).toMatchObject({
                      ^
error: expect(received).toMatchObject(expected)

@@ -3,15 +3,15 @@
    "agentKey": "headless~runs~full",
    "cacheRead": 33,
    "cacheWrite": 44,
    "cost": 1.25,
    "dispatchId": "dispatch-full",
-   "finishedAt": "2026-01-01T00:01:00.000Z",
+   "finishedAt": 1767225660000,
    "lastError": "last problem",
    "model": "model-full",
    "result": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx... (2815 bytes truncated) ...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
-   "startedAt": "2026-01-01T00:00:00.000Z",
+   "startedAt": 1767225600000,
    "state": "done",
    "task": "the complete task",
    "tokensIn": 11,
    "tokensOut": 22,
    "turns": 7,

- Expected  - 2
+ Received  + 2

      at <anonymous> (/home/bryan/orch/test/daemon-events.test.ts:155:17)
(fail) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [45.12ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [47.90ms]
(pass) daemon presence events > a status without a dispatch id does not write history [34.11ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [44.32ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.34ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.07ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.04ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.05ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [29.96ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [39.28ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [27.96ms]
(pass) daemon presence events > an asking transition drives command sink delivery [41.16ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.05ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [41.35ms]
(pass) run rows > upsert updates a row while preserving its original start time [32.31ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [37.31ms]
(pass) run rows > omits absent optional fields instead of returning null [34.30ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [39.86ms]
(pass) run rows > stays readable after the agent presence directory is deleted [45.97ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.41ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.24ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.15ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.14ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.15ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.14ms]
(pass) shebangRuntime > returns null for an unreadable path [0.13ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.36ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.20ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.17ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.26ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.17ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.29ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.25ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.23ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.30ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.19ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.72ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.10ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.09ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.11ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [44.92ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [33.58ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [39.57ms]
(pass) store hardening > the attempt insert claim is exactly once [42.24ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [153.82ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [40.56ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [41.66ms]

test/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [126.53ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live record over dead rows sharing its name [0.18ms]
(pass) lifecycle target resolution > reports the target and disambiguating keys for live ambiguity [0.16ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead row when no live match exists [0.03ms]
(pass) lifecycle target resolution > matches a stale bare pane row by its handle without parsing pane as an identity [0.04ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.14ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.05ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.06ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.45ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.12ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.19ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.16ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.13ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.17ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.10ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.05ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.63ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.20ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.39ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [53.75ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [58.55ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [68.84ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [57.75ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [86.05ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [42.46ms]
(skip) claude-hooks shim tests need the dist bundle

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.11ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.23ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.10ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [1.01ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.13ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.53ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.09ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.34ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.07ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [10.21ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.20ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.02ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.32ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.20ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.17ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.04ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.04ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [2.86ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [3.65ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.06ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [1.15ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.32ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.07ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [22.94ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.18ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.14ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [52.75ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.25ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.05ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.06ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [56.19ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [42.47ms]
(pass) rebuild schema > documented column declarations are exact [58.43ms]
(pass) rebuild schema > all satellite overlap triggers use documented keys [889.80ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [630.54ms]
(pass) rebuild schema > enforces foreign keys and agent checks [37.34ms]
(pass) rebuild schema > requires exactly one task scope [39.47ms]
(pass) rebuild schema > allows one open attempt only [39.90ms]
(pass) rebuild schema > enforces lease checks and one lease [41.01ms]
(pass) rebuild schema > rejects overlapping closed intervals [43.06ms]
(pass) rebuild schema > STRICT rejects text in integer instant [31.08ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [69.39ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [58.45ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [7.48ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [46.28ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [58.68ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [43.19ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.39ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [0.71ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [27.39ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [31.28ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [41.47ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [36.87ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.43ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.07ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.11ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.09ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.03ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.04ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.36ms]

test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.48ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.16ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.67ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.29ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.04ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.01ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [34.58ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [67.36ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [62.00ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [54.50ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [61.13ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [68.98ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [66.56ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [60.25ms]

test/log-record.test.ts:

# Unhandled error between tests
-------------------------------
error: Cannot find module '../src/log.ts' from '/home/bryan/orch/test/log-record.test.ts'
-------------------------------


test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [209.45ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [53.92ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [49.50ms]
(pass) queue facade storage > retention never removes a queued task based on its age [42.05ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [47.30ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [49.70ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [42.86ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [41.44ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.20ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.05ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.12ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.04ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.25ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.07ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.04ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.70ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [31.00ms]

test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [4.18ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.57ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.13ms]
(pass) thinking resolution > per-harness override beats global default [0.34ms]

test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.13ms]
(pass) setup model flags > binds each model flag to its own harness [0.13ms]
(pass) setup model flags > allows a bare model for one harness [0.04ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.13ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.08ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.13ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.07ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.05ms]
(pass) Claude adapter > detects state from a live presence status [0.52ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.69ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.42ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [35.84ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [209.82ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [50.89ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [49.50ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [90.92ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.17ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.28ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.62ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.24ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.07ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.02ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.12ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.14ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.09ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.14ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [2.99ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.17ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [39.38ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.34ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [160.76ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.15ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.08ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [9.31ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [0.41ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [109.08ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [45.54ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [33.03ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.20ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.07ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [46.44ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [26.59ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.26ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [41.16ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [34.69ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [30.36ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [39.11ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [32.33ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.38ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [44.11ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [54.83ms]
(pass) commands/runs > running rows render as running, not zero duration [0.26ms]
(pass) commands/runs > result falls back to durable run history after presence reap [56.65ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [124.47ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [321.07ms]
(pass) orch settings notify > accepts asking as a first-class sink state [98.69ms]
(pass) orch settings notify > remove drops only the named sink [218.46ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [231.93ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.62ms]

test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [1.67ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane roles [5.01ms]
(pass) TmuxBackend > does not declare pane foreground capability [0.05ms]
(pass) TmuxBackend > reports tmux availability [0.21ms]
(pass) TmuxBackend > workspaceNames is empty — tmux sessions have no names distinct from ids [0.05ms]
(pass) TmuxBackend > reflects the TMUX environment [0.06ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.59ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.10ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.42ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.09ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [250.87ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.10ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [1751.27ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.49ms]
(pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.78ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.89ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.19ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.68ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.48ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.74ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.24ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.08ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.08ms]
(pass) malformed input > rejects wrong segment count [0.15ms]
(pass) malformed input > rejects empty key [0.17ms]
(pass) malformed input > rejects empty backend or id on serialize [0.11ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.06ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [58.12ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [43.05ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [47.87ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [40.88ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [47.84ms]
(pass) lease commands > reap refuses while the recorded process is alive [41.95ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [59.90ms]
{"outcome":"answer","reason":"no-pane","text":"headless~workspace~abort-worker has no pane; abort does not apply."}
133 |       cmdAbort([key, "--json"]);
134 |     } finally {
135 |       backend.canSendKeys = oldCanSendKeys;
136 |       backend.sendKeys = oldSendKeys;
137 |     }
138 |     expect(sends).toBe(2);
                        ^
error: expect(received).toBe(expected)

Expected: 2
Received: 0

      at <anonymous> (/home/bryan/orch/test/commands-lease.test.ts:138:19)
(fail) lease commands > abort proceeds with a foreign live-holder lease [57.81ms]
{"closed":["close-handle"],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [50.70ms]
{"target":"headless~workspace~reap-worker","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [41.31ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [43.93ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.18ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [158.78ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.19ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.12ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.07ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.51ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.35ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.23ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.69ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.23ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.84ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.45ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.53ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.22ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.37ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.31ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.35ms]
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
  add       @remix-run/dev       Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
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
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [36.10ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.05ms]
(pass) daemon lifecycle > rejects a recycled pid identity [0.53ms]
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
  add       hono                 Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    react                Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
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

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.60ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.53ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.26ms]

test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.23ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.11ms]

test/spawn-name-list.test.ts:
(pass) spawn names a fleet at creation > one name per pane, used verbatim and unnumbered [34.41ms]
(pass) spawn names a fleet at creation > a single name with N > 1 still grows the numbered fleet [29.19ms]
(pass) spawn names a fleet at creation > a name list whose length does not match N is refused before anything is created [0.39ms]
(pass) spawn names a fleet at creation > every name in the list is validated, so one bad name creates nothing [0.29ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [51.90ms]
(pass) agent lease rows > a second open lease is rejected [41.08ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [54.08ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [45.06ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [56.39ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [47.61ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [45.22ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [113.11ms]
(pass) agent lease rows > an agent cannot lease itself [48.32ms]
(pass) agent lease rows > expiry inserts nothing new [44.15ms]
(pass) agent lease rows > reads return only open rows [51.63ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [44.98ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.68ms]

test/queue-workspace-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [56.65ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [46.57ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [57.48ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.10ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.29ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.07ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.05ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.09ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.02ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.11ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.08ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.10ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [37.80ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.28ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.09ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.18ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.07ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.17ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.08ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.10ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.04ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.11ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.38ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [28.33ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [36.72ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [36.17ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [51.39ms]
(pass) event store rows > pruned sequence numbers are never reused [52.91ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [58.28ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [49.51ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.68ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.54ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [2.11ms]

test/presence-inbox.test.ts:
(pass) shared presence line writers > inbox and ack drains use the same claimed rename path [0.37ms]
(pass) shared presence line writers > pi appends and answers through shared presence writers [0.45ms]
(pass) shared presence line writers > wrong status schema is rejected by shared status reader [0.39ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [0.22ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [46.58ms]
(pass) fleet ownership scoping > close --all works without an owner token [158.81ms]
{"closed":["mine","foreign"],"requested":2,"ok":2,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [50.56ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [235.87ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [719.34ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [319.66ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [541.85ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [333.89ms]
{"closed":["{\"pid\":13700,\"key\":\"headless~local~mismatched\"}"],"requested":1,"ok":1,"stream":false}
302 |     } finally {
303 |       backend.capabilities.panes = oldPanes;
304 |       backend.close = oldClose;
305 |     }
306 | 
307 |     expect(paneClosed).toBe(true);
                             ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:307:24)
(fail) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [64.08ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.15ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [151.09ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps every managed spawn [183.59ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [185.91ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [167.80ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.35ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [0.97ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [0.35ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [0.69ms]
(pass) loadConfig > reads the declared runtime [0.40ms]
(pass) loadConfig > parses every supported settings section [1.17ms]
(pass) loadConfig > rejects a file without the current schemaVersion [0.39ms]
(pass) loadConfig > rejects invalid JSON loudly [0.21ms]
(pass) loadConfig > names the key path for invalid fields [0.49ms]
(pass) loadConfig > rejects unknown settings keys [0.41ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [0.60ms]
(pass) loadConfig > rejects old settings keys [1.86ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [1.16ms]
(pass) loadConfig > applies every settings default when sections are absent [0.55ms]
(pass) loadConfig > preserves configured values while defaulting each missing section value [0.80ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [1.06ms]
(pass) loadConfig > rejects a host without dest [0.48ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [0.59ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [0.45ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.36ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.31ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.49ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.49ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.79ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.57ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.55ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.24ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.65ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [1.12ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.88ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [1.45ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.43ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.65ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [0.88ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.49ms]
(pass) config precedence > uses the settings.json value over the fallback [0.51ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.52ms]
(pass) config precedence > uses an explicit flag override over the environment [0.05ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.06ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [0.35ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.29ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [1.82ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [1.43ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [2.52ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.62ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [2.61ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.66ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [251.48ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.78ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [102.43ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.78ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.60ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.68ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.12ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.33ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.30ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [2.54ms]
(pass) worker prompt capability composition > pi worker header permits only locked heavy commands through orch [0.04ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.06ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.04ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.05ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.03ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
(pass) worker prompt capability composition > events strip both worker header variants [32.72ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.28ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.62ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [0.66ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [28.87ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.07ms]
(pass) commands/target > extracts target and joined prompt [0.13ms]
(pass) commands/target > reads only structured result text [0.06ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.11ms]
(pass) commands/target > lists only live serialized identity presence entries [1.53ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [44.62ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [40.92ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [44.30ms]

test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [32.30ms]

test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [49.90ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [45.34ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.20ms]

test/store-task-rows.test.ts:
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [47.33ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [62.92ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [59.13ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [61.07ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [52.01ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [65.65ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [55.49ms]

test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.21ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.07ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.07ms]

test/command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [41.24ms]
(pass) command workspace fields > skipBackends keeps the authoritative presence entity shape [34.41ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [45.45ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [14.87ms]
(pass) worktree primitives > detects commits ahead of a base branch [18.31ms]
(pass) worktree primitives > removes an agent worktree [14.29ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.09ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [44.24ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [39.98ms]
(pass) presence status schema > status and list report the same agent identity [89.12ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [39.77ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [39.11ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [47.02ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [49.72ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [48.76ms]
(pass) presence status schema > persists the complete spawned identity record [18.81ms]

test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [3.43ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.05ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.14ms]

test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.24ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.98ms]
(pass) command lock > second acquire blocks until first releases [37.87ms]
(pass) command lock > dead-pid lock is reaped [0.62ms]
(pass) command lock > release with wrong pid refuses [0.36ms]
bun test held by agent-a (pid 12370)
(pass) command lock > matches locked command prefixes and probes settings [1.79ms]
(pass) command lock > run propagates the child exit code [6.83ms]

test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.46ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.10ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [107.52ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [43.57ms]

test/cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [11.42ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [0.69ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.33ms]
(pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [599.84ms]
(pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [0.88ms]

test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.08ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [1.04ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.30ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [3544.00ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [0.99ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [0.85ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [3551.25ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [3547.19ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [131.78ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [94.31ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [108.37ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [48.32ms]
(pass) agent ownership > replaces an existing owner [36.97ms]
(pass) agent ownership > allows unowned and same-owner writes [39.50ms]
(pass) agent ownership > denies foreign writes and supports stealing [41.40ms]

test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.08ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.05ms]
(pass) per-command help topics > an unknown name has no topic [0.02ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.09ms]

test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.19ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.05ms]
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [36.38ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [59.76ms]
(pass) spawn name numbering > a dead agent frees its name and its index [56.53ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [56.22ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [48.44ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [48.02ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [44.02ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [43.40ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [36.59ms]

test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.24ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [1.94ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.10ms]

test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [51.93ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [46.71ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.40ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [54.55ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.19ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.15ms]

test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.16ms]

test/store-spawned.test.ts:
(pass) spawned and ownership store rows > spawned-row guard rejects arrays [0.06ms]
(pass) spawned and ownership store rows > round-trips name and workspace through the public spawned seam [43.09ms]
(pass) spawned and ownership store rows > ownership table has no workspace column [41.09ms]
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner [151.50ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [39.98ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [38.58ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [43.24ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [53.28ms]

test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [48.81ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [40.40ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [42.55ms]

test/cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [865.78ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [0.60ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1332.66ms]
(pass) command lock serialization > release refuses a different process instance token [0.56ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [18.75ms]
(pass) async remote fan-out > returns a typed dead-host failure [16.90ms]
(pass) async remote fan-out > returns a typed timeout failure [503.22ms]
(pass) async remote fan-out > returns a typed non-JSON failure [18.61ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [509.04ms]

test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.11ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.04ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.25ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.05ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.04ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.04ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.79ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.12ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.45ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [10.65ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.11ms]

test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [65.87ms]
(pass) spawn agent registration > headless writes no plexer or handle row [47.04ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [63.66ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [48.96ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty — headless has no name concept [0.14ms]
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [38.99ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [35.53ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [49.87ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [31.63ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [36.25ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [4.12ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [3.99ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.62ms]

test/commands-spawn.test.ts:
pi extensions:
  /home/bryan/.pi/agent/extensions/pi-bridge.js -> /home/bryan/orch/dist/extensions/pi-bridge.js
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [599.71ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [4228.74ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [36.21ms]
error: expect(received).toMatchObject(expected)

  {
    "adapterFlag": "claude",
    "backendFlag": "headless",
+   "cmd": "pi",
+   "commandFlag": false,
+   "cwd": "/home/bryan/orch",
    "json": true,
-   "namePrefix": "worker",
+   "label": "work",
+   "names": [
+     "worker",
+   ],
    "positional": [
      "2",
    ],
+   "promptFlags": [],
+   "tabLabel": null,
    "unknownFlags": [],
+   "workspace": null,
  }

- Expected  - 1
+ Received  + 10

(fail) commands/spawn > preserves the existing named-spawn path [0.35ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.05ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.17ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [57.14ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [41.99ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [42.44ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [33.14ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [34.94ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [37.35ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [42.60ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [36.10ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [40.20ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [27.31ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [39.37ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [41.18ms]

test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [100.27ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [159.32ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1183.39ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [721.31ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [560.29ms]

test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [37.10ms]
(pass) catalogue rows > write then read round-trips at and stdout [37.83ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [58.53ms]
(pass) catalogue rows > an entry with empty stdout is not stored [44.02ms]
(pass) catalogue rows > clearCatalogues empties the store [71.21ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [74.55ms]

test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [0.70ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.35ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.73ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.61ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.39ms]
(pass) spawn limits > global boundary refusal data counts the whole request [1.83ms]
(pass) spawn limits > one workspace may use the full global allotment [0.83ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.84ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [0.69ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [1.24ms]
(pass) spawn limits > dead pid records free capacity [0.27ms]
(pass) spawn limits > foreign panes never count [0.25ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [49.73ms]
(pass) spawn limits > doctor accepts satisfiable limits [51.14ms]

test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.09ms]
(pass) store row values > sets only non-null fields [0.07ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [22.41ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [392.96ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [21.49ms]
(pass) watchConfig > stop prevents further callbacks [406.03ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [78.15ms]

test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [0.08ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.11ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.15ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.15ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.20ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [3.76ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [6.23ms]

test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.12ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.06ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.03ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.48ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.53ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [1.45ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.83ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2012.23ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [1.60ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [3.26ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.12ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.07ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.03ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.05ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.77ms]

test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.02ms]

test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.29ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.19ms]
(pass) commands/events > parses filters and scope flags [0.09ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.05ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
(pass) commands/events > excludes an agent spawned by a different session [0.02ms]
(pass) commands/events > --any-agent passes agents from both sessions [0.06ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.11ms]
(pass) commands/events > names one agent by name or by identity key [0.07ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.23ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.38ms]
(pass) commands/events > rejects malformed event and labels sinks [0.10ms]

test/store-interval-rows.test.ts:
(pass) interval satellites > closeThenOpen is atomic [56.00ms]
(pass) interval satellites > only one open interval is allowed [48.65ms]
(pass) interval satellites > closed process intervals cannot overlap [60.62ms]
(pass) interval satellites > closed space intervals cannot overlap [57.33ms]
(pass) interval satellites > half-open adjacency is legal [61.83ms]
(pass) interval satellites > clearSpace closes without opening [55.04ms]
(pass) interval satellites > agent plexer is immutable one-shot [58.69ms]
(pass) interval satellites > process restart history closes at the successor since [47.76ms]
(pass) interval satellites > process rows carry host and process identity [50.31ms]
(pass) interval satellites > nullable process start_token round-trips as null [43.78ms]
(pass) interval satellites > space move history closes at the successor since [49.09ms]
(pass) interval satellites > tuning change history closes at the successor since [54.83ms]
(pass) interval satellites > handle history preserves each renumbered handle [50.37ms]
(pass) interval satellites > interval instants are stored as INTEGER values [59.43ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [46.51ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [49.38ms]
(pass) interval satellites > tuning carries model and nullable thinking [46.03ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [5.45ms]
(pass) commands/control > parses --then destination and note [0.17ms]
(pass) commands/control > adds worker header unless raw [0.07ms]

test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [43.76ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [42.42ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.24ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [1.06ms]

test/store-connection-guards.test.ts:
42 |     const before = readFileSync(path);
43 | 
44 |     expect(() => openStore(dir)).toThrow(/does not match orch's migrations/i);
45 |     expect(() => openStore(dir)).toThrow(/db:reset/i);
46 |     expect(readFileSync(path)).toEqual(before);
47 |     expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
                                                      ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (/home/bryan/orch/test/store-connection-guards.test.ts:47:50)
(fail) store migration guards > a store predating the migrations is refused, not rebuilt over [30.87ms]
55 |     mkdirSync(presenceDir, { recursive: true });
56 |     writeFileSync(join(presenceDir, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, pid: process.pid, state: "working" }));
57 | 
58 |     expect(() => openStore(dir)).toThrow(/live agents/i);
59 |     expect(readFileSync(path)).toEqual(before);
60 |     expect(existsSync(join(dir, "orch.db-wal"))).toBe(false);
                                                      ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (/home/bryan/orch/test/store-connection-guards.test.ts:60:50)
(fail) store migration guards > names live presence as the thing to close before rebuilding [39.72ms]

test/retention.test.ts:
265 |   if (!result.success) {
266 |     // Every rejection below is rendered as plain guidance naming the file, what is wrong, and
267 |     // the exact command that fixes it. A raw zod issue dump never reaches the operator.
268 |     const root = parsed as Record<string, unknown> | null;
269 |     if (result.error.issues.some((issue) => issue.path[0] === "schemaVersion")) {
270 |       throw new Error(`${file}: this settings file was written by an older orch (schemaVersion ${JSON.stringify(root?.schemaVersion)}; this orch reads ${SETTINGS_SCHEMA}) and cannot be read.\nRun: orch setup`);
                                                                                                                                                                                                                      ^
error: /tmp/orch-retention-f4Lgky/settings.json: this settings file was written by an older orch (schemaVersion 4; this orch reads 5) and cannot be read.
Run: orch setup
      at readSettingsFile (/home/bryan/orch/src/config.ts:270:209)
      at loadConfigOrNull (/home/bryan/orch/src/config.ts:408:16)
      at <anonymous> (/home/bryan/orch/test/retention.test.ts:70:23)
(fail) retention sweep > retention windows are independently configurable [27.63ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [101.98ms]
(pass) retention sweep > returns zero counts when every row is inside its window [48.93ms]
Warning: retention sweep queue failed: no such table: tasks
(pass) retention sweep > continues sweeping when one table delete fails [45.21ms]
(pass) retention sweep > reaps expired agents with no presence dir and releases registry/name reservation [53.56ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [60.18ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [51.19ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [43.45ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [37.90ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [97.63ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [48.14ms]
(pass) retention sweep > does not sweep again one minute after the first tick [52.71ms]

test/web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.48ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.07ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.06ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.13ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.12ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.06ms]
(pass) commands/review > falls back to branch then pane [0.04ms]

test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.05ms]
(pass) commands/status > dead rows never display stale live state [0.03ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.04ms]
(pass) commands/status > default status reads span every workspace [0.10ms]
(pass) commands/status > derives view fields from seeded presence [0.25ms]
(pass) commands/status > marks dead presence as exited [7.24ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.50ms]
(pass) commands/status > shared status row carries presence-derived fields [0.37ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.71ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.38ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.45ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, unleased, and legacy rows [56.85ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [7.10ms]
(pass) commands/status > formats workspace labels and warnings [0.19ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [48.24ms]
(pass) workspace policy > resolves workspace names through records and functions [0.15ms]
(pass) workspace policy > compares serialized keys by their workspace [41.58ms]
(pass) workspace policy > enforces the workspace wall [47.43ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [37.98ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.34ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [51.65ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [40.04ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [46.22ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [45.84ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [38.98ms]

test/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [33.83ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [6.66ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.63ms]
(pass) config precedence > uses env over config and flag over env [0.40ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [3.88ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.65ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.10ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [39.98ms]
(pass) runDoctor > checks a healthy store [33.38ms]
(pass) runDoctor > warns when the store is absent [0.29ms]
(pass) runDoctor > fails when the store predates orch's migrations [36.24ms]
(pass) runDoctor > fails and names a missing store table [33.53ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [37.95ms]
(pass) runDoctor > reports an absent daemon as optional [36.63ms]
(pass) runDoctor > reports and fixes a stale daemon lock [35.66ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [55.66ms]
(pass) runDoctor > warns when the live daemon code hash is stale [51.97ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [79.91ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [0.85ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.50ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.53ms]
(pass) runDoctor > reports a dead presence pid [46.31ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [49.81ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.55ms]
(pass) runDoctor > validates configured notifier adapters [216.42ms]
(pass) runDoctor > reports invalid config and accepts missing config [75.14ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [78.87ms]

test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [1.39ms]

test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [46.54ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [58.56ms]
(pass) agent store rows > liveAgents excludes agents with an ending [49.46ms]
(pass) agent store rows > packMembers selects the materialized root [51.02ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [34.39ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [28.70ms]
(pass) agent store rows > label maps both null and a value [51.56ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [44.14ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [42.40ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [55.65ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [57.07ms]
(pass) agent store rows > childrenOf returns direct descendants [69.09ms]

test/close-always.test.ts:
No target matches "worker-name". Run 'orch panes' to list.
