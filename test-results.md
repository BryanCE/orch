bun test v1.4.0 (34cbb9a40)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.09ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.07ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.04ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.09ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.28ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.07ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.05ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.89ms]

test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [49.55ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [38.89ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [36.67ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [47.30ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [29.80ms]

test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.15ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [13.78ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [320.20ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1053.23ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.09ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.35ms]
Selection recorded in /tmp/orch-setup-characterization-c1wSqa/settings.json:
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
  /tmp/orch-setup-characterization-c1wSqa/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  ok      orch  (/home/bryan/.local/bin/orch)
  ok      pif  (/home/bryan/.local/bin/pif)
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 33/34 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [130.59ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.14ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [34.89ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [33.33ms]

test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [0.49ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.13ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.29ms]

test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.38ms]
(pass) notify router > passes typed webhook and command configuration [0.28ms]
(pass) notify router > surfaces notifier errors [0.15ms]

test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [52.94ms]
(pass) status performance seams > resolves orchestrator id once per status call [55.26ms]

test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [50.05ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [50.42ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [40.89ms]

test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.53ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.35ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.34ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.51ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.36ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.35ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.09ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5035.51ms]
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [272.99ms]
(pass) daemon RPC > round-trips a call over the real unix socket [2.93ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [57.18ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [57.24ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [37.05ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [40.13ms]
(pass) daemon RPC > refuses a hello that reports no session pid [5.01ms]
(pass) daemon RPC > refuses a hello without its environment [4.92ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [60.07ms]
(pass) daemon RPC > refuses a TCP hello without a token [6.35ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.79ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.20ms]
(pass) daemon RPC > returns an error for an unknown method [2.86ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.28ms]
(pass) daemon RPC > delivers pushed subscription events [43.23ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [308.21ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [49.69ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [10.28ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.32ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [102.42ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [0.93ms]

test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [56.75ms]
(pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [57.57ms]
(pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back — silence is the worst outcome [126.76ms]
(pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error — delivery is best-effort, the task stays settled [62.67ms]

test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [49.08ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [49.34ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [43.89ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [45.83ms]

test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [46.35ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [33.34ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.54ms]

test/provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.09ms]
(pass) the one provenance walk > depth counts hops to the root [0.04ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.01ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.04ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.05ms]
(pass) the one provenance walk > a cycle terminates [0.03ms]

test/daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [36.48ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [24.86ms]
(pass) daemon identity RPCs > register-session mints one id per session token [35.98ms]
(pass) daemon identity RPCs > the removed method is unknown [2.95ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [0.95ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.70ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1.60ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.63ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.52ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.64ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.31ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.02ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.04ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.03ms]
(pass) assistantText > undefined for non-assistant roles [0.02ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.05ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.10ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.07ms]

test/close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [43.40ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [42.55ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [43.65ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [42.33ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [45.53ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [187.35ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [155.18ms]

test/caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [41.05ms]
(pass) caller kind > id + other token is human [30.15ms]
(pass) caller kind > id + no token is human [38.87ms]
(pass) caller kind > no id is human [0.31ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [184.77ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [471.08ms]
(pass) review plumbing > approve merges and removes the worktree and branch [273.89ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [51.70ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [52.98ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.44ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.72ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.66ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.59ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.46ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [104.52ms]

test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [5.56ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [47.61ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [42.37ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [39.85ms]
(pass) daemon presence events > a status without a dispatch id does not write history [32.99ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [39.24ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.38ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.07ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.05ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.03ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.07ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.29ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [36.69ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [1.78ms]
(pass) daemon presence events > an asking transition drives command sink delivery [22.38ms]

test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [27.32ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [25.91ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.92ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.20ms]

test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [66.43ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [56.20ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [53.92ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.04ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.17ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [34.67ms]
(pass) run rows > upsert updates a row while preserving its original start time [27.03ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [33.60ms]
(pass) run rows > omits absent optional fields instead of returning null [28.84ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [31.80ms]
(pass) run rows > stays readable after the agent presence directory is deleted [36.81ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.42ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.28ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.25ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.15ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.19ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.23ms]
(pass) shebangRuntime > returns null for an unreadable path [0.18ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.64ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.26ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.20ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.32ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.21ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.29ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.30ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.25ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.25ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.20ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.76ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.17ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.11ms]

test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.54ms]
(pass) settings editor reducer > opens the focused setting for editing [0.05ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.04ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.20ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.08ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.07ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.03ms]

test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [32.48ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [30.64ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [37.27ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [32.42ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [36.37ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [22.24ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [37.15ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [30.58ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [32.51ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [35.91ms]
(pass) store hardening > the attempt insert claim is exactly once [34.08ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [117.66ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [44.87ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [34.02ms]

test/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [141.51ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.23ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.29ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.05ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.06ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.03ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.03ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.05ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.06ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.06ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.46ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.14ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [2.38ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.46ms]

test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [1.26ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.71ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.51ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.19ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [43.14ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [42.17ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [35.32ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [0.71ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [0.47ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.15ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.18ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.09ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.58ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [0.87ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.35ms]

test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [36.85ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no launch env) [72.98ms]
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [81.83ms]
(node:19296) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(pass) claude-hooks shim > under node > writes status.json for a valid key [72.63ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no launch env) [61.77ms]
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [54.66ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [119.56ms]
(skip) claude-hooks shim tests need the dist bundle

test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [34.27ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [45.45ms]
(pass) the agent composer > tuning is not environment: it survives a move [38.13ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [37.60ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [35.01ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [32.10ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [35.48ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [33.63ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.28ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [32.00ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [31.77ms]

test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [23.83ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [21.77ms]
(pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stdout [140.62ms]

test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.27ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.04ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [2.70ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.13ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.15ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.04ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.03ms]

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.19ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.15ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.07ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.34ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.06ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.14ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [5.94ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.09ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.02ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.89ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.11ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.12ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.21ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.09ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.24ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.41ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.13ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [22.44ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.10ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.29ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.06ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.08ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [11.90ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.24ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.04ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.03ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.12ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.04ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.48ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.04ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.11ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.02ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [41.16ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.21ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.05ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.07ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.05ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [21.50ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [19.22ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [411.69ms]
(pass) rebuild schema > enforces foreign keys and agent checks [35.16ms]
(pass) rebuild schema > requires exactly one task scope [43.28ms]
(pass) rebuild schema > allows one open attempt only [55.86ms]
(pass) rebuild schema > enforces lease checks and one lease [40.91ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [64.98ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [68.18ms]

test/dispatch-correlation.test.ts:
(pass) dispatch correlation > one dispatch id produces the whole life of that dispatch [742.64ms]

test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [8.55ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [55.02ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [68.75ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [51.38ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [49.14ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [37.21ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [52.41ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.32ms]
(pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [0.85ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [0.73ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [39.04ms]
(pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [54.25ms]
(pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [40.98ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.58ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.18ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.11ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.09ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.15ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.06ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.06ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.03ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.06ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.45ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.03ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]

test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.61ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.12ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.62ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.28ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.05ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.03ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [28.11ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [42.22ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [34.16ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [48.54ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [54.33ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [50.60ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [51.79ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [47.87ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [56.04ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [50.50ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [49.59ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [48.12ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [106.79ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [65.69ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [55.45ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [43.58ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [36.16ms]

test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [2.78ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.34ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.45ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.24ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.03ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.04ms]

test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.03ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [5.22ms]

test/spawn-placement.test.ts:
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [36.94ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [24.17ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [27.87ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [33.34ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [29.41ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [31.28ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [33.82ms]

test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [43.27ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [37.24ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [38.20ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [37.99ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [36.55ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [35.17ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [153.80ms]

test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.12ms]

test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [35.02ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [30.95ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [38.05ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [33.10ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [38.02ms]
(pass) queue facade storage > retention never removes a queued task based on its age [35.65ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [35.66ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [39.05ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [34.78ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [33.99ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.31ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.09ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [54.30ms]

test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.04ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.10ms]
(pass) settings shell decisions > an overridden setting cannot be written [117.03ms]
(pass) settings shell decisions > registered writes use the registry entry [1.21ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.13ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.11ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.05ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > launch env uses the minted agent id name [0.04ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.22ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.26ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.08ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.04ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.07ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.41ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [51.19ms]

test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [4.56ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.53ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.09ms]
(pass) thinking resolution > per-harness override beats global default [0.34ms]

test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [33.00ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [38.96ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [35.44ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.40ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.27ms]

test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.13ms]
(pass) setup model flags > binds each model flag to its own harness [0.07ms]
(pass) setup model flags > allows a bare model for one harness [0.02ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.14ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.06ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.11ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.06ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.06ms]
(pass) Claude adapter > detects state from a live presence status [0.52ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.60ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.38ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [69.94ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [273.35ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [69.79ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [85.37ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [98.91ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.20ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.41ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.22ms]

test/claude-hooks.test.ts:
(pass) Claude hook command > gates execution on the launch environment variable [0.21ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.06ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.02ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.10ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.07ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.06ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.09ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.13ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.06ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [32.70ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.37ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [179.83ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.35ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.03ms]

test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.32ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [4.85ms]

test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [15.64ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [2.22ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.71ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.73ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [2.03ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.44ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [0.27ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [36.57ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.40ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [37.83ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.19ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.05ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [46.34ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.33ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.19ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [31.65ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [24.22ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [0.95ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [0.46ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [19.14ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.32ms]

test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [54.69ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [50.69ms]
(pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [55.58ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [55.99ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [51.25ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [41.21ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [44.07ms]
(pass) commands/runs > running rows render as running, not zero duration [0.24ms]
(pass) commands/runs > result falls back to durable run history after presence reap [31.08ms]

test/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.59ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [35.96ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.01ms]

test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [1.37ms]
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [0.73ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [99.48ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [277.59ms]
(pass) orch settings notify > accepts asking as a first-class sink state [103.92ms]
(pass) orch settings notify > remove drops only the named sink [190.39ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [187.19ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.51ms]

test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [0.30ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > current identity uses the explicit id, not the launch environment [0.43ms]
(pass) TmuxBackend > does not expose legacy top-level group methods [0.06ms]
(pass) TmuxBackend > composes a complete group role bundle [0.04ms]
(pass) TmuxBackend > exposes tmux pane roles [0.03ms]
(pass) TmuxBackend > does not declare pane foreground capability [0.04ms]
(pass) TmuxBackend > reports tmux availability [0.16ms]
(pass) TmuxBackend > reflects the TMUX environment [0.05ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.43ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.09ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.27ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.08ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [251.30ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.23ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1751.43ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.62ms]
(pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.60ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.73ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.24ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.38ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.20ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.37ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.19ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.13ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.05ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.09ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.13ms]
(pass) isAgentId > accepts a minted id [0.08ms]
(pass) isAgentId > rejects everything that is not one [0.09ms]
(pass) malformed input > rejects a plexer-and-space key on parse [0.12ms]
(pass) malformed input > rejects an empty key [0.03ms]
(pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.09ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.05ms]
(pass) malformed input > tryParseIdentity parses a minted id [0.02ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [47.50ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [36.94ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [39.05ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [34.37ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [106.83ms]
(pass) lease commands > reap refuses while the recorded process is alive [31.15ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [37.76ms]
{"outcome":"answer","reason":"no-pane","text":"sbnj87a50p has no pane; abort does not apply."}
(pass) lease commands > abort proceeds with a foreign live-holder lease [48.13ms]
{"closed":["kf3g2j0w39"],"results":[{"target":"kf3g2j0w39","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [46.45ms]
{"target":"gote3aaz16","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [35.65ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [34.77ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.21ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [149.04ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.15ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.04ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.49ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.26ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.32ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.63ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.21ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.57ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.52ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.59ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.30ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.40ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.31ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.36ms]
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
  remove    webpack              Remove a dependency from package.json (bun rm)
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
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [38.83ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.11ms]
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
  add       @evan/duckdb         Add a dependency to package.json (bun a)
  remove    @parcel/core         Remove a dependency from package.json (bun rm)
  update    @zarfjs/zarf         Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      zod                  Display package metadata from the registry
  why       tailwindcss          Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [0.54ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.50ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.32ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.23ms]

test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.20ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.14ms]

test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [7.71ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [3.32ms]

test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.10ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.04ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.13ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.15ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.06ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.04ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.04ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.73ms]

test/no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.09ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [63.50ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [21.36ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [43.43ms]
(pass) agent lease rows > a second open lease is rejected [41.81ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [40.91ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [49.63ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [48.96ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [44.74ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [38.48ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [36.50ms]
(pass) agent lease rows > an agent cannot lease itself [31.20ms]
(pass) agent lease rows > expiry inserts nothing new [37.60ms]
(pass) agent lease rows > reads return only open rows [35.37ms]

test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [33.36ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [33.66ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [34.85ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [31.21ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [25.34ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.60ms]

test/one-spelling-per-fact.test.ts:
(pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [27.52ms]
(pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.10ms]
(pass) one spelling per shared fact > removed identity method has no source spelling [2.63ms]
(pass) one spelling per shared fact > settings reads have no literal fallbacks [3.57ms]
(pass) one spelling per shared fact > launch env has one spelling [8.39ms]
(pass) one spelling per shared fact > removed spawn cap has no source or README spelling [2.60ms]

test/cmd-lock-is-never-half-created.test.ts:
(pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [1521.68ms]
(pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [0.68ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [48.67ms]

test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadConfig [0.93ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [0.62ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.82ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.61ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.27ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [0.46ms]

test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [42.72ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [41.51ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [44.95ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [44.02ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [40.93ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [42.95ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [48.07ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [27.92ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [34.57ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [31.41ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [28.98ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.11ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [32.67ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [37.48ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [36.24ms]
(pass) C4f self-rename > an invalid name is refused [30.03ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [40.63ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [37.86ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [12.45ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.06ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.25ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.05ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.04ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.12ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.12ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.06ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.09ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [54.85ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.30ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.09ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.19ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.11ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.20ms]

test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [40.08ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [58.27ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [41.52ms]

test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [31.19ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [30.87ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [30.60ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [37.90ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [22.89ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [38.14ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [51.67ms]
(pass) space policy > resolves space names through records and functions [0.13ms]
(pass) space policy > compares agents by the space each is composed into [61.70ms]
(pass) space policy > enforces the space wall across every plexer alike [88.99ms]
(pass) space policy > scopes agents to the current space [54.88ms]
(pass) space policy > a null current space leaves items unscoped [23.34ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [52.13ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [48.51ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.15ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.13ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.09ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.12ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.46ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.53ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [33.22ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [27.69ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [42.85ms]
(pass) event store rows > pruned sequence numbers are never reused [36.42ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [30.39ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [38.71ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.04ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.54ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [1.35ms]

test/every-agent-has-an-inbox.test.ts:
(pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [45.78ms]
(pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [44.70ms]
(pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [26.68ms]
(pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [33.70ms]

test/presence-inbox.test.ts:
(pass) shared presence line writers > inbox and ack drains use the same claimed rename path [0.40ms]
(pass) shared presence line writers > pi appends and answers through shared presence writers [0.48ms]
(pass) shared presence line writers > wrong status schema is rejected by shared status reader [0.33ms]

test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.59ms]
(pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.13ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.09ms]

test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [32.59ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [33.29ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [32.75ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [95.89ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [34.49ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [33.43ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [72.62ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [0.36ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [48.99ms]
(pass) fleet ownership scoping > close --all works without an owner token [179.24ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [71.28ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [239.95ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [744.33ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [299.99ms]
