bun test v1.4.0 (34cbb9a40)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.10ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.05ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.09ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.02ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.29ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.14ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.05ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [1.27ms]

test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [53.94ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [40.27ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [38.97ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [52.01ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [29.50ms]

test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.17ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [14.11ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [339.31ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1064.87ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.08ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.26ms]
Selection recorded in /tmp/orch-setup-characterization-x8dBNH/settings.json:
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
  /tmp/orch-setup-characterization-x8dBNH/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  ok      orch  (/home/bryan/.local/bin/orch)
  ok      pif  (/home/bryan/.local/bin/pif)
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 31/32 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [155.33ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.15ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [46.39ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [31.20ms]

test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.48ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.12ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.27ms]

test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.43ms]
(pass) notify router > passes typed webhook and command configuration [0.30ms]
(pass) notify router > surfaces notifier errors [0.14ms]

test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [23.50ms]
(pass) status performance seams > resolves orchestrator id once per status call [18.53ms]

test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [61.60ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [41.18ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [52.26ms]

test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.90ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.65ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.50ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.84ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.56ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.52ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.73ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5030.08ms]
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [258.98ms]
(pass) daemon RPC > round-trips a call over the real unix socket [3.03ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [45.50ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [79.72ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [40.56ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [52.49ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.89ms]
(pass) daemon RPC > refuses a hello without its environment [4.73ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [48.11ms]
(pass) daemon RPC > refuses a TCP hello without a token [4.48ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.55ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.94ms]
(pass) daemon RPC > returns an error for an unknown method [2.64ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.15ms]
(pass) daemon RPC > delivers pushed subscription events [43.85ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [306.54ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [33.08ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [4.93ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.46ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [103.26ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.12ms]

test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [54.58ms]
(pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [42.00ms]
(pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back — silence is the worst outcome [46.64ms]
(pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error — delivery is best-effort, the task stays settled [45.06ms]

test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [98.52ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [66.82ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [47.74ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [49.50ms]

test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [36.87ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [31.89ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.42ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [0.90ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.59ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1.24ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.45ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.46ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.54ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.31ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.01ms]
(pass) assistantText > undefined for non-assistant roles [0.01ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.09ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.07ms]

test/close-is-keyed-by-agent-id.test.ts:
104 | 
105 |     withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));
106 | 
107 |     // The reported failure in one assertion: orch asked `herdr pane close
108 |     // 2d6biywurb`, an agent id in the place a pane handle goes.
109 |     expect(backend.closed).not.toContain("2d6biywurb");
                                     ^
error: expect(received).not.toContain(expected)

Expected to not contain: "2d6biywurb"
Received: [ "2d6biywurb" ]

      at <anonymous> (/home/bryan/orch/test/close-is-keyed-by-agent-id.test.ts:109:32)
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [42.91ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [41.12ms]
130 | 
131 |     const { text } = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all"]); }));
132 | 
133 |     // One listing must speak ONE vocabulary. `Closed w7:p3C.` names a herdr
134 |     // coordinate a person never typed and cannot address anything else with.
135 |     expect(text).toContain("zcixvdjos8");
                       ^
error: expect(received).toContain(expected)

Expected to contain: "zcixvdjos8"
Received: "Closed w7:p3C.\n"

      at <anonymous> (/home/bryan/orch/test/close-is-keyed-by-agent-id.test.ts:135:18)
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [41.35ms]
142 |     const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3D")] });
143 | 
144 |     const { payload } = withRegisteredBackend(backend, () =>
145 |       capture(() => { cmdClose(["--all", "--json"]); }));
146 | 
147 |     expect(payload.closed).toEqual(["3ng6mmpi8e"]);
                                 ^
error: expect(received).toEqual(expected)

  [
-   "3ng6mmpi8e",
+   "w7:p3D",
  ]

- Expected  - 1
+ Received  + 1

      at <anonymous> (/home/bryan/orch/test/close-is-keyed-by-agent-id.test.ts:147:28)
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [42.94ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [47.99ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [277.08ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [164.01ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [195.42ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [534.50ms]
(pass) review plumbing > approve merges and removes the worktree and branch [246.86ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [44.92ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [45.26ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.19ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.50ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.39ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.35ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.23ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [94.67ms]

test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [3.68ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [48.28ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [48.13ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [39.96ms]
(pass) daemon presence events > a status without a dispatch id does not write history [30.88ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [39.05ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.31ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.07ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.04ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.03ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.06ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.27ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [32.73ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [0.47ms]
(pass) daemon presence events > an asking transition drives command sink delivery [11.33ms]

test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [26.48ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [25.86ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.79ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.26ms]

test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [56.75ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [42.04ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [49.40ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [2.35ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.15ms]
(pass) commands/panes > exports the pane listing command directly [0.06ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [27.43ms]
(pass) run rows > upsert updates a row while preserving its original start time [25.71ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [31.14ms]
(pass) run rows > omits absent optional fields instead of returning null [30.31ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [38.35ms]
(pass) run rows > stays readable after the agent presence directory is deleted [44.45ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.44ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.30ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.20ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.18ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.21ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.20ms]
(pass) shebangRuntime > returns null for an unreadable path [0.19ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.55ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.41ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.23ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.29ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.23ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.32ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.29ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.32ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.34ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.24ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.86ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.13ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.16ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.13ms]

test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.53ms]
(pass) settings editor reducer > opens the focused setting for editing [0.07ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.03ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.18ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.07ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.04ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.04ms]

test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [41.14ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [34.03ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [32.75ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [29.99ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [32.80ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [18.53ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [34.42ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [26.13ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [32.00ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [39.19ms]
(pass) store hardening > the attempt insert claim is exactly once [33.64ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [115.26ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [44.69ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [33.28ms]

test/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [128.53ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.25ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.27ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.05ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.03ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.04ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.05ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.05ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.38ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.15ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [1.63ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.54ms]

test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [2.24ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [1.01ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a composite key handed over no identity [0.35ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.63ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.23ms]
(pass) this process's own identity is the id and nothing else > a composite key never yields an identity, whole or in pieces [0.30ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [0.96ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > a malformed launch key walls the caller in, it does not free them [0.55ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [47.18ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [40.01ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [0.87ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [0.52ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.22ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.21ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.10ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.51ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.02ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.34ms]

test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [37.23ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [65.55ms]
61 | 
62 |     test("exits 1 loudly on a present-but-malformed key", () => {
63 |       const result = runShim(runtime, "Stop", { ORCH_AGENT_KEY: "garbage", ORCH_DIR: tempOrchDir() });
64 | 
65 |       expect(result.status).toBe(1);
66 |       expect(result.stderr).toContain("identity");
                                 ^
error: expect(received).toContain(expected)

Expected to contain: "identity"
Received: ""

      at <anonymous> (/home/bryan/orch/test/claude-hooks-shim.test.ts:66:29)
(fail) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [110.63ms]
(node:31670) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(pass) claude-hooks shim > under node > writes status.json for a valid key [79.30ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [64.00ms]
61 | 
62 |     test("exits 1 loudly on a present-but-malformed key", () => {
63 |       const result = runShim(runtime, "Stop", { ORCH_AGENT_KEY: "garbage", ORCH_DIR: tempOrchDir() });
64 | 
65 |       expect(result.status).toBe(1);
66 |       expect(result.stderr).toContain("identity");
                                 ^
error: expect(received).toContain(expected)

Expected to contain: "identity"
Received: ""

      at <anonymous> (/home/bryan/orch/test/claude-hooks-shim.test.ts:66:29)
(fail) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [60.06ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [56.46ms]
(skip) claude-hooks shim tests need the dist bundle

test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [39.81ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [46.23ms]
(pass) the agent composer > tuning is not environment: it survives a move [36.49ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [40.17ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [36.78ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [35.55ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [32.67ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [37.29ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.41ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [34.66ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [31.69ms]

test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [23.38ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [23.29ms]
(pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stdout [149.31ms]

test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [4.00ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.13ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.15ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.14ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.21ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.11ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.05ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.05ms]

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.09ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.31ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.14ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.05ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.27ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.18ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.05ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.54ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.11ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.24ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.07ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [9.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.24ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.04ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [1.39ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.14ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.31ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.11ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.04ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.33ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.41ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.11ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [25.77ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.22ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [10.27ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.19ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.03ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.46ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.03ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.12ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.02ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [45.77ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.17ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.06ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.04ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [21.97ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [26.07ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [406.11ms]
(pass) rebuild schema > enforces foreign keys and agent checks [33.33ms]
(pass) rebuild schema > requires exactly one task scope [34.38ms]
(pass) rebuild schema > allows one open attempt only [36.04ms]
(pass) rebuild schema > enforces lease checks and one lease [35.78ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [46.44ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [53.54ms]

test/dispatch-correlation.test.ts:
(pass) dispatch correlation > one dispatch id produces the whole life of that dispatch [648.19ms]

test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [8.11ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [47.27ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [69.28ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [51.84ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [54.74ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [32.08ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [52.37ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.51ms]
(pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [0.75ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [0.59ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [26.05ms]
(pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [48.47ms]
(pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [48.33ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.45ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.13ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.04ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.03ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.11ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.09ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.14ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.06ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.09ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.08ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.61ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.03ms]

test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.76ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.23ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.78ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.36ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.05ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [29.18ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [41.63ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [0.96ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [69.90ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [71.08ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [50.34ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [54.25ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [123.08ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [68.88ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [56.75ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [55.66ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [48.59ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [55.12ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [48.12ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [77.42ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [42.20ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [44.82ms]

test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [0.79ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.33ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.33ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.22ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.03ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.04ms]

test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.03ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [5.78ms]

test/spawn-placement.test.ts:
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [40.07ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [27.48ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [31.74ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [37.34ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [39.02ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [29.84ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [31.71ms]

test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [43.55ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [37.77ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [42.06ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [39.37ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [38.93ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [37.11ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [147.78ms]

test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.13ms]

test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [53.44ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [36.65ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [38.97ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [40.83ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [41.40ms]
(pass) queue facade storage > retention never removes a queued task based on its age [37.26ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [39.05ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [52.22ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [43.10ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [35.99ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.32ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.06ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [52.55ms]

test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.06ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.11ms]
(pass) settings shell decisions > an overridden setting cannot be written [109.51ms]
(pass) settings shell decisions > registered writes use the registry entry [1.22ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.17ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.12ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.05ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.33ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.09ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.03ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.52ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [39.96ms]

test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [4.29ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.60ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.11ms]
(pass) thinking resolution > per-harness override beats global default [0.39ms]

test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [38.39ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [35.47ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [35.92ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.28ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.19ms]

test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.12ms]
(pass) setup model flags > binds each model flag to its own harness [0.06ms]
(pass) setup model flags > allows a bare model for one harness [0.02ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.10ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.05ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.07ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.05ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.07ms]
(pass) Claude adapter > detects state from a live presence status [0.40ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.46ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.40ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [66.71ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [269.11ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [64.33ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [92.96ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [106.59ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.23ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.61ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.24ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.09ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.03ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.10ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.07ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.06ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.11ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.16ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.07ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [36.76ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.33ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [178.64ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.31ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.03ms]

test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.11ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [4.29ms]

test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [10.36ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [2.05ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [2.27ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.87ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.80ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.45ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [0.31ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [32.54ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.35ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [36.55ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.18ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.06ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [47.27ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.32ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.19ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [30.80ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [22.01ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [0.87ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [0.47ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [21.62ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.34ms]

test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [52.67ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [50.53ms]
(pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [52.72ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [57.07ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [61.19ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [46.29ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [46.16ms]
(pass) commands/runs > running rows render as running, not zero duration [0.20ms]
(pass) commands/runs > result falls back to durable run history after presence reap [30.97ms]

test/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.68ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [38.47ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.50ms]

test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [1.47ms]
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [0.99ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [103.61ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [592.62ms]
(pass) orch settings notify > accepts asking as a first-class sink state [151.94ms]
(pass) orch settings notify > remove drops only the named sink [208.45ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [200.04ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.77ms]

test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [6.97ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > does not expose legacy top-level group methods [0.16ms]
(pass) TmuxBackend > composes a complete group role bundle [0.05ms]
(pass) TmuxBackend > exposes tmux pane roles [0.06ms]
(pass) TmuxBackend > does not declare pane foreground capability [0.05ms]
(pass) TmuxBackend > reports tmux availability [0.19ms]
(pass) TmuxBackend > reflects the TMUX environment [0.06ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.06ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.52ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.10ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.34ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.08ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.27ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.17ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1751.07ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.45ms]
(pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.29ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.36ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.15ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.26ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.13ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.25ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.13ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [5.20ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.19ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.19ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.37ms]
(pass) isAgentId > accepts a minted id [0.05ms]
(pass) isAgentId > rejects everything that is not one [0.14ms]
(pass) malformed input > rejects a plexer-and-space key on parse [0.13ms]
(pass) malformed input > rejects an empty key [0.03ms]
(pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.08ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.03ms]
(pass) malformed input > tryParseIdentity parses a minted id [0.03ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [50.32ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [43.49ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [35.34ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [39.02ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [38.21ms]
(pass) lease commands > reap refuses while the recorded process is alive [31.70ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [40.60ms]
{"outcome":"answer","reason":"no-pane","text":"4jkxd5xwkj has no pane; abort does not apply."}
(pass) lease commands > abort proceeds with a foreign live-holder lease [53.94ms]
{"closed":["close-handle"],"results":[{"target":"uuiln4mpd3","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [47.69ms]
{"target":"m2vfie9f0p","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [46.23ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [44.66ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.20ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [161.04ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.16ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.10ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.07ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.49ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.32ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.25ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.60ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.25ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.54ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.52ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.67ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.30ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.39ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.31ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.39ms]
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
  remove    redux                Remove a dependency from package.json (bun rm)
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [41.92ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.02ms]
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
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
(pass) daemon lifecycle > rejects a recycled pid identity [0.53ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.52ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.37ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.23ms]

test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.21ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.11ms]

test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [3.22ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [6.57ms]

test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.09ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.02ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.11ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.10ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.04ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.03ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.04ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.52ms]

test/no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.05ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [50.81ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [20.51ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [46.16ms]
(pass) agent lease rows > a second open lease is rejected [41.77ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [42.21ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [36.04ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [39.56ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [38.30ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [41.07ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [33.02ms]
(pass) agent lease rows > an agent cannot lease itself [37.54ms]
(pass) agent lease rows > expiry inserts nothing new [34.19ms]
(pass) agent lease rows > reads return only open rows [37.68ms]

test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [33.63ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [33.90ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [35.35ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [33.38ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [27.12ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.55ms]

test/cmd-lock-is-never-half-created.test.ts:
(pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [1522.97ms]
(pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [0.59ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [39.91ms]

test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadConfig [1.20ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [0.64ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.70ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.58ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.28ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [0.45ms]

test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [42.13ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [40.32ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [38.75ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [41.36ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [36.09ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [40.47ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [40.38ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [28.97ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [35.48ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [32.74ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [30.22ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.12ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [30.18ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [40.44ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [38.75ms]
(pass) C4f self-rename > an invalid name is refused [28.74ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [42.12ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [39.74ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [12.67ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.07ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.29ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.05ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.07ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.15ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.10ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.06ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.09ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [48.53ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.38ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.12ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.30ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.10ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.21ms]

test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [40.85ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [39.39ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [105.06ms]

test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [31.46ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [34.19ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [36.63ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [34.05ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [25.68ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [40.29ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [53.71ms]
(pass) space policy > resolves space names through records and functions [0.12ms]
(pass) space policy > compares agents by the space each is composed into [59.79ms]
(pass) space policy > enforces the space wall across every plexer alike [88.89ms]
(pass) space policy > scopes agents to the current space [48.48ms]
(pass) space policy > a null current space leaves items unscoped [27.62ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [50.47ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [50.86ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.13ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [2.65ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.08ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.09ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.38ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.58ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [33.25ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [26.55ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [42.23ms]
(pass) event store rows > pruned sequence numbers are never reused [37.23ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [34.30ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [35.94ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.12ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.73ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [2.05ms]

test/every-agent-has-an-inbox.test.ts:
(pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [43.90ms]
(pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [48.64ms]
(pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [28.71ms]
(pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [31.89ms]

test/presence-inbox.test.ts:
(pass) shared presence line writers > inbox and ack drains use the same claimed rename path [0.44ms]
(pass) shared presence line writers > pi appends and answers through shared presence writers [0.47ms]
(pass) shared presence line writers > wrong status schema is rejected by shared status reader [0.34ms]

test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.68ms]
(pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.14ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.09ms]

test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [33.13ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [29.94ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [34.87ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [28.51ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [36.90ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [40.68ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [0.33ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [61.10ms]
(pass) fleet ownership scoping > close --all works without an owner token [182.19ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","mine","foreign","other"],"results":[{"target":"caller","handle":"caller","outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":"other","outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [66.85ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [228.49ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [788.94ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [363.12ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [718.14ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [404.90ms]
{"closed":["{\"pid\":32315,\"key\":\"kmismatch1\"}"],"results":[{"target":"kmismatch1","handle":"{\"pid\":32315,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [62.74ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.16ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [196.70ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [218.45ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [291.03ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [175.77ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [200.57ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [182.60ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [4.79ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [1.67ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [0.43ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [0.97ms]
(pass) loadConfig > reads the declared runtime [0.40ms]
(pass) loadConfig > parses every supported settings section [1.78ms]
(pass) loadConfig > rejects a file without the current schemaVersion [0.76ms]
(pass) loadConfig > rejects invalid JSON loudly [0.41ms]
(pass) loadConfig > names the key path for invalid fields [0.54ms]
(pass) loadConfig > rejects unknown settings keys [0.45ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [0.39ms]
(pass) loadConfig > rejects old settings keys [1.48ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [2.51ms]
(pass) loadConfig > applies every settings default when sections are absent [0.65ms]
(pass) loadConfig > preserves configured values while defaulting each missing section value [0.59ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [1.11ms]
(pass) loadConfig > rejects a host without dest [0.61ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [0.57ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [0.38ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.31ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.22ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.54ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.43ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.83ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.61ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.67ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.22ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.79ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [1.19ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.72ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [0.90ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.83ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.80ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [0.87ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.34ms]
(pass) config precedence > uses the settings.json value over the fallback [0.69ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.86ms]
(pass) config precedence > uses an explicit flag override over the environment [0.07ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.10ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.32ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.17ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [1.85ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.61ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [2.69ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [0.85ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [1.29ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.34ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [1.62ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.03ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [280.19ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.58ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [129.56ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [1.11ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.88ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.94ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.54ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.39ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.32ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.14ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.07ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.04ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.05ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.03ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.56ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.59ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.82ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [0.96ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [0.47ms]

test/identity-is-not-environment.test.ts:
(pass) A1 — identity carries no environment > Identity declares no plexer and no plexer grouping [0.09ms]
(pass) A1 — identity carries no environment > a key is the minted id itself, with no separator to split [0.05ms]
(pass) A1 — identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.04ms]
(pass) A1 — identity carries no environment > minted ids are unique per spawn [2.72ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.08ms]
(pass) commands/target > extracts target and joined prompt [0.14ms]
(pass) commands/target > reads only structured result text [0.05ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.12ms]
(pass) commands/target > lists only live serialized identity presence entries [1.25ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [46.97ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [33.94ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [33.25ms]

test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [6.96ms]

test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [34.85ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [35.51ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.20ms]

test/store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [38.62ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [43.16ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [35.87ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [50.70ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [44.52ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [46.23ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [48.58ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [59.62ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [47.62ms]

test/no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [3.05ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [0.70ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [0.40ms]

test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.15ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.10ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.05ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [15.32ms]
(pass) worktree primitives > detects commits ahead of a base branch [25.97ms]
(pass) worktree primitives > removes an agent worktree [20.01ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.26ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [38.31ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [36.42ms]
(pass) presence status schema > status and list report the same agent identity [61.91ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [42.10ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [40.72ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [44.73ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [42.11ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [41.15ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [35.96ms]

test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.15ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.04ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.11ms]

test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.43ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.82ms]
(pass) command lock > second acquire blocks until first releases [39.71ms]
(pass) command lock > dead-pid lock is reaped [0.74ms]
(pass) command lock > release with wrong pid refuses [0.38ms]
bun test held by agent-a (pid 31019)
(pass) command lock > matches locked command prefixes and probes settings [1.44ms]
(pass) command lock > run propagates the child exit code [6.10ms]

test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.10ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.08ms]

test/broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [50.55ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [49.45ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [44.38ms]

test/cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [2.05ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [0.50ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.43ms]
(pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [613.40ms]
(pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [1.27ms]

test/work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [52.99ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [40.70ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.38ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [0.32ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [38.69ms]

test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.10ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [0.94ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.34ms]

test/status-renders-one-row-shape.test.ts:
(pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [9.69ms]
(pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.28ms]
(pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [31.67ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [117.43ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [1.16ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [3.11ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [25.74ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [20.98ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [81.84ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [76.91ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [71.23ms]

test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.05ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.06ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.07ms]

test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.21ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.04ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [52.12ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [46.42ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [45.92ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [45.09ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [48.30ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [18.77ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [19.33ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [16.26ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [15.90ms]

test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.21ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [2.33ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.13ms]

test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [51.07ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [41.79ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.28ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [37.46ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.26ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.22ms]

test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.13ms]

test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [31.43ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [19.03ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [39.08ms]

test/daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [4.17ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [7.49ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [3.97ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [36.15ms]

test/peer-lease-visibility.test.ts:
(pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [44.94ms]
(pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [50.43ms]
(pass) peer summaries carry ownership as a lease > a dead holder is not a live one [59.82ms]
(pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [52.49ms]
(pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [59.48ms]
(pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [47.81ms]

test/cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [869.25ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [0.70ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1308.46ms]
(pass) command lock serialization > release refuses a different process instance token [0.73ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [36.86ms]
(pass) async remote fan-out > returns a typed dead-host failure [20.92ms]
(pass) async remote fan-out > returns a typed timeout failure [503.46ms]
(pass) async remote fan-out > returns a typed non-JSON failure [16.78ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [508.57ms]

test/adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.15ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.08ms]

test/commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [1.07ms]
(pass) orch logs > --agent selects one agent's records [0.48ms]
(pass) orch logs > --level selects one severity [0.51ms]
(pass) orch logs > --since drops everything older than the instant given [0.32ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [0.35ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [0.49ms]
(pass) orch logs > --json emits the records themselves [0.56ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [1.57ms]

test/offline-is-not-a-second-source.test.ts:
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [37.03ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [28.27ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.26ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.10ms]

test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.10ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.03ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.17ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.05ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.04ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.03ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.76ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.17ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.47ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [10.73ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.19ms]

test/one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record — space and lease included [59.17ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [44.31ms]
(pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [107.89ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.20ms]

test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [64.14ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [40.93ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [55.32ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [37.79ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [0.22ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [34.81ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [49.59ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [17.86ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [0.30ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.15ms]
(pass) HeadlessBackend > never signals a dead pid [0.08ms]

test/commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [1.42ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [20.05ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [1.21ms]
(pass) commands/spawn > the positionals are the agent names [0.08ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.03ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.10ms]

test/queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [50.76ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now — a new pack member makes it claimable again [41.83ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [40.59ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [42.43ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [36.48ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [49.54ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [33.57ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [43.70ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [38.32ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [42.86ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [40.94ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [54.09ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [64.51ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [50.02ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [48.26ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [42.80ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [48.30ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [41.06ms]

test/ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.09ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.04ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit — the caller can act on it [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.23ms]

test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [126.88ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [152.77ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1177.21ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [624.32ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [5276.40ms]

test/space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [0.80ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [5.80ms]
(pass) space helpers > derives an entity space from the store [0.52ms]
(pass) space helpers > returns the same entities when all spaces are requested [0.10ms]
(pass) space wall writes > allows a write within the same space [0.41ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.43ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [2.34ms]
(pass) space wall writes > allows a cross-space write with an explicit override [0.42ms]
(pass) space wall writes > allows unplaced targets [0.23ms]

test/one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.06ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [12.05ms]

test/presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [0.80ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [0.58ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [0.53ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [24.17ms]

test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [22.74ms]
(pass) catalogue rows > write then read round-trips at and stdout [30.92ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [25.89ms]
(pass) catalogue rows > an entry with empty stdout is not stored [19.45ms]
(pass) catalogue rows > clearCatalogues empties the store [30.48ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [28.78ms]

test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [0.62ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.68ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.45ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.50ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.37ms]
(pass) spawn limits > global boundary refusal data counts the whole request [1.30ms]
(pass) spawn limits > one workspace may use the full global allotment [0.75ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.68ms]
(pass) spawn limits > uncapped space is bounded only by global count [0.56ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [1.04ms]
(pass) spawn limits > dead pid records free capacity [0.23ms]
(pass) spawn limits > foreign panes never count [0.22ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [19.30ms]
(pass) spawn limits > doctor accepts satisfiable limits [18.28ms]

test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.03ms]
(pass) store row values > sets only non-null fields [0.03ms]

test/agent-model-unwelded.test.ts:
(pass) A1 — the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [0.66ms]
(pass) A1 — the four facts are never welded > ownership is a lease table, not a second id space [0.56ms]
(pass) A1 — the four facts are never welded > the agents hub carries identity and provenance only [0.17ms]
(pass) A1 — the four facts are never welded > no table anywhere carries a lifetime [8.55ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [22.02ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [393.21ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [21.59ms]
(pass) watchConfig > stop prevents further callbacks [406.39ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [76.57ms]

test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [0.06ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.10ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.19ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.13ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.16ms]

test/queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [43.61ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [102.19ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [39.65ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [40.49ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [2.61ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [4.29ms]

test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.08ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.37ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.42ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [1.29ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.10ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.87ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2006.93ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [1.43ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [0.50ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.10ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.05ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.08ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.08ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.06ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.73ms]

test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.02ms]

test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.28ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.18ms]
(pass) commands/events > parses filters and scope flags [0.07ms]
(pass) commands/events > parses the wake-up flags [0.02ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.05ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.04ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
(pass) commands/events > excludes an agent spawned by a different session [0.01ms]
(pass) commands/events > --any-agent passes agents from both sessions [0.03ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.02ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.07ms]
(pass) commands/events > names one agent by name or by identity key [0.07ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.20ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.38ms]
(pass) commands/events > rejects malformed event and labels sinks [0.15ms]
(pass) commands/events space scope > an agent streams into the space it currently occupies [52.88ms]
(pass) commands/events space scope > moving an agent moves its events with it [48.71ms]
(pass) commands/events space scope > --all streams every space, and an unplaced caller scopes to none [42.28ms]
(pass) commands/events space scope > a key naming no registered agent is in no space [0.38ms]

test/close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [55.88ms]
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [41.84ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [46.64ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [51.79ms]

test/commands-space.test.ts:
(pass) orch space — orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [40.12ms]
(pass) orch space — orch's own grouping > create refuses a name already in use [29.64ms]
(pass) orch space — orch's own grouping > delete refuses a space that still holds agents [50.96ms]
(pass) orch space — the plexer's home > create makes a home and records only its coordinate [29.58ms]
(pass) orch space — the plexer's home > list reports that a space has a home without naming the coordinate [30.70ms]
(pass) orch space — the plexer's home > rename renames orch's space and its home [36.74ms]
(pass) orch space — the plexer's home > delete closes the home and drops its coordinate [30.03ms]
(pass) orch space — the plexer's home > focus focuses the recorded coordinate [30.43ms]
(pass) orch space — the plexer's home > a home made in another plexer is not this environment's to focus [30.70ms]
(pass) orch space — absence is an answer > focus with no space-home role names the space and what is missing [29.94ms]
(pass) orch space — absence is an answer > the plain-text answer names the space too [27.70ms]
(pass) orch space — vocabulary and wiring > cmdSpace lists through the resolved environment [19.73ms]
(pass) orch space — vocabulary and wiring > orch ws is gone [0.13ms]
(pass) orch space — vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.10ms]
(pass) orch space — vocabulary and wiring > no space output ever says workspace [32.00ms]

test/lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [30.58ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [29.72ms]

test/store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [37.46ms]
(pass) interval satellites > half-open adjacency is legal [39.80ms]
(pass) interval satellites > clearSpace closes without opening [39.43ms]
(pass) interval satellites > agent plexer is immutable one-shot [36.71ms]
(pass) interval satellites > process restart history closes at the successor since [42.70ms]
(pass) interval satellites > process rows carry host and process identity [39.19ms]
(pass) interval satellites > nullable process start_token round-trips as null [39.18ms]
(pass) interval satellites > space move history closes at the successor since [49.81ms]
(pass) interval satellites > tuning change history closes at the successor since [39.38ms]
(pass) interval satellites > handle history preserves each renumbered handle [41.11ms]
(pass) interval satellites > interval instants are stored as INTEGER values [49.64ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [63.11ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [44.66ms]
(pass) interval satellites > tuning carries model and nullable thinking [41.71ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.20ms]
(pass) commands/control > parses --then destination and note [0.04ms]
(pass) commands/control > adds worker header unless raw [0.05ms]

test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [32.40ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [43.04ms]
(pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [47.10ms]
(pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [44.39ms]
(pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [41.84ms]
(pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [27.25ms]
(pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [35.20ms]
(pass) outbox ack fallback > a write no channel would take stays unsent [30.87ms]

test/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [0.36ms]
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [38.84ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [49.58ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [39.16ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [61.84ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [58.29ms]

test/daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [50.24ms]
(pass) daemon decision trail > records a lease granted over a dead holder [39.37ms]
(pass) daemon decision trail > records a no-pane boundary answer with its reason [33.95ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.19ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.53ms]

test/no-stderr-writes.test.ts:
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [5.59ms]
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [0.66ms]

test/errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.07ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.05ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.10ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.04ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.05ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.07ms]

test/command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [123.42ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [41.79ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [49.70ms]

test/store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [33.15ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [25.97ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [28.96ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [23.90ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [24.79ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [19.68ms]

test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [26.70ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [89.98ms]
(pass) retention sweep > returns zero counts when every row is inside its window [44.22ms]
(pass) retention sweep > continues sweeping when one table delete fails [54.03ms]
(pass) retention sweep > reaps expired agents by identity, taking every satellite with them [60.99ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [41.50ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [19.90ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [25.19ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [25.85ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [23.87ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [26.15ms]
(pass) retention sweep > does not sweep again one minute after the first tick [32.38ms]
(pass) retention sweep > prunes orch's own logs past the age cap [26.74ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [34.26ms]

test/web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [1.33ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.16ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.07ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.28ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.13ms]
(pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.26ms]
(pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.38ms]
(pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.25ms]
(pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.21ms]
(pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [9.61ms]
(pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.26ms]
(pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.14ms]
(pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.26ms]
(pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.09ms]

test/session-path-is-not-posix-only.test.ts:
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a Windows drive-letter session path is reported as a PATH [4.90ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a POSIX session path still reports as a path [3.12ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a RELATIVE path is not a session path, and the id is used instead [2.68ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.05ms]
(pass) commands/review > falls back to branch then the agent's address [0.03ms]

test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.04ms]
(pass) commands/status > dead rows never display stale live state [0.04ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.06ms]
(pass) commands/status > default status reads span every workspace [0.14ms]
(pass) commands/status > derives status row fields from seeded presence [25.59ms]
(pass) commands/status > marks dead presence as exited [5.69ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [5.48ms]
(pass) commands/status > shared status row carries presence-derived fields [6.93ms]
(pass) commands/status > row carries the owning backend's declared capabilities [13.26ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [4.54ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [9.47ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [58.96ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [24.25ms]
(pass) commands/status > formats workspace labels and warnings [0.17ms]

test/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.29ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.09ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.09ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [6.21ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.53ms]

test/no-daemon-commands.test.ts:
(pass) commands that need no daemon need no identity > orch help registers no agent and starts no daemon [104.93ms]
(pass) commands that need no daemon need no identity > orch version registers no agent and starts no daemon [100.90ms]
(pass) commands that need no daemon need no identity > orch status --offline registers no agent and starts no daemon [114.90ms]
(pass) commands that need no daemon need no identity > orch doctor registers no agent and starts no daemon [131.16ms]
(pass) commands that need no daemon need no identity > help works before setup has ever run, which is when it is needed most [98.18ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [29.45ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [28.76ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [35.08ms]

test/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [25.80ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [0.82ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.44ms]
(pass) config precedence > uses env over config and flag over env [0.38ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.71ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.72ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.12ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [18.81ms]
(pass) runDoctor > checks a healthy store [42.25ms]
(pass) runDoctor > warns when the store is absent [0.29ms]
(pass) runDoctor > fails when the store predates orch's migrations [26.12ms]
(pass) runDoctor > fails and names a missing store table [25.48ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [16.83ms]
(pass) runDoctor > reports an absent daemon as optional [21.63ms]
(pass) runDoctor > reports and fixes a stale daemon lock [20.54ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [56.06ms]
(pass) runDoctor > warns when the live daemon code hash is stale [27.39ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [38.26ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [0.81ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.66ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [1.06ms]
(pass) runDoctor > reports a dead presence pid [30.00ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [20.83ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.76ms]
(pass) runDoctor > validates configured notifier adapters [172.69ms]
(pass) runDoctor > reports invalid config and accepts missing config [40.64ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [49.71ms]

test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.24ms]
(pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [59.12ms]

test/vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [31.99ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [24.59ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [40.51ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.14ms]
(pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [9.71ms]

test/backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [0.21ms]
(pass) tmux space home > create names the session after the space and returns its root pane [0.20ms]
(pass) tmux space home > rename and close address the session coordinate [0.08ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.10ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.16ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.11ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.13ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.15ms]

test/queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [59.10ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [49.90ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [42.66ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [56.26ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [53.33ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [143.69ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [50.04ms]

test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [45.03ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [56.22ms]
(pass) agent store rows > liveAgents excludes agents with an ending [38.31ms]
(pass) agent store rows > packMembers selects the materialized root [39.52ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [22.52ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [23.98ms]
(pass) agent store rows > label maps both null and a value [34.07ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [33.39ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [43.06ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [33.69ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [28.20ms]
(pass) agent store rows > childrenOf returns direct descendants [40.31ms]

test/close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-space target by name, key, or pane id [87.40ms]
Could not close pane-survives: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [102.45ms]
Could not close pane-signal-failed: signal denied
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [58.74ms]
{"closed":["pane-presence-only"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and reaps [59.31ms]
{"closed":["pane-owned"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [50.76ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [49.29ms]
{"closed":["pane-duplicate"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [43.32ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [199.76ms]
(pass) close always works > steer remains blocked by the space wall [50.03ms]

test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [6.22ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.21ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.20ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.15ms]

test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.18ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.29ms]

test/close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything — no ORCH_AGENT_KEY is the human at a terminal [44.01ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [35.60ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [36.86ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [39.17ms]
(pass) who may end an agent (D7) > an agent may always close itself — acting on yourself is not driving a fleet [40.15ms]
(pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [36.54ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [43.21ms]

test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.34ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.12ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.04ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.11ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.10ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.08ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.07ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.12ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.07ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.29ms]
(pass) orch models --json > emits the pinned harness/model shape [0.11ms]

test/settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [0.94ms]
(pass) settings registry > every registry read resolves against a loaded config [1.48ms]
(pass) settings registry > contains no duplicate keys [0.07ms]

test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [34.79ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [31.74ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [35.25ms]

test/commands-results.test.ts:
(pass) commands/results > renders missing space and host as absent instead of inventing local [22.57ms]
(pass) commands/results > validates and extracts question payloads [0.11ms]
(pass) commands/results > formats invalid and recent timestamps [0.05ms]
(pass) commands/results > routes a seeded result.json through the command module [35.03ms]
(pass) commands/results > falls back to adapter session text when result.json is absent [32.15ms]
(pass) commands/results > uses result.json even when the presence status has no agent [34.20ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [30.06ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [38.89ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [37.17ms]
(pass) commands/results > orch session reports the pi entry count [38.51ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [38.05ms]

test/reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [32.96ms]
(pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [45.29ms]
(pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [43.58ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [34.80ms]

test/control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [1.06ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [0.74ms]
(pass) deliverControl > still answers a pane awaiting an answer [0.84ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [0.80ms]
(pass) deliverControl > does not fall back from a keys strategy to the orch channel [41.27ms]
(pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [55.37ms]
(pass) deliverControl > refuses steer and model on an adapter that composes neither role [2.56ms]
(pass) deliverControl > requires presence for inbox delivery [55.65ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [43.11ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [34.20ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > composes a complete group role bundle [0.19ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [1.70ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.20ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.24ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.13ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.12ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.06ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.14ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.07ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.17ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.05ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.17ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.46ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.21ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.07ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.28ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.07ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.09ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.18ms]
(pass) HerdrBackend > pane input submits through pane run [0.05ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.09ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.06ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.22ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.10ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.07ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.16ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [31.50ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [40.84ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [35.98ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [27.52ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [5.02ms]

test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [24.75ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [24.54ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [0.69ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [0.54ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [0.69ms]

test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.09ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.18ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.50ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.20ms]

test/agent-launch-carries-project-scope.test.ts:
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.59ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.39ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.42ms]

test/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [120.98ms]
(pass) orch settings > every registered setting is printed in the table [115.02ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [114.18ms]
(pass) orch settings > --json reports env as the winning source over settings.json [122.91ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [360.92ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [147.34ms]
(pass) orch settings > a load error surfaces loudly with no partial table [121.62ms]
(pass) orch settings > sets a boolean through its registry entry [117.92ms]
(pass) orch settings > sets an integer through its registry entry [140.48ms]
fleet.spawn_cap = 6
(pass) orch settings > single-setting set delegates to the registry writer [2.45ms]
(pass) orch settings > sets a choice through its registry entry [126.04ms]
(pass) orch settings > sets a multi value through its registry entry [129.09ms]
(pass) orch settings > sets a list value through its registry entry [130.63ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [137.35ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [165.09ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [121.64ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [114.45ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [124.17ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [136.28ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [168.77ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [48.37ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [32.09ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [38.23ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [24.68ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2099.10ms]

test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.06ms]
(pass) commands/index > reads a package version string [0.13ms]
(pass) commands/index > announces unleased agents once per session [0.64ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [0.89ms]

test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [27.69ms]
(pass) outbox store rows > reports one message's pending state [31.06ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [35.31ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [29.68ms]

test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.08ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.05ms]

test/a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.11ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.15ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.10ms]

test/pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [36.35ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [41.32ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [42.72ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [29.22ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [38.36ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [29.07ms]

test/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [17.20ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [25.11ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [21.49ms]

packages/web/src/lib/fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [0.47ms]
(pass) web environment projection > missing space is absent rather than local [0.12ms]
(pass) web environment projection > pane coordinates are not chosen names [0.11ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.94ms]

packages/web/src/lib/web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.40ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.74ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.31ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.13ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [1.51ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


5 tests failed:
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [42.91ms]
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [41.35ms]
(fail) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [42.94ms]
(fail) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [110.63ms]
(fail) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [60.06ms]

 1443 pass
 1 skip
 5 fail
 6568 expect() calls
Ran 1449 tests across 232 files. [64.27s]
