bun test v1.3.14 (0d9b296a)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.19ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.09ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.07ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.06ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.20ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.06ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.07ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.83ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.12ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.13ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.08ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.09ms]

test/orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [486.28ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1177.47ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.58ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.37ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.20ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [150.07ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [142.36ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [4.83ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [141.88ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [140.60ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.05ms]
(pass) daemon RPC > refuses a hello without its environment [3.24ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [146.27ms]
(pass) daemon RPC > refuses a TCP hello without a token [5.30ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [3.22ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.15ms]
(pass) daemon RPC > returns an error for an unknown method [2.57ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [15.12ms]
(pass) daemon RPC > delivers pushed subscription events [141.71ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [429.50ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [144.52ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [6.91ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.40ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [104.06ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.47ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.55ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.04ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.09ms]
(pass) assistantText > reads role-tagged records [0.04ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
(pass) assistantText > undefined for non-assistant roles [0.06ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.06ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.08ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.02ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [368.27ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [287.09ms]

test/review.test.ts:
102 |     const worktreePath = createAgentWorktree(repoRoot, "feature-1");
103 |     commit(worktreePath, "feature.txt", "feature\n", "add feature");
104 |     registerDoneAgent(orchDir, "pane-1", worktreePath, worktreeBranch(worktreePath));
105 | 
106 |     const result = JSON.parse(runOrch(repoRoot, orchDir, "review", "list", "--json")) as Record<string, unknown>[];
107 |     expect(result).toHaveLength(1);
                         ^
error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 0

      at <anonymous> (/home/bryan/orch/test/review.test.ts:107:20)
(fail) review plumbing > lists only done worktree agents with commits ahead [254.36ms]
54 |     // write commands auto-start it and deliver through its code.
55 |     env: { ...process.env, ORCH_DIR: orchDir, ORCHD_ENTRYPOINT: path.join(import.meta.dir, "../src/daemon/orchd.ts") },
56 |     stdout: "pipe",
57 |     stderr: "pipe",
58 |   });
59 |   if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
                                   ^
error: orch review reject iterate-1 -m handle the empty case exited 1: No reviewable worktree matches "iterate-1". Run 'orch review list'.

      at runOrch (/home/bryan/orch/test/review.test.ts:59:31)
      at <anonymous> (/home/bryan/orch/test/review.test.ts:119:12)
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [247.37ms]
54 |     // write commands auto-start it and deliver through its code.
55 |     env: { ...process.env, ORCH_DIR: orchDir, ORCHD_ENTRYPOINT: path.join(import.meta.dir, "../src/daemon/orchd.ts") },
56 |     stdout: "pipe",
57 |     stderr: "pipe",
58 |   });
59 |   if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
                                                                                                                  ^
error: orch review approve approve-1 exited 1: No reviewable worktree matches "approve-1". Run 'orch review list'.

      at runOrch (/home/bryan/orch/test/review.test.ts:59:110)
      at <anonymous> (/home/bryan/orch/test/review.test.ts:136:12)
(fail) review plumbing > approve merges and removes the worktree and branch [246.77ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [28.28ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [34.38ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.26ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.75ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.67ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.65ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.38ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [84.88ms]

test/daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [171.65ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [144.30ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [140.52ms]
(pass) daemon presence events > a status without a dispatch id does not write history [127.08ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [148.94ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.43ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.11ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.05ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [137.94ms]
(pass) daemon presence events > a blocked transition drives command sink delivery [160.24ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [12.69ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [54.02ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.21ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [149.69ms]
(pass) run rows > upsert updates a row while preserving its original start time [187.07ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [173.48ms]
(pass) run rows > omits absent optional fields instead of returning null [133.35ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [136.94ms]
71 | function databasePath(orchDir: string): string {
72 |   return join(orchDir, "orch.db");
73 | }
74 | 
75 | function createTables(db: DatabaseLike): void {
76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
                                            ^
SQLiteError: table harnesses already exists
      at run (bun:sqlite:336:21)
      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)
      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)
      at selectRuns (/home/bryan/orch/src/store/run-rows.ts:114:11)
      at <anonymous> (/home/bryan/orch/test/store-runs.test.ts:105:12)
(fail) run rows > stays readable after the agent presence directory is deleted [135.15ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [5.39ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.31ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.17ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.14ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.21ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.33ms]
(pass) shebangRuntime > returns null for an unreadable path [0.89ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.06ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [4.29ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.52ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.43ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [0.33ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [0.36ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.31ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.34ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.28ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.28ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.31ms]

test/herdr-notify-hardening.test.ts:
91 | 
92 |     expect(handle).toBe("w6:p10");
93 |     expect(lastCall("pane", "rename")).toEqual(["pane", "rename", "w6:p10", "pi-"]);
94 |     // ONE argv value, shell-quoted: herdr joins separate words with plain spaces,
95 |     // which strips the quoting and launches the harness with no arguments.
96 |     expect(lastCall("pane", "run")).toEqual([
                                         ^
error: expect(received).toEqual(expected)

- [
-   "pane",
-   "run",
-   "w6:p10",
-   "bash -lc 'printf '\''quoted "value" spaces $HOME'\'''",
- ]
+ undefined

- Expected  - 6
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/herdr-notify-hardening.test.ts:96:37)
(fail) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.66ms]
151 |     // splits the caller's own pane and the fresh pane must be re-seated after.
152 |     const planned = typeof opts.targetPane === "string" ? opts.targetPane : null;
153 |     const handle = this.openPane(workspace, opts, planned ?? process.env.HERDR_PANE_ID ?? null);
154 |     herdrBestEffort(["pane", "rename", handle, paneName(adapter, opts)]);
155 |     const kind = HERDR_KINDS[adapter.id];
156 |     if (!kind) throw new Error(`unsupported herdr harness kind: ${String(adapter.id)}`);
                                                                                            ^
error: unsupported herdr harness kind: 
      at spawn (/home/bryan/orch/src/backends/herdr/index.ts:156:87)
      at <anonymous> (/home/bryan/orch/test/herdr-notify-hardening.test.ts:105:24)
(fail) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.20ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.16ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [149.63ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [157.98ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [154.39ms]
(pass) store hardening > the attempt insert claim is exactly once [137.06ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [235.52ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.10ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.04ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.39ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.12ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.19ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.15ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.18ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.20ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.08ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.04ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.51ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.39ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.24ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [32.37ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [29.27ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [31.98ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [31.92ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [34.42ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [28.63ms]
(skip) claude-hooks shim tests need the dist bundle

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.23ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.08ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.21ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.36ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.07ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.11ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.05ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [7.42ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.15ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.03ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.06ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.20ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.20ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.05ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.04ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.86ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.11ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.37ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [218.18ms]
(pass) rebuild schema > schema stamp and foreign keys are enabled [167.13ms]
(pass) rebuild schema > documented column declarations are exact [140.13ms]
(pass) rebuild schema > all satellite overlap triggers use documented keys [1577.34ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [1644.96ms]
(pass) rebuild schema > enforces foreign keys and agent checks [168.60ms]
(pass) rebuild schema > requires exactly one task scope [141.54ms]
(pass) rebuild schema > allows one open attempt only [148.62ms]
(pass) rebuild schema > enforces lease checks and one lease [132.95ms]
(pass) rebuild schema > rejects overlapping closed intervals [133.34ms]
(pass) rebuild schema > STRICT rejects text in integer instant [132.19ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [142.94ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [157.79ms]

test/wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [7.46ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [146.42ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [131.64ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [188.78ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [2.25ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [0.76ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [131.96ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [136.63ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [134.38ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [136.06ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.40ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.07ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.03ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.03ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.08ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.10ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.05ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.06ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.03ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.05ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.05ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [153.46ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [145.34ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [142.34ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [150.16ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member and attempts enforce the cap [154.33ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [140.40ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [157.81ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [187.79ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [255.38ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [142.35ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [153.43ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.27ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.07ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.18ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.05ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.47ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.09ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.04ms]
(pass) spawn policy caps > reads a pack cap override from settings [1.37ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.21ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.12ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.09ms]
(pass) Claude adapter > detects state from a live presence status [0.69ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.60ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.40ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [34.66ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [146.46ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [35.00ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [35.29ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [139.09ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.18ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.20ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.31ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.23ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.11ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.08ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.14ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.09ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.09ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.14ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.08ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.09ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [140.09ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.46ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [149.77ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.23ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.11ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [16.03ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.36ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.22ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [0.52ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [140.25ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.22ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.12ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [141.03ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.40ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.19ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [0.84ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [135.89ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [183.15ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [146.01ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.35ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [164.60ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [150.06ms]
(pass) commands/runs > running rows render as running, not zero duration [0.19ms]
(pass) commands/runs > result falls back to durable run history after presence reap [159.83ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [113.93ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [377.04ms]
(pass) orch settings notify > remove drops only the named sink [416.52ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [267.67ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.48ms]

test/notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [1.65ms]
(pass) notify > delivers only to sinks whose on filter matches the event [26.01ms]
(pass) notify > command sink writes the event payload as JSON on stdin [20.42ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.20ms]
(pass) notify > webhook failure is non-fatal and reports a warning [27.39ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.13ms]
(pass) TmuxBackend > reports tmux availability [0.52ms]
(pass) TmuxBackend > workspaceNames is empty — tmux sessions have no names distinct from ids [0.09ms]
(pass) TmuxBackend > reflects the TMUX environment [0.10ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.11ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.88ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.14ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.53ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.09ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.07ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.19ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.17ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.15ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.32ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.08ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.24ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.11ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.44ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.12ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle [0.01ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts [0.07ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts [0.03ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.07ms]
(pass) malformed input > rejects wrong segment count [0.13ms]
(pass) malformed input > rejects empty key [0.04ms]
(pass) malformed input > rejects empty backend or id on serialize [0.08ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.05ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [175.90ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [154.21ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [160.84ms]
(pass) lease commands > reap refuses while the recorded process is alive [144.57ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [172.96ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.39ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [270.21ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [1.55ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.05ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.47ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.41ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.24ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.74ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.28ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.71ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.67ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.54ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.27ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.41ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.27ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.31ms]
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
  remove    backbone             Remove a dependency from package.json (bun rm)
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [128.88ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [2.04ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.3.14+0d9b296af)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         vite                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       react                Add a dependency to package.json (bun a)
  remove    browserify           Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.
  feedback  ./file1 ./file2      Provide feedback to the Bun team.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [1.12ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [1.46ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [1.07ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [243.16ms]
(pass) agent lease rows > a second open lease is rejected [170.14ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [165.51ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [155.14ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [175.99ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [179.20ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [150.36ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [181.87ms]
(pass) agent lease rows > an agent cannot lease itself [166.58ms]
(pass) agent lease rows > expiry inserts nothing new [160.00ms]
(pass) agent lease rows > reads return only open rows [154.63ms]

test/queue-workspace-replay.test.ts:
71 | function databasePath(orchDir: string): string {
72 |   return join(orchDir, "orch.db");
73 | }
74 | 
75 | function createTables(db: DatabaseLike): void {
76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
                                            ^
SQLiteError: table harnesses already exists
      at run (bun:sqlite:336:21)
      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)
      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)
      at allTasks (/home/bryan/orch/src/store/task-rows.ts:181:16)
      at listTasks (/home/bryan/orch/src/queue.ts:129:10)
      at <anonymous> (/home/bryan/orch/test/queue-workspace-replay.test.ts:22:12)
(fail) queue replay keeps typed scope > a reopened store offers pack work only to that pack [170.86ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [150.36ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [163.05ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.16ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.33ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.06ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.04ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.08ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.02ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.11ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.08ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.11ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [203.56ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.62ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.17ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.38ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.16ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.36ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.21ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.22ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.11ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.20ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.44ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [147.48ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [157.74ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [153.27ms]
71 | function databasePath(orchDir: string): string {
72 |   return join(orchDir, "orch.db");
73 | }
74 | 
75 | function createTables(db: DatabaseLike): void {
76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
                                            ^
SQLiteError: table harnesses already exists
      at run (bun:sqlite:336:21)
      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)
      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)
      at withTransaction (/home/bryan/orch/src/store/connection.ts:139:14)
      at <anonymous> (/home/bryan/orch/test/store-events.test.ts:44:12)
(fail) event store rows > appendEvent keeps sequence numbers across store reopen [142.67ms]
(pass) event store rows > pruned sequence numbers are never reused [141.24ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [136.36ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [142.75ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [2.52ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [164.52ms]
111 |     delete process.env.HERDR_PANE_ID;
112 |     delete process.env.TMUX_PANE;
113 |     recordSpawned("headless~local~unowned", { backend: "headless", workspace: "local", handle: "unowned", owner: "other" });
114 |     const result = runCli(dir, ["close", "--all", "--json"], undefined);
115 |     expect(result.status).toBe(0);
116 |     expect(spawnedRecords().has("headless~local~unowned")).toBe(false);
                                                                 ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:116:60)
(fail) fleet ownership scoping > close --all works without an owner token [284.26ms]
{"closed":["mine","foreign"],"requested":2,"ok":2,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [165.61ms]
151 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, startToken: processStartToken(pid), agent: "pi", state: "working" }));
152 |     insertSpawnedRecord(dir, { pane: key, backend: "headless", adapter: "pi", handle: JSON.stringify({ pid, key }) });
153 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });
154 | 
155 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
156 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:156:27)
(fail) fleet ownership scoping > explicit foreign target closes successfully [301.69ms]
172 |         schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
173 |       }));
174 |       recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
175 |       const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
176 |       expect(result.status).not.toBe(0);
177 |       expect(result.output).toContain("other-orchestrator");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\ntable harnesses already exists\n"

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:177:29)
(fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [367.66ms]
190 |     writeFileSync(join(dir, "agents", key, "result.json"), JSON.stringify({ text: "other session's answer" }));
191 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
192 | 
193 |     const refused = runCli(dir, ["result", key], "caller-orchestrator");
194 |     expect(refused.status).not.toBe(0);
195 |     expect(refused.output).toContain("other-orchestrator");
                                 ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\n71 | function databasePath(orchDir: string): string {\n72 |   return join(orchDir, \"orch.db\");\n73 | }\n74 | \n75 | function createTables(db: DatabaseLike): void {\n76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);\n                                            ^\nSQLiteError: table harnesses already exists\n      errno: 1,\n byteOffset: 13,\n\n      at run (bun:sqlite:336:21)\n      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)\n      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)\n      at selectSpawnedRecord (/home/bryan/orch/src/store/spawned-rows.ts:111:15)\n      at placementOf (/home/bryan/orch/src/agent/registry.ts:12:18)\n      at workspaceOf (/home/bryan/orch/src/policy/workspace.ts:10:10)\n      at buildEntities (/home/bryan/orch/src/entities.ts:162:55)\n      at resolveTarget (/home/bryan/orch/src/entities.ts:229:22)\n      at cmdResult (/home/bryan/orch/src/commands/results.ts:53:15)\n\nBun v1.3.14 (Linux x64)\n"

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:195:28)
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [327.55ms]
214 |       ["move", key, "--new-tab"],
215 |     ];
216 |     for (const args of mutations) {
217 |       const result = runCli(dir, args, "caller-orchestrator");
218 |       expect(result.status).not.toBe(0);
219 |       expect(result.output).toContain("other-orchestrator");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\n71 | function databasePath(orchDir: string): string {\n72 |   return join(orchDir, \"orch.db\");\n73 | }\n74 | \n75 | function createTables(db: DatabaseLike): void {\n76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);\n                                            ^\nSQLiteError: table harnesses already exists\n      errno: 1,\n byteOffset: 13,\n\n      at run (bun:sqlite:336:21)\n      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)\n      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)\n      at selectSpawnedRecord (/home/bryan/orch/src/store/spawned-rows.ts:111:15)\n      at placementOf (/home/bryan/orch/src/agent/registry.ts:12:18)\n      at workspaceOf (/home/bryan/orch/src/policy/workspace.ts:10:10)\n      at buildEntities (/home/bryan/orch/src/entities.ts:162:55)\n      at resolveTarget (/home/bryan/orch/src/entities.ts:229:22)\n      at backendTarget (/home/bryan/orch/src/commands/target.ts:161:15)\n\nBun v1.3.14 (Linux x64)\n"

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:219:29)
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [282.16ms]
230 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid, startToken: processStartToken(pid), agent: "pi", state: "working" }));
231 |     insertSpawnedRecord(dir, { pane: key, backend: "headless", adapter: "pi", handle: JSON.stringify({ pid, key }) });
232 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });
233 | 
234 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
235 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:235:27)
(fail) fleet ownership scoping > close ignores --force and remains unconditional [319.96ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [0.29ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [339.05ms]
269 |     recordSpawned("headless~wF~mine", { backend: "headless", workspace: "wF", handle: "mine", owner: agentKey });
270 |     recordSpawned("headless~wF~theirs", { backend: "headless", workspace: "wF", handle: "theirs", owner: "herdr~wF~operator" });
271 | 
272 |     const result = runCli(dir, ["close", "--all", "--json"], undefined, { ORCH_AGENT_KEY: agentKey });
273 |     expect(result.status).toBe(0);
274 |     expect(spawnedRecords().has("headless~wF~mine")).toBe(false);
                                                           ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:274:54)
(fail) a spawned agent touches only what it spawned > close --all sweeps every managed spawn [265.21ms]
281 |     mkdirSync(join(dir, "agents", key), { recursive: true });
282 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
283 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "wF", handle: key, owner: "herdr~wF~operator" });
284 | 
285 |     const result = runCli(dir, ["close", key], undefined, { ORCH_AGENT_KEY: agentKey });
286 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:286:27)
(fail) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [281.58ms]
295 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
296 |     recordSpawned(key, { backend: "herdr", adapter: "pi", workspace: "wF", handle: key, owner: agentKey });
297 | 
298 |     const result = runCli(dir, ["close", key], "herdr~wF~operator");
299 |     // Assert on the pair so a non-zero exit prints what orch actually said.
300 |     expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
                                                                   ^
error: expect(received).toMatchObject(expected)

  {
-   "status": 0,
+   "output": 
+ "
+ 71 | function databasePath(orchDir: string): string {
+ 72 |   return join(orchDir, "orch.db");
+ 73 | }
+ 74 | 
+ 75 | function createTables(db: DatabaseLike): void {
+ 76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
+                                             ^
+ SQLiteError: table harnesses already exists
+       errno: 1,
+  byteOffset: 13,
+ 
+       at run (bun:sqlite:336:21)
+       at createTables (/home/bryan/orch/src/store/connection.ts:76:40)
+       at openStore (/home/bryan/orch/src/store/connection.ts:120:3)
+       at selectSpawnedRecord (/home/bryan/orch/src/store/spawned-rows.ts:111:15)
+       at placementOf (/home/bryan/orch/src/agent/registry.ts:12:18)
+       at workspaceOf (/home/bryan/orch/src/policy/workspace.ts:10:10)
+       at buildEntities (/home/bryan/orch/src/entities.ts:162:55)
+       at resolveLifecycleTarget (/home/bryan/orch/src/commands/target.ts:194:20)
+       at cmdClose (/home/bryan/orch/src/commands/lifecycle.ts:423:22)
+ 
+ Bun v1.3.14 (Linux x64)
+ "
+ ,
+   "status": 1,
  }

- Expected  - 1
+ Received  + 27

      at <anonymous> (/home/bryan/orch/test/owner-scoping.test.ts:300:62)
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [268.05ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.50ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [0.78ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [0.45ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [0.49ms]
(pass) loadConfig > reads the declared runtime [0.31ms]
82 |       workspaces: { wD: "Design" },
83 |       daemon: { tcp_port: 4321 },
84 |       tiling: { first_split: "columns" },
85 |     });
86 | 
87 |     expect(loadConfig(directory)).toEqual({
                                       ^
error: expect(received).toEqual(expected)

  {
    "daemon": {
      "idle_shutdown_minutes": 30,
      "tcp_port": 4321,
    },
    "defaults": {
      "adapter": "claude",
      "backend": "headless",
      "models": {
        "claude": "sonnet",
      },
      "worktree": true,
    },
    "enabled": {
      "adapters": [
        "pi",
        "claude",
      ],
      "backends": [
        "headless",
      ],
    },
    "fleet": {
      "cross_workspace": true,
      "max_agents": 12,
+     "pack_cap": 10,
      "spawn_cap": 4,
      "worker_peer_tools": true,
      "workspace_caps": {
        "wD": 4,
      },
    },
    "hosts": {
      "gpu1": {
        "dest": "bryan@gpu1",
      },
    },
    "locked_commands": [],
    "models": {
      "allowed": {
        "claude": [
          "sonnet",
          "opus",
        ],
      },
      "preferred": {
        "claude": [
          "sonnet",
        ],
      },
    },
    "notify": [
      {
        "id": "webhook",
        "on": [
          "done",
          "error",
        ],
        "url": "https://example.test/orch",
      },
    ],
    "queue": {
      "max_retries": 3,
    },
    "retention": {
      "ended_agents_days": 6,
      "events_days": 2,
      "logs_days": 7,
      "outbox_days": 4,
      "queue_days": 1,
      "runs_days": 3,
    },
    "runtime": "node",
    "skills": {
      "install": true,
      "roots": [
        "~/.claude/skills",
        "~/.agents/skills",
      ],
    },
    "tiling": {
      "first_split": "columns",
    },
    "timeouts": {
      "adapter_command_ms": 33,
      "dispatch_ack_ms": 11,
      "notify_ms": 44,
      "wait_ms": 22,
    },
    "workers": {
      "allow_tools": [],
      "builtin_tools": true,
      "exclude_extensions": [],
      "inherit_extensions": true,
    },
    "workspaces": {
      "wD": "Design",
    },
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/config.test.ts:87:35)
(fail) loadConfig > parses every supported settings section [1.23ms]
(pass) loadConfig > rejects a file without the current schemaVersion [0.44ms]
(pass) loadConfig > rejects invalid JSON loudly [0.20ms]
(pass) loadConfig > names the key path for invalid fields [0.42ms]
(pass) loadConfig > rejects unknown settings keys [0.59ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [0.55ms]
(pass) loadConfig > rejects old settings keys [1.59ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [1.32ms]
168 | 
169 |   test("applies every settings default when sections are absent", () => {
170 |     const directory = tempDir();
171 |     fs.writeFileSync(path.join(directory, "settings.json"), JSON.stringify({ schemaVersion: SETTINGS_SCHEMA, runtime: "node" }));
172 | 
173 |     expect(loadConfig(directory)).toEqual({
                                        ^
error: expect(received).toEqual(expected)

  {
    "daemon": {
      "idle_shutdown_minutes": 30,
      "tcp_port": 3716,
    },
    "defaults": {
      "models": {},
      "worktree": false,
    },
    "enabled": {
      "adapters": [],
      "backends": [],
    },
    "fleet": {
      "cross_workspace": false,
      "max_agents": undefined,
+     "pack_cap": 10,
      "spawn_cap": 8,
      "worker_peer_tools": false,
      "workspace_caps": {},
    },
    "hosts": {},
    "locked_commands": [],
    "models": {
      "allowed": {},
      "preferred": {},
    },
    "notify": [],
    "queue": {
      "max_retries": 1,
    },
    "retention": {
      "ended_agents_days": 90,
      "events_days": 7,
      "logs_days": 7,
      "outbox_days": 7,
      "queue_days": 14,
      "runs_days": 30,
    },
    "runtime": "node",
    "skills": {
      "install": true,
      "roots": [
        "~/.claude/skills",
        "~/.agents/skills",
      ],
    },
    "tiling": {
      "first_split": "rows",
    },
    "timeouts": {
      "adapter_command_ms": 60000,
      "dispatch_ack_ms": 10000,
      "notify_ms": 3000,
      "wait_ms": 300000,
    },
    "workers": {
      "allow_tools": [],
      "builtin_tools": true,
      "exclude_extensions": [],
      "inherit_extensions": true,
    },
    "workspaces": {},
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/config.test.ts:173:35)
(fail) loadConfig > applies every settings default when sections are absent [0.76ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [0.96ms]
(pass) loadConfig > rejects a host without dest [0.63ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [0.62ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [0.40ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.36ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.17ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.35ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.34ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.73ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [1.18ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.80ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.28ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.73ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [2.04ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.79ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [1.12ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.51ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.69ms]
369 |     writeSettingsFullTree(directory);
370 | 
371 |     const raw = JSON.parse(fs.readFileSync(path.join(directory, "settings.json"), "utf8")) as {
372 |       fleet?: Record<string, unknown>;
373 |     };
374 |     expect(raw.fleet).toEqual({ spawn_cap: 8, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false });
                            ^
error: expect(received).toEqual(expected)

  {
    "cross_workspace": false,
+   "pack_cap": 10,
    "spawn_cap": 8,
    "worker_peer_tools": false,
    "workspace_caps": {},
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/config.test.ts:374:23)
(fail) writeSettingsFullTree > round-trips defaults without inventing max_agents [1.06ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.33ms]
(pass) config precedence > uses the settings.json value over the fallback [0.34ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.29ms]
(pass) config precedence > uses an explicit flag override over the environment [0.03ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.08ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [0.33ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.30ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [1.92ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [2.01ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [2.17ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.57ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [2.63ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [2.20ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [396.44ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.77ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [184.44ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.80ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.61ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.61ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [0.96ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.28ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.31ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [1.64ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.09ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.05ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.07ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.05ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.04ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.04ms]
(pass) worker prompt capability composition > events strip both worker header variants [144.57ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.43ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.70ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [1.33ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [144.32ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [1.33ms]
(pass) commands/target > extracts target and joined prompt [0.23ms]
(pass) commands/target > reads only structured result text [0.06ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.14ms]
(pass) commands/target > lists only live serialized identity presence entries [1.20ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [150.26ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [161.84ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [161.51ms]

test/commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [147.63ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.31ms]

test/store-task-rows.test.ts:
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [170.15ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [160.29ms]
(pass) task and attempt rows > two separate connections cannot insert two open attempts [150.73ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [159.98ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [212.79ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [187.30ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [151.41ms]

test/pi-footer.test.ts:
(pass) orch pi footer > puts model and thinking level first, in that order [3.02ms]
(pass) orch pi footer > truncates the model first so thinking stays visible in narrow panes [0.53ms]
(pass) orch pi footer > uses explicit fallbacks when pi has not selected a model yet [0.02ms]

test/command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [147.99ms]
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [146.51ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [13.56ms]
(pass) worktree primitives > detects commits ahead of a base branch [21.06ms]
(pass) worktree primitives > removes an agent worktree [14.63ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.41ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [33.95ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [41.67ms]
(pass) presence status schema > status and list report the same agent identity [191.55ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [40.71ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [40.41ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [42.00ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [32.39ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [38.47ms]
71 | function databasePath(orchDir: string): string {
72 |   return join(orchDir, "orch.db");
73 | }
74 | 
75 | function createTables(db: DatabaseLike): void {
76 |   for (const ddl of CORE_TABLE_DDL) db.exec(ddl);
                                            ^
SQLiteError: table harnesses already exists
      at run (bun:sqlite:336:21)
      at createTables (/home/bryan/orch/src/store/connection.ts:76:40)
      at openStore (/home/bryan/orch/src/store/connection.ts:120:3)
      at insertSpawnedRecord (/home/bryan/orch/src/store/spawned-rows.ts:70:3)
      at recordSpawned (/home/bryan/orch/src/presence/store.ts:182:3)
      at <anonymous> (/home/bryan/orch/test/presence-schema.test.ts:144:5)
(fail) presence status schema > persists the complete spawned identity record [8.37ms]

test/notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [18.77ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [0.68ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.77ms]
(pass) command lock > second acquire blocks until first releases [36.44ms]
(pass) command lock > dead-pid lock is reaped [0.57ms]
(pass) command lock > release with wrong pid refuses [0.32ms]
bun test held by agent-a (pid 25184)
(pass) command lock > matches locked command prefixes and probes settings [1.40ms]
(pass) command lock > run propagates the child exit code [17.46ms]

test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.09ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.12ms]

test/broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [139.55ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [148.84ms]

test/cmd-lock-bridge.test.ts:
88 |       toolCallId,
89 |       args: { command: LOCKED_COMMAND },
90 |     });
91 | 
92 |     const held = readCommandLock(orchDir);
93 |     expect(held).not.toBeNull();
                          ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (/home/bryan/orch/test/cmd-lock-bridge.test.ts:93:22)
(fail) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [4.67ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [1.14ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.50ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [152.64ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [1.14ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [0.97ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [145.09ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [145.19ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [236.77ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [200.66ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [206.82ms]

test/ownership.test.ts:
(pass) agent ownership > round-trips an owner [154.38ms]
(pass) agent ownership > allows unowned and same-owner writes [150.24ms]
(pass) agent ownership > denies foreign writes and supports stealing [146.59ms]

test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.07ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.04ms]
(pass) per-command help topics > an unknown name has no topic [0.02ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.10ms]

test/spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [158.83ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [241.78ms]
(pass) spawn name numbering > a dead agent frees its name and its index [156.49ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [140.08ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [141.91ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [169.34ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [160.25ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [171.81ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [150.24ms]

test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [138.09ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [147.34ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.44ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [150.19ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.25ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.17ms]

test/store-spawned.test.ts:
(pass) spawned and ownership store rows > ownership table has no workspace column [140.02ms]
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner in one query [224.78ms]
(pass) spawned and ownership store rows > writeSpawnedName updates an existing pane and reports missing panes [208.81ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [156.02ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [146.76ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [144.99ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [144.36ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [31.07ms]
(pass) async remote fan-out > returns a typed dead-host failure [30.57ms]
(pass) async remote fan-out > returns a typed timeout failure [506.78ms]
(pass) async remote fan-out > returns a typed non-JSON failure [27.67ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [507.30ms]

test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.15ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.05ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.20ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.07ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.05ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.06ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.85ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.17ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [42.17ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [10.57ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.21ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty — headless has no name concept [0.26ms]
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [156.46ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [26.98ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [71.40ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [27.12ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [50.72ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [3.54ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [4.15ms]
(pass) HeadlessBackend > never signals an unrecorded pid [0.58ms]

test/commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [3.68ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.21ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [171.92ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [146.27ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [161.12ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [147.19ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [160.97ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [148.41ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [137.54ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [152.41ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [132.00ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [132.22ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [142.94ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [130.88ms]

test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [104.29ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [277.57ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1343.76ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [3845.80ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [850.75ms]

test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [184.91ms]
(pass) catalogue rows > write then read round-trips at and stdout [314.51ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [259.56ms]
(pass) catalogue rows > an entry with empty stdout is not stored [252.35ms]
(pass) catalogue rows > clearCatalogues empties the store [333.82ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [305.77ms]

test/spawn-limits.test.ts:
46 | 
47 | describe("spawn limits", () => {
48 |   test("schema loads global and workspace caps", () => {
49 |     const dir = tempDir();
50 |     writeSettingsFixture(dir, { fleet: { max_agents: 12, workspace_caps: { wD: 4 } } });
51 |     expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, max_agents: 12, workspace_caps: { wD: 4 }, worker_peer_tools: false, cross_workspace: false });
                                       ^
error: expect(received).toEqual(expected)

  {
    "cross_workspace": false,
    "max_agents": 12,
+   "pack_cap": 10,
    "spawn_cap": 8,
    "worker_peer_tools": false,
    "workspace_caps": {
      "wD": 4,
    },
  }

- Expected  - 0
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/spawn-limits.test.ts:51:35)
(fail) spawn limits > schema loads global and workspace caps [2.26ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.88ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.88ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.78ms]
59 |   });
60 | 
61 |   test("omitted fleet caps normalize to defaults", () => {
62 |     const dir = tempDir();
63 |     writeSettingsFixture(dir);
64 |     expect(loadConfig(dir).fleet).toEqual({ spawn_cap: 8, workspace_caps: {}, worker_peer_tools: false, cross_workspace: false });
                                       ^
error: expect(received).toEqual(expected)

  {
    "cross_workspace": false,
+   "max_agents": undefined,
+   "pack_cap": 10,
    "spawn_cap": 8,
    "worker_peer_tools": false,
    "workspace_caps": {},
  }

- Expected  - 0
+ Received  + 2

      at <anonymous> (/home/bryan/orch/test/spawn-limits.test.ts:64:35)
(fail) spawn limits > omitted fleet caps normalize to defaults [1.22ms]
(pass) spawn limits > global boundary refusal data counts the whole request [2.18ms]
(pass) spawn limits > one workspace may use the full global allotment [0.64ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.44ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [0.44ms]
(pass) spawn limits > dead pid records free capacity [0.38ms]
(pass) spawn limits > foreign panes never count [0.45ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [314.92ms]
(pass) spawn limits > doctor accepts satisfiable limits [280.34ms]

test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.11ms]
(pass) store row values > sets only non-null fields [0.09ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [28.42ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [397.05ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [25.48ms]
(pass) watchConfig > stop prevents further callbacks [405.54ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [554.78ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [6.15ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [7.44ms]

test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.37ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.13ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.06ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.69ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.57ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [4.09ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.29ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [3.23ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2011.39ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [1.41ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [0.69ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.18ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.11ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.11ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.08ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.07ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [1.68ms]

test/commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [4.73ms]
(pass) commands/events > parses filters and scope flags [0.20ms]
(pass) commands/events > parses the wake-up flags [0.08ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.39ms]
(pass) commands/events > keeps my spawned agent in scope before its lease is written [0.05ms]
(pass) commands/events > excludes my spawned agent while another orch holds its lease [0.03ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.30ms]
(pass) commands/events > names one agent by name or by identity key [0.46ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.90ms]
(pass) commands/events > rejects malformed event and labels sinks [0.32ms]

test/store-interval-rows.test.ts:
(pass) interval satellites > closeThenOpen is atomic [316.38ms]
(pass) interval satellites > only one open interval is allowed [484.26ms]
(pass) interval satellites > closed process intervals cannot overlap [612.59ms]
(pass) interval satellites > closed space intervals cannot overlap [357.96ms]
(pass) interval satellites > half-open adjacency is legal [523.94ms]
(pass) interval satellites > clearSpace closes without opening [231.22ms]
(pass) interval satellites > agent plexer is immutable one-shot [196.05ms]
(pass) interval satellites > process restart history closes at the successor since [261.25ms]
(pass) interval satellites > process rows carry host and process identity [614.38ms]
(pass) interval satellites > nullable process start_token round-trips as null [401.03ms]
(pass) interval satellites > space move history closes at the successor since [286.34ms]
(pass) interval satellites > tuning change history closes at the successor since [207.59ms]
(pass) interval satellites > handle history preserves each renumbered handle [216.25ms]
(pass) interval satellites > interval instants are stored as INTEGER values [194.67ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [177.44ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [185.38ms]
(pass) interval satellites > tuning carries model and nullable thinking [176.68ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.37ms]
(pass) commands/control > parses --then destination and note [0.10ms]
(pass) commands/control > adds worker header unless raw [0.09ms]

test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [196.87ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [180.60ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [4.20ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [1.70ms]

test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [172.99ms]
41 |   db.query("UPDATE tasks SET created_at=? WHERE id=?").run(Date.parse(ts), task.id);
42 |   if (state !== "queued") {
43 |     claimTask(dir, task.id, "queue-agent", `${text}-dispatch`);
44 |     if (state === "done") {
45 |       recordTaskDone(dir, task.id);
46 |       db.query("UPDATE task_attempts SET until=? WHERE task_id=?").run(Date.parse(ts), task.id);
                                                                        ^
SQLiteError: CHECK constraint failed: until IS NULL OR until > since
      at #run (bun:sqlite:185:20)
      at seedQueueTask (/home/bryan/orch/test/retention.test.ts:46:68)
      at <anonymous> (/home/bryan/orch/test/retention.test.ts:78:5)
(fail) retention sweep > uses each table's own window and keeps queued and claimed tasks [339.30ms]
41 |   db.query("UPDATE tasks SET created_at=? WHERE id=?").run(Date.parse(ts), task.id);
42 |   if (state !== "queued") {
43 |     claimTask(dir, task.id, "queue-agent", `${text}-dispatch`);
44 |     if (state === "done") {
45 |       recordTaskDone(dir, task.id);
46 |       db.query("UPDATE task_attempts SET until=? WHERE task_id=?").run(Date.parse(ts), task.id);
                                                                        ^
SQLiteError: CHECK constraint failed: until IS NULL OR until > since
      at #run (bun:sqlite:185:20)
      at seedQueueTask (/home/bryan/orch/test/retention.test.ts:46:68)
      at <anonymous> (/home/bryan/orch/test/retention.test.ts:101:5)
(fail) retention sweep > returns zero counts when every row is inside its window [191.69ms]
Warning: retention sweep queue failed: no such table: tasks
(pass) retention sweep > continues sweeping when one table delete fails [370.93ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [216.97ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [203.70ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [176.97ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [175.05ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [170.97ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [186.63ms]
(pass) retention sweep > does not sweep again one minute after the first tick [187.22ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [2.68ms]
(pass) commands/review > falls back to branch then pane [0.05ms]

test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.08ms]
(pass) commands/status > dead rows never display stale live state [0.09ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.07ms]
(pass) commands/status > default status reads span every workspace [0.18ms]
(pass) commands/status > derives view fields from seeded presence [1.01ms]
(pass) commands/status > marks dead presence as exited [0.44ms]
(pass) commands/status > shared status row carries presence-derived fields [0.18ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.14ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.09ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.13ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.21ms]
(pass) commands/status > formats workspace labels and warnings [0.21ms]

test/workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [174.86ms]
(pass) workspace policy > resolves workspace names through records and functions [0.23ms]
(pass) workspace policy > compares serialized keys by their workspace [198.72ms]
(pass) workspace policy > enforces the workspace wall [193.08ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [196.98ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.53ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [209.63ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [181.53ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [181.36ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [189.59ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [168.10ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [4.00ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.57ms]
(pass) config precedence > uses env over config and flag over env [0.52ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.78ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.61ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [2.56ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [177.57ms]
(pass) runDoctor > checks a healthy store [298.86ms]
(pass) runDoctor > warns when the store is absent [0.58ms]
(pass) runDoctor > fails when the store schema stamp is wrong [178.41ms]
(pass) runDoctor > fails and names a missing store table [204.18ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [191.00ms]
(pass) runDoctor > reports an absent daemon as optional [180.10ms]
(pass) runDoctor > reports and fixes a stale daemon lock [194.95ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [186.28ms]
(pass) runDoctor > warns when the live daemon code hash is stale [184.20ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [454.37ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [2.33ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [1.05ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.91ms]
(pass) runDoctor > reports a dead presence pid [197.60ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [236.58ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.16ms]
(pass) runDoctor > validates configured notifier adapters [749.35ms]
notify: could not load settings.json: /tmp/orch-doctor-DBYzvv/settings.json: this settings file has invalid values: ✖ Invalid input: expected number, received string → at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [367.75ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [398.94ms]

test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [11.71ms]

test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [189.16ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [168.34ms]
(pass) agent store rows > liveAgents excludes agents with an ending [172.13ms]
(pass) agent store rows > packMembers selects the materialized root [167.63ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [141.88ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [145.04ms]
(pass) agent store rows > label maps both null and a value [166.17ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [156.66ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [161.24ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [156.71ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [174.93ms]
(pass) agent store rows > childrenOf returns direct descendants [157.13ms]

test/close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [157.43ms]
{"closed":["headless~foreign~owned"],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [135.95ms]
{"target":"headless~foreign~abort","aborted":true}
(pass) close always works > abort ignores owner gate [689.14ms]
127 |       schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "done",
128 |     }));
129 | 
130 |     const result = runCli(dir, ["close", key, "--json"]);
131 | 
132 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (/home/bryan/orch/test/close-always.test.ts:132:27)
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [320.07ms]
(pass) close always works > steer remains blocked by the workspace wall [155.94ms]

test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [3.29ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.17ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.07ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.15ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.09ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.11ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.04ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.18ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.13ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.52ms]
(pass) orch models --json > emits the pinned harness/model shape [0.15ms]

test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [144.19ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [148.54ms]

test/commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.12ms]
(pass) commands/results > formats invalid and recent timestamps [0.16ms]
(pass) commands/results > routes a seeded result.json through the command module [146.82ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [174.22ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [155.38ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [168.08ms]
(pass) commands/results > orch session reports the pi entry count [179.60ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [142.53ms]

test/workspace-walls.test.ts:
(pass) workspace helpers > reads workspace ids from the spawned registry [0.30ms]
(pass) workspace helpers > derives an entity workspace from the registry [0.23ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [0.14ms]
(pass) workspace wall writes > allows a write within the same workspace [0.12ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.09ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.25ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.07ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.05ms]

test/control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [1.72ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [0.94ms]
(pass) deliverControl > still answers a pane awaiting an answer [1.40ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [1.25ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [151.34ms]
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > fails when claude keys fallback cannot deliver [178.61ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [4.40ms]
(pass) deliverControl > requires presence for inbox delivery [153.26ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [150.40ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [132.96ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [2.25ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.11ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.06ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.04ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.07ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.13ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.09ms]
(pass) HerdrBackend > a pane split off the caller's own pane is moved into the fleet's tab [0.21ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.06ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.06ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.14ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.10ms]
(pass) HerdrBackend > deliver submits with agent prompt, not the removed agent send [0.05ms]
(pass) HerdrBackend > a run payload still goes through pane run [0.03ms]
(pass) HerdrBackend > waitAgentStatus uses agent wait --until, not the removed top-level wait [0.07ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.26ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [143.22ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [158.97ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [164.17ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [161.09ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [8.29ms]

test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [149.18ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [160.83ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [177.72ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [151.64ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [141.09ms]

test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.19ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.05ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.48ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.25ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.95ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [17.95ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [0.81ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.59ms]

test/settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [115.13ms]
(pass) orch settings > --json reports env as the winning source over settings.json [125.34ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [468.71ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [180.41ms]
(pass) orch settings > a load error surfaces loudly with no partial table [144.79ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [193.28ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [223.01ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [186.24ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [166.59ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [1770.09ms]

test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [2.35ms]
(pass) commands/index > reads a package version string [0.24ms]

test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [176.42ms]
(pass) outbox store rows > reports one message's pending state [167.13ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [154.34ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [206.39ms]

test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.07ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.08ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.12ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.04ms]

test/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [1.80ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [1.38ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [1.36ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


27 tests failed:
(fail) review plumbing > lists only done worktree agents with commits ahead [254.36ms]
(fail) review plumbing > reject re-dispatches feedback through the adapter inbox [247.37ms]
(fail) review plumbing > approve merges and removes the worktree and branch [246.77ms]
(fail) run rows > stays readable after the agent presence directory is deleted [135.15ms]
(fail) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.66ms]
(fail) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.20ms]
(fail) queue replay keeps typed scope > a reopened store offers pack work only to that pack [170.86ms]
(fail) event store rows > appendEvent keeps sequence numbers across store reopen [142.67ms]
(fail) fleet ownership scoping > close --all works without an owner token [284.26ms]
(fail) fleet ownership scoping > explicit foreign target closes successfully [301.69ms]
(fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [367.66ms]
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [327.55ms]
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [282.16ms]
(fail) fleet ownership scoping > close ignores --force and remains unconditional [319.96ms]
(fail) a spawned agent touches only what it spawned > close --all sweeps every managed spawn [265.21ms]
(fail) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [281.58ms]
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [268.05ms]
(fail) loadConfig > parses every supported settings section [1.23ms]
(fail) loadConfig > applies every settings default when sections are absent [0.76ms]
(fail) writeSettingsFullTree > round-trips defaults without inventing max_agents [1.06ms]
(fail) presence status schema > persists the complete spawned identity record [8.37ms]
(fail) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [4.67ms]
(fail) spawn limits > schema loads global and workspace caps [2.26ms]
(fail) spawn limits > omitted fleet caps normalize to defaults [1.22ms]
(fail) retention sweep > uses each table's own window and keeps queued and claimed tasks [339.30ms]
(fail) retention sweep > returns zero counts when every row is inside its window [191.69ms]
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [320.07ms]

 822 pass
 1 skip
 27 fail
 4253 expect() calls
Ran 850 tests across 125 files. [77.96s]
