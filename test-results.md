bun test v1.4.0 (34cbb9a40)

packages/orch/test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.15ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.06ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.02ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.13ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.03ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.28ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.35ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.05ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.06ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.81ms]

packages/orch/test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [61.68ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [45.68ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [34.72ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [51.59ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [31.74ms]

packages/orch/test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.16ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [15.25ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [332.35ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1056.05ms]

packages/orch/test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.10ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.34ms]
Selection recorded in /tmp/orch-setup-characterization-kjjgO8/settings.json:
  runtime           = node
  adapters          = pi
  default adapter   = pi
  backends          = headless
  default backend   = headless
  model (pi)          = (none)  picker: none, allowed: all offered
Prerequisites:
  MISSING pi
  ok      headless
  install bun: curl -fsSL https://bun.sh/install | bash
  install pi: bun add -g @earendil-works/pi-coding-agent
Presence dir:
  /tmp/orch-setup-characterization-kjjgO8/agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
  /tmp/orch-setup-home-26rNI6/.local/bin/orch -> /home/bryan/orch/packages/orch/dist/bin/orch.js
  /tmp/orch-setup-home-26rNI6/.local/bin/pif -> /home/bryan/orch/packages/orch/bin/pif
  /tmp/orch-setup-home-26rNI6/.local/bin/orch-ding -> /home/bryan/orch/packages/orch/dist/bin/orch-ding.js
  SKIP pi extensions: pi integration shim disabled
Running doctor checks...
Doctor: 30/34 checks passed
Smoke test skipped (non-interactive) - run `orch setup` on a TTY to verify orch can deliver work.
Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [105.65ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.25ms]

packages/orch/test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [116.83ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [43.62ms]

packages/orch/test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [1.96ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.37ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.55ms]

packages/orch/test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [5.49ms]
(pass) notify router > passes typed webhook and command configuration [0.68ms]
(pass) notify router > surfaces notifier errors [0.55ms]

packages/orch/test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [5.27ms]
(pass) status performance seams > resolves orchestrator id once per status call [8.03ms]

packages/orch/test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [42.57ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [42.16ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [51.60ms]

packages/orch/test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [1.20ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.75ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.45ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.57ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.39ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.43ms]

packages/orch/test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.13ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5044.16ms]
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [283.25ms]
(pass) daemon RPC > round-trips a call over the real unix socket [2.86ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [37.84ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [71.20ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [37.27ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [49.73ms]
(pass) daemon RPC > refuses a hello that reports no session pid [5.05ms]
(pass) daemon RPC > refuses a hello without its environment [6.07ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [51.53ms]
(pass) daemon RPC > refuses a TCP hello without a token [4.02ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.15ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.91ms]
(pass) daemon RPC > returns an error for an unknown method [3.31ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.92ms]
(pass) daemon RPC > delivers pushed subscription events [44.45ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [302.50ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [31.79ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [5.06ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.34ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [103.44ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [1.44ms]

packages/orch/test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [48.89ms]
(pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [45.43ms]
(pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back — silence is the worst outcome [42.75ms]
(pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error — delivery is best-effort, the task stays settled [123.91ms]

packages/orch/test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [49.00ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [44.64ms]
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [47.98ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [50.99ms]

packages/orch/test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [41.73ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [36.24ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.46ms]

packages/orch/test/provenance.test.ts:
(pass) the one provenance walk > ancestors are parent-first, root last [0.11ms]
(pass) the one provenance walk > depth counts hops to the root [0.06ms]
(pass) the one provenance walk > an unknown id is its own root at depth 0 [0.02ms]
(pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.07ms]
(pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.05ms]
(pass) the one provenance walk > a cycle terminates [0.04ms]

packages/orch/test/daemon-rpc-identity.test.ts:
(pass) daemon identity RPCs > claim-identity stamps a minted id [38.14ms]
(pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [23.57ms]
(pass) daemon identity RPCs > register-session mints one id per session token [46.17ms]
(pass) daemon identity RPCs > the removed method is unknown [2.78ms]

packages/orch/test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [0.99ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.66ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1.42ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.93ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.96ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.51ms]

packages/orch/test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.36ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.04ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.02ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.02ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.04ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

packages/orch/test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.12ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.07ms]

packages/orch/test/close-is-keyed-by-agent-id.test.ts:
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [43.78ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [46.58ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [52.62ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [75.21ms]
(pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [51.13ms]

packages/orch/test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [211.86ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [166.41ms]

packages/orch/test/caller-kind.test.ts:
(pass) caller kind > id + recorded token is agent [37.01ms]
(pass) caller kind > id + other token is human [30.36ms]
(pass) caller kind > id + no token is human [36.71ms]
(pass) caller kind > no id is human [0.31ms]

packages/orch/test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [211.29ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [523.33ms]
(pass) review plumbing > approve merges and removes the worktree and branch [253.80ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [31.91ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [34.19ms]

packages/orch/test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.54ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.73ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.53ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.47ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.35ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [181.91ms]

packages/orch/test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [3.32ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [43.41ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [41.14ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [41.02ms]
(pass) daemon presence events > a status without a dispatch id does not write history [37.37ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [42.47ms]
(pass) daemon presence events > emitted events carry the pack capacity at publish time [104.69ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.23ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.10ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.03ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.05ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.05ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.35ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [33.89ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [0.56ms]
(pass) daemon presence events > an asking transition drives command sink delivery [21.70ms]

packages/orch/test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [30.11ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [26.64ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.96ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.29ms]

packages/orch/test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [62.53ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [47.53ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [42.62ms]

packages/orch/test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.03ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.09ms]
(pass) commands/panes > exports the pane listing command directly [0.02ms]

packages/orch/test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [32.11ms]
(pass) run rows > upsert updates a row while preserving its original start time [25.31ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [32.06ms]
(pass) run rows > omits absent optional fields instead of returning null [29.39ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [35.73ms]
(pass) run rows > stays readable after the agent presence directory is deleted [41.46ms]

packages/orch/test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.47ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.37ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.24ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.19ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.21ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.17ms]
(pass) shebangRuntime > returns null for an unreadable path [0.20ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.04ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.51ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.33ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.34ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.41ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.47ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.60ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.37ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.30ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.29ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.22ms]

packages/orch/test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.76ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.17ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.12ms]

packages/orch/test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.61ms]
(pass) settings editor reducer > opens the focused setting for editing [0.05ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.03ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.13ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.05ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.04ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.03ms]

packages/orch/test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [36.41ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [34.58ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [47.66ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [32.05ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [34.06ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [23.62ms]

packages/orch/test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [38.39ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [28.22ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [30.31ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [41.24ms]
(pass) store hardening > the attempt insert claim is exactly once [40.21ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [130.79ms]

packages/orch/test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [42.28ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [31.71ms]

packages/orch/test/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [138.68ms]

packages/orch/test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.19ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.23ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.04ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.05ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.03ms]

packages/orch/test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.05ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.04ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

packages/orch/test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.39ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.11ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [1.59ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.60ms]

packages/orch/test/capacity.test.ts:
(pass) fleet capacity > counts live agents by root holder [0.23ms]
(pass) fleet capacity > reports configured per-space caps [0.07ms]
(pass) fleet capacity > uses null for an unlimited total [0.03ms]
(pass) fleet capacity > formats holder, space, and machine capacity [0.14ms]

packages/orch/test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [1.34ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.64ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.52ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.24ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [43.70ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [46.12ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [39.43ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [0.96ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [0.59ms]

packages/orch/test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.15ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.19ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.09ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.65ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.24ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.33ms]

packages/orch/test/status-live.test.ts:
(pass) live status renderer > renders a clear screen, timestamped header, and table body [8.62ms]
(pass) live status renderer > renders a refresh failure in the header area [0.29ms]
(pass) live status renderer > coalesces a burst into one pending follow-up refresh [0.38ms]
(pass) live status renderer > keeps the existing table renderer available [0.13ms]

packages/orch/test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [40.89ms]

packages/orch/test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no launch env) [80.66ms]
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [80.58ms]
(node:23030) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(pass) claude-hooks shim > under node > writes status.json for a valid key [82.15ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no launch env) [67.75ms]
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [75.07ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [60.20ms]
(skip) claude-hooks shim tests need the dist bundle

packages/orch/test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [37.76ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [49.54ms]
(pass) the agent composer > tuning is not environment: it survives a move [39.17ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [41.20ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [36.23ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [41.66ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [33.01ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [41.16ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.35ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [29.01ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [28.42ms]

packages/orch/test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [31.84ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [23.07ms]
(pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stdout [159.81ms]

packages/orch/test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.09ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.04ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.06ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.12ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.04ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.06ms]

packages/orch/test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.16ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.15ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.06ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.28ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.06ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.13ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.04ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [2.00ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.08ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.02ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.69ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.09ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.11ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [0.77ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.05ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.25ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.35ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.07ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.12ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [23.94ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.09ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.22ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [10.84ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.20ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.03ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.02ms]
(pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
(pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.08ms]
(pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.04ms]
(pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.72ms]
(pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.04ms]

packages/orch/test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.42ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.03ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [38.61ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.21ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.04ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.03ms]

packages/orch/test/settings-defects.test.ts:
(pass) settingsDefects > returns no defects for an absent file [0.47ms]
(pass) settingsDefects > returns no defects for a valid settings file [0.61ms]
(pass) settingsDefects > reports unparsable JSON as one file defect [0.25ms]
(pass) settingsDefects > suggests a near-match for a stale key [2.76ms]
(pass) settingsDefects > does not guess a replacement for a removed key [1.74ms]
(pass) settingsDefects > reports the expected pinned schema value [1.53ms]
(pass) settingsDefects > reports a wrong value type on a real key [0.84ms]

packages/orch/test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [23.93ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [22.89ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [456.81ms]
(pass) rebuild schema > enforces foreign keys and agent checks [32.81ms]
(pass) rebuild schema > requires exactly one task scope [31.49ms]
(pass) rebuild schema > allows one open attempt only [39.06ms]
(pass) rebuild schema > enforces lease checks and one lease [50.94ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [50.83ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [48.62ms]

packages/orch/test/dispatch-correlation.test.ts:
(pass) dispatch correlation > one dispatch id produces the whole life of that dispatch [775.88ms]

packages/orch/test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [8.25ms]

packages/orch/test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [48.30ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [59.67ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [42.95ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [46.30ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [34.70ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [56.81ms]

packages/orch/test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.52ms]
(pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [0.74ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [0.60ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [26.06ms]
(pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [45.00ms]
(pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [49.01ms]

packages/orch/test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.56ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.11ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.11ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.06ms]

packages/orch/test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.08ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.07ms]

packages/orch/test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.63ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.06ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]

packages/orch/test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.71ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.22ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [7.63ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.25ms]

packages/orch/test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.07ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.02ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.02ms]

packages/orch/test/notify-ding.test.ts:
(pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.26ms]
(pass) notify/ding > this host names the players it would use, and says how to get one [0.19ms]
(pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.08ms]

packages/orch/test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [31.46ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [50.35ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [56.45ms]

packages/orch/test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [46.56ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [47.76ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [50.16ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [55.71ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [56.32ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [52.89ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [58.64ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [56.56ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [47.45ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [50.53ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [43.24ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [115.92ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [46.16ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [40.59ms]

packages/orch/test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [0.78ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.35ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.34ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.27ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.03ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.04ms]

packages/orch/test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.03ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [5.78ms]

packages/orch/test/spawn-placement.test.ts:
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [34.84ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [28.46ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [30.75ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [31.64ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [31.99ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [28.71ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [36.85ms]

packages/orch/test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [53.43ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [44.85ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [39.73ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [39.49ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [39.49ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [40.08ms]

packages/orch/test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [151.44ms]

packages/orch/test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.13ms]

packages/orch/test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [36.69ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [32.29ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [42.02ms]

packages/orch/test/settings-repair-write.test.ts:
(pass) applySettingsRepairs > rename carries the value to the new key [1.25ms]
(pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [0.43ms]
(pass) applySettingsRepairs > set writes a value at a dotted path [0.63ms]
(pass) applySettingsRepairs > drop deletes a value without pruning its parent [0.62ms]
(pass) applySettingsRepairs > applies several repairs in one call [0.61ms]
(pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [0.77ms]

packages/orch/test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [41.23ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [48.58ms]
(pass) queue facade storage > retention never removes a queued task based on its age [35.47ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [38.73ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [39.49ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [36.48ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [42.15ms]

packages/orch/test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.43ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.13ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [52.98ms]

packages/orch/test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.06ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.12ms]
(pass) settings shell decisions > an overridden setting cannot be written [121.65ms]
(pass) settings shell decisions > registered writes use the registry entry [3.08ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.17ms]

packages/orch/test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.16ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.06ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

packages/orch/test/spawn-policy.test.ts:
(pass) spawn policy caps > launch env uses the minted agent id name [0.05ms]
(pass) spawn policy caps > worker prompt depth > root worker maySpawn follows max_depth [0.27ms]
(pass) spawn policy caps > allows a pack spawn while under the cap [0.36ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.20ms]
(pass) spawn policy caps > a slave may not spawn by default: fleet.max_depth is 1 [0.08ms]
(pass) spawn policy caps > fleet.max_depth 2 lets a slave spawn and refuses its child [0.12ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.61ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [49.34ms]

packages/orch/test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [4.26ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.47ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.09ms]
(pass) thinking resolution > per-harness override beats global default [0.36ms]

packages/orch/test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [39.75ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [45.32ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [50.49ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [0.64ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.42ms]

packages/orch/test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.23ms]
(pass) setup model flags > binds each model flag to its own harness [0.15ms]
(pass) setup model flags > allows a bare model for one harness [0.04ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.14ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.06ms]

packages/orch/test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.16ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.08ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.05ms]
(pass) Claude adapter > detects state from a live presence status [0.52ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.45ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.44ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [89.95ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [343.55ms]
(pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [70.33ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed launch env [86.88ms]

packages/orch/test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [1851.34ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.21ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.29ms]
(pass) notifier setup logic > renders a command entry that loadSettings can parse [3.11ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.32ms]

packages/orch/test/claude-hooks.test.ts:
(pass) Claude hook command > gates execution on the launch environment variable [4.26ms]

packages/orch/test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.13ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.03ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.12ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.12ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.07ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.15ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.15ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.07ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [42.89ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.39ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [157.48ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.15ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.04ms]

packages/orch/test/port-has-no-shell.test.ts:
(pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.09ms]
(pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [5.17ms]

packages/orch/test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [2.54ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [1.84ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.63ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.70ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.74ms]

packages/orch/test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.34ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [0.29ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [38.37ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.35ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [40.35ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.25ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.07ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [50.81ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.38ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.19ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [39.11ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [23.17ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [0.92ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [0.52ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [21.96ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.45ms]

packages/orch/test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [61.38ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [59.89ms]
(pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [59.37ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [52.97ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [58.57ms]

packages/orch/test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [41.54ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [48.55ms]
(pass) commands/runs > running rows render as running, not zero duration [0.22ms]
(pass) commands/runs > result falls back to durable run history after presence reap [25.72ms]

packages/orch/test/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.73ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [34.12ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [2.96ms]

packages/orch/test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [1.22ms]
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [0.71ms]

packages/orch/test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [134.59ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [297.56ms]
(pass) orch settings notify > accepts asking as a first-class sink state [98.86ms]
(pass) orch settings notify > remove drops only the named sink [196.49ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [192.50ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.48ms]
(pass) orch settings notify > the notify row lists every sink, and the ones that carry a value round-trip through it [96.54ms]
(pass) orch settings notify > the notify row refuses an unknown sink and a carrying sink with nothing to carry [0.65ms]

packages/orch/test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [6.72ms]

packages/orch/test/backend-tmux.test.ts:
(pass) TmuxBackend > current identity uses the explicit id, not the launch environment [7.46ms]
(pass) TmuxBackend > does not expose legacy top-level group methods [0.06ms]
(pass) TmuxBackend > composes a complete group role bundle [0.03ms]
(pass) TmuxBackend > exposes tmux pane roles [0.04ms]
(pass) TmuxBackend > does not declare pane foreground capability [0.04ms]
(pass) TmuxBackend > reports tmux availability [0.15ms]
(pass) TmuxBackend > reflects the TMUX environment [0.05ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.52ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.08ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.28ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.06ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [250.90ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.12ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1751.04ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.31ms]
(pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.27ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.37ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.18ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.25ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.13ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.21ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.15ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.19ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.12ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.18ms]

packages/orch/test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.90ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.07ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.12ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [3.53ms]
(pass) isAgentId > accepts a minted id [0.04ms]
(pass) isAgentId > rejects everything that is not one [0.06ms]
(pass) malformed input > rejects a plexer-and-space key on parse [0.15ms]
(pass) malformed input > rejects an empty key [0.04ms]
(pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.11ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.04ms]
(pass) malformed input > tryParseIdentity parses a minted id [0.02ms]

packages/orch/test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [44.29ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [41.64ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [40.31ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [42.35ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [37.57ms]
(pass) lease commands > reap refuses while the recorded process is alive [32.28ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [37.57ms]
{"outcome":"answer","reason":"no-pane","text":"ysoi7barrs has no pane; abort does not apply."}
(pass) lease commands > abort proceeds with a foreign live-holder lease [48.43ms]
{"closed":["ofc5ea8nfz"],"results":[{"target":"ofc5ea8nfz","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [60.82ms]
{"target":"5mlru4luf9","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [50.78ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [50.60ms]

packages/orch/test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.30ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [154.19ms]

packages/orch/test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.23ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.11ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.05ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.48ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.25ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.23ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.65ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.22ms]

packages/orch/test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.54ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.46ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.57ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.25ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.44ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.28ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [0.32ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         next                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       zod                  Add a dependency to package.json (bun a)
  remove    redux                Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [45.52ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.30ms]
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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [0.59ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.49ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.41ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.20ms]

packages/orch/test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.15ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.08ms]

packages/orch/test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [7.61ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [3.21ms]

packages/orch/test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.09ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.03ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.09ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.12ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.04ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.03ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.05ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.51ms]

packages/orch/test/no-placement-row-over-the-composed-view.test.ts:
(pass) no Placement row is reassembled over the composed view (2.1) > there is no second lookup module projecting the environment into a flat row [0.13ms]
(pass) no Placement row is reassembled over the composed view (2.1) > the space wall reads the OPEN space interval, so a moved agent is walled by where it IS [53.90ms]
(pass) no Placement row is reassembled over the composed view (2.1) > a string that names no registered agent is in no space rather than an error [20.91ms]

packages/orch/test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [45.08ms]
(pass) agent lease rows > a second open lease is rejected [34.08ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [46.73ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [57.99ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [47.38ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [43.16ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [40.76ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [42.77ms]
(pass) agent lease rows > an agent cannot lease itself [38.02ms]
(pass) agent lease rows > expiry inserts nothing new [37.56ms]
(pass) agent lease rows > reads return only open rows [42.86ms]

packages/orch/test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [41.80ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [29.89ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [37.85ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [36.03ms]

packages/orch/test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [26.66ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.58ms]

packages/orch/test/one-spelling-per-fact.test.ts:
(pass) one spelling per shared fact > osSide and the store agree for an injected Windows platform [29.83ms]
(pass) one spelling per shared fact > the shared record guard rejects arrays and null [0.09ms]
(pass) one spelling per shared fact > removed identity method has no source spelling [3.63ms]
(pass) one spelling per shared fact > settings reads have no literal fallbacks [5.15ms]
(pass) one spelling per shared fact > launch env has one spelling [11.79ms]
(pass) one spelling per shared fact > removed spawn cap has no source or README spelling [4.40ms]

packages/orch/test/cmd-lock-is-never-half-created.test.ts:
(pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [1524.45ms]
(pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [0.77ms]

packages/orch/test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [44.82ms]

packages/orch/test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadSettings [1.21ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [0.72ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.72ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.67ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.29ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [0.59ms]

packages/orch/test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [42.47ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [41.36ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [43.46ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [39.50ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [39.53ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [40.25ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [46.22ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [26.90ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [34.57ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [29.46ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [29.48ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.13ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [28.73ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [39.70ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [40.24ms]
(pass) C4f self-rename > an invalid name is refused [25.79ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [44.19ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [39.53ms]

packages/orch/test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [13.03ms]

packages/orch/test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.07ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.30ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.06ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.06ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.15ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.11ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.08ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.11ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [132.00ms]

packages/orch/test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.38ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.12ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.24ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.10ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.37ms]

packages/orch/test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [42.70ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [40.85ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [43.20ms]

packages/orch/test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [28.29ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [32.75ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [31.49ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [36.43ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [25.51ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [51.70ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [57.27ms]
(pass) space policy > resolves space names through records and functions [0.16ms]
(pass) space policy > compares agents by the space each is composed into [65.56ms]
(pass) space policy > enforces the space wall across every plexer alike [93.72ms]
(pass) space policy > scopes agents to the current space [45.99ms]
(pass) space policy > a null current space leaves items unscoped [24.11ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [50.32ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [50.13ms]

packages/orch/test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.15ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.15ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.08ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.52ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.59ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [34.73ms]

packages/orch/test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [28.02ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [43.65ms]
(pass) event store rows > pruned sequence numbers are never reused [38.31ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [32.61ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [34.02ms]

packages/orch/test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [3.07ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [1.36ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [1.37ms]

packages/orch/test/every-agent-has-an-inbox.test.ts:
(pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [46.74ms]
(pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [45.29ms]
(pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [30.06ms]
(pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [50.83ms]

packages/orch/test/presence-inbox.test.ts:
(pass) shared presence line writers > inbox and ack drains use the same claimed rename path [0.48ms]
(pass) shared presence line writers > pi appends and answers through shared presence writers [0.64ms]
(pass) shared presence line writers > wrong status schema is rejected by shared status reader [0.32ms]

packages/orch/test/events-scope-notice.test.ts:
(pass) events scope notice > names the default live scope and its wideners [0.12ms]
(pass) events scope notice > names the all-agent live scope and its history widener [0.05ms]
(pass) events scope notice > does not announce when history was requested [0.02ms]
(pass) events scope notice > writes one notice before starting the live transport [0.07ms]
(pass) events scope notice > does not write a notice when history was requested [0.05ms]
(pass) events scope notice > does not announce when explicit targets were requested [0.03ms]

packages/orch/test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.46ms]
(pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.14ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.13ms]

packages/orch/test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [44.15ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [36.98ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [35.64ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [27.74ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [92.66ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [47.62ms]

packages/orch/test/owner-scoping.test.ts:
(pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [82.37ms]
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [0.33ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [66.93ms]
(pass) fleet ownership scoping > close --all works without an owner token [193.75ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","klmine0001","klforeign1","other"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [67.71ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [243.74ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [882.43ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [364.72ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [629.40ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [382.75ms]
{"closed":["kmismatch1"],"results":[{"target":"kmismatch1","handle":"{\"pid\":23781,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [63.09ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.33ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [230.21ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [215.26ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [225.19ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [205.48ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [207.62ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [211.50ms]

packages/orch/test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [2.10ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [2.09ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [291.92ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [1.17ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [215.58ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.92ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.84ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.88ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.44ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.32ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.40ms]

packages/orch/test/worker-prompt.test.ts:
(pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.16ms]
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.08ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.04ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.05ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.03ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.38ms]

packages/orch/test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.24ms]
(pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [0.90ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [0.72ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [0.35ms]

packages/orch/test/identity-is-not-environment.test.ts:
(pass) A1 — identity carries no environment > Identity declares no plexer and no plexer grouping [0.05ms]
(pass) A1 — identity carries no environment > a key is the minted id itself, with no separator to split [0.04ms]
(pass) A1 — identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.03ms]
(pass) A1 — identity carries no environment > minted ids are unique per spawn [1.87ms]

packages/orch/test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.05ms]
(pass) commands/target > extracts target and joined prompt [0.10ms]
(pass) commands/target > reads only structured result text [0.04ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.09ms]
(pass) commands/target > lists only live serialized identity presence entries [0.90ms]

packages/orch/test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [35.28ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [30.87ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [40.41ms]

packages/orch/test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [1.47ms]

packages/orch/test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [36.41ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [40.00ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.19ms]

packages/orch/test/store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [38.63ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [47.18ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [44.19ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [45.64ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [36.60ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [49.67ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [50.42ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [65.98ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [60.73ms]

packages/orch/test/no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [5.41ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [0.82ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [0.52ms]

packages/orch/test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.16ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.11ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.06ms]

packages/orch/test/settings-view.test.ts:
(pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.17ms]
(pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.07ms]
(pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.37ms]
(pass) settings view > frame with a filter narrows the list and draws the filter line [0.08ms]
(pass) settings view > frame reports an empty filter match instead of a blank screen [0.06ms]
(pass) settings view > a long list is windowed with more-above/more-below markers [0.48ms]
(pass) settings view > overlays render choices, checkboxes, and input with error [0.21ms]
(pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]

packages/orch/test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [15.36ms]
(pass) worktree primitives > detects commits ahead of a base branch [22.21ms]
(pass) worktree primitives > removes an agent worktree [15.89ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.44ms]

packages/orch/test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [48.48ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [37.24ms]
(pass) presence status schema > status and list report the same agent identity [66.23ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [44.75ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [51.92ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [40.85ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [38.74ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [51.84ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [81.31ms]

packages/orch/test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.17ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.05ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.10ms]

packages/orch/test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.38ms]

packages/orch/test/session-env.test.ts:
(pass) shim environment > allows the launch environment variable [0.10ms]

packages/orch/test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.68ms]
(pass) command lock > second acquire blocks until first releases [39.93ms]
(pass) command lock > dead-pid lock is reaped [0.60ms]
(pass) command lock > release with wrong pid refuses [0.37ms]
bun test held by agent-a (pid 22415)
(pass) command lock > matches locked command prefixes and probes settings [1.33ms]
(pass) command lock > run propagates the child exit code [5.01ms]

packages/orch/test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.11ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.06ms]

packages/orch/test/broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [50.46ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [51.88ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [45.69ms]

packages/orch/test/cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [11.44ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [1.46ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.41ms]
(pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [641.86ms]
(pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [1.49ms]

packages/orch/test/work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [42.99ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [39.34ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.52ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [0.51ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [42.90ms]

packages/orch/test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.08ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [0.60ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.23ms]

packages/orch/test/status-renders-one-row-shape.test.ts:
(pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [7.07ms]
(pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.37ms]
(pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [35.73ms]

packages/orch/test/doctor-checks.test.ts:
(pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [70.54ms]
(pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [57.91ms]
(pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [39.30ms]
(pass) doctor unclaimed-agent checks > ignores a claimed agent [39.75ms]
(pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [42.88ms]
(pass) doctor notification-sink checks > reports no sinks as healthy [31.35ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [1.29ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [1.11ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [53.35ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [56.89ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [125.19ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [153.51ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [120.39ms]

packages/orch/test/doctor-settings-defects.test.ts:
(pass) doctor settings defects > accepts an absent settings file [0.47ms]
(pass) doctor settings defects > accepts a clean settings file and keeps its path detail [0.62ms]
(pass) doctor settings defects > reports malformed JSON as a file defect [0.40ms]
(pass) doctor settings defects > reports a read failure instead of throwing [0.33ms]
(pass) doctor settings defects > reports a stale key with the value that was written [1.02ms]
(pass) doctor settings defects > reports a typo with its suggested key [0.96ms]
(pass) doctor settings defects > reports the expected schema version [0.63ms]
(pass) doctor settings defects > skips settings-dependent checks with a short repair hint [29.19ms]

packages/orch/test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.04ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.06ms]
(pass) per-command help topics > an unknown name has no topic [0.02ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]

packages/orch/test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.14ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.03ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [51.08ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [45.72ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [48.77ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [46.58ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [49.35ms]

packages/orch/test/identity-self.test.ts:
(pass) selfIdentity > returns the launch id without touching the store [1.01ms]

packages/orch/test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [49.98ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [81.77ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [77.82ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [24.77ms]

packages/orch/test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.19ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [2.99ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.12ms]

packages/orch/test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [44.01ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [48.72ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.36ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [42.96ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.18ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.16ms]

packages/orch/test/settings-precedence.test.ts:
(pass) settings precedence > returns a defaults value when no override is set [0.86ms]
(pass) settings precedence > applies defaults when settings, env, and flag are absent [0.33ms]
(pass) settings precedence > uses env over settings and flag over env [0.36ms]
(pass) settings precedence > parses notify entries and hosts into expected shapes [0.60ms]
(pass) settings precedence > reports a helpful validation error for invalid settings [0.42ms]

packages/orch/test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.12ms]

packages/orch/test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [39.41ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [22.27ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [41.75ms]

packages/orch/test/daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [4.54ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [9.58ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [5.21ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [49.82ms]

packages/orch/test/peer-lease-visibility.test.ts:
(pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [49.38ms]
(pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [50.06ms]
(pass) peer summaries carry ownership as a lease > a dead holder is not a live one [46.34ms]
(pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [48.01ms]
(pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [51.72ms]
(pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [46.87ms]

packages/orch/test/cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [883.97ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [0.95ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1358.84ms]
(pass) command lock serialization > release refuses a different process instance token [0.88ms]

packages/orch/test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [27.25ms]
(pass) async remote fan-out > returns a typed dead-host failure [20.51ms]
(pass) async remote fan-out > returns a typed timeout failure [503.63ms]
(pass) async remote fan-out > returns a typed non-JSON failure [21.92ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [507.91ms]

packages/orch/test/reap-picker.test.ts:
(pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.12ms]
(pass) reapCandidates > classifies empty input [0.04ms]
(pass) cmdReap > prints the --dead --json result shape [38.76ms]
(pass) cmdReap > refuses bare reap when stdin is not a TTY [0.26ms]

packages/orch/test/adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.11ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.04ms]

packages/orch/test/commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [0.92ms]
(pass) orch logs > --agent selects one agent's records [0.38ms]
(pass) orch logs > --level selects one severity [0.32ms]
(pass) orch logs > --since drops everything older than the instant given [0.29ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [0.33ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [0.35ms]
(pass) orch logs > --json emits the records themselves [0.32ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [0.95ms]

packages/orch/test/offline-is-not-a-second-source.test.ts:
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [23.74ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [29.14ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.24ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.08ms]

packages/orch/test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.14ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.04ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.28ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.08ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.05ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.03ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.77ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.19ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.50ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [10.70ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.13ms]

packages/orch/test/one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record — space and lease included [60.51ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [42.95ms]
(pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [46.34ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.29ms]

packages/orch/test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [122.33ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [38.91ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [56.80ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [41.37ms]

packages/orch/test/settings-repair.test.ts:
(pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.09ms]
(pass) settings repair choices > offers only rename when there is only a suggestion [0.04ms]
(pass) settings repair choices > offers only set when there is only an expected value [0.03ms]
(pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.01ms]
(pass) settings repair reducer > starts every defect at leave and focus at zero [0.06ms]
(pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.15ms]
(pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.07ms]
(pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.13ms]
(pass) settings repair reducer > leave produces no repair [0.03ms]
(pass) settings repair reducer > empty defects make every action a no-op [0.03ms]

packages/orch/test/backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [0.22ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [36.12ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [52.57ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [17.55ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [0.29ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.16ms]
(pass) HeadlessBackend > never signals a dead pid [0.13ms]

packages/orch/test/commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [6.08ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [24.88ms]
(pass) commands/spawn > rejects removed spawn cap flag as unknown [0.11ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [1.17ms]
(pass) commands/spawn > the positionals are the agent names [0.09ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.06ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.13ms]

packages/orch/test/queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [63.59ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now — a new pack member makes it claimable again [51.72ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [52.82ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [41.67ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [45.19ms]

packages/orch/test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [46.29ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [35.27ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [41.36ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [46.21ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [43.69ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [43.13ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [52.18ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [57.84ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [49.19ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [55.10ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [44.62ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [65.95ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [45.93ms]

packages/orch/test/unleased-agents.test.ts:
(pass) registration unleased agent hint > includes unleased workers but never session identities [48.86ms]

packages/orch/test/ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.08ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit — the caller can act on it [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.16ms]

packages/orch/test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [144.56ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [183.77ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1226.99ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [55.03ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [5305.45ms]

packages/orch/test/space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [1.42ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [15.24ms]
(pass) space helpers > derives an entity space from the store [0.67ms]
(pass) space helpers > returns the same entities when all spaces are requested [0.11ms]
(pass) space wall writes > allows a write within the same space [0.48ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.53ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [3.62ms]
(pass) space wall writes > allows a cross-space write with an explicit override [0.47ms]
(pass) space wall writes > allows unplaced targets [0.26ms]

packages/orch/test/one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.06ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [11.10ms]

packages/orch/test/presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [0.83ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [0.91ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [1.01ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [27.86ms]

packages/orch/test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [32.84ms]
(pass) catalogue rows > write then read round-trips at and stdout [38.14ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [34.49ms]
(pass) catalogue rows > an entry with empty stdout is not stored [21.97ms]
(pass) catalogue rows > clearCatalogues empties the store [31.79ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [29.45ms]

packages/orch/test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [1.25ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.58ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.57ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.51ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.49ms]
(pass) spawn limits > global boundary refusal data counts the whole request [2.15ms]
(pass) spawn limits > one workspace may use the full global allotment [1.35ms]
(pass) spawn limits > workspace cap is independent of global headroom [3.32ms]
(pass) spawn limits > uncapped space is bounded only by global count [1.22ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [1.72ms]
(pass) spawn limits > dead pid records free capacity [0.64ms]
(pass) spawn limits > foreign panes never count [0.46ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [51.37ms]
(pass) spawn limits > doctor accepts satisfiable limits [57.63ms]

packages/orch/test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.05ms]
(pass) store row values > sets only non-null fields [0.04ms]

packages/orch/test/agent-model-unwelded.test.ts:
(pass) A1 — the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [1.05ms]
(pass) A1 — the four facts are never welded > ownership is a lease table, not a second id space [0.63ms]
(pass) A1 — the four facts are never welded > the agents hub carries identity and provenance only [0.16ms]
(pass) A1 — the four facts are never welded > no table anywhere carries a lifetime [4.96ms]

packages/orch/test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [72.75ms]

packages/orch/test/status-headless.test.ts:
(pass) headless status visibility > keeps an exited agent with a terminal state [0.18ms]
(pass) headless status visibility > keeps an exited agent with a recorded result [0.05ms]
(pass) headless status visibility > drops a dead row with no result or terminal state [0.03ms]
(pass) headless status visibility > keeps a live row [0.03ms]
(pass) headless status visibility > --all keeps stale rows [0.03ms]
(pass) headless status visibility > uses agent language without backend details when no backend was asked [0.05ms]

packages/orch/test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [0.11ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.54ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.14ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.22ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.17ms]

packages/orch/test/queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [64.22ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [48.48ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [39.10ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [52.03ms]

packages/orch/test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [3.76ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [6.36ms]

packages/orch/test/settings-repair-roundtrip.test.ts:
(pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [2.15ms]
(pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [1.58ms]
(pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [3.41ms]
(pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [1.77ms]
(pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [1.20ms]

packages/orch/test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.10ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.03ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.02ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.38ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.38ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [0.17ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.09ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.86ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [1759.12ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [0.79ms]

packages/orch/test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [3.56ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.08ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.08ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.07ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.05ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.66ms]

packages/orch/test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.02ms]

packages/orch/test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.29ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.05ms]
(pass) commands/events > parses filters and scope flags [0.05ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.03ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.01ms]
(pass) commands/events > excludes an agent spawned by a different session [0.01ms]
(pass) commands/events > --any-agent passes agents from both sessions [0.03ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.01ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.06ms]
(pass) commands/events > names one agent by name or by identity key [0.07ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.21ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.27ms]
(pass) commands/events > appends pack capacity to human-readable event lines [0.07ms]
(pass) commands/events > rejects malformed event and labels sinks [0.13ms]
(pass) commands/events space scope > an agent streams into the space it currently occupies [48.27ms]
(pass) commands/events space scope > moving an agent moves its events with it [48.13ms]
(pass) commands/events space scope > --all streams every space, and an unplaced caller scopes to none [51.12ms]
(pass) commands/events space scope > a key naming no registered agent is in no space [0.30ms]

packages/orch/test/close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [61.31ms]
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [50.05ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [98.17ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [48.49ms]

packages/orch/test/commands-space.test.ts:
(pass) orch space — orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [38.34ms]
(pass) orch space — orch's own grouping > create refuses a name already in use [32.54ms]
(pass) orch space — orch's own grouping > delete refuses a space that still holds agents [40.01ms]
(pass) orch space — the plexer's home > create makes a home and records only its coordinate [40.78ms]
(pass) orch space — the plexer's home > list reports that a space has a home without naming the coordinate [34.89ms]
(pass) orch space — the plexer's home > rename renames orch's space and its home [35.72ms]
(pass) orch space — the plexer's home > delete closes the home and drops its coordinate [36.68ms]
(pass) orch space — the plexer's home > focus focuses the recorded coordinate [31.54ms]
(pass) orch space — the plexer's home > a home made in another plexer is not this environment's to focus [35.26ms]
(pass) orch space — absence is an answer > focus with no space-home role names the space and what is missing [31.77ms]
(pass) orch space — absence is an answer > the plain-text answer names the space too [25.05ms]
(pass) orch space — vocabulary and wiring > cmdSpace lists through the resolved environment [26.66ms]
(pass) orch space — vocabulary and wiring > orch ws is gone [0.10ms]
(pass) orch space — vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.06ms]
(pass) orch space — vocabulary and wiring > no space output ever says workspace [31.26ms]

packages/orch/test/lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [30.59ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [29.88ms]

packages/orch/test/store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [37.76ms]
(pass) interval satellites > half-open adjacency is legal [41.94ms]
(pass) interval satellites > clearSpace closes without opening [50.30ms]
(pass) interval satellites > agent plexer is immutable one-shot [36.85ms]
(pass) interval satellites > process restart history closes at the successor since [38.10ms]
(pass) interval satellites > process rows carry host and process identity [42.04ms]
(pass) interval satellites > nullable process start_token round-trips as null [37.67ms]
(pass) interval satellites > space move history closes at the successor since [41.15ms]
(pass) interval satellites > tuning change history closes at the successor since [42.71ms]
(pass) interval satellites > handle history preserves each renumbered handle [39.27ms]
(pass) interval satellites > interval instants are stored as INTEGER values [56.72ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [40.78ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [42.76ms]
(pass) interval satellites > tuning carries model and nullable thinking [38.56ms]

packages/orch/test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [1.41ms]
(pass) commands/control > parses --then destination and note [0.22ms]
(pass) commands/control > adds worker header unless raw [0.11ms]

packages/orch/test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [45.80ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [47.02ms]
(pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [38.13ms]
(pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [37.41ms]
(pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [35.28ms]
(pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [30.57ms]
(pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [36.46ms]
(pass) outbox ack fallback > a write no channel would take stays unsent [32.06ms]

packages/orch/test/claim-agent.test.ts:
(pass) claim agent > unclaimed + A → stamped [31.58ms]
(pass) claim agent > claimed A, claim A → unchanged [32.52ms]
(pass) claim agent > claimed A, reclaimAgent(id) then B → stamped with B [34.41ms]
(pass) claim agent > claimed A, plain claim B → refused claimed-by-other, row unchanged [32.32ms]
(pass) claim agent > unknown id → refused unknown-agent [24.88ms]

packages/orch/test/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > describes composed and absent backend roles [0.37ms]
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [38.05ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [34.71ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [39.74ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [66.33ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [57.89ms]

packages/orch/test/daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [41.38ms]
(pass) daemon decision trail > records a lease granted over a dead holder [56.15ms]
(pass) daemon decision trail > records a no-pane boundary answer with its reason [64.78ms]

packages/orch/test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.17ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.38ms]

packages/orch/test/no-stderr-writes.test.ts:
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > no runtime source writes to process.stderr [5.78ms]
(pass) orch has one diagnosis channel (the logger) and one output channel (stdout) > the scan actually covers the tree it claims to [0.79ms]

packages/orch/test/errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.06ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.05ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.06ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.03ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.04ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.06ms]

packages/orch/test/command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [40.62ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [42.98ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [51.24ms]

packages/orch/test/store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [38.17ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [27.72ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [43.88ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [26.57ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [27.47ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [46.85ms]

packages/orch/test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [26.89ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [99.13ms]
(pass) retention sweep > returns zero counts when every row is inside its window [44.09ms]
(pass) retention sweep > continues sweeping when one table delete fails [38.74ms]
(pass) retention sweep > reaps expired agents by identity, taking every satellite with them [47.09ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [35.65ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [26.97ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [24.89ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [23.17ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [24.41ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [24.22ms]
(pass) retention sweep > does not sweep again one minute after the first tick [31.01ms]
(pass) retention sweep > prunes orch's own logs past the age cap [26.97ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [33.13ms]

packages/orch/test/web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.36ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.06ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.04ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.12ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.08ms]
(pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.15ms]
(pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.08ms]
(pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.07ms]
(pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.09ms]
(pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.08ms]
(pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.12ms]
(pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.10ms]
(pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.13ms]
(pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.06ms]

packages/orch/test/session-path-is-not-posix-only.test.ts:
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a Windows drive-letter session path is reported as a PATH [3.51ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a POSIX session path still reports as a path [2.35ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a RELATIVE path is not a session path, and the id is used instead [2.09ms]

packages/orch/test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.04ms]
(pass) commands/review > falls back to branch then the agent's address [0.03ms]

packages/orch/test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.02ms]
(pass) commands/status > dead rows never display stale live state [0.03ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.08ms]
(pass) commands/status > default status reads span every workspace [0.08ms]
(pass) commands/status > derives status row fields from seeded presence [28.55ms]
(pass) commands/status > marks dead presence as exited [6.16ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [4.93ms]
(pass) commands/status > shared status row carries presence-derived fields [5.67ms]
(pass) commands/status > row carries the owning backend's declared capabilities [16.10ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [4.33ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [7.36ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [50.60ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [17.16ms]
(pass) commands/status > capacity footer uses configured caps and groups holders by root [0.67ms]
(pass) commands/status > formats workspace labels and warnings [0.17ms]

packages/orch/test/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.31ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.15ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.12ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [7.44ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.60ms]

packages/orch/test/no-daemon-commands.test.ts:
(pass) commands that need no daemon need no identity > orch help registers no agent and starts no daemon [118.04ms]
(pass) commands that need no daemon need no identity > orch version registers no agent and starts no daemon [112.73ms]
(pass) commands that need no daemon need no identity > orch status --offline registers no agent and starts no daemon [135.63ms]
(pass) commands that need no daemon need no identity > orch doctor registers no agent and starts no daemon [171.15ms]
(pass) commands that need no daemon need no identity > help works before setup has ever run, which is when it is needed most [115.98ms]

packages/orch/test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [52.28ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [34.14ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [31.46ms]

packages/orch/test/one-shape-only.test.ts:
(pass) one current shape only > a live presence record with a malformed identity is a doctor failure [0.63ms]
(pass) one current shape only > doctor backend reports have one detection spelling [0.22ms]

packages/orch/test/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [27.26ms]

packages/orch/test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.15ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [22.60ms]
(pass) runDoctor > checks a healthy store [49.06ms]
(pass) runDoctor > warns when the store is absent [0.47ms]
(pass) runDoctor > fails when the store predates orch's migrations [30.88ms]
(pass) runDoctor > fails and names a missing store table [23.32ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [20.78ms]
(pass) runDoctor > reports an absent daemon as optional [25.96ms]
(pass) runDoctor > reports and fixes a stale daemon lock [26.85ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [60.52ms]
(pass) runDoctor > warns when the live daemon code hash is stale [25.12ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [46.53ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [1.01ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.86ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.76ms]
(pass) runDoctor > reports a dead presence pid [27.14ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [23.20ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [0.64ms]
(pass) runDoctor > validates configured notifier adapters [224.59ms]
(pass) runDoctor > reports invalid settings and accepts missing settings [51.21ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [77.66ms]

packages/orch/test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.12ms]
(pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [49.54ms]

packages/orch/test/settings-watch.test.ts:
(pass) watchSettings > loads initially and applies a valid edit after the debounce [38.57ms]
(pass) watchSettings > keeps the last-good settings, warns once, and recovers [392.83ms]
(pass) watchSettings > reloads on a touched reload.signal without a settings edit [21.49ms]
(pass) watchSettings > stop prevents further callbacks [409.75ms]

packages/orch/test/vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [42.40ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [26.58ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [48.05ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.19ms]
(pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [14.97ms]

packages/orch/test/backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [0.37ms]
(pass) tmux space home > create names the session after the space and returns its root pane [0.31ms]
(pass) tmux space home > rename and close address the session coordinate [0.14ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.13ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.15ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.08ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.07ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.05ms]

packages/orch/test/queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [76.30ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [52.45ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [46.57ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [50.47ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [56.33ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [41.61ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [49.86ms]

packages/orch/test/settings-repair-screen.test.ts:
(pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.08ms]
(pass) repair action labels > names the value a set writes [0.03ms]
(pass) repair action labels > drop and leave say only what they do [0.02ms]
(pass) repair frame > shows every defect with the value the person wrote [0.46ms]
(pass) repair frame > promises that nothing changes before a save, because nothing does [0.10ms]
(pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.08ms]
(pass) repair frame > a chosen repair is shown as what it will do [0.10ms]
(pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.06ms]
(pass) repair frame > the count reads as English for one defect and for many [0.06ms]
(pass) repair frame > no row runs past the terminal width, tag included [0.08ms]
(pass) repair frame > the file being repaired is named in the header [0.04ms]

packages/orch/test/lock-holder.test.ts:
(pass) command lock holder > uses the registered agent id [0.68ms]
(pass) command lock holder > uses the process user fallback when unregistered [0.32ms]

packages/orch/test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent writes both NULL; agentById reads both back [33.05ms]
(pass) agent store rows > insertAgent materializes the provenance root [39.35ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [42.47ms]
(pass) agent store rows > liveAgents excludes agents with an ending [39.22ms]
(pass) agent store rows > packMembers selects the materialized root [40.90ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [26.29ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [23.57ms]
(pass) agent store rows > label maps both null and a value [36.88ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [32.86ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [45.93ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [36.57ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [36.89ms]
(pass) agent store rows > childrenOf returns direct descendants [57.07ms]

packages/orch/test/close-always.test.ts:
{"closed":["panename01","panekey001","paneid0001"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-space target by name, key, or pane id [113.06ms]
Could not close survives01: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [122.15ms]
Could not close signalfai1: signal denied
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [71.23ms]
{"closed":["presence01"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and reaps [75.38ms]
{"closed":["owned00001"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [69.43ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [46.08ms]
{"closed":["duplicate1"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [54.58ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [196.34ms]
(pass) close always works > steer remains blocked by the space wall [53.53ms]

packages/orch/test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [5.11ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.20ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.20ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.13ms]

packages/orch/test/identity-launch.test.ts:
(pass) launchCredential > returns null when the launch environment is unset [0.22ms]
(pass) launchCredential > returns a minted id [0.16ms]
(pass) launchCredential > malformed value exits 1 and logs launch.invalid-key [20.00ms]

packages/orch/test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.22ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.40ms]

packages/orch/test/close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything [57.21ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [45.24ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [50.86ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [35.53ms]
(pass) who may end an agent (D7) > an agent may always close itself — acting on yourself is not driving a fleet [39.83ms]
(pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [50.22ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [55.26ms]

packages/orch/test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.33ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.12ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.10ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.05ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.08ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.03ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.22ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.06ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.30ms]
(pass) orch models --json > emits the pinned harness/model shape [0.11ms]

packages/orch/test/settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [0.94ms]
(pass) settings registry > every registry read resolves against loaded settings [3.03ms]
(pass) settings registry > fleet help explains what each limit counts [0.26ms]
(pass) settings registry > fleet.max_depth round-trips through the full-tree writer [1.66ms]
(pass) settings registry > fleet.max_depth rejects zero through the registered writer [1.87ms]
(pass) settings registry > fleet.max_depth writes its value to settings.json [2.04ms]
(pass) settings registry > contains no duplicate keys [0.26ms]

packages/orch/test/backend-herdr-predicates.test.ts:
(pass) herdr environment predicates > neither variable set [0.22ms]
(pass) herdr environment predicates > HERDR_ENV=1 only [0.19ms]
(pass) herdr environment predicates > HERDR_PANE_ID only [0.02ms]
(pass) herdr environment predicates > both variables set

packages/orch/test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [42.81ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [29.06ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [37.72ms]

packages/orch/test/commands-results.test.ts:
(pass) commands/results > renders missing space and host as absent instead of inventing local [26.78ms]
(pass) commands/results > validates and extracts question payloads [0.16ms]
(pass) commands/results > formats invalid and recent timestamps [0.08ms]
(pass) commands/results > routes a seeded result.json through the command module [46.76ms]
(pass) commands/results > falls back to adapter session text when result.json is absent [55.55ms]
(pass) commands/results > uses result.json even when the presence status has no agent [43.40ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [38.98ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [41.15ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [35.81ms]
(pass) commands/results > orch session reports the pi entry count [43.56ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [35.97ms]

packages/orch/test/settings.test.ts:
(pass) loadSettings > refuses to invent settings when settings.json is missing [6.69ms]
(pass) loadSettings > requires a top-level runtime and never defaults it [1.22ms]
(pass) loadSettings > rejects an unrecognized runtime naming the accepted values [0.49ms]
(pass) loadSettings > rejects a runtime misplaced under defaults [0.54ms]
(pass) loadSettings > reads the declared runtime [0.55ms]
(pass) loadSettings > parses every supported settings section [1.44ms]
(pass) loadSettings > rejects a file without the current schemaVersion [0.55ms]
(pass) loadSettings > rejects invalid JSON loudly [0.29ms]
(pass) loadSettings > names the key path for invalid fields [0.45ms]
(pass) loadSettings > rejects unknown settings keys [0.42ms]
(pass) loadSettings > rejects removed spawn cap setting by name [0.35ms]
(pass) loadSettings > parses models.allowed as a per-harness pattern map [0.38ms]
(pass) loadSettings > rejects renamed fleet keys and loads their replacements [1.86ms]
(pass) loadSettings > rejects old settings keys [2.16ms]
(pass) loadSettings > rejects legacy notify type and unknown ids [0.92ms]
(pass) loadSettings > applies every settings default when sections are absent [0.60ms]
(pass) loadSettings > preserves configured values while defaulting each missing section value [0.73ms]
(pass) loadSettings > rejects non-positive and non-integer retention windows [0.88ms]
(pass) loadSettings > rejects a host without dest [0.39ms]
(pass) loadSettings > rejects an unknown id in enabled.adapters [0.45ms]
(pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [0.33ms]
(pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [0.27ms]
(pass) allowedModelPatterns > restricts nothing when settings contain no patterns [0.15ms]
(pass) allowedModelPatterns > returns the configured patterns when set [0.32ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.43ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.89ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.94ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [1.49ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.32ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.81ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [1.24ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.71ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [1.08ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.39ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.70ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [1.05ms]
(pass) settings precedence > uses the fallback when env and settings.json omit a setting [0.33ms]
(pass) settings precedence > uses the settings.json value over the fallback [0.32ms]
(pass) settings precedence > uses the ORCH_* environment value over settings.json [0.32ms]
(pass) settings precedence > uses an explicit flag override over the environment [0.05ms]
(pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.07ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.11ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.10ms]
(pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [0.33ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.32ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [1.55ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [0.88ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [1.61ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.37ms]

packages/orch/test/reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [41.99ms]
(pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [57.87ms]
(pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [43.93ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [44.09ms]

packages/orch/test/control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [5.69ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [0.77ms]
(pass) deliverControl > still answers a pane awaiting an answer [0.61ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [0.57ms]
(pass) deliverControl > does not fall back from a keys strategy to the orch channel [41.95ms]
(pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [37.93ms]
(pass) deliverControl > refuses steer and model on an adapter that composes neither role [1.14ms]
(pass) deliverControl > requires presence for inbox delivery [36.35ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [41.90ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [37.58ms]

packages/orch/test/backend-herdr.test.ts:
(pass) HerdrBackend > current identity uses the explicit id, not the launch environment [0.59ms]
(pass) HerdrBackend > composes a complete group role bundle [0.07ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.91ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.21ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.26ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.15ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.22ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.11ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.21ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.11ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.22ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.06ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.21ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.92ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.27ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.06ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.33ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.11ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.14ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.22ms]
(pass) HerdrBackend > pane input submits through pane run [0.06ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.10ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.08ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.22ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.11ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.07ms]

packages/orch/test/one-retry-policy.test.ts:
(pass) one retry policy > retries flaky async and sync operations through the shared helper [0.43ms]
(pass) one retry policy > uses the policy's declared backoff schedule [0.22ms]
(pass) one retry policy > surfaces the last error after exactly attempts tries [0.31ms]

packages/orch/test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.20ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [39.74ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [39.48ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [29.47ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [29.47ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [5.34ms]

packages/orch/test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [23.52ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [22.22ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [1.06ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [0.62ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [44.40ms]

packages/orch/test/peer-tools-registration.test.ts:
(pass) peer tool registration > does not register orch_send when no spawner address exists [1.19ms]
(pass) peer tool registration > does not register orch_send when the spawner pid is dead [0.59ms]
(pass) peer tool registration > registers orch_send when the spawner has live presence and an inbox [0.65ms]

packages/orch/test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.10ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.05ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.03ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.06ms]

packages/orch/test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.26ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.46ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.23ms]

packages/orch/test/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [158.38ms]
(pass) orch settings > every registered setting is printed in the table [151.34ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [148.79ms]
(pass) orch settings > --json reports env as the winning source over settings.json [146.74ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [405.72ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [158.49ms]
(pass) orch settings > a load error surfaces loudly with no partial table [159.95ms]
(pass) orch settings > sets a boolean through its registry entry [152.35ms]
(pass) orch settings > sets an integer through its registry entry [154.27ms]
fleet.max_depth = 6
(pass) orch settings > single-setting set delegates to the registry writer [2.13ms]
(pass) orch settings > sets a choice through its registry entry [166.47ms]
(pass) orch settings > sets a multi value through its registry entry [161.42ms]
(pass) orch settings > sets a list value through its registry entry [166.42ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [189.99ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [156.07ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [133.25ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [132.57ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [134.54ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [210.20ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [135.02ms]

packages/orch/test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [37.13ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [39.39ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [39.74ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [34.64ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2075.35ms]

packages/orch/test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.05ms]
(pass) commands/index > reads a package version string [0.12ms]
(pass) commands/index > announces unleased agents once per session [0.28ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [1.22ms]

packages/orch/test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [26.76ms]
(pass) outbox store rows > reports one message's pending state [29.62ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [28.73ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [38.94ms]

packages/orch/test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.07ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.09ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.09ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.06ms]

packages/orch/test/a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.13ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.14ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.11ms]

packages/orch/test/pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [33.69ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [38.91ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [51.14ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [37.12ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [52.17ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [42.93ms]

packages/orch/test/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [24.21ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [23.93ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [23.44ms]

packages/web/src/lib/fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [5.12ms]
(pass) web environment projection > missing space is absent rather than local [0.21ms]
(pass) web environment projection > pane coordinates are not chosen names [0.13ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.60ms]

packages/web/src/lib/web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.35ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.76ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.23ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.07ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [1.01ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle

 1601 pass
 1 skip
 0 fail
 7122 expect() calls
Ran 1602 tests across 259 files. [69.53s]
