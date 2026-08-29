bun test v1.4.0 (34cbb9a40)

test/tiling.test.ts:
(pass) planTilePlacement > a lone pane anchors the split to the only pane [0.11ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.05ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.03ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.10ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.05ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.03ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [0.35ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.08ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.07ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.03ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.95ms]

test/hello-environment.test.ts:
(pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [57.12ms]
(pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [41.31ms]
(pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [37.97ms]
(pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [48.06ms]
(pass) hello records the environment in full > the claim carries every environment fact hello has to record [30.09ms]

test/orchd-rpc-reconnect.test.ts:
(pass) RPC JSON framing > rejects malformed object that only has an id [0.15ms]
(pass) RPC JSON framing > parses split and multiple newline-delimited frames [14.24ms]
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [325.52ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1051.84ms]

test/commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.09ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.32ms]
Selection recorded in /tmp/orch-setup-characterization-jxzkrN/settings.json:
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
  /tmp/orch-setup-characterization-jxzkrN/agents
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
(pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [129.72ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.14ms]

test/store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [59.51ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [60.03ms]

test/port-no-optional-methods.test.ts:
(pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [1.67ms]
(pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.17ms]
(pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [6.20ms]

test/notify-router.test.ts:
(pass) notify router > delivers only when on includes the event state [0.40ms]
(pass) notify router > passes typed webhook and command configuration [0.43ms]
(pass) notify router > surfaces notifier errors [0.21ms]

test/status-perf.test.ts:
(pass) status performance seams > resolves bundle hashes once per status call [20.84ms]
(pass) status performance seams > resolves orchestrator id once per status call [6.93ms]

test/nested-spawn-unleased.test.ts:
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the middle agent's death leaves the grandchild unleased, held by nobody [60.11ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandchild stays alive and adoptable, and keeps its own provenance [60.59ms]
(pass) a grandchild becomes unleased, never falls to the grandparent (D5) > the grandparent holding the middle agent does not extend to the grandchild [61.57ms]

test/log-level.test.ts:
(pass) the configured log level reaches every logger > the env var wins over settings.json [0.99ms]
(pass) the configured log level reaches every logger > settings.json is used when the env var is unset [0.46ms]
(pass) the configured log level reaches every logger > an unrecognised env value falls back to the configured level [0.35ms]
(pass) the configured log level reaches every logger > the CLI logger honours the configured level [0.51ms]
(pass) the configured log level reaches every logger > the CLI logger drops records below the configured level [0.32ms]
(pass) the configured log level reaches every logger > the daemon logger resolves through the same helper [0.64ms]

test/daemon-rpc.test.ts:
(pass) daemon RPC > rejects a hello response with a malformed optional field [0.14ms]
(pass) daemon RPC > hello translates an absent daemon instead of reading a missing token [5021.37ms]
(pass) daemon RPC > an unreachable agent yields a boundary answer, and the outbox is not left pending [281.51ms]
(pass) daemon RPC > round-trips a call over the real unix socket [2.73ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [38.42ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [63.74ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [40.86ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [43.82ms]
(pass) daemon RPC > refuses a hello that reports no session pid [4.47ms]
(pass) daemon RPC > refuses a hello without its environment [4.21ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [52.35ms]
(pass) daemon RPC > refuses a TCP hello without a token [3.75ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [4.82ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [3.50ms]
(pass) daemon RPC > returns an error for an unknown method [2.61ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [13.95ms]
(pass) daemon RPC > delivers pushed subscription events [47.77ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [310.17ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [38.52ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [4.51ms]
(pass) daemon RPC > has a catchable absent-daemon error [0.31ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [102.61ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [0.85ms]

test/cross-pack-result-delivery.test.ts:
(pass) results go to the enqueuer across packs (Cq4) > a result reaches the FOREIGN enqueuer's inbox, not the runner's [51.52ms]
(pass) results go to the enqueuer across packs (Cq4) > the delivered line carries the result payload, not just a notification [47.29ms]
(pass) results go to the enqueuer across packs (Cq4) > a FAILED task still reports back — silence is the worst outcome [47.33ms]
(pass) results go to the enqueuer across packs (Cq4) > an enqueuer with no inbox is not an error — delivery is best-effort, the task stays settled [39.87ms]

test/rename-syncs-the-pane-border.test.ts:
(pass) orch rename syncs the pane border in one command (U5) > one rename sets orch's name AND the plexer chrome [74.29ms]
(pass) orch rename syncs the pane border in one command (U5) > the response states the two outcomes SEPARATELY [43.14ms]
orch rename: named "thinking-axis", but the pane border was not updated: herdr refused: pane rename unavailable
(pass) orch rename syncs the pane border in one command (U5) > a plexer that refuses the chrome never unwrites orch's own name [45.71ms]
(pass) orch rename syncs the pane border in one command (U5) > --pane still gives the border something DIFFERENT, and leaves the name alone [40.17ms]

test/store-instants.test.ts:
(pass) epoch-millisecond store instants > a lease records its holding as an integer instant [44.87ms]
(pass) epoch-millisecond store instants > agents order numerically by their creation instant, never lexically [30.94ms]
(pass) epoch-millisecond store instants > all time-named columns use integer declarations [0.43ms]

test/daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [0.95ms]
(pass) machine daemon registration > the refusal a second start prints names the live daemon's pid [0.64ms]
(pass) machine daemon registration > doctor names both when a second daemon is live beside the registered one [1.29ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [0.60ms]
(pass) machine daemon registration > routes a different orch dir to its own runtime files [0.58ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [0.65ms]

test/transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.43ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.03ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.04ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.02ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.06ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.01ms]

test/setup-io.test.ts:
(pass) setup prompt answer validation > refuses a single answer that was not offered [0.10ms]
(pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.09ms]

test/clean-worktrees.test.ts:
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [174.58ms]
(pass) clean worktrees > --force discards an unmerged orphan and its branch [133.80ms]

test/review.test.ts:
(pass) review plumbing > lists only done worktree agents with commits ahead [213.73ms]
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [466.40ms]
(pass) review plumbing > approve merges and removes the worktree and branch [241.99ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > conflicting approval aborts without changing either branch [32.62ms]
fatal: Not possible to fast-forward, aborting.
(pass) review plumbing > non-fast-forward approval creates a merge commit [83.38ms]

test/codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [3.45ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.72ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.55ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [0.52ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [0.30ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [118.37ms]

test/daemon-events.test.ts:
(pass) daemon presence events > closes every watcher when watched agent directories disappear [4.89ms]
(pass) daemon presence events > an RPC subscriber receives a presence transition [51.26ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [57.99ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [44.50ms]
(pass) daemon presence events > a status without a dispatch id does not write history [33.66ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [40.79ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.46ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.14ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.07ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.06ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.09ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [0.51ms]
(pass) daemon presence events > presence transitions use the normalized agent name after rename [33.41ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [0.64ms]
(pass) daemon presence events > an asking transition drives command sink delivery [21.65ms]

test/backend-process-role.test.ts:
(pass) ProcessRole > headless provider records pid and start token and safely kills it [26.73ms]
(pass) ProcessRole > herdr provider records pid and start token and safely kills it [26.13ms]
(pass) ProcessRole > tmux provider records pid and start token and safely kills it [25.93ms]
(pass) ProcessRole > reports replaced when a pid is reused by a different process token [0.29ms]

test/status-unleased.test.ts:
(pass) status owner rendering > leased by a live holder shows that holder [54.74ms]
(pass) status owner rendering > a dead holder is shown as unleased with the holder gone [49.61ms]
(pass) status owner rendering > an agent never leased shows no orch driving it [49.91ms]

test/commands-panes.test.ts:
(pass) commands/panes > pane identity is the minted id alone [0.03ms]
(pass) commands/panes > a plexer-and-space key is not an identity [0.07ms]
(pass) commands/panes > exports the pane listing command directly [0.01ms]

test/store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [30.09ms]
(pass) run rows > upsert updates a row while preserving its original start time [28.28ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [31.03ms]
(pass) run rows > omits absent optional fields instead of returning null [26.86ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [32.30ms]
(pass) run rows > stays readable after the agent presence directory is deleted [42.91ms]

test/doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [0.46ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [0.40ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [0.24ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [0.20ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [0.22ms]
(pass) shebangRuntime > returns null for a file with no shebang [0.17ms]
(pass) shebangRuntime > returns null for an unreadable path [0.16ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [0.49ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [0.44ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [0.21ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [0.28ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [0.21ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [0.28ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [0.27ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [0.25ms]
(pass) doctor runtime verdict table > remediation names both directions — rebuild, or re-record the declaration [0.29ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.21ms]

test/herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.74ms]
(pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [0.10ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.10ms]
(pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [0.12ms]

test/settings-editor.test.ts:
(pass) settings editor reducer > moves focus down and up without running off either end [0.56ms]
(pass) settings editor reducer > opens the focused setting for editing [0.06ms]
(pass) settings editor reducer > cancel leaves value unchanged and returns to browsing [0.06ms]
(pass) settings editor reducer > commit updates value and produces a pending write [0.17ms]
(pass) settings editor reducer > refuses invalid values with a reason and stays open [0.09ms]
(pass) settings editor reducer > refuses opening a read-only setting with a reason [0.08ms]
(pass) settings editor reducer > cancelling without a commit yields zero writes [0.04ms]

test/environment-dictates-what-is-possible.test.ts:
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a MOVE is a new environment record, and what is possible follows it at once [39.77ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > a move closes the interval it left, so history says WHERE it was and WHEN [31.80ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > moving one axis leaves every other axis exactly where it was [42.18ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > an UPGRADE is a NEW host_plexers row, not an overwrite of the old one [31.96ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > re-declaring the SAME version is not an upgrade and opens no second row [35.29ms]
(pass) the environment dictates what is possible, and nothing negotiates it (E15) > nothing anywhere records what an agent CAN do [18.16ms]

test/routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [32.68ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [29.50ms]
(pass) store hardening > the store refuses a second open holding, so ownership cannot fork [31.21ms]
(pass) store hardening > adoption closes the prior holding in the same step that opens the new one [36.06ms]
(pass) store hardening > the attempt insert claim is exactly once [40.17ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [124.54ms]

test/daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [44.87ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [38.51ms]

test/reset-build-safety.test.ts:
(pass) build reset safety > --build dry-run never names a path inside ORCH_DIR [132.58ms]

test/lifecycle-targets.test.ts:
(pass) lifecycle target resolution > prefers one live agent over dead ones sharing its name [0.18ms]
(pass) lifecycle target resolution > reports the target and disambiguating ids for live ambiguity [0.20ms]
(pass) lifecycle target resolution > cleanup can still resolve a dead agent when no live match exists [0.07ms]
(pass) lifecycle target resolution > an agent is addressable by its id, its name, or its pane handle [0.05ms]
(pass) lifecycle target resolution > the pane is environment: moving it leaves every other address intact [0.02ms]

test/parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.02ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.02ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.04ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.04ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.05ms]

test/setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.32ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.09ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.13ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.14ms]

test/agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [1.21ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [0.49ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a composite key handed over no identity [0.21ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [0.47ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.18ms]
(pass) this process's own identity is the id and nothing else > a composite key never yields an identity, whole or in pieces [0.21ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [1.11ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > a malformed launch key walls the caller in, it does not free them [0.53ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id — no segment is split out of it [39.28ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [38.08ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [1.28ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [0.65ms]

test/launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.16ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.21ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.08ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.03ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [0.59ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [1.02ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.28ms]

test/queue-space-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [35.20ms]

test/claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [40.63ms]
malformed identity key: expected 10 lowercase alphanumerics, got "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [43.40ms]
(node:9949) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(pass) claude-hooks shim > under node > writes status.json for a valid key [39.45ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [32.68ms]
malformed identity key: expected 10 lowercase alphanumerics, got "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [28.62ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [34.52ms]
(skip) claude-hooks shim tests need the dist bundle

test/agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [38.95ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [42.35ms]
(pass) the agent composer > tuning is not environment: it survives a move [39.00ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [38.53ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [33.45ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [37.64ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [40.84ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [38.48ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.82ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [30.11ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [31.77ms]

test/command-refusal.test.ts:
(pass) a command refusal is thrown, not exited > an unresolvable target throws a CommandRefusal instead of killing the process [26.95ms]
(pass) a command refusal is thrown, not exited > the refusal carries the reason a human needs [22.87ms]
(pass) a command refusal is thrown, not exited > the CLI boundary turns a refusal into exit 1 with the message on stderr [167.53ms]

test/herdr-notify-busy.test.ts:
(pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.09ms]
(pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.02ms]
(pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.04ms]
(pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.06ms]
(pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.12ms]
(pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.05ms]
(pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.03ms]
(pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.03ms]

test/check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.03ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.16ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.07ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.02ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.14ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.06ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.02ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.28ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.05ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.12ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [5.61ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.08ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.89ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.10ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.11ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.21ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.06ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.01ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.28ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.40ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.08ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.02ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.10ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.03ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [22.10ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.07ms]
(pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.26ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.05ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [10.42ms]

test/plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.10ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.03ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [40.66ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.17ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.04ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.09ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.08ms]

test/store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [20.02ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [32.58ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [379.71ms]
(pass) rebuild schema > enforces foreign keys and agent checks [39.18ms]
(pass) rebuild schema > requires exactly one task scope [30.24ms]
(pass) rebuild schema > allows one open attempt only [31.57ms]
(pass) rebuild schema > enforces lease checks and one lease [37.21ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [41.32ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [49.05ms]

test/dispatch-correlation.test.ts:
(pass) dispatch correlation > one dispatch id produces the whole life of that dispatch [702.85ms]

test/wall-single-owner.test.ts:
(pass) space wall ownership > keeps the wall decision primitive in one source module [7.86ms]

test/spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id — never the name, never the pane handle [42.94ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [53.78ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [40.60ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn into a space writes agent_spaces, and the composer reads it back [46.14ms]
(pass) A1: spawn registration records the space as an environment axis > a spawn stating no space records NO ROW — a missing axis is a missing row [39.49ms]
(pass) A1: spawn registration records the space as an environment axis > moving an agent to another space closes the old interval and keeps its identity [52.06ms]

test/answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [1.45ms]
(pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [0.67ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [0.63ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [22.86ms]
(pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [43.09ms]
(pass) answer over the daemon control socket > refuses an answer from outside the lease, naming the holder [63.51ms]

test/adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.49ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.10ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.04ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.07ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.14ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.05ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

test/recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.05ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.02ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.07ms]

test/build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [0.43ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the `orch` bin points at the packaged entrypoint, not bin/orch.ts [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the packaged entrypoint is built for node, from the source entrypoint [0.04ms]
(pass) the installed CLI is the packaged build, never live source (K2) > a global install cannot happen without a build in front of it [0.02ms]
(pass) the installed CLI is the packaged build, never live source (K2) > the package ships dist/, so what is installed is what was built [0.02ms]

test/tool-exec-retry.test.ts:
(pass) every command into a harness or plexer retries on timing, not on being wrong > a transient refusal is reattempted until it succeeds [3.64ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a failure the caller calls permanent is thrown on the FIRST attempt, never retried [0.31ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > a tool that never recovers exhausts the budget and reports how many attempts it cost [8.08ms]
(pass) every command into a harness or plexer retries on timing, not on being wrong > the seam names no harness: the same policy drives a different binary [1.35ms]

test/daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.04ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit

test/commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [25.01ms]
(pass) worktree ownership reads the composed environment > a live agent's worktree is protected and a dead one's is not [48.86ms]
(pass) orch clean is destructive maintenance > a spawned agent is refused the sweep, and the dirs it does not own survive [0.91ms]

test/queue.test.ts:
(pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [53.68ms]
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [57.80ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [66.97ms]
(pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [65.16ms]
(pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [57.78ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [53.53ms]
(pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [53.78ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [55.18ms]
(pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [52.18ms]
(pass) queue facade on tasks and attempts > Cq13: adoption carries the queue — pack work comes with the agents [55.30ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [42.87ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [56.82ms]
(pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [42.16ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [40.49ms]

test/log-record.test.ts:
(pass) the one log record shape > writes one JSONL record per call, with an epoch-millis instant [2.82ms]
(pass) the one log record shape > a record below the configured level is not written at all [0.29ms]
(pass) the one log record shape > a correlation id rides every record of one dispatch, so one grep finds its whole life [0.28ms]
(pass) the one log record shape > agentId carries orch's minted id; a plexer handle is a field, never the identity [0.22ms]
(pass) the one log record shape > every level is orderable, lowest to highest [0.03ms]
(pass) the one log record shape > a malformed line is rejected by the guard rather than trusted [0.04ms]

test/one-bind-for-the-unix-endpoint.test.ts:
(pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.03ms]
(pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [5.37ms]

test/spawn-placement.test.ts:
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [33.81ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [32.17ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space and orch OUTSIDE the plexer, the PACK gets its own marked home [32.34ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > the same pack spawning again reuses its home and asks the human nothing [35.93ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > an environment that holds nothing answers with an absence, never a refusal [31.79ms]
(pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a space with no home HERE places the fleet without borrowing another plexer's [32.41ms]

test/holder-death-costs-a-driver.test.ts:
(pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [40.47ms]
(pass) holder death costs a driver, not a life (D2) > the lease closes `expired` — not `released`, because no caller held it [38.91ms]
(pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable — nothing closes it [40.21ms]
(pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [38.97ms]
(pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [39.70ms]
(pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [37.49ms]

test/broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [183.96ms]

test/hermetic-env.test.ts:
(pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.12ms]

test/a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [39.06ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there — losing a pane costs a shortcut, not a life [34.89ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [39.04ms]

test/store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [33.97ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [48.23ms]
(pass) queue facade storage > retention never removes a queued task based on its age [33.19ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [34.03ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [35.26ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [36.64ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [29.08ms]

test/commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [0.20ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.05ms]
(pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [51.22ms]

test/settings-shell.test.ts:
(pass) settings shell decisions > non-TTY takes the print path [0.04ms]
(pass) settings shell decisions > an overridden setting is refused with the winner named [0.12ms]
(pass) settings shell decisions > an overridden setting cannot be written [105.16ms]
(pass) settings shell decisions > registered writes use the registry entry [1.16ms]
(pass) settings shell decisions > registry exposes writable subcommand entries [0.15ms]

test/worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.12ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.05ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test/spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.24ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.07ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.03ms]
(pass) spawn policy caps > reads a pack cap override from settings [0.38ms]
(pass) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [39.09ms]

test/thinking-resolution.test.ts:
(pass) thinking resolution > resolves every rung in priority order [4.42ms]
(pass) thinking resolution > bare model with no setting yields harness default [0.54ms]
(pass) thinking resolution > pi translates the resolved level through its thinking role [0.10ms]
(pass) thinking resolution > per-harness override beats global default [0.33ms]

test/herdr-hud-environment.test.ts:
(pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [40.63ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [38.73ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [39.97ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [1.15ms]
(pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [0.33ms]

test/setup-flags.test.ts:
(pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.14ms]
(pass) setup model flags > binds each model flag to its own harness [0.07ms]
(pass) setup model flags > allows a bare model for one harness [0.02ms]
(pass) setup model flags > rejects a model bound to an unselected harness [0.10ms]
(pass) setup model flags > rejects duplicate model flags for one harness [0.07ms]

test/claude-adapter.test.ts:
(pass) Claude adapter > declares its identity, and composes only the roles it fully implements [0.10ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.05ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.05ms]
(pass) Claude adapter > detects state from a live presence status [0.45ms]
(pass) Claude adapter > extracts result.json before transcript and native output [0.46ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [0.36ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [89.09ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [347.44ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [85.65ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [109.45ms]

test/setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [122.51ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.14ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.19ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [1.30ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.21ms]

test/cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.95ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.07ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.17ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [3.77ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.15ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.21ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [0.15ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.21ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [37.47ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.32ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [157.53ms]
(pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.20ms]
(pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.04ms]

test/daemon-credential.test.ts:
(pass) the token file is the whole credential > the token is 0600 [13.51ms]
(pass) the token file is the whole credential > $ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces [2.01ms]
(pass) the token file is the whole credential > a token left loose by an earlier run is tightened, not trusted [1.70ms]
(pass) the token file is the whole credential > a runtime directory the daemon creates is 0700 too [1.64ms]
(pass) the token file is the whole credential > nothing else is enrolled: there is no allowlist beside the token [1.69ms]

test/peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.35ms]
(pass) spawner identity > an unregistered Claude Code session is labelled by its harness, with no id [0.23ms]
(pass) spawner identity > a session orch has registered IS addressable, by the id orch minted [31.74ms]
(pass) spawner identity > an unregistered session has no id to hand out, and does not invent one [0.33ms]
(pass) spawner identity > an orch-spawned orchestrator acts as the id orch minted for it [37.63ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.19ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.05ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the lease holder [45.60ms]
(pass) the spawner address invariant > an UNREGISTERED session stamps no address, so no worker is handed an unreachable one [0.34ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.17ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [29.46ms]
(pass) peer identity in messaging > peer summaries render an unplaced agent without a local place name [19.21ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [0.97ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [0.43ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [19.67ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.32ms]

test/transfer-does-not-disturb.test.ts:
(pass) a transfer touches the lease and nothing else > a handoff changes the holder and leaves every other fact identical [53.99ms]
(pass) a transfer touches the lease and nothing else > the agent's process is not restarted or re-attached [53.74ms]
(pass) a transfer touches the lease and nothing else > no reset, steer or re-attach is delivered to the agent [55.50ms]
(pass) a transfer touches the lease and nothing else > adoption of an unheld agent disturbs it no more than a handoff does [57.28ms]
(pass) a transfer touches the lease and nothing else > the holding that ended is kept as history, not erased by the transfer [57.81ms]

test/commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [44.03ms]
(pass) commands/runs > target filter and json preserve RunRecord rows [63.43ms]
(pass) commands/runs > running rows render as running, not zero duration [0.18ms]
(pass) commands/runs > result falls back to durable run history after presence reap [28.18ms]

test/daemon-no-peer-credentials.test.ts:
(pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [0.85ms]
(pass) the daemon asks for a token and nothing else > a caller the daemon has no relationship to is accepted on the token alone [42.28ms]
(pass) the daemon asks for a token and nothing else > that same stranger without the token is refused, so the token is what decided [3.81ms]

test/dispatch-channel-first.test.ts:
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a headless agent receives a dispatch through the inbox, not a no-pane answer [1.86ms]
(pass) work reaches an agent through orch's channel, with the pane only a shortcut > a steer reaches a paneless agent the same way [1.17ms]

test/settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [107.10ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [319.85ms]
(pass) orch settings notify > accepts asking as a first-class sink state [111.88ms]
(pass) orch settings notify > remove drops only the named sink [252.77ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [190.35ms]
(pass) orch settings notify > an empty notify array lists as none configured [0.48ms]

test/notify.test.ts:
(pass) notification routing > an excluded state does not invoke its notifier [4.83ms]

test/backend-tmux.test.ts:
(pass) TmuxBackend > does not expose legacy top-level group methods [0.14ms]
(pass) TmuxBackend > composes a complete group role bundle [0.06ms]
(pass) TmuxBackend > exposes tmux pane roles [0.04ms]
(pass) TmuxBackend > does not declare pane foreground capability [0.07ms]
(pass) TmuxBackend > reports tmux availability [0.19ms]
(pass) TmuxBackend > workspaceNames is empty — tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.05ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.05ms]
(pass) TmuxBackend > the pane inventory surfaces only orch-spawned panes [0.51ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.12ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [0.43ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.10ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [250.97ms]
(pass) TmuxBackend > waiting fails immediately when the pane has no presence key [0.11ms]
(pass) TmuxBackend > the pane screen returns captured text and throws when capture-pane fails [1750.92ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.35ms]
(pass) TmuxBackend > paneHost.open splits the requested target with cwd and environment [0.38ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.87ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.17ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.26ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.12ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.34ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.17ms]

test/identity.test.ts:
(pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.08ms]
(pass) serializeIdentity / parseIdentity > round-trips a minted id [0.04ms]
(pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.09ms]
(pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.02ms]
(pass) isAgentId > accepts a minted id [0.04ms]
(pass) isAgentId > rejects everything that is not one [0.05ms]
(pass) malformed input > rejects a plexer-and-space key on parse [0.11ms]
(pass) malformed input > rejects an empty key [0.04ms]
(pass) malformed input > rejects a pane handle, a name, and a wrong-length id on serialize [0.08ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.04ms]
(pass) malformed input > tryParseIdentity parses a minted id [0.02ms]

test/commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [50.64ms]
(pass) lease commands > a LIVE foreign holder still excludes everyone else [38.31ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [37.76ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [43.68ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [41.26ms]
(pass) lease commands > reap refuses while the recorded process is alive [35.15ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [44.05ms]
{"outcome":"answer","reason":"no-pane","text":"3g8da1wyi1 has no pane; abort does not apply."}
(pass) lease commands > abort proceeds with a foreign live-holder lease [57.39ms]
{"closed":["close-handle"],"results":[{"target":"043e3xb91v","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) lease commands > close proceeds with a foreign live-holder lease [54.01ms]
{"target":"exxhm8gp3t","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [41.24ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [35.12ms]

test/event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.20ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [150.02ms]

test/adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.16ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.09ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.06ms]
(pass) PiAdapter > reads state from the presence status through store helpers [0.50ms]
(pass) PiAdapter > appends a steer message to the presence inbox [0.27ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [0.25ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [0.70ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.21ms]

test/daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [0.53ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [0.51ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [0.67ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [0.27ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [0.39ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [0.33ms]
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
  add       react                Add a dependency to package.json (bun a)
  remove    babel-core           Remove a dependency from package.json (bun rm)
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
  create    astro                Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [60.13ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [1.15ms]
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
  add       tailwindcss          Add a dependency to package.json (bun a)
  remove    is-array             Remove a dependency from package.json (bun rm)
  update    elysia               Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
  outdated                       Display latest versions of outdated dependencies
  link      [<package>]          Register or link a local npm package
  unlink                         Unregister a local npm package
  publish                        Publish a package to the npm registry
  patch <pkg>                    Prepare a package for patching
  pm <subcommand>                Additional package management utilities
  info      @shumai/shumai       Display package metadata from the registry
  why       hono                 Explain why a package is installed

  build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file

  init                           Start an empty Bun project from a built-in template
  create    vite                 Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [0.55ms]
(pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [0.49ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [0.36ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [0.21ms]

test/port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.22ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.12ms]

test/one-control-dispatcher.test.ts:
(pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [8.32ms]
(pass) there is exactly one control dispatcher > no dispatcher is exported under two names [4.10ms]

test/spawn-name-list.test.ts:
(pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.17ms]
(pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.08ms]
(pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.20ms]
(pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.30ms]
(pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.16ms]
(pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.13ms]
(pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.08ms]
(pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [0.71ms]

test/store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [46.55ms]
(pass) agent lease rows > a second open lease is rejected [39.31ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [40.50ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [40.69ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [38.47ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [41.32ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [38.78ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [38.60ms]
(pass) agent lease rows > an agent cannot lease itself [36.60ms]
(pass) agent lease rows > expiry inserts nothing new [40.95ms]
(pass) agent lease rows > reads return only open rows [41.41ms]

test/unleased-stays-adoptable.test.ts:
(pass) unleased and idle stays alive and adoptable (D3) > a decade of retention sweeps never ages out an unleased idle agent [34.24ms]
(pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards — the point of keeping it [38.60ms]
(pass) unleased and idle stays alive and adoptable (D3) > the sweep reaps only agents that actually ENDED, never merely unleased ones [34.54ms]
(pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [36.96ms]

test/port-seam-channel.test.ts:
(pass) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [38.64ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [0.68ms]

test/cmd-lock-is-never-half-created.test.ts:
(pass) the command lock file is never observable half-created > a reader racing acquire/release never sees an existing but incomplete lock [1524.83ms]
(pass) the command lock file is never observable half-created > createFileExclusively refuses a taken path and leaves no staging file behind [0.62ms]

test/outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [42.90ms]

test/settings-thinking.test.ts:
(pass) orch settings thinking > writes the global default and reads back through loadConfig [1.07ms]
(pass) orch settings thinking > writes a per-harness override without disturbing the global default [1.34ms]
thinking  xhigh
(pass) orch settings thinking > the command sets the level a user names [0.70ms]
thinking (pi)  low
(pass) orch settings thinking > the command sets a per-harness level with --harness [0.61ms]
(pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [0.26ms]
(pass) orch settings thinking > clearing a per-harness override falls back to the global default [0.50ms]

test/lease-authority.test.ts:
(pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [39.20ms]
(pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [39.97ms]
(pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [34.48ms]
(pass) C4 steal > adopt refuses a live holder, and --steal takes it [40.50ms]
(pass) C4 steal > detach refuses a live holder, and --steal releases it [37.83ms]
(pass) C4a fencing token > lease ids are monotonic across handoff and adoption [38.92ms]
(pass) C4a fencing token > a stale fence cannot release the current holder's lease [43.40ms]
(pass) C4a fencing token > openLeaseId is null when nothing is leased [28.84ms]
(pass) C4b reads are never gated > status and events read straight through a live foreign lease [36.27ms]
(pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [31.16ms]
(pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [29.09ms]
(pass) C4e naming at creation > a nameless spawn is refused [0.13ms]
(pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [28.79ms]
(pass) C4f self-rename > an agent renames itself whether or not a lease is in force [40.25ms]
(pass) C4f self-rename > renaming another agent is driving and obeys the lease [35.25ms]
(pass) C4f self-rename > an invalid name is refused [97.03ms]
(pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [59.55ms]
(pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [58.47ms]

test/work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [26.43ms]

test/cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.07ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [0.26ms]
(pass) tmux backend registry and capabilities > exposes pane roles [0.05ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.06ms]
(pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.16ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [0.11ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.07ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.08ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [50.02ms]

test/setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.31ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.09ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.21ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.08ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.21ms]

test/work-loop-identity.test.ts:
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [47.18ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [39.96ms]
(pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [44.55ms]

test/space-policy.test.ts:
(pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [32.80ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in the SAME repo root can reach each other [39.34ms]
(pass) a space is user-created, and absence falls back to the repo root > two unspaced agents in DIFFERENT repo roots cannot [30.87ms]
(pass) a space is user-created, and absence falls back to the repo root > an agent placed in no space reports none, even inside a plexer workspace [50.45ms]
(pass) a space is user-created, and absence falls back to the repo root > recording a spawn never conjures the space it names [30.90ms]
(pass) a space is user-created, and absence falls back to the repo root > a space still walls, and it outranks the repo root [39.35ms]
(pass) space policy > reads the space from the environment satellite, and absence is null [63.90ms]
(pass) space policy > resolves space names through records and functions [0.15ms]
(pass) space policy > compares agents by the space each is composed into [69.82ms]
(pass) space policy > enforces the space wall across every plexer alike [91.06ms]
(pass) space policy > scopes agents to the current space [49.02ms]
(pass) space policy > a null current space leaves items unscoped [29.79ms]
(pass) space policy > 2.7 status displays the composed space, not text sliced from a key [50.22ms]
(pass) space policy > 6.6 structured identity drives status and policy, not serialized key text [51.82ms]

test/notify-events-format.test.ts:
(pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.10ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.12ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.11ms]
(pass) notification and presence event formatting > webhook payload includes space and spaceColor [0.45ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.49ms]
(pass) notification and presence event formatting > derivePresenceTransition composes the space from the agent's environment [32.06ms]

test/store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [38.47ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [48.59ms]
(pass) event store rows > pruned sequence numbers are never reused [42.11ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [37.65ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [51.27ms]

test/bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [4.68ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [2.08ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [1.86ms]

test/every-agent-has-an-inbox.test.ts:
(pass) every agent has an inbox > a paned agent and a capless one are delivered to identically [65.93ms]
(pass) every agent has an inbox > the inbox is at one derived path, whatever the agent's environment [52.71ms]
(pass) every agent has an inbox > delivery stamps an id and a timestamp on every message, for every agent [30.86ms]
(pass) every agent has an inbox > delivery is refused for a disconnected bridge, not for a missing pane [40.02ms]

test/presence-inbox.test.ts:
(pass) shared presence line writers > inbox and ack drains use the same claimed rename path [6.54ms]
(pass) shared presence line writers > pi appends and answers through shared presence writers [1.02ms]
(pass) shared presence line writers > wrong status schema is rejected by shared status reader [0.51ms]

test/status-owner-column.test.ts:
(pass) the rendered status table carries the owner column > each row's OWNER cell holds that row's lease fact [0.96ms]
(pass) the rendered status table carries the owner column > a dead holder renders as unleased, not as a live driver [0.16ms]
(pass) the rendered status table carries the owner column > the owner column is dropped only when no row knows its lease [0.19ms]

test/pack-gets-its-own-home.test.ts:
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the coordinate is STORED against the pack and is never orch's own id [36.74ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > the home orch opens is MARKED as orch's, never a bare directory name [38.55ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a space's home and a pack's home use the SAME role and different tables [38.77ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > an environment that holds nothing answers with an absence, and stores none [27.20ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > a home recorded in another plexer is not this one's to drive [33.73ms]
(pass) a pack gets its own marked plexer home (E8, E9, E10) > closing a pack's home clears the row, so the next open is a fresh one [33.60ms]

test/owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else this process's own minted id [0.41ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [114.85ms]
(pass) fleet ownership scoping > close --all works without an owner token [178.27ms]
skipping caller: unknown backend null (reaping the record)
skipping other: unknown backend null (reaping the record)
{"closed":["caller","mine","foreign","other"],"results":[{"target":"caller","handle":"caller","outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null},{"target":"other","handle":"other","outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
(pass) fleet ownership scoping > close --all closes all managed records regardless of owner [70.46ms]
(pass) fleet ownership scoping > explicit foreign target closes successfully [253.03ms]
(pass) fleet ownership scoping > driving verbs remain gated against a live foreign holder [790.02ms]
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [342.69ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [632.37ms]
(pass) fleet ownership scoping > close has no force option and remains unconditional without it [356.03ms]
{"closed":["{\"pid\":10936,\"key\":\"kmismatch1\"}"],"results":[{"target":"kmismatch1","handle":"{\"pid\":10936,\"key\":\"kmismatch1\"}","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [56.30ms]
(pass) a spawned agent touches only what it spawned > a spawned agent acts as its own minted id, not its launch key [0.13ms]
(pass) a spawned agent touches only what it spawned > --cross-space from a spawned agent is refused [142.74ms]
(pass) a spawned agent touches only what it spawned > close --all from an AGENT sweeps only its own subtree [210.44ms]
(pass) a spawned agent touches only what it spawned > close --all from the HUMAN sweeps every managed spawn, whoever spawned it [209.14ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent is REFUSED when the target is not its own [176.10ms]
(pass) a spawned agent touches only what it spawned > close from a spawned agent SUCCEEDS on a slave it spawned itself [201.04ms]
(pass) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [188.52ms]

test/config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [6.39ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [1.13ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [0.42ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [0.41ms]
(pass) loadConfig > reads the declared runtime [0.33ms]
(pass) loadConfig > parses every supported settings section [1.17ms]
(pass) loadConfig > rejects a file without the current schemaVersion [0.33ms]
(pass) loadConfig > rejects invalid JSON loudly [0.21ms]
(pass) loadConfig > names the key path for invalid fields [0.42ms]
(pass) loadConfig > rejects unknown settings keys [0.33ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [0.36ms]
(pass) loadConfig > rejects old settings keys [0.99ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [0.67ms]
(pass) loadConfig > applies every settings default when sections are absent [0.43ms]
(pass) loadConfig > preserves configured values while defaulting each missing section value [0.43ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [0.70ms]
(pass) loadConfig > rejects a host without dest [0.36ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [0.49ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [0.35ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.42ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.31ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.03ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [0.65ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [0.77ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [0.83ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [0.61ms]
(pass) reapUnreadableSettings > leaves a readable file alone [0.28ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [0.58ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [0.98ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [0.64ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [0.90ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [0.34ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [0.53ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [0.79ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [0.28ms]
(pass) config precedence > uses the settings.json value over the fallback [0.26ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [0.40ms]
(pass) config precedence > uses an explicit flag override over the environment [0.03ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.05ms]
(pass) resolveWithSource > rejects an environment value with the wrong shape [0.08ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.05ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [0.31ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [0.26ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [1.24ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [0.65ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [1.11ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [0.25ms]

test/doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [1.92ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [1.09ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [327.36ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [0.65ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [149.09ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [0.79ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [0.61ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [0.67ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [1.26ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.41ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [0.44ms]

test/worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.17ms]
(pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.05ms]
(pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.05ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.03ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
(pass) worker prompt capability composition > events strip both worker header variants [0.41ms]

test/adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.27ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [0.54ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [0.62ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [0.34ms]

test/identity-is-not-environment.test.ts:
(pass) A1 — identity carries no environment > Identity declares no plexer and no plexer grouping [0.05ms]
(pass) A1 — identity carries no environment > a key is the minted id itself, with no separator to split [0.04ms]
(pass) A1 — identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.03ms]
(pass) A1 — identity carries no environment > minted ids are unique per spawn [1.70ms]

test/commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.04ms]
(pass) commands/target > extracts target and joined prompt [0.09ms]
(pass) commands/target > reads only structured result text [0.04ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.08ms]
(pass) commands/target > lists only live serialized identity presence entries [0.96ms]

test/outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [33.84ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [30.11ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [109.64ms]

test/reload-no-bundle-write.test.ts:
{"results":[],"ok":0,"total":0,"hard":false,"signaled":"reload.signal"}
(pass) reload > does not write installed extension bundles [6.96ms]

test/commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [34.35ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [37.35ms]
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [0.29ms]

test/store-task-rows.test.ts:
(pass) task and attempt rows > malformed task rows are refused instead of handed back as typed data [47.59ms]
(pass) task and attempt rows > malformed attempt rows are refused instead of handing back NaN [46.05ms]
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [33.63ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [42.92ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [39.39ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [47.61ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [49.78ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [70.64ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [47.99ms]

test/no-sibling-relay.test.ts:
(pass) a worker with no reachable spawner does not relay (L6) > an unset spawner refuses, and the refusal names the agent's own report path [5.53ms]
(pass) a worker with no reachable spawner does not relay (L6) > the refusal never suggests another agent as an alternative route [0.64ms]
(pass) a worker with no reachable spawner does not relay (L6) > a spawner that is stamped but has no inbox refuses by NAME and still says to report [0.39ms]

test/orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [8.62ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.25ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.33ms]

test/worktree.test.ts:
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [21.32ms]
(pass) worktree primitives > detects commits ahead of a base branch [28.19ms]
(pass) worktree primitives > removes an agent worktree [22.53ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [1.54ms]

test/presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [45.55ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [39.91ms]
(pass) presence status schema > status and list report the same agent identity [64.41ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [36.16ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [40.76ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [40.91ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [32.81ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [41.83ms]
(pass) presence status schema > the four facts are recorded apart and composed back onto the minted id [25.44ms]

test/port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.08ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.02ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.06ms]

test/notify-sinks.test.ts:
(pass) notification entries > desktop entries use the canonical notifier registry [0.23ms]

test/cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [0.53ms]
(pass) command lock > second acquire blocks until first releases [38.58ms]
(pass) command lock > dead-pid lock is reaped [0.57ms]
(pass) command lock > release with wrong pid refuses [0.43ms]
bun test held by agent-a (pid 9093)
(pass) command lock > matches locked command prefixes and probes settings [1.05ms]
(pass) command lock > run propagates the child exit code [4.25ms]

test/remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.11ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.06ms]

test/broker-ownership.test.ts:
(pass) broker ownership and space governance > the composed holder is the only ownership record, and adoption moves it [43.23ms]
(pass) broker ownership and space governance > refuses cross-space writes unless explicitly overridden [42.93ms]
(pass) broker ownership and space governance > moving an agent between spaces moves the wall, not its identity [39.57ms]

test/cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquire→release around the tool call [8.24ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched — no acquire, no release [0.50ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted — a non-bash tool never acquires [0.32ms]
(pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [612.12ms]
(pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [0.85ms]

test/work-survives-its-spawner.test.ts:
(pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [45.17ms]
(pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [38.39ms]
(pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.35ms]
(pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [0.29ms]
(pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [39.47ms]

test/session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.13ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [0.77ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [0.25ms]

test/doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [3520.53ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [0.77ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [0.68ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [3518.95ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [3519.37ms]
(pass) doctor notification-sink checks > warns when a notifier omits done from its on list [63.39ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [63.48ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [63.06ms]

test/commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.06ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.03ms]
(pass) per-command help topics > logs help names every filter the command accepts [0.06ms]
(pass) per-command help topics > an unknown name has no topic [0.01ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.05ms]

test/spawn-names.test.ts:
(pass) agent name validation > rejects names outside herdr's naming rule [0.17ms]
(pass) agent name validation > accepts lowercase names with hyphens and underscores [0.04ms]
(pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [45.90ms]
(pass) a live name is claimed and a dead one is released > a dead agent frees its name [40.02ms]
(pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [39.95ms]
(pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [47.26ms]
(pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [42.93ms]

test/doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [16.35ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [15.65ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [14.28ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [14.88ms]

test/adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.17ms]
(pass) adapter-owned session environment > keeps harness env literals inside adapter modules [2.18ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.11ms]

test/spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [50.07ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [40.04ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.32ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [41.57ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.16ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.13ms]

test/launch-stamp.test.ts:
(pass) canonical launch stamp > claude and codex launches produce the same status shape [0.21ms]

test/self-actor-identity.test.ts:
(pass) a driving session's write-actor is the agent orch registered for it > the session token resolves to the id hello minted, so the actor equals its own lease holder [29.44ms]
(pass) a driving session's write-actor is the agent orch registered for it > a token orch has never seen resolves to nothing rather than a fabricated id [20.52ms]
(pass) a driving session's write-actor is the agent orch registered for it > one session keeps ONE id across calls, whatever pid the shell reports [40.73ms]

test/daemon-transport-parity.test.ts:
(pass) both transports carry one mechanism > a bound TCP port does not displace the unix socket or become its own service [3.49ms]
(pass) both transports carry one mechanism > the credential is demanded identically on both [4.71ms]
(pass) both transports carry one mechanism > a missing credential is refused identically on both [3.90ms]
(pass) both transports carry one mechanism > the same token registers the same session whichever transport carried it [45.16ms]

test/peer-lease-visibility.test.ts:
(pass) peer summaries carry ownership as a lease > a peer the caller holds reports the caller as the live holder [49.32ms]
(pass) peer summaries carry ownership as a lease > a peer nobody ever took reports no orch driving it [44.10ms]
(pass) peer summaries carry ownership as a lease > a dead holder is not a live one [44.14ms]
(pass) the compact listing separates orphans from live work > unleased peers sit in their own bucket, below the driven ones [45.68ms]
(pass) the compact listing separates orphans from live work > a held peer names its holder, and an unleased one never reads as yours [50.25ms]
(pass) the compact listing separates orphans from live work > with nothing unleased the bucket does not appear at all [52.24ms]

test/cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [866.39ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [0.87ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1311.39ms]
(pass) command lock serialization > release refuses a different process instance token [0.64ms]

test/remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [16.87ms]
(pass) async remote fan-out > returns a typed dead-host failure [19.50ms]
(pass) async remote fan-out > returns a typed timeout failure [503.57ms]
(pass) async remote fan-out > returns a typed non-JSON failure [16.74ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [506.58ms]

test/adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.10ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.04ms]

test/commands-logging.test.ts:
(pass) orch logs > --dispatch selects one dispatch across both sinks, oldest first [0.86ms]
(pass) orch logs > --agent selects one agent's records [0.41ms]
(pass) orch logs > --level selects one severity [0.36ms]
(pass) orch logs > --since drops everything older than the instant given [0.32ms]
(pass) orch logs > --since 0 keeps every record instead of being read as a missing value [0.28ms]
(pass) orch logs > renders a readable line: instant, level, event, correlation, agent, fields [0.32ms]
(pass) orch logs > --json emits the records themselves [0.30ms]
(pass) command logging > notify test records the diagnosis and keeps user output on stdout [0.85ms]

test/offline-is-not-a-second-source.test.ts:
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [36.72ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [21.76ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.21ms]
(pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.08ms]

test/herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message → undefined [0.09ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error → undefined [0.02ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text → undefined [0.17ms]
(pass) retryableErrorMessage classifier > error stop with retryable text → the message [0.04ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.03ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.02ms]
(pass) createPaneStateMachine state ordering > run → blocked → unblock → idle debounce [5.46ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.05ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.37ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [10.77ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.14ms]

test/one-writer-records-a-spawned-agent.test.ts:
(pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record — space and lease included [52.32ms]
(pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [40.97ms]
(pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [0.19ms]

test/spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [39.56ms]
(pass) spawn agent registration > an agent that states no plexer and no handle gets neither row [31.83ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [51.99ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [34.65ms]

test/backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty — headless has no name concept [0.10ms]
(pass) HeadlessBackend > refuses to spawn with no prompt — a headless agent runs its prompt and exits [0.17ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [33.23ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [48.90ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [16.01ms]
(pass) HeadlessBackend > signals a matching recorded process through the injected killer [0.31ms]
(pass) HeadlessBackend > refuses to signal a pid whose process instance was replaced [0.11ms]
(pass) HeadlessBackend > never signals a dead pid [0.08ms]

test/commands-spawn.test.ts:
(pass) commands/spawn > refuses an invalid name before resolving or creating a workspace [1.41ms]
(pass) commands/spawn > refuses spawn without a name before any spawn mutations [15.77ms]
(pass) commands/spawn > rejects --detached as an unknown spawn flag [0.83ms]
(pass) commands/spawn > the positionals are the agent names [0.06ms]
(pass) commands/spawn > collects repeated prompts in agent order [0.03ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.10ms]

test/queue-reaping.test.ts:
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > a failed task whose scope is gone is unrunnable and survives every retention sweep [47.39ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > unrunnable is about who is alive now — a new pack member makes it claimable again [37.00ms]
(pass) Cq10/Cq11: unrunnable is a fact, stale is a clock, and only one of them is reapable > stale is surfaced beside its state and never deleted on age [35.46ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on re-scopes to the taker's own pack and the work becomes claimable there [39.75ms]
(pass) Cq12: an orphaned task has take-on, leave and reap, all deliberate > take-on refuses a taker that is not itself live [35.89ms]

test/broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused while a live orch holds the lease [36.04ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unleased target [29.32ms]
(pass) daemon governWrite enforcement > the lease holder may write to its own agent [35.47ms]
(pass) daemon governWrite enforcement > a foreign live holder in the same space is refused and named [36.85ms]
(pass) daemon governWrite enforcement > a dead holder is not a collision [41.88ms]
(pass) daemon governWrite enforcement > --steal on a driving verb does not take a live holder's lease [38.64ms]
(pass) daemon governWrite enforcement > a cross-space write is refused by the wall before the lease [47.88ms]
(pass) daemon governWrite enforcement > --cross-space clears the wall but the lease still applies [53.96ms]
(pass) daemon governWrite enforcement > the space operator writes to a same-space leased agent without taking the lease [51.21ms]
(pass) daemon governWrite enforcement > a foreign space's operator still hits the wall [57.72ms]
(pass) daemon governWrite enforcement > a refused enqueue leaves the lease exactly as it was [44.48ms]
(pass) daemon governWrite enforcement > a granted write and its enqueue commit together [42.04ms]
(pass) daemon governWrite enforcement > an unleased target is writable by any same-space actor [43.66ms]

test/ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.88ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.08ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit — the caller can act on it [0.12ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [4.26ms]

test/skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [119.39ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [146.35ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1167.95ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [439.64ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [491.86ms]

test/space-walls.test.ts:
(pass) space helpers > reads space ids from the environment satellite, never from the key [1.03ms]
(pass) space helpers > an agent that moves space keeps its identity and reports the new space [7.40ms]
(pass) space helpers > derives an entity space from the store [0.79ms]
(pass) space helpers > returns the same entities when all spaces are requested [0.10ms]
(pass) space wall writes > allows a write within the same space [0.73ms]
(pass) space wall writes > denies a cross-space write with both spaces in the reason [0.66ms]
(pass) space wall writes > applies the same wall rule whatever plexer the agents sit in [4.70ms]
(pass) space wall writes > allows a cross-space write with an explicit override [0.85ms]
(pass) space wall writes > allows unplaced targets [0.33ms]

test/one-query-stack-over-the-connection.test.ts:
(pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.07ms]
(pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [11.81ms]

test/presence-dirs-are-reaped-not-migrated.test.ts:
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, even with a LIVE pid [0.94ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [0.54ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [0.39ms]
(pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [22.08ms]

test/store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [21.47ms]
(pass) catalogue rows > write then read round-trips at and stdout [28.38ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [28.97ms]
(pass) catalogue rows > an entry with empty stdout is not stored [19.51ms]
(pass) catalogue rows > clearCatalogues empties the store [30.83ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [33.93ms]

test/spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [0.65ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.82ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.59ms]
(pass) spawn limits > rejects invalid cap %s with file and key [0.65ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [0.32ms]
(pass) spawn limits > global boundary refusal data counts the whole request [1.26ms]
(pass) spawn limits > one workspace may use the full global allotment [0.68ms]
(pass) spawn limits > workspace cap is independent of global headroom [0.74ms]
(pass) spawn limits > uncapped space is bounded only by global count [0.56ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [0.95ms]
(pass) spawn limits > dead pid records free capacity [0.22ms]
(pass) spawn limits > foreign panes never count [0.23ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [24.08ms]
(pass) spawn limits > doctor accepts satisfiable limits [19.96ms]

test/store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.05ms]
(pass) store row values > sets only non-null fields [0.05ms]

test/agent-model-unwelded.test.ts:
(pass) A1 — the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [0.82ms]
(pass) A1 — the four facts are never welded > ownership is a lease table, not a second id space [0.50ms]
(pass) A1 — the four facts are never welded > the agents hub carries identity and provenance only [0.16ms]
(pass) A1 — the four facts are never welded > no table anywhere carries a lifetime [5.60ms]

test/config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [21.85ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [392.70ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [21.78ms]
(pass) watchConfig > stop prevents further callbacks [409.91ms]

test/orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [75.68ms]

test/seat-index.test.ts:
(pass) seat pure seams > errorMessage preserves non-Error thrown values [0.07ms]
(pass) seat pure seams > hasTheme discriminates missing and valid themes [0.07ms]
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.12ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.14ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.17ms]

test/queue-cli-scope.test.ts:
(pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [39.95ms]
(pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [36.95ms]
(pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [32.45ms]
(pass) Cq9: reading the queue is open > listing and history carry no caller and hide no other pack's work [37.95ms]

test/orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [2.28ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [3.64ms]

test/pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.06ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.02ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.04ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.30ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > retries until a still-booting registry answers [2.35ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > throws when the registry never yields the model [1.31ms]
(pass) resolveRegistryModel — task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.09ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [0.81ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2008.62ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [0.47ms]

test/doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and composed roles [3.05ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.09ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.05ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.04ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.03ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [0.68ms]

test/os-side.test.ts:
(pass) osSide > supports both platform branches independent of ambient host [0.03ms]

test/commands-events.test.ts:
(pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.25ms]
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.14ms]
(pass) commands/events > parses filters and scope flags [0.07ms]
(pass) commands/events > parses the wake-up flags [0.05ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.04ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.02ms]
(pass) commands/events > includes an unleased agent spawned by this session [0.02ms]
(pass) commands/events > excludes an agent spawned by a different session [0.01ms]
(pass) commands/events > --any-agent passes agents from both sessions [0.04ms]
(pass) commands/events > excludes an agent while another orch holds its lease [0.03ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.06ms]
(pass) commands/events > names one agent by name or by identity key [0.04ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.14ms]
(pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [0.23ms]
(pass) commands/events > rejects malformed event and labels sinks [0.11ms]
(pass) commands/events space scope > an agent streams into the space it currently occupies [48.35ms]
(pass) commands/events space scope > moving an agent moves its events with it [44.56ms]
(pass) commands/events space scope > --all streams every space, and an unplaced caller scopes to none [37.74ms]
(pass) commands/events space scope > a key naming no registered agent is in no space [0.28ms]

test/close-reports-every-target.test.ts:
(pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [131.19ms]
Could not close w7:p2C: herdr refused: pane is busy
(pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [39.30ms]
(pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [39.87ms]
(pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [41.12ms]

test/commands-space.test.ts:
(pass) orch space — orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [31.00ms]
(pass) orch space — orch's own grouping > create refuses a name already in use [25.92ms]
(pass) orch space — orch's own grouping > delete refuses a space that still holds agents [28.74ms]
(pass) orch space — the plexer's home > create makes a home and records only its coordinate [30.20ms]
(pass) orch space — the plexer's home > list reports that a space has a home without naming the coordinate [29.25ms]
(pass) orch space — the plexer's home > rename renames orch's space and its home [30.45ms]
(pass) orch space — the plexer's home > delete closes the home and drops its coordinate [35.41ms]
(pass) orch space — the plexer's home > focus focuses the recorded coordinate [29.30ms]
(pass) orch space — the plexer's home > a home made in another plexer is not this environment's to focus [28.86ms]
(pass) orch space — absence is an answer > focus with no space-home role names the space and what is missing [35.40ms]
(pass) orch space — absence is an answer > the plain-text answer names the space too [36.80ms]
(pass) orch space — vocabulary and wiring > cmdSpace lists through the resolved environment [22.81ms]
(pass) orch space — vocabulary and wiring > orch ws is gone [0.11ms]
(pass) orch space — vocabulary and wiring > space help never says workspace and offers create/rename/delete [0.06ms]
(pass) orch space — vocabulary and wiring > no space output ever says workspace [38.65ms]

test/lifecycle-reports-a-partial-run.test.ts:
(pass) a partial reload or restart is reported, not exited > reload --json writes the whole payload and sets exitCode, never exits [34.88ms]
(pass) a partial reload or restart is reported, not exited > restart --json writes the whole payload and sets exitCode, never exits [31.19ms]

test/store-interval-rows.test.ts:
(pass) interval satellites > only one open interval is allowed [36.87ms]
(pass) interval satellites > half-open adjacency is legal [39.71ms]
(pass) interval satellites > clearSpace closes without opening [41.91ms]
(pass) interval satellites > agent plexer is immutable one-shot [33.84ms]
(pass) interval satellites > process restart history closes at the successor since [39.04ms]
(pass) interval satellites > process rows carry host and process identity [34.06ms]
(pass) interval satellites > nullable process start_token round-trips as null [36.92ms]
(pass) interval satellites > space move history closes at the successor since [34.40ms]
(pass) interval satellites > tuning change history closes at the successor since [34.96ms]
(pass) interval satellites > handle history preserves each renumbered handle [36.76ms]
(pass) interval satellites > interval instants are stored as INTEGER values [49.75ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [34.94ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [37.83ms]
(pass) interval satellites > tuning carries model and nullable thinking [34.53ms]

test/commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.15ms]
(pass) commands/control > parses --then destination and note [0.04ms]
(pass) commands/control > adds worker header unless raw [0.04ms]

test/outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [33.44ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [28.74ms]
(pass) outbox ack fallback > a duplicated ack marker is counted once, not twice [28.94ms]
(pass) outbox ack fallback > an ack whose key does not match the agent dir is ignored [31.89ms]
(pass) outbox ack fallback > an inbox write is queued, not delivered: only the agent's ack settles the row [30.16ms]
(pass) outbox ack fallback > a channel that can never ack settles the row on the write itself [28.91ms]
(pass) outbox ack fallback > a queued write is handed off, so it is open but no longer unsent [29.26ms]
(pass) outbox ack fallback > a write no channel would take stays unsent [26.99ms]

test/doctor-declared-vs-reality.test.ts:
(pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [38.39ms]
(pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [37.53ms]
(pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [35.48ms]
(pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [53.10ms]
(pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [53.76ms]

test/daemon-decision-trail.test.ts:
(pass) daemon decision trail > records a lease refused against a live holder [58.03ms]
(pass) daemon decision trail > records a lease granted over a dead holder [38.01ms]
steer vdwvestmb8 refused (no-pane): vdwvestmb8 has no pane; steer does not apply.
(pass) daemon decision trail > records a no-pane boundary answer with its reason [31.56ms]

test/commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.21ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [0.45ms]

test/errno-guard.test.ts:
(pass) errnoCode reads a syscall error code, and only a real one > returns the code of a real node syscall error [0.11ms]
(pass) errnoCode reads a syscall error code, and only a real one > a plain Error carries no code, so there is none to report [0.07ms]
(pass) errnoCode reads a syscall error code, and only a real one > a non-object never yields a code instead of crashing on it [0.08ms]
(pass) errnoCode reads a syscall error code, and only a real one > a code-shaped field of the wrong type is not a code [0.04ms]
(pass) isAgentState verifies the state rather than asserting it > accepts a declared state [0.05ms]
(pass) isAgentState verifies the state rather than asserting it > rejects anything not declared, including non-strings [0.06ms]

test/command-space-fields.test.ts:
(pass) command space fields > status and wall entities use the composed space, and it is nowhere in the key [41.15ms]
(pass) command space fields > skipBackends keeps the authoritative presence entity shape [40.31ms]
(pass) command space fields > status reports a mixed pi and Claude fleet with the same identity fields [46.05ms]

test/store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [27.81ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [28.34ms]
(pass) a slave never reaps or recreates the store > a spawned agent hitting a schema-mismatched store errors and mutates nothing [26.29ms]
(pass) a slave never reaps or recreates the store > a recreate is refused while a live presence dir exists, for the user too [23.37ms]
(pass) a slave never reaps or recreates the store > the user may recreate once nothing is live [20.14ms]
(pass) a slave never reaps or recreates the store > a spawned agent is refused a recreate even with nothing live [24.78ms]

test/retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [19.79ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [86.56ms]
(pass) retention sweep > returns zero counts when every row is inside its window [39.03ms]
Warning: retention sweep queue failed: Failed query: select "tasks"."id" from "tasks" inner join "task_states" on "task_states"."task_id" = "tasks"."id" left join "task_cancellations" on "task_cancellations"."task_id" = "tasks"."id" where (("task_states"."state" in (?, ?, ?)) and (COALESCE("task_cancellations"."cancelled_at", (
    SELECT MAX("task_attempts"."until") FROM "task_attempts" WHERE "task_attempts"."task_id" = "tasks"."id"
  )) < ?))
params: done,failed,cancelled,1768694400000
(pass) retention sweep > continues sweeping when one table delete fails [34.36ms]
(pass) retention sweep > reaps expired agents by identity, taking every satellite with them [44.18ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [30.36ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [26.84ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [21.29ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [21.24ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [38.77ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [37.49ms]
(pass) retention sweep > does not sweep again one minute after the first tick [31.31ms]
(pass) retention sweep > prunes orch's own logs past the age cap [29.01ms]
(pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [29.16ms]

test/web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.39ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer space id [0.07ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.05ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.13ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.10ms]
(pass) live views group by lease (C7) > a space encompasses its orchs, and each orch encompasses the agents it holds [0.18ms]
(pass) live views group by lease (C7) > an ADOPTED agent is filed under the orch holding it now, never under its spawner [0.09ms]
(pass) live views group by lease (C7) > an UNHELD agent is grouped as unheld, not hidden and not invented an orch [0.07ms]
(pass) live views group by lease (C7) > the space still lists every live agent flat, so the lease grouping adds a level and hides nothing [0.10ms]
(pass) live views group by lease (C7) > history does NOT gain a lease level: a pack stays grouped by provenance [0.08ms]
(pass) the orphan bucket holds every undriven agent (G9) > a lease whose holder is DEAD is an orphan, not live work [0.13ms]
(pass) the orphan bucket holds every undriven agent (G9) > an agent with no lease at all is still an orphan [0.11ms]
(pass) the orphan bucket holds every undriven agent (G9) > the two buckets never overlap and never lose an agent [0.15ms]
(pass) the orphan bucket holds every undriven agent (G9) > a dead holder is not shown as an orch driving work in the lease grouping either [0.06ms]

test/session-path-is-not-posix-only.test.ts:
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a Windows drive-letter session path is reported as a PATH [3.18ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a POSIX session path still reports as a path [1.98ms]
(pass) a session path is recognised by being absolute, not by a leading slash (1.12) > a RELATIVE path is not a session path, and the id is used instead [1.82ms]

test/commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.04ms]
(pass) commands/review > falls back to branch then the agent's address [0.02ms]

test/commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.07ms]
(pass) commands/status > dead rows never display stale live state [0.03ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.04ms]
(pass) commands/status > default status reads span every workspace [0.17ms]
(pass) commands/status > derives view fields from seeded presence [0.21ms]
(pass) commands/status > marks dead presence as exited [17.55ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.42ms]
(pass) commands/status > shared status row carries presence-derived fields [0.27ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.39ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.19ms]
(pass) commands/status > status owner ignores spawning provenance when no lease exists [0.46ms]
(pass) commands/status > lease-backed status attribution distinguishes my lease, another lease, and unleased rows [45.91ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [5.83ms]
(pass) commands/status > formats workspace labels and warnings [0.18ms]

test/os-executors.test.ts:
(pass) cross-OS execution is a backend, not a peer daemon > the local side supplies start, is-alive and kill [0.21ms]
(pass) cross-OS execution is a backend, not a peer daemon > an OS side with no executor answers, and never runs the body [0.09ms]
(pass) cross-OS execution is a backend, not a peer daemon > the local side runs the body and hands back its value [0.07ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor passes a daemon registered on the side orch is running on [5.05ms]
(pass) cross-OS execution is a backend, not a peer daemon > doctor answers, rather than failing, for a daemon on a side with no executor [0.51ms]

test/no-daemon-commands.test.ts:
(pass) commands that need no daemon need no identity > orch help registers no agent and starts no daemon [100.49ms]
(pass) commands that need no daemon need no identity > orch version registers no agent and starts no daemon [133.83ms]
(pass) commands that need no daemon need no identity > orch status --offline registers no agent and starts no daemon [125.09ms]
(pass) commands that need no daemon need no identity > orch doctor registers no agent and starts no daemon [145.13ms]
(pass) commands that need no daemon need no identity > help works before setup has ever run, which is when it is needed most [114.97ms]

test/doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [29.15ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [21.65ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [18.98ms]

test/doctor-settings-preservation.test.ts:
(pass) doctor settings preservation > yes mode leaves existing settings.json byte-identical [19.18ms]

test/config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [0.47ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [0.35ms]
(pass) config precedence > uses env over config and flag over env [0.32ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [0.60ms]
(pass) config precedence > reports a helpful validation error for invalid config [0.43ms]

test/doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.11ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [21.23ms]
(pass) runDoctor > checks a healthy store [44.32ms]
(pass) runDoctor > warns when the store is absent [0.31ms]
(pass) runDoctor > fails when the store predates orch's migrations [27.21ms]
(pass) runDoctor > fails and names a missing store table [25.59ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [18.73ms]
(pass) runDoctor > reports an absent daemon as optional [15.60ms]
(pass) runDoctor > reports and fixes a stale daemon lock [14.34ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [38.87ms]
(pass) runDoctor > warns when the live daemon code hash is stale [16.29ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [31.56ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [0.68ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [0.49ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [0.59ms]
(pass) runDoctor > reports a dead presence pid [21.21ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [30.03ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [1.24ms]
(pass) runDoctor > validates configured notifier adapters [141.59ms]
(pass) runDoctor > reports invalid config and accepts missing config [35.07ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [32.73ms]

test/work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.16ms]
(pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [58.54ms]

test/vocabulary.test.ts:
(pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [32.89ms]
(pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [30.37ms]
(pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [101.45ms]
(pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.14ms]
(pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [12.85ms]

test/backend-space-home.test.ts:
(pass) tmux space home > focus switches the client to the session holding the space [0.16ms]
(pass) tmux space home > create names the session after the space and returns its root pane [0.18ms]
(pass) tmux space home > rename and close address the session coordinate [0.05ms]
(pass) tmux space home > list reports every session as a coordinate with a label [0.08ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled pack home is named for the pack it was opened for [0.13ms]
(pass) a home orch opens is never unmarked (E8) > an unlabelled space home is named for the space, not for the pack [0.06ms]
(pass) a home orch opens is never unmarked (E8) > a subject id the plexer would refuse is made safe, never passed through [0.07ms]
(pass) a home orch opens is never unmarked (E8) > a caller-supplied label is used verbatim [0.04ms]

test/queue-scope.test.ts:
(pass) queue scope invariants > a failed pack task retries on another pack member, while an agent task stays pinned [51.78ms]
(pass) queue scope invariants > cancel is allowed for the enqueuer or a lease holder of a targeted agent [47.08ms]
(pass) queue scope invariants > cancel refuses a caller who is neither enqueuer nor targeted lease holder [38.55ms]
(pass) queue scope invariants > edit is allowed only for the enqueuer while queued [39.15ms]
(pass) queue scope invariants > an orphan has exactly take-on, leave, and reap resolutions [45.98ms]
(pass) queue scope invariants > stale queued work is surfaced distinctly and never deleted by age [34.11ms]
(pass) queue scope invariants > two concurrent claims have one winner and one one_open_attempt violation [47.19ms]

test/store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [37.01ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [35.79ms]
(pass) agent store rows > liveAgents excludes agents with an ending [37.04ms]
(pass) agent store rows > packMembers selects the materialized root [39.22ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [20.07ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [17.97ms]
(pass) agent store rows > label maps both null and a value [32.94ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [30.79ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [36.98ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [37.68ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [27.12ms]
(pass) agent store rows > childrenOf returns direct descendants [37.30ms]

test/close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"results":[{"target":"panename01","handle":"pane-name","outcome":"done","error":null},{"target":"panekey001","handle":"pane-key","outcome":"done","error":null},{"target":"paneid0001","handle":"pane-id","outcome":"done","error":null}],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-space target by name, key, or pane id [91.53ms]
Could not close pane-survives: pane-survives is still listed by headless after the close
{"closed":[],"results":[{"target":"survives01","handle":"pane-survives","outcome":"error","error":"pane-survives is still listed by headless after the close"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a successful backend close retains a pane that is still listed [109.92ms]
Could not close pane-signal-failed: signal denied
{"closed":[],"results":[{"target":"signalfai1","handle":"pane-signal-failed","outcome":"error","error":"signal denied"}],"requested":1,"ok":0,"stream":false}
(pass) close always works > a failed signal retains the registry and presence and reports failure [65.75ms]
{"closed":["pane-presence-only"],"results":[{"target":"presence01","handle":"pane-presence-only","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > presence pid without a recorded process closes the pane without signalling and reaps [79.15ms]
{"closed":["pane-owned"],"results":[{"target":"owned00001","handle":"pane-owned","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > close ignores owner and spawnedBy gates [56.59ms]
{"outcome":"answer","reason":"no-environment-role","text":"this pane environment does not provide abort"}
(pass) close always works > abort ignores owner gate [54.92ms]
{"closed":["pane-duplicate"],"results":[{"target":"duplicate1","handle":"pane-duplicate","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
(pass) close always works > duplicate close targets count once [57.56ms]
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [244.75ms]
(pass) close always works > steer remains blocked by the space wall [54.03ms]

test/agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [1.09ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.23ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.23ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.19ms]

test/adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.21ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [0.44ms]

test/close-authority.test.ts:
(pass) who may end an agent (D7) > the human may close anything — no ORCH_AGENT_KEY is the human at a terminal [47.18ms]
(pass) who may end an agent (D7) > an orch may close the slaves it owns, at any depth [39.87ms]
(pass) who may end an agent (D7) > an agent may NOT close another orch's slaves, and is told whose it is [40.28ms]
(pass) who may end an agent (D7) > an agent may not close a peer orch either [40.43ms]
(pass) who may end an agent (D7) > an agent may always close itself — acting on yourself is not driving a fleet [39.53ms]
(pass) who may end an agent (D7) > the LEASE never decides it: a foreign holder does not block the owner [41.87ms]
(pass) who may end an agent (D7) > a provenance cycle terminates instead of hanging [47.95ms]

test/commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.53ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.18ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.05ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.16ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.25ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.12ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.06ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.18ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.07ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.47ms]
(pass) orch models --json > emits the pinned harness/model shape [0.14ms]

test/settings-registry.test.ts:
(pass) settings registry > declares every schema setting exactly once [1.24ms]
(pass) settings registry > every registry read resolves against a loaded config [3.34ms]
(pass) settings registry > contains no duplicate keys [0.09ms]

test/doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [36.97ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [32.30ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [37.40ms]

test/commands-results.test.ts:
(pass) commands/results > renders missing space and host as absent instead of inventing local [24.00ms]
(pass) commands/results > validates and extracts question payloads [0.14ms]
(pass) commands/results > formats invalid and recent timestamps [0.08ms]
(pass) commands/results > routes a seeded result.json through the command module [43.61ms]
(no result.json - falling back to adapter-extracted session text)
(pass) commands/results > falls back to adapter session text when result.json is absent [38.17ms]
(pass) commands/results > uses result.json even when the presence status has no agent [43.00ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [50.08ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [44.09ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [35.39ms]
(pass) commands/results > orch session reports the pi entry count [40.72ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [58.33ms]

test/reap-walks-provenance.test.ts:
(pass) reap walks the provenance tree (H3) > an ended agent with a still-present descendant is NOT reaped [33.69ms]
(pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up, one sweep per level [47.74ms]
(pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap even when the parent ended long ago [37.67ms]
(pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [40.70ms]

test/control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [1.13ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [0.76ms]
(pass) deliverControl > still answers a pane awaiting an answer [0.69ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [0.64ms]
(pass) deliverControl > does not fall back from a keys strategy to the orch channel [35.06ms]
(pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [33.65ms]
(pass) deliverControl > refuses steer and model on an adapter that composes neither role [0.89ms]
(pass) deliverControl > requires presence for inbox delivery [37.47ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [38.02ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [33.80ms]

test/backend-herdr.test.ts:
(pass) HerdrBackend > composes a complete group role bundle [1.13ms]
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [5.51ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.13ms]
(pass) HerdrBackend > agent_not_ready keeps the pane and does not close it [0.17ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.07ms]
(pass) HerdrBackend > pane and tab creation always preserves focus [0.08ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.07ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.09ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.05ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.11ms]
(pass) HerdrBackend > the pane host closes a pane through herdr [0.03ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.12ms]
(pass) HerdrBackend > a grouped spawn with no planned target splits a pane already in that tab, never the caller's pane [0.21ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.17ms]
(pass) HerdrBackend > adopts herdr's replacement pane id after move [0.03ms]
(pass) HerdrBackend > refuses a live herdr agent name before start [0.18ms]
(pass) HerdrBackend > reads recent unwrapped pane output [0.07ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.05ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.11ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.11ms]
(pass) HerdrBackend > pane input submits through pane run [0.05ms]
(pass) HerdrBackend > pane rename failure reaches the role caller [0.07ms]
(pass) HerdrBackend > waiting uses agent wait --until, not the removed top-level wait [0.07ms]
(pass) HerdrBackend space home > opens an orch-marked workspace for a pack the caller did not label [0.14ms]
(pass) HerdrBackend space home > a space home the human named keeps that name [0.05ms]
(pass) HerdrBackend space home > create hands back the plexer coordinate and the root pane, and says neither [0.05ms]

test/broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.18ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [26.13ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [38.58ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [30.15ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [26.00ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [6.76ms]

test/peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [25.05ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [19.95ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [0.64ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [0.41ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [0.47ms]

test/pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user — alive [0.07ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process — dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.01ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.04ms]

test/notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > reports notifier reachability from one configured entry [0.22ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.42ms]
(pass) notifier registry and built-in adapters > a notifier error is the caller's real error [0.18ms]

test/agent-launch-carries-project-scope.test.ts:
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.29ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.10ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.08ms]

test/settings-command.test.ts:
(pass) orch settings > every registered setting is reachable through --json [169.70ms]
(pass) orch settings > every registered setting is printed in the table [113.96ms]
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [139.14ms]
(pass) orch settings > --json reports env as the winning source over settings.json [110.11ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [327.57ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [111.41ms]
(pass) orch settings > a load error surfaces loudly with no partial table [122.98ms]
(pass) orch settings > sets a boolean through its registry entry [139.71ms]
(pass) orch settings > sets an integer through its registry entry [127.26ms]
(pass) orch settings > sets a choice through its registry entry [138.75ms]
(pass) orch settings > sets a multi value through its registry entry [137.23ms]
(pass) orch settings > sets a list value through its registry entry [115.29ms]
(pass) orch settings > refuses an invalid boolean and names the allowed values [115.69ms]
(pass) orch settings > refuses an invalid integer and names the allowed range [118.30ms]
(pass) orch settings > refuses an invalid choice and names the allowed choices [106.22ms]
(pass) orch settings > refuses an invalid multi value and names the allowed choices [111.98ms]
(pass) orch settings > refuses an invalid list and names JSON as the allowed format [130.65ms]
(pass) orch settings > refuses an unknown key and suggests nearest valid keys [117.90ms]
(pass) orch settings > refuses read-only runtime and names the editing subcommand [140.18ms]

test/orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [49.90ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [34.25ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [30.77ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [25.62ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [1944.19ms]

test/commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.05ms]
(pass) commands/index > reads a package version string [0.12ms]
(pass) commands/index > announces unleased agents once per session [0.36ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [1.06ms]

test/store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [28.73ms]
(pass) outbox store rows > reports one message's pending state [28.35ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [29.73ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [39.82ms]

test/adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.12ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.06ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.11ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.17ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.07ms]

test/a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.17ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.14ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.09ms]

test/pack-membership.test.ts:
(pass) a pack is the provenance root > a registered session is an orch of a pack of one [47.63ms]
(pass) a pack is the provenance root > membership is inherited from the spawner at any depth, never re-rooted [41.54ms]
(pass) a pack is the provenance root > every agent is in exactly one pack, and two packs never share a member [46.33ms]
(pass) a pack is the provenance root > a pack of one grows without re-rooting, and the root stays the orch [32.41ms]
(pass) a pack is the provenance root > a lease or a move never changes which pack an agent is in [40.56ms]
(pass) a pack is the provenance root > an agent cannot be spawned by someone who does not exist [81.24ms]

test/doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [29.94ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [13.79ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [14.72ms]

packages/web/src/lib/fleet.test.ts:
(pass) web environment projection > novel plexers still render a detached environment [0.27ms]
(pass) web environment projection > missing space is absent rather than local [0.10ms]
(pass) web environment projection > pane coordinates are not chosen names [0.08ms]
(pass) web environment projection > renderers contain no provider-id branches or backend capability imports [0.45ms]

packages/web/src/lib/web-shell.test.ts:
(pass) web shell and fleet views > the app shell scrolls only its content region [0.30ms]
(pass) web shell and fleet views > no route declares a scroll frame of its own [0.57ms]
(pass) web shell and fleet views > unleased agents are partitioned into an orphan bucket [0.17ms]
(pass) web shell and fleet views > history groups exited agents by the agent that spawned them [0.07ms]
(pass) web shell and fleet views > visible names never expose a plexer coordinate or the forbidden term [0.73ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle

 1428 pass
 1 skip
 0 fail
 6508 expect() calls
Ran 1429 tests across 227 files. [67.85s]
