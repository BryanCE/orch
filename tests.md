$ bun --filter @bryance/orch test
@bryance/orch test: bun test v1.4.0 (34cbb9a40) 24x PARALLEL
@bryance/orch test: 
@bryance/orch test: test\a-backend-exposes-each-operation-once.test.ts:
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.12ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.03ms]
@bryance/orch test: (pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) presence filenames stay limited to the live protocol > inbox.jsonl is no longer a presence-filename breach [0.63ms]
@bryance/orch test: 
@bryance/orch test: test\agent-model-unwelded.test.ts:
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [1.36ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [0.74ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.29ms]
@bryance/orch test: (pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [11.18ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > a floor admits every version at or above it [0.74ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > a live presence record with a malformed identity is a doctor failure [7.35ms]
@bryance/orch test: 
@bryance/orch test: test\notify-ding.test.ts:
@bryance/orch test: (pass) notify/ding > the sound sink is a declared sink that takes no configuration [0.29ms]
@bryance/orch test: (pass) notify/ding > this host names the players it would use, and says how to get one [0.17ms]
@bryance/orch test: (pass) notify/ding > a command string runs through the host's own shell; argv is passed through untouched [0.14ms]
@bryance/orch test: 
@bryance/orch test: test\one-shape-only.test.ts:
@bryance/orch test: (pass) one current shape only > doctor backend reports have one detection spelling [22.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > currentOrNull returns null and current reports an absent file [3.48ms]
@bryance/orch test: 
@bryance/orch test: test\plexer-versions.test.ts:
@bryance/orch test: (pass) plexer version support > compares numeric versions rather than lexical strings [0.50ms]
@bryance/orch test: (pass) plexer version support > rotates one open host install row when the plexer changes version [126.32ms]
@bryance/orch test: (pass) plexer version support > doctor names both versions and tells the operator to update the plexer [0.27ms]
@bryance/orch test: (pass) plexer version support > a supported plexer the user never installed is not a complaint [0.03ms]
@bryance/orch test: (pass) plexer version support > an in-range install reports ok with the version it read [0.05ms]
@bryance/orch test: (pass) plexer version support > a compatible server rides along on the row without complaint [0.03ms]
@bryance/orch test: (pass) plexer version support > a server the installed client outgrew fails and names the restart [0.03ms]
@bryance/orch test: (pass) plexer version support > a server that reports no compatibility is unknown, never a failure [0.02ms]
@bryance/orch test: (pass) plexer version support > a plexer with no server running says nothing about one [0.04ms]
@bryance/orch test: (pass) plexer version support > only an installed plexer that cannot report a version warns [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [41.53ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > backend types contain neither deleted declaration [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > loads initially and applies a valid edit after the debounce [56.96ms]
@bryance/orch test: 
@bryance/orch test: test\notify-event.test.ts:
@bryance/orch test: (pass) notify events > accepts every event member [59.32ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [155.47ms]
@bryance/orch test: 
@bryance/orch test: test\notify-event.test.ts:
@bryance/orch test: (pass) notify events > rejects invalid event shapes [1.28ms]
@bryance/orch test: (pass) notify events > reads agent state only from state events [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\check-bridge.test.ts:
@bryance/orch test: (pass) presence filenames stay limited to the live protocol > status.json is a state-file breach [0.04ms]
@bryance/orch test: (pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > status.json is forbidden under src but allowed outside the scanned scopes [0.03ms]
@bryance/orch test: (pass) Rule 18 forbids state files and fs.watch outside their sanctioned sites > fs.watch is forbidden outside src/settings/watch.ts [0.02ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.05ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.04ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / settings seams [0.04ms]
@bryance/orch test: (pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.36ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags ORCH_DIR reads outside src/services.ts [0.05ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags createServices calls outside the five roots [0.04ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > flags imports of removed global composition exports [0.07ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > allows createServices calls in each composition root [0.04ms]
@bryance/orch test: (pass) composition happens only at roots (checkCompositionRootLine) > allows the ORCH_DIR read and declaration in src/services.ts [0.02ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.05ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.01ms]
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
@bryance/orch test: (pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.24ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundles/build.ts [0.06ms]
@bryance/orch test: (pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.01ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.06ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.05ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.03ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke test holds no exemption: the branch was deleted, not blessed [0.03ms]
@bryance/orch test: (pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise [58.54ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.22ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.02ms]
@bryance/orch test: (pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [36.17ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.25ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.25ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > no file is exempt from the identity-construction rule [0.01ms]
@bryance/orch test: (pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [2.45ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.08ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.02ms]
@bryance/orch test: (pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.41ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > a deleted capability bag or optional method is not exempt [0.76ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the exempted names are the roles the ports actually declare [0.10ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > nullable data on the port is not exempted as a role [0.03ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags plexer and harness identity branches [0.04ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > flags method-presence capability checks [0.13ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows a branch inside a concrete backend [0.03ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > passes the clean tree: no file in ANY scanned scope branches on an environment id [211.33ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > the core-scope allowlist is EMPTY, so no line holds a standing exemption [0.26ms]
@bryance/orch test: (pass) 10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine) > allows capability-driven code [0.05ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.44ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.09ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.11ms]
@bryance/orch test: (pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [46.51ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a launch env read outside launch.ts with the file and constant named [0.16ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > allows the launch env read inside identity/launch.ts [0.03ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a bare launch env name literal outside launch.ts [0.02ms]
@bryance/orch test: (pass) launch env reads stay in identity/launch.ts (checkLaunchEnvLine) > flags a comment mentioning the launch env name outside launch.ts [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the definition line is allowed where it lives, and nowhere else [0.04ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > any other quoted plexer id in that same file still fails [0.02ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > the line src/types/backend.ts actually carries is the allowed one [0.60ms]
@bryance/orch test: (pass) the closed plexer-id set is spelled in exactly one line > extensions get the same rule with their own scope named [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\queue-space-replay.test.ts:
@bryance/orch test: (pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [186.63ms]
@bryance/orch test: 
@bryance/orch test: test\port-has-no-shell.test.ts:
@bryance/orch test: (pass) the backend port has no dead workspace shell > src contains no workspaceNames calls or BackendWorkspace references [94.96ms]
@bryance/orch test: 
@bryance/orch test: test\settings-manager.test.ts:
@bryance/orch test: (pass) settings manager > parses valid fixture text [16.39ms]
@bryance/orch test: (pass) settings manager > holds one parsed object until reload [2.58ms]
@bryance/orch test: (pass) settings manager > does not cache malformed text as a value [2.45ms]
@bryance/orch test: (pass) settings manager > reloads file settings after the file changes [37.06ms]
@bryance/orch test: (pass) settings manager > update > file manager lands text and current reflects it without reload [19.13ms]
@bryance/orch test: (pass) settings manager > update > in-memory manager lands text and current reflects it [2.23ms]
@bryance/orch test: (pass) settings manager > update > removes a stale lock before updating [36.70ms]
@bryance/orch test: (pass) settings manager > update > refuses a held lock and leaves settings and lock untouched [11.06ms]
@bryance/orch test: (pass) settings manager > reports a legacy config.toml [4.00ms]
@bryance/orch test: 
@bryance/orch test: test\port-no-optional-methods.test.ts:
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/backend.ts has no optional methods on any port interface [4.79ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > the deleted capability flags bag is gone, not merely unimplemented [0.61ms]
@bryance/orch test: (pass) the environment port declares capability by composition, never by optionality > src/types/adapter.ts has no optional methods on the harness port either [0.87ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a report for an unregistered agent throws and publishes nothing [9.69ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [143.35ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > selects pending messages and delivers each message once [193.81ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > spaceColor is stable and returns a palette hex [0.69ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > retention windows are independently configurable [180.40ms]
@bryance/orch test: 
@bryance/orch test: test\launch-model-gate.test.ts:
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [12.58ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [19.72ms]
@bryance/orch test: (pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [3.16ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > expands a short name with one listed match [6.96ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > reports multiple matches as ambiguous in sorted order [10.71ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > passes through a full listed spec [9.75ms]
@bryance/orch test: (pass) short model names expand against the allowed harness catalogue > does not expand a match excluded by models.allowed [5.92ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [8.87ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [12.51ms]
@bryance/orch test: (pass) the settings allowlist applies on top of harness membership > a spec no harness lists is refused by the harness, not the allowlist [26.94ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > expands a short name and keeps its thinking suffix [7.85ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > refuses an ambiguous short name by naming every candidate [7.25ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > a short name whose only matches the allowlist excludes is an allowlist refusal [6.00ms]
@bryance/orch test: (pass) admission expands a short name through the same gate > the allowlist narrows an otherwise ambiguous short name to one match [31.28ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > does not gate help or noninteractive commands [0.09ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a headless agent receives a dispatch through the link [245.80ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > inserts pending messages and orders them by creation time [219.22ms]
@bryance/orch test: 
@bryance/orch test: test\commands-index.test.ts:
@bryance/orch test: (pass) commands/index > reads a package version string [0.78ms]
@bryance/orch test: (pass) commands/index > prints the daemon's unleased list and stays silent on an empty one [0.18ms]
@bryance/orch test: (pass) commands/index > dispatches representative commands and reports unknown commands [55.95ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > schema loads global and workspace caps [44.98ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-boundary.test.ts:
@bryance/orch test: (pass) port seam command boundary > headless target is answered without invoking its pane role [0.25ms]
@bryance/orch test: (pass) port seam command boundary > paned environment without a role is answered at the boundary [0.04ms]
@bryance/orch test: (pass) port seam command boundary > an invocation preserves the provider failure [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the plexer the caller registered in is on the agent, not only on the host [288.17ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > records a sink with the field that sink declares [96.66ms]
@bryance/orch test: 
@bryance/orch test: test\a-row-is-not-a-pane.test.ts:
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [155.52ms]
@bryance/orch test: (pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [196.27ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [385.99ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-allowlist.test.ts:
@bryance/orch test: (pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.61ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.21ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.04ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.03ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.18ms]
@bryance/orch test: (pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.33ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.17ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.04ms]
@bryance/orch test: (pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > keeps the last-good settings, warns once, and recovers [430.01ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > unclaimed + A ΓåÆ stamped [253.64ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > malformed task options are refused instead of handed back as TaskOptions [246.37ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-channel-first.test.ts:
@bryance/orch test: (pass) work reaches an agent through its link > a capless adapter still gets the not-placed boundary answer [285.73ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-agents.test.ts:
@bryance/orch test: (pass) registration unleased agent hint > includes unleased workers but never session identities [268.75ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > reloads on a touched reload.signal without a settings edit [32.89ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > host OS and the store agree for an injected Windows platform [251.65ms]
@bryance/orch test: 
@bryance/orch test: test\outbox.test.ts:
@bryance/orch test: (pass) outbox delivery > checks one message's pending state without scanning the outbox [171.00ms]
@bryance/orch test: (pass) outbox delivery > keeps failed messages pending until their backoff expires [228.69ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-bundle-diagnosis.test.ts:
@bryance/orch test: (pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [2.63ms]
@bryance/orch test: pi extensions:
@bryance/orch test: (pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [19.70ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > reports publish only changed-state transitions [293.52ms]
@bryance/orch test: 
@bryance/orch test: test\notify-events-format.test.ts:
@bryance/orch test: (pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.62ms]
@bryance/orch test: (pass) notification and presence event formatting > named events prefer the human name over the harness id [0.05ms]
@bryance/orch test: (pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.10ms]
@bryance/orch test: (pass) notification and presence event formatting > message notification titles contain delivered mail text [0.05ms]
@bryance/orch test: (pass) notification and presence event formatting > webhook payload includes space and spaceColor [1.76ms]
@bryance/orch test: (pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [266.79ms]
@bryance/orch test: (pass) notification and presence event formatting > transitionEventFromRow composes the space from the agent's environment [241.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > detach releases the lease and is a no-op when already unleased [232.39ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > --file is parsed off the positionals [6.03ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an RPC subscriber receives a presence transition [332.43ms]
@bryance/orch test: 
@bryance/orch test: test\dispatch-prompt-file.test.ts:
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > the file body is the prompt, apostrophes and newlines intact [7.92ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > without --file the positionals after the target are the prompt [0.53ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a typed prompt and --file together is a refusal, never a silent winner [5.58ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > an empty file is refused: a dispatch with no prompt is not a dispatch [2.75ms]
@bryance/orch test: (pass) a dispatch prompt can come from a file instead of argv > a missing file names itself in the refusal [0.77ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > --with is repeatable and parsed off the positionals [0.24ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a file reference is absolute and typed as a file [5.86ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a directory reference is typed as a directory [7.27ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > a missing path dies at dispatch, naming the flag [0.48ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > the task tells the agent where to look and to open paths only when needed; content is never inlined [0.33ms]
@bryance/orch test: (pass) --with points the agent at context it opens on demand > no references leaves the instructions untouched [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\notify-router.test.ts:
@bryance/orch test: (pass) notify router > delivers only when on includes the event state [0.32ms]
@bryance/orch test: (pass) notify router > passes typed webhook and command configuration [0.78ms]
@bryance/orch test: (pass) notify router > surfaces notifier errors [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\one-spelling-per-fact.test.ts:
@bryance/orch test: (pass) one spelling per shared fact > the shared record guard rejects arrays and null [4.66ms]
@bryance/orch test: (pass) one spelling per shared fact > removed identity method has no source spelling [45.03ms]
@bryance/orch test: (pass) one spelling per shared fact > settings reads have no literal fallbacks [36.25ms]
@bryance/orch test: (pass) one spelling per shared fact > launch env has one spelling [132.19ms]
@bryance/orch test: (pass) one spelling per shared fact > removed spawn cap has no source or README spelling [33.04ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > a decade of sweeps never ages out an unleased idle agent [233.27ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [157.40ms]
@bryance/orch test: 
@bryance/orch test: test\notify-sinks.test.ts:
@bryance/orch test: (pass) notification entries > desktop entries use the canonical notifier registry [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\store-outbox.test.ts:
@bryance/orch test: (pass) outbox store rows > reports one message's pending state [215.22ms]
@bryance/orch test: (pass) outbox store rows > bumps attempts and hides a message until its next attempt time [209.13ms]
@bryance/orch test: (pass) outbox store rows > deletes delivered messages older than the cutoff [203.70ms]
@bryance/orch test: 
@bryance/orch test: test\settings-notify.test.ts:
@bryance/orch test: (pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [124.99ms]
@bryance/orch test: (pass) orch settings notify > accepts asking as a first-class sink state [46.26ms]
@bryance/orch test: (pass) orch settings notify > remove drops only the named sink [108.26ms]
@bryance/orch test: (pass) orch settings notify > list reports each sink with the states it fires on, defaults included [54.51ms]
@bryance/orch test: (pass) orch settings notify > an empty notify array lists as none configured [7.37ms]
@bryance/orch test: (pass) orch settings notify > the notify row lists every sink, the states it may fire on, and the fields each carries [50.00ms]
@bryance/orch test: (pass) orch settings notify > the notify row writes the picked sinks, states included, and drops the ones left off [35.00ms]
@bryance/orch test: (pass) orch settings notify > the notify row refuses an unknown sink, a carrying sink with nothing to carry, and an unknown state [5.00ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > reports every registered backend and composed roles [26.80ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > headless delivery reaches the link and the ack settles its outbox row [314.62ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-hardening.test.ts:
@bryance/orch test: (pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [9.99ms]
@bryance/orch test: (pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [19.80ms]
@bryance/orch test: (pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [3.71ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-backends.test.ts:
@bryance/orch test: (pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.14ms]
@bryance/orch test: (pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.12ms]
@bryance/orch test: (pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.11ms]
@bryance/orch test: (pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.10ms]
@bryance/orch test: (pass) doctor backend and presence checks > honours the configured default over the probe order [0.06ms]
@bryance/orch test: (pass) doctor backend and presence checks > reports only records missing the current schema stamp [15.94ms]
@bryance/orch test: 
@bryance/orch test: test\status-perf.test.ts:
@bryance/orch test: (pass) status performance seams > resolves orchestrator id once per status call [925.86ms]
@bryance/orch test: 
@bryance/orch test: test\notify.test.ts:
@bryance/orch test: (pass) notification routing > an excluded state does not invoke its notifier [0.30ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-model-flag.test.ts:
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.09ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.07ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
@bryance/orch test: (pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.18ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.11ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.10ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.07ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.03ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.05ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.03ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.06ms]
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
@bryance/orch test: (pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\settings-watch.test.ts:
@bryance/orch test: (pass) watchSettings > stop prevents further callbacks [440.58ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > returns a defaults value when no override is set [24.54ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.47ms]
@bryance/orch test: 
@bryance/orch test: test\settings-precedence.test.ts:
@bryance/orch test: (pass) settings precedence > applies defaults when settings, env, and flag are absent [9.12ms]
@bryance/orch test: (pass) settings precedence > uses env over settings and flag over env [21.75ms]
@bryance/orch test: (pass) settings precedence > parses notify entries and hosts into expected shapes [13.18ms]
@bryance/orch test: (pass) settings precedence > reports a helpful validation error for invalid settings [21.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > refuses to invent settings when settings.json is missing [12.98ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > declares every schema setting exactly once [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-self.test.ts:
@bryance/orch test: (pass) commands/self > reads the caller identity from the daemon [1031.46ms]
@bryance/orch test: (pass) commands/self > uses caller depth for worker spawn policy [0.31ms]
@bryance/orch test: (pass) commands/self > refuses non-operator overrides [0.25ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > fleet visibility follows provenance depth, not caller environment [294.64ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > task and last text use the same spelling in the row and table cell [214.54ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-client.test.ts:
@bryance/orch test: (pass) bridge daemon client > attaches, receives deliveries, acks on the link, and reconnects [1123.07ms]
@bryance/orch test: (pass) bridge daemon client > dead endpoints resolve undefined without invoking handlers [10.80ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > state is derived from attempts rather than stored on tasks [267.02ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > finds a live agent deeper than fleet.max_depth [267.35ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone is never handed to the plexer as a pane [1073.72ms]
@bryance/orch test: 
@bryance/orch test: test\settings-registry.test.ts:
@bryance/orch test: (pass) settings registry > every registry read resolves against loaded settings [28.17ms]
@bryance/orch test: (pass) settings registry > fleet help explains what each limit counts [0.17ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth round-trips through the full-tree writer [14.06ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth rejects zero through the registered writer [16.33ms]
@bryance/orch test: (pass) settings registry > fleet.max_depth writes its value to settings.json [64.54ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days is an integer that accepts none [0.58ms]
@bryance/orch test: (pass) settings registry > retention.ended_agents_days writes null and reads it back as null [28.94ms]
@bryance/orch test: (pass) settings registry > an integer without none refuses none [0.32ms]
@bryance/orch test: (pass) settings registry > contains no duplicate keys [0.16ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-pi.test.ts:
@bryance/orch test: (pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.32ms]
@bryance/orch test: (pass) PiAdapter > declares its lifecycle slash-commands [0.17ms]
@bryance/orch test: (pass) PiAdapter > reads state from the presence status through store helpers [192.27ms]
@bryance/orch test: (pass) PiAdapter > reads the reported result and falls back to the last assistant session text [18.74ms]
@bryance/orch test: (pass) PiAdapter > parses pi's supported model table without importing harness internals [0.48ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: (pass) commands/setup > reads the setup flags in either spelling, with every --model kept in order [0.80ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > registerSpawnedAgent alone writes the COMPLETE record ΓÇö space and lease included [300.26ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-stale-presence.test.ts:
@bryance/orch test: (pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [333.36ms]
@bryance/orch test: (pass) doctor stale presence safety > no dead agents leaves nothing to remove [280.94ms]
@bryance/orch test: (pass) doctor stale presence safety > flags malformed presence directory names [238.24ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > every driving verb is refused while a live foreign orch holds the lease [909.10ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-roles.test.ts:
@bryance/orch test: (pass) adapter role composition > composes complete roles per adapter [0.13ms]
@bryance/orch test: (pass) adapter role composition > answers with zero exit code when a shim role is absent [0.07ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > reports every rejected key without touching the file [26.88ms]
@bryance/orch test: 
@bryance/orch test: test\claim-agent.test.ts:
@bryance/orch test: (pass) claim agent > claimed A, claim A ΓåÆ unchanged [208.60ms]
@bryance/orch test: (pass) claim agent > claimed A, reclaimAgent(id) then B ΓåÆ stamped with B [217.69ms]
@bryance/orch test: (pass) claim agent > claimed A, plain claim B ΓåÆ refused claimed-by-other, row unchanged [201.67ms]
@bryance/orch test: (pass) claim agent > unknown id ΓåÆ refused unknown-agent [215.05ms]
@bryance/orch test: 
@bryance/orch test: test\adapter-session-env.test.ts:
@bryance/orch test: (pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.91ms]
@bryance/orch test: (pass) adapter-owned session environment > keeps harness env literals inside adapter modules [24.42ms]
@bryance/orch test: (pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-roundtrip.test.ts:
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a removed key is never guessed at - it offers no rename [17.05ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > the choices a person makes leave the file loadable [37.39ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > a typo keeps its value: renaming carries it to the real key [28.31ms]
@bryance/orch test: (pass) repairing a settings.json the schema rejects > leaving every defect alone writes nothing at all [13.64ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-screen.test.ts:
@bryance/orch test: (pass) repair action labels > names the key a rename lands on, so the destination is never a guess [0.06ms]
@bryance/orch test: (pass) repair action labels > names the value a set writes [0.02ms]
@bryance/orch test: (pass) repair action labels > drop and leave say only what they do [0.01ms]
@bryance/orch test: (pass) repair frame > shows every defect with the value the person wrote [0.54ms]
@bryance/orch test: (pass) repair frame > promises that nothing changes before a save, because nothing does [0.07ms]
@bryance/orch test: (pass) repair frame > every defect starts at leave, so opening the screen destroys nothing [0.04ms]
@bryance/orch test: (pass) repair frame > a chosen repair is shown as what it will do [0.05ms]
@bryance/orch test: (pass) repair frame > the focused row's offered keys are shown, so no choice has to be guessed [0.08ms]
@bryance/orch test: (pass) repair frame > the count reads as English for one defect and for many [0.06ms]
@bryance/orch test: (pass) repair frame > no row runs past the terminal width, tag included [0.07ms]
@bryance/orch test: (pass) repair frame > the file being repaired is named in the header [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [4.90ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > an agent whose pane is gone still ends, and reports done [292.17ms]
@bryance/orch test: 
@bryance/orch test: test\unleased-stays-adoptable.test.ts:
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > and it is still adoptable afterwards ΓÇö the point of keeping it [207.68ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > the reap takes only agents whose process is GONE, never merely unleased ones [235.82ms]
@bryance/orch test: (pass) unleased and idle stays alive and adoptable (D3) > repeated sweeps are stable: an unleased agent survives every one of them [248.36ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > declares its identity, and composes only the roles it fully implements [5.39ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename carries the value to the new key [79.84ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [272.52ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attaches, replies, notifies after the reply write, and pushes deliveries [341.23ms]
@bryance/orch test: 
@bryance/orch test: test\commands-setup.test.ts:
@bryance/orch test: Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-Wz7pQ1\settings.json:
@bryance/orch test:   runtime           = node
@bryance/orch test:   adapters          = pi
@bryance/orch test:   default adapter   = pi
@bryance/orch test:   backends          = headless
@bryance/orch test:   default backend   = headless
@bryance/orch test:   model (pi)          = (none)  picker: none, allowed: all offered
@bryance/orch test: Prerequisites:
@bryance/orch test:   MISSING pi
@bryance/orch test:   ok      headless
@bryance/orch test:   install bun: curl -fsSL https://bun.sh/install | bash
@bryance/orch test:   install pi: bun add -g @earendil-works/pi-coding-agent
@bryance/orch test: Presence dir:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-Wz7pQ1\agents
@bryance/orch test: Skills:
@bryance/orch test:   not installed - turn it back on with: orch settings skills --install
@bryance/orch test: bins:
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-axTIDI\.local\bin\orch (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-axTIDI\.local\bin\pif (copy)
@bryance/orch test:   C:\Users\Bryan\AppData\Local\Temp\orch-setup-home-axTIDI\.local\bin\orch-ding (copy)
@bryance/orch test:   SKIP pi extensions: pi integration shim disabled
@bryance/orch test: Running doctor checks...
@bryance/orch test: Doctor: 31/35 checks passed
@bryance/orch test: Done. Open a plexer workspace and try: orch spawn 2 --tab Team1
@bryance/orch test: (pass) commands/setup > resolves noninteractive provider sets and defaults [0.73ms]
@bryance/orch test: (pass) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [428.11ms]
@bryance/orch test: (pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.85ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair-write.test.ts:
@bryance/orch test: (pass) applySettingsRepairs > rename onto an occupied key throws and leaves the file untouched [53.70ms]
@bryance/orch test: (pass) applySettingsRepairs > set writes a value at a dotted path [22.70ms]
@bryance/orch test: (pass) applySettingsRepairs > drop deletes a value without pruning its parent [43.33ms]
@bryance/orch test: (pass) applySettingsRepairs > applies several repairs in one call [34.13ms]
@bryance/orch test: (pass) applySettingsRepairs > repairs a schema-rejected file before readSettingsFile validates it [14.90ms]
@bryance/orch test: 
@bryance/orch test: test\settings-repair.test.ts:
@bryance/orch test: (pass) settings repair choices > offers rename, set, drop, then leave when all repairs apply [0.07ms]
@bryance/orch test: (pass) settings repair choices > offers only rename when there is only a suggestion [0.02ms]
@bryance/orch test: (pass) settings repair choices > offers only set when there is only an expected value [0.02ms]
@bryance/orch test: (pass) settings repair choices > always offers leave, and cannot drop a file-level defect [0.02ms]
@bryance/orch test: (pass) settings repair reducer > starts every defect at leave and focus at zero [0.04ms]
@bryance/orch test: (pass) settings repair reducer > refuses choices the focused defect does not offer and reports why [0.16ms]
@bryance/orch test: (pass) settings repair reducer > clamps focus at both ends and clears a prior reason [0.06ms]
@bryance/orch test: (pass) settings repair reducer > maps non-leave choices to repairs in defect order [0.10ms]
@bryance/orch test: (pass) settings repair reducer > leave produces no repair [0.02ms]
@bryance/orch test: (pass) settings repair reducer > empty defects make every action a no-op [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > what a human is told they closed is the agent, not the plexer's coordinate [281.05ms]
@bryance/orch test: 
@bryance/orch test: test\hello-environment.test.ts:
@bryance/orch test: (pass) hello records the environment in full > the place the caller occupies in its plexer is recorded at hello [223.05ms]
@bryance/orch test: (pass) hello records the environment in full > a session that moved to another place re-registers with the new one, and one row stays open [220.47ms]
@bryance/orch test: (pass) hello records the environment in full > the space the caller registered in is recorded at hello, not inferred later [215.38ms]
@bryance/orch test: (pass) hello records the environment in full > a session in no space and no plexer records neither, and that is an answer [253.64ms]
@bryance/orch test: (pass) hello records the environment in full > re-registering the same session does not re-root or re-place it [247.97ms]
@bryance/orch test: (pass) hello records the environment in full > the claim carries every environment fact hello has to record [274.24ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > builds the interactive Claude launch command [0.53ms]
@bryance/orch test: (pass) Claude adapter > pins headless print mode to the hook-driven presence path [2.74ms]
@bryance/orch test: (pass) Claude adapter > detects state from a live presence status [200.18ms]
@bryance/orch test: (pass) Claude adapter > extracts results before transcript and native output [31.02ms]
@bryance/orch test: (pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [7.81ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > a role is derived from the tree, never stored [226.09ms]
@bryance/orch test: 
@bryance/orch test: test\agent-view.test.ts:
@bryance/orch test: (pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [148.74ms]
@bryance/orch test: (pass) the agent composer > tuning is not environment: it survives a move [212.89ms]
@bryance/orch test: (pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [181.64ms]
@bryance/orch test: (pass) the agent composer > provenance is on the view and is not the same fact as ownership [196.14ms]
@bryance/orch test: (pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [190.13ms]
@bryance/orch test: (pass) the agent composer > an agent with no spawner reports no spawner name [200.45ms]
@bryance/orch test: (pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [199.99ms]
@bryance/orch test: (pass) the agent composer > the axis list is the only place every axis is enumerated [0.54ms]
@bryance/orch test: (pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [187.74ms]
@bryance/orch test: (pass) the agent composer > an unknown agent is null, never an empty shell [203.29ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > non-TTY takes the print path [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline and online read the same agents from the same presence files [965.91ms]
@bryance/orch test: 
@bryance/orch test: test\ambiguous-target-says-what-to-do.test.ts:
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.14ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.02ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.03ms]
@bryance/orch test: (pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\settings-shell.test.ts:
@bryance/orch test: (pass) settings shell decisions > an overridden setting is refused with the winner named [0.58ms]
@bryance/orch test: (pass) settings shell decisions > registered writes use the registry entry [62.83ms]
@bryance/orch test: (pass) settings shell decisions > a committed choice shows its saved value on the next screen [29.41ms]
@bryance/orch test: (pass) settings shell decisions > registry exposes writable subcommand entries [0.36ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-limits.test.ts:
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [13.10ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [9.41ms]
@bryance/orch test: (pass) spawn limits > rejects invalid cap %s with file and key [42.98ms]
@bryance/orch test: (pass) spawn limits > omitted fleet caps normalize to defaults [8.40ms]
@bryance/orch test: (pass) spawn limits > global boundary refusal data counts the whole request [267.21ms]
@bryance/orch test: (pass) spawn limits > one workspace may use the full global allotment [221.94ms]
@bryance/orch test: (pass) spawn limits > workspace cap is independent of global headroom [208.54ms]
@bryance/orch test: (pass) spawn limits > uncapped space is bounded only by global count [240.30ms]
@bryance/orch test: (pass) spawn limits > foreign pack members do not consume the caller's pack cap [240.12ms]
@bryance/orch test: (pass) spawn limits > an agent whose recorded process is gone frees capacity [202.27ms]
@bryance/orch test: (pass) spawn limits > foreign panes never count [222.24ms]
@bryance/orch test: (pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [10.62ms]
@bryance/orch test: (pass) spawn limits > doctor accepts satisfiable limits [12.42ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [195.45ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a socket close detaches its bridge [289.93ms]
@bryance/orch test: 
@bryance/orch test: test\status-renders-one-row-shape.test.ts:
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > local and remote rows share the renderer; remote adds only HOST [0.80ms]
@bryance/orch test: (pass) status rendering has one row shape and one table renderer > fleet resolves caller inputs once while building three presence rows [863.05ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: (pass) orch settings thinking > writes the global default and reads back through loadSettings [32.97ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-unscoped-tasks.test.ts:
@bryance/orch test: (pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [210.62ms]
@bryance/orch test: (pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [199.46ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the --json closed list names agents, so a caller can map it back [295.67ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the positional arguments are the names, one per pane [0.47ms]
@bryance/orch test: 
@bryance/orch test: test\settings.test.ts:
@bryance/orch test: (pass) loadSettings > requires a top-level runtime and never defaults it [25.26ms]
@bryance/orch test: (pass) loadSettings > rejects an unrecognized runtime naming the accepted values [4.78ms]
@bryance/orch test: (pass) loadSettings > rejects a runtime misplaced under defaults [7.87ms]
@bryance/orch test: (pass) loadSettings > reads the declared runtime [22.11ms]
@bryance/orch test: (pass) loadSettings > parses every supported settings section [19.90ms]
@bryance/orch test: (pass) loadSettings > reads question re-ask and retention sweep settings [11.08ms]
@bryance/orch test: (pass) loadSettings > rejects a file without the current schemaVersion [10.41ms]
@bryance/orch test: (pass) loadSettings > rejects invalid JSON loudly [4.27ms]
@bryance/orch test: (pass) loadSettings > names the key path for invalid fields [7.39ms]
@bryance/orch test: (pass) loadSettings > rejects unknown settings keys [40.63ms]
@bryance/orch test: (pass) loadSettings > rejects removed spawn cap setting by name [26.50ms]
@bryance/orch test: (pass) loadSettings > parses models.allowed as a per-harness pattern map [9.80ms]
@bryance/orch test: (pass) loadSettings > rejects renamed fleet keys and loads their replacements [46.01ms]
@bryance/orch test: (pass) loadSettings > rejects old settings keys [47.39ms]
@bryance/orch test: (pass) loadSettings > rejects legacy notify type and unknown ids [22.01ms]
@bryance/orch test: (pass) loadSettings > applies every settings default when sections are absent [33.16ms]
@bryance/orch test: (pass) loadSettings > preserves configured values while defaulting each missing section value [20.35ms]
@bryance/orch test: (pass) loadSettings > rejects non-positive and non-integer retention windows [57.26ms]
@bryance/orch test: (pass) loadSettings > rejects a host without dest [24.56ms]
@bryance/orch test: (pass) loadSettings > rejects an unknown id in enabled.adapters [5.91ms]
@bryance/orch test: (pass) loadSettings > rejects defaults.adapter not present in enabled.adapters [11.79ms]
@bryance/orch test: (pass) loadSettings > rejects when settings.json is absent but a legacy config.toml exists [3.55ms]
@bryance/orch test: (pass) allowedModelPatterns > restricts nothing when settings contain no patterns [7.95ms]
@bryance/orch test: (pass) allowedModelPatterns > returns the configured patterns when set [7.67ms]
@bryance/orch test: (pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [32.57ms]
@bryance/orch test: (pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [53.54ms]
@bryance/orch test: (pass) writeSettingsRuntime > a different runtime replaces the single value in place [26.98ms]
@bryance/orch test: (pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [48.78ms]
@bryance/orch test: (pass) reapUnreadableSettings > leaves a readable file alone [5.42ms]
@bryance/orch test: (pass) writeSettingsEnabled > round-trips both provider arrays [48.48ms]
@bryance/orch test: (pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [45.21ms]
@bryance/orch test: (pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [26.39ms]
@bryance/orch test: (pass) writeSettingsDefault > is idempotent when rewriting the same value [44.92ms]
@bryance/orch test: (pass) writeSettingsDefault > refuses to write through an out-of-version settings file [15.50ms]
@bryance/orch test: (pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [23.67ms]
@bryance/orch test: (pass) writeSettingsFullTree > round-trips defaults without inventing max_agents_total [40.72ms]
@bryance/orch test: (pass) settings precedence > uses the fallback when env and settings.json omit a setting [29.45ms]
@bryance/orch test: (pass) settings precedence > uses the settings.json value over the fallback [7.61ms]
@bryance/orch test: (pass) settings precedence > uses the ORCH_* environment value over settings.json [14.03ms]
@bryance/orch test: (pass) settings precedence > uses an explicit flag override over the environment [0.20ms]
@bryance/orch test: (pass) resolveSetting > uses flag, environment coercion, settings, then fallback in precedence order [0.11ms]
@bryance/orch test: (pass) resolveWithSource > rejects an environment value with the wrong shape [0.22ms]
@bryance/orch test: (pass) resolveWithSource > reports the winning source at each precedence level [0.17ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > loadSettings parses a per-harness preferred quicklist [5.65ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [14.25ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [41.25ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [16.13ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [74.77ms]
@bryance/orch test: (pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [15.38ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a herdr-placed agent reports the handle its environment carries [254.18ms]
@bryance/orch test: 
@bryance/orch test: test\offline-is-not-a-second-source.test.ts:
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline reports the SAME state the agent reported, never a second opinion [239.50ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > there is exactly ONE row builder, and --offline only narrows what it asks [0.55ms]
@bryance/orch test: (pass) --offline is a narrower view of ONE source, not a second one (M8) > offline is the one path that never dials or starts the daemon [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > owner token is this process's own registered id, and nothing before it registers [890.03ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > detects DrvFs paths by mount path segment [0.39ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > pushes the answer and its question id [222.47ms]
@bryance/orch test: 
@bryance/orch test: test\settings-thinking.test.ts:
@bryance/orch test: thinking  xhigh
@bryance/orch test: thinking (pi)  low
@bryance/orch test: (pass) orch settings thinking > writes a per-harness override without disturbing the global default [43.87ms]
@bryance/orch test: (pass) orch settings thinking > the command sets the level a user names [28.08ms]
@bryance/orch test: (pass) orch settings thinking > the command sets a per-harness level with --harness [45.76ms]
@bryance/orch test: (pass) orch settings thinking > a level orch does not know is refused, naming the valid levels [6.66ms]
@bryance/orch test: (pass) orch settings thinking > clearing a per-harness override falls back to the global default [20.16ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > a second socket replaces the first link [256.92ms]
@bryance/orch test: 
@bryance/orch test: test\setup-flags.test.ts:
@bryance/orch test: (pass) setup model flags > rejects a bare model when multiple harnesses are selected [0.55ms]
@bryance/orch test: (pass) setup model flags > binds each model flag to its own harness [0.22ms]
@bryance/orch test: (pass) setup model flags > allows a bare model for one harness [0.02ms]
@bryance/orch test: (pass) setup model flags > rejects a model bound to an unselected harness [0.17ms]
@bryance/orch test: (pass) setup model flags > rejects duplicate model flags for one harness [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\settings-view.test.ts:
@bryance/orch test: (pass) settings view > visibleEntryIndices matches key and group case-insensitively [0.29ms]
@bryance/orch test: (pass) settings view > windowBounds keeps the focus inside the budget and clamps at both ends [0.07ms]
@bryance/orch test: (pass) settings view > frame shows group headers, values, provenance tags, and the focused help [0.45ms]
@bryance/orch test: (pass) settings view > frame with a filter narrows the list and draws the filter line [0.06ms]
@bryance/orch test: (pass) settings view > frame reports an empty filter match instead of a blank screen [0.04ms]
@bryance/orch test: (pass) settings view > a long list is windowed with more-above/more-below markers [0.41ms]
@bryance/orch test: (pass) settings view > overlays render choices, checkboxes, and input with error [0.18ms]
@bryance/orch test: (pass) settings view > a checkbox row shows what its choice carries [0.04ms]
@bryance/orch test: (pass) settings view > displayValue keeps scalars bare and JSON-encodes shapes [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-checks.test.ts:
@bryance/orch test: (pass) doctor provenance-depth checks > accepts a live agent at fleet.max_depth [209.36ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > finds an old unclaimed live agent with its age [202.75ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a claimed agent [265.42ms]
@bryance/orch test: (pass) doctor unclaimed-agent checks > ignores a fresh unclaimed agent under the threshold [235.19ms]
@bryance/orch test: (pass) doctor notification-sink checks > reports no sinks as healthy [5.47ms]
@bryance/orch test: (pass) doctor notification-sink checks > rejects a webhook with a malformed URL [12.14ms]
@bryance/orch test: (pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [18.09ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns for a command binary missing from PATH [28.68ms]
@bryance/orch test: (pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [19.90ms]
@bryance/orch test: (pass) doctor notification-sink checks > warns when a notifier omits done from its on list [7.64ms]
@bryance/orch test: (pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [6.39ms]
@bryance/orch test: (pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [18.25ms]
@bryance/orch test: 
@bryance/orch test: test\setup-io.test.ts:
@bryance/orch test: (pass) setup prompt answer validation > refuses a single answer that was not offered [0.17ms]
@bryance/orch test: (pass) setup prompt answer validation > refuses multi-select answers containing an unoffered value [0.10ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-name-list.test.ts:
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the pane count is how many names were given [0.05ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > spawning with no name at all is refused [0.12ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > a bare count is not a name and is refused [0.14ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > the same name twice would collide, so it is refused before anything is created [0.05ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > every name is validated, so one bad name creates nothing [0.07ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > --name is gone: naming is positional, so the flag is an unknown flag [0.58ms]
@bryance/orch test: (pass) spawn names every agent positionally, at creation > claimSpawnNames takes the resolved names and asserts each is free [192.03ms]
@bryance/orch test: 
@bryance/orch test: test\vocabulary.test.ts:
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no table carries a role column: there is nothing to disagree with the tree [214.14ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > renaming an agent or moving its lease never changes its role [231.56ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > every role term orch displays comes from the one map [0.15ms]
@bryance/orch test: (pass) vocabulary is a display map, and a role is tree position > no module outside the map spells a role term into a user-facing string [70.10ms]
@bryance/orch test: 
@bryance/orch test: test\close-is-keyed-by-agent-id.test.ts:
@bryance/orch test: (pass) close is keyed by the agent id, never by a plexer coordinate (U10) > the plexer is still handed the real handle when there IS a pane [273.61ms]
@bryance/orch test: 
@bryance/orch test: test\wake.test.ts:
@bryance/orch test: (pass) wake signal > next resolves on wake [1.51ms]
@bryance/orch test: (pass) wake signal > next resolves after the timeout with no wake [10.30ms]
@bryance/orch test: (pass) wake signal > two concurrent next calls both resolve on one wake [0.34ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > rejects names outside herdr's naming rule [0.68ms]
@bryance/orch test: 
@bryance/orch test: test\wall-single-owner.test.ts:
@bryance/orch test: (pass) space wall ownership > keeps the wall decision primitive in one source module [34.47ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [75.37ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > the unix endpoint is claimed in exactly one place [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attach for an agent the store does not know is refused and the server keeps serving [227.62ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > probes the built-in adapters [31.70ms]
@bryance/orch test: 
@bryance/orch test: test\commands-control.test.ts:
@bryance/orch test: (pass) commands/control > parses dispatch flags without losing prompt words [0.64ms]
@bryance/orch test: (pass) commands/control > --then is not a dispatch flag [0.35ms]
@bryance/orch test: (pass) commands/control > adds worker header unless raw [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > attach without a key is rejected [27.33ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.35ms]
@bryance/orch test: 
@bryance/orch test: test\store-queue.test.ts:
@bryance/orch test: (pass) queue facade storage > retention deletes only settled tasks older than the cutoff [230.79ms]
@bryance/orch test: (pass) queue facade storage > retention never removes a queued task based on its age [234.07ms]
@bryance/orch test: (pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [238.09ms]
@bryance/orch test: (pass) queue facade storage > completed tasks stay done after their scope agent ends [217.71ms]
@bryance/orch test: (pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [192.88ms]
@bryance/orch test: (pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [201.69ms]
@bryance/orch test: 
@bryance/orch test: test\one-bind-for-the-unix-endpoint.test.ts:
@bryance/orch test: (pass) one bind for the unix endpoint (2.4) > reclaiming a stale socket yields the endpoint a first bind produces [127.09ms]
@bryance/orch test: 
@bryance/orch test: test\setup-notifiers.test.ts:
@bryance/orch test: (pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.24ms]
@bryance/orch test: (pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.44ms]
@bryance/orch test: (pass) notifier setup logic > renders a command entry that loadSettings can parse [91.47ms]
@bryance/orch test: (pass) notifier setup logic > builds valid entries and reports invalid selections [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-hud-environment.test.ts:
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > the handle follows the agent when it moves pane [206.14ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > an agent on another plexer is not a herdr pane [237.95ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a process orch never launched is not a herdr pane [7.04ms]
@bryance/orch test: (pass) the herdr HUD reads its pane from the composer, never from the key > a key that is not a minted id resolves to no pane at all [12.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > parses governance and validates daemon status [9.57ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-busy.test.ts:
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > shown is a delivery [0.21ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > busy is NOT a delivery, however herdr exited [0.04ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > every other refusal herdr can answer with is also not a delivery [0.10ms]
@bryance/orch test: (pass) a herdr notification is delivered only when herdr says it was shown > output that is not a herdr answer is never read as a delivery [0.20ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a toast shown on the first try is sent once and waits for nothing [0.20ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a busy herdr is retried after a wait, and the retry is the delivery [0.06ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a herdr that stays busy gives up rather than blocking the daemon forever [0.03ms]
@bryance/orch test: (pass) a busy herdr is waited out, not dropped > a refusal that waiting cannot fix is not retried [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-daemon.test.ts:
@bryance/orch test: (pass) commands/daemon > reads a lock pid only from a complete lock record [25.23ms]
@bryance/orch test: 
@bryance/orch test: test\one-control-dispatcher.test.ts:
@bryance/orch test: (pass) there is exactly one control dispatcher > no module outside src/control declares a control dispatcher [43.50ms]
@bryance/orch test: (pass) there is exactly one control dispatcher > no dispatcher is exported under two names [28.42ms]
@bryance/orch test: 
@bryance/orch test: test\herdr-notify-hardening.test.ts:
@bryance/orch test: (pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [6.00ms]
@bryance/orch test: (pass) herdr and notification hardening > falls back to a valid name when the identity key contains herdr-invalid separators [1.05ms]
@bryance/orch test: (pass) herdr and notification hardening > nameless notifications use a space label, never a bare pane key [1.87ms]
@bryance/orch test: 
@bryance/orch test: test\hermetic-env.test.ts:
@bryance/orch test: (pass) the test suite is hermetic > no plexer environment leaks in from the shell that launched bun [0.42ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > the store exposes no raw-SQL port beside the typed one [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-link-server.test.ts:
@bryance/orch test: (pass) daemon bridge links > server close detaches every bridge [235.86ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > maps Claude hook events to presence reports [756.60ms]
@bryance/orch test: 
@bryance/orch test: test\store-rebuild-schema.test.ts:
@bryance/orch test: (pass) rebuild schema > rebuild DDL inventory is exact [153.18ms]
@bryance/orch test: 
@bryance/orch test: test\one-query-stack-over-the-connection.test.ts:
@bryance/orch test: (pass) one query stack over the connection (2.3) > nothing in the repo prepares a statement through the deleted port [63.90ms]
@bryance/orch test: 
@bryance/orch test: test\one-retry-policy.test.ts:
@bryance/orch test: (pass) one retry policy > retries flaky async and sync operations through the shared helper [0.96ms]
@bryance/orch test: (pass) one retry policy > uses the policy's declared backoff schedule [0.25ms]
@bryance/orch test: (pass) one retry policy > surfaces the last error after exactly attempts tries [0.49ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > owned renderers and tool help do not expose the retired workspace term [0.58ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-binding.test.ts:
@bryance/orch test: (pass) Cq4: results go to the enqueuer, not the runner > every task event the work loop publishes is keyed to whoever enqueued it [314.56ms]
@bryance/orch test: 
@bryance/orch test: test\commands-events.test.ts:
@bryance/orch test: (pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.28ms]
@bryance/orch test: (pass) commands/events > parses the scope flags [0.08ms]
@bryance/orch test: (pass) commands/events > parses the wake-up flags [0.05ms]
@bryance/orch test: (pass) commands/events > --filter names the states to drop and is never the default [0.19ms]
@bryance/orch test: (pass) commands/events > the monitor shows only the monitor.on states and every worker message [0.14ms]
@bryance/orch test: (pass) commands/events > the monitor's states come from settings, not from the code [0.02ms]
@bryance/orch test: (pass) commands/events > the monitor parses the same flags as events under its own usage [0.75ms]
@bryance/orch test: (pass) commands/events > includes an adopted agent whose open lease is mine [0.05ms]
@bryance/orch test: (pass) commands/events > includes a reused pane leased by me even when another session spawned it [0.13ms]
@bryance/orch test: (pass) commands/events > includes an unleased agent spawned by this session [0.06ms]
@bryance/orch test: (pass) commands/events > excludes an agent spawned by a different session [0.02ms]
@bryance/orch test: (pass) commands/events > --space-wide passes agents from both sessions [0.04ms]
@bryance/orch test: (pass) commands/events > excludes an agent while another orch holds its lease [0.03ms]
@bryance/orch test: (pass) commands/events > describes durable replay and reports pruned history gaps [2.50ms]
@bryance/orch test: (pass) commands/events > names one agent by name or by identity key [0.24ms]
@bryance/orch test: (pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [1.65ms]
@bryance/orch test: (pass) commands/events > renders opaque plexer coordinates without relabeling them as spaces [1.00ms]
@bryance/orch test: (pass) commands/events > message events render the full delivered mail text once [0.13ms]
@bryance/orch test: (pass) commands/events > an agent in no space gets no empty bracket on its line [0.12ms]
@bryance/orch test: (pass) commands/events > an event line says what happened, never the fleet's books [0.08ms]
@bryance/orch test: (pass) commands/events > rejects malformed event and labels sinks [4.20ms]
@bryance/orch test: (pass) commands/events space ceiling > matches an event's stamped space and lets an unplaced caller hear all [0.06ms]
@bryance/orch test: (pass) commands/events space ceiling > a session hears its workers and its mail, never its own transitions [1.05ms]
@bryance/orch test: 
@bryance/orch test: test\setup-smoke.test.ts:
@bryance/orch test: (pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [6.01ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [1.19ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [3.09ms]
@bryance/orch test: (pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [3.72ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > a space is created, listed, renamed and deleted with no space-home role [976.15ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn leaves NOTHING for a second writer to fill in [1622.63ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-repins-on-settings-change.test.ts:
@bryance/orch test: (pass) daemon settings tuning re-pin > pins every live agent to the resolved settings default [22.24ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > spawn stamps the caller's registered id as the holder on its record [941.88ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-repins-on-settings-change.test.ts:
@bryance/orch test: (pass) daemon settings tuning re-pin > keeps the tuning a pinned agent holds and tunes only the unpinned one [13.82ms]
@bryance/orch test: (pass) daemon settings tuning re-pin > does not pin when tuning settings did not change [20.25ms]
@bryance/orch test: (pass) daemon settings tuning re-pin > continues re-pinning after one agent fails [17.08ms]
@bryance/orch test: 
@bryance/orch test: test\setup-wizard.test.ts:
@bryance/orch test: (pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.62ms]
@bryance/orch test: (pass) setup model picker > keeps the compact selector for small catalogues [0.15ms]
@bryance/orch test: (pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.35ms]
@bryance/orch test: (pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.13ms]
@bryance/orch test: (pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > attach holds the link under the canonical key and push reaches it [191.31ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the task in flight finishes and its result survives the holder [214.17ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > leased by a live holder shows that holder [865.56ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-claude-hooks.test.ts:
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [95.27ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [140.70ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [88.20ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [67.38ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [70.47ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [38.67ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [40.21ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [70.19ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > treats an absent settings file as not configured [3.76ms]
@bryance/orch test: (pass) doctor Claude hooks shim check > handles malformed settings gracefully [5.33ms]
@bryance/orch test: 
@bryance/orch test: test\answer-dispatch.test.ts:
@bryance/orch test: (pass) answer over the bridge > returns not-asking without pushing [164.45ms]
@bryance/orch test: (pass) answer over the bridge > reports a detached bridge for a live asking agent [244.37ms]
@bryance/orch test: (pass) answer over the bridge > reports a gone asking agent [184.84ms]
@bryance/orch test: (pass) answer over the bridge > answers with a clear absence when the adapter takes no answers [244.71ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > writes real files to the store and links each harness dir into it [58.59ms]
@bryance/orch test: 
@bryance/orch test: test\claude-adapter.test.ts:
@bryance/orch test: (pass) Claude adapter > exits silently and writes no presence without launch env (a non-orch session) [218.73ms]
@bryance/orch test: (pass) Claude adapter > fails hard and writes no presence on a malformed launch env [141.17ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > create refuses a name already in use [233.65ms]
@bryance/orch test: 
@bryance/orch test: test\claude-hooks.test.ts:
@bryance/orch test: (pass) Claude hook command > runs for every Claude session and lets the shim self-gate [9.16ms]
@bryance/orch test: 
@bryance/orch test: test\backend-headless.test.ts:
@bryance/orch test: (pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [2.53ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > a claim records the minted agent id, not the presence key [263.74ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.71ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads an empty fleet [289.80ms]
@bryance/orch test: 
@bryance/orch test: test\skill-store-and-links.test.ts:
@bryance/orch test: (pass) skill store and harness links > replaces a real directory left in a harness dir with a link into the store [50.26ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a harness dir holding a real directory instead of a link [59.91ms]
@bryance/orch test: (pass) skill store and harness links > doctor reports a stale store and its fix reinstalls the packaged skill [110.14ms]
@bryance/orch test: (pass) skill store and harness links > doctor passes once every harness dir links into the store [40.36ms]
@bryance/orch test: (pass) skill store and harness links > doctor skips when the user turned the skill install off [21.86ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > matching model and effort produces no finding [240.46ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö orch's own grouping > delete refuses a space that still holds agents [270.88ms]
@bryance/orch test: 
@bryance/orch test: test\queue.test.ts:
@bryance/orch test: (pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [221.12ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [201.85ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: the gate is on enqueuing into a scope, and adoption earns it [221.90ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq1: a pack drains its queue with its orch dead and no lease in force [209.21ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [218.20ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq3: a space-scoped task is an offer, and only an opted-in pack consumes it [248.06ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [220.84ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq5: an agent-scoped binding is to the agent and survives adoption [235.91ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq13: adoption carries the queue ΓÇö pack work comes with the agents [188.25ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [259.94ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [222.00ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > Cq7: origin_workspace is gone from the tasks table, scope replaces it [233.51ms]
@bryance/orch test: (pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [247.92ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > a null ended_agents_days is the user's own choice, never the default [196.41ms]
@bryance/orch test: (pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [292.93ms]
@bryance/orch test: (pass) retention sweep > returns zero counts when every row is inside its window [211.72ms]
@bryance/orch test: (pass) retention sweep > continues sweeping when one table delete fails [202.08ms]
@bryance/orch test: (pass) retention sweep > reaps a gone agent by identity, taking every satellite with it [231.81ms]
@bryance/orch test: (pass) retention sweep > a dead parent goes in the same reap as its dead child [234.33ms]
@bryance/orch test: (pass) retention sweep > a dead parent stays while a live child still points at it [226.82ms]
@bryance/orch test: (pass) retention sweep > a dead agent a task still points at stays for a later reap [212.31ms]
@bryance/orch test: (pass) retention sweep > the sweep leaves a dead agent's rows alone and keeps its young history [252.56ms]
@bryance/orch test: (pass) retention sweep > removes a gone agent's history once its last write is past the window [212.59ms]
@bryance/orch test: (pass) retention sweep > keeps history whose newest file is inside the window [250.79ms]
@bryance/orch test: (pass) retention sweep > a null window keeps history forever [197.63ms]
@bryance/orch test: (pass) retention sweep > never reaps a live agent or its history regardless of age [215.00ms]
@bryance/orch test: (pass) retention sweep > sweeps old logs but preserves logs for live agents [215.60ms]
@bryance/orch test: 
@bryance/orch test: test\status-unleased.test.ts:
@bryance/orch test: (pass) status owner rendering > a dead holder is shown as unleased with the holder gone [239.72ms]
@bryance/orch test: (pass) status owner rendering > an agent never leased shows no orch driving it [202.11ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > --json carries a per-target outcome, not just the successes [956.99ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > a dispatched transition writes the full run row [275.92ms]
@bryance/orch test: (pass) daemon presence events > a result report stores the complete result text [232.33ms]
@bryance/orch test: (pass) daemon presence events > a status report after the result leaves the settled run alone [222.97ms]
@bryance/orch test: (pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [229.61ms]
@bryance/orch test: (pass) daemon presence events > a status without a dispatch id does not write history [244.31ms]
@bryance/orch test: (pass) daemon presence events > a throwing history write does not stop event delivery [225.65ms]
@bryance/orch test: (pass) daemon presence events > emitted events carry the pack capacity at publish time [214.01ms]
@bryance/orch test: (pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.39ms]
@bryance/orch test: (pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.23ms]
@bryance/orch test: (pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.12ms]
@bryance/orch test: (pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.11ms]
@bryance/orch test: (pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.15ms]
@bryance/orch test: (pass) daemon presence events > presence transitions resolve the human name before emission [263.60ms]
@bryance/orch test: (pass) daemon presence events > presence transitions use the normalized agent name after rename [181.09ms]
@bryance/orch test: (pass) daemon presence events > status rows preserve the complete asking transition payload [238.49ms]
@bryance/orch test: (pass) daemon presence events > an asking report publishes an asking event [243.48ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-names.test.ts:
@bryance/orch test: (pass) agent name validation > accepts lowercase names with hyphens and underscores [0.12ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a live agent holds its name against a second spawn [279.20ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > a dead agent frees its name [204.41ms]
@bryance/orch test: (pass) a live name is claimed and a dead one is released > another space's agent never blocks a name here [236.87ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > moving an agent moves the name it holds [227.82ms]
@bryance/orch test: (pass) name scope follows the agent's current space, not its birthplace > the collision names the agent by its minted id [205.33ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > an asking transition drives command sink delivery [286.00ms]
@bryance/orch test: 
@bryance/orch test: test\agent-key-is-minted-id.test.ts:
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [1.28ms]
@bryance/orch test: (pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [1.11ms]
@bryance/orch test: (pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [593.36ms]
@bryance/orch test: (pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [230.87ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [849.36ms]
@bryance/orch test: (pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [227.58ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [8.42ms]
@bryance/orch test: (pass) doctor reads a presence directory name as an id > a minted id is well formed, with or without a status row [222.38ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies unleased dead holders and leased dead processes [0.51ms]
@bryance/orch test: 
@bryance/orch test: test\commands-fleet.test.ts:
@bryance/orch test: (pass) commands/fleet > reads agent views and indexes presence by key [317.83ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > create makes a home and records only its coordinate [292.23ms]
@bryance/orch test: 
@bryance/orch test: test\work-loop-identity.test.ts:
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > an idle process with no registered agent row is never handed pack work [238.77ms]
@bryance/orch test: (pass) Cq8/Cq1: the work loop claims as the registered agent, never as a plexer key > Cq1: the pack drains its own queue with its orch dead and no lease in force [288.45ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > a LIVE foreign holder still excludes everyone else [859.19ms]
@bryance/orch test: (pass) lease commands > adopt takes an unleased agent and a dead holder [216.82ms]
@bryance/orch test: (pass) lease commands > adopt refuses a holder with a live recorded process [226.43ms]
@bryance/orch test: (pass) lease commands > reap refuses when a live descendant exists, regardless of lease [231.14ms]
@bryance/orch test: (pass) lease commands > reap refuses while the recorded process is alive [185.46ms]
@bryance/orch test: (pass) lease commands > reap is never lease-gated and removes the record and presence [241.24ms]
@bryance/orch test: (pass) lease commands > abort proceeds with a foreign live-holder lease [878.73ms]
@bryance/orch test: 
@bryance/orch test: test\space-policy.test.ts:
@bryance/orch test: (pass) a space is user-created, and absence falls back to the repo root > placing an agent in a space nobody created is refused, not minted [286.19ms]
@bryance/orch test: 
@bryance/orch test: test\store-agent-rows.test.ts:
@bryance/orch test: (pass) agent store rows > insertAgent writes both NULL; agentById reads both back [259.56ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > a spawn into NO space records no space and hands the plexer only its coordinate [875.36ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: orch is not running inside herdr and no backend was chosen - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a plexer orch only probed, from a plain terminal, spawns headless [68.12ms]
@bryance/orch test: 
@bryance/orch test: test\one-writer-records-a-spawned-agent.test.ts:
@bryance/orch test: (pass) one writer records a spawned agent (2.1) > the presence store no longer offers a second way to record an agent [3.22ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-channel.test.ts:
@bryance/orch test: (pass) orch bridge links and capture roles > live session delivery settles mail without a bridge or pane route [228.21ms]
@bryance/orch test: (pass) orch bridge links and capture roles > a spawned agent whose bridge is detached stays queued for that bridge [269.07ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner prompt waits for the spawner's bridge [260.25ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to its spawner under mail.to_spawner events settles on the spawner's stream [225.55ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in settles on the stream under prompt-unless-focused [244.09ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane the human is in still waits for the bridge under prompt [224.35ms]
@bryance/orch test: (pass) orch bridge links and capture roles > worker mail to a spawner whose pane is unfocused waits for the bridge under prompt-unless-focused [285.57ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker follows mail.to_worker, not mail.to_spawner [221.21ms]
@bryance/orch test: (pass) orch bridge links and capture roles > spawner mail to its worker under mail.to_worker events settles on the worker's stream [217.09ms]
@bryance/orch test: (pass) orch bridge links and capture roles > events mail to a dead recipient is undeliverable [243.77ms]
@bryance/orch test: (pass) orch bridge links and capture roles > dead session without a bridge or pane route is undeliverable [230.19ms]
@bryance/orch test: (pass) orch bridge links and capture roles > capture reads status and result from the store [293.28ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a failed target reports outcome error WITH the real error text [333.11ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > shows only agents held by the current session, not its provenance children [0.29ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer stays selected and its home is what the human grants [47.09ms]
@bryance/orch test: 
@bryance/orch test: test\port-seam-errors.test.ts:
@bryance/orch test: (pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.57ms]
@bryance/orch test: (pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.23ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-links.test.ts:
@bryance/orch test: (pass) bridge links > a second attach for the same key replaces the first [209.35ms]
@bryance/orch test: (pass) bridge links > detach removes only the link still held [220.04ms]
@bryance/orch test: (pass) bridge links > push with no link throws BridgeDetachedError [270.07ms]
@bryance/orch test: (pass) bridge links > an unknown target is refused before the registry is consulted [168.72ms]
@bryance/orch test: (pass) bridge message guards > accept every action shape [2.02ms]
@bryance/orch test: (pass) bridge message guards > refuse a missing field, an unknown action, and a non-record [1.88ms]
@bryance/orch test: (pass) bridge message guards > a delivery is an id plus a message [4.82ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) reapCandidates > classifies empty input [0.08ms]
@bryance/orch test: 
@bryance/orch test: test\orch-bugs-4-5.test.ts:
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [3.68ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [5.03ms]
@bryance/orch test: (pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-events.test.ts:
@bryance/orch test: (pass) daemon presence events > liveness announces a dead process as exited, then reaps its rows [296.75ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [1.29ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: orch is not running inside herdr and herdr cannot open a space of its own - spawning headless. Pass --backend herdr or set defaults.backend to open a herdr home for these agents (the user grants it), or --space <id> to place them in an open space.
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a chosen plexer that cannot open a home still falls back to headless [60.39ms]
@bryance/orch test: 
@bryance/orch test: test\commands-help.test.ts:
@bryance/orch test: (pass) per-command help topics > aliases resolve to their command's topic [3.73ms]
@bryance/orch test: (pass) per-command help topics > logs help names every filter the command accepts [0.57ms]
@bryance/orch test: (pass) per-command help topics > an unknown name has no topic [0.05ms]
@bryance/orch test: (pass) per-command help topics > every topic is printable text ending in a newline [5.56ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > list reports that a space has a home without naming the coordinate [246.93ms]
@bryance/orch test: 
@bryance/orch test: test\retention.test.ts:
@bryance/orch test: (pass) retention sweep > does not sweep again one minute after the first tick [215.87ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the age cap [243.11ms]
@bryance/orch test: (pass) retention sweep > prunes orch's own logs past the size cap even when freshly written [186.72ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"closed":["ojzo86oyy4"],"results":[{"target":"ojzo86oyy4","handle":"close-handle","outcome":"done","error":null}],"requested":1,"ok":1,"stream":false}
@bryance/orch test: (pass) lease commands > close proceeds with a foreign live-holder lease [413.54ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [269.54ms]
@bryance/orch test: (pass) runDoctor > checks a healthy store [239.45ms]
@bryance/orch test: (pass) runDoctor > warns when the store is absent [2.69ms]
@bryance/orch test: (pass) runDoctor > fails when the store predates orch's migrations [185.71ms]
@bryance/orch test: (pass) runDoctor > fails and names a missing store table [187.54ms]
@bryance/orch test: (pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [261.46ms]
@bryance/orch test: (pass) runDoctor > reports an absent daemon as optional [238.34ms]
@bryance/orch test: (pass) runDoctor > reports and fixes a stale daemon lock [326.03ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a caller recorded inside the plexer stays in it, chosen or not [66.13ms]
@bryance/orch test: (pass) outside every plexer, spawn is headless unless the human chose one > a named space is placement enough: no chosen backend needed [37.17ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > rejects malformed object that only has an id [5.88ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-reasserts-pin.test.ts:
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts after session_start and reports the applied pin [18.67ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > reasserts one time for a foreign level and ignores apply events [5.95ms]
@bryance/orch test: (pass) bridge reasserts orch model pins > a harness clamp does not create a reassert loop [16.24ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-idle.test.ts:
@bryance/orch test: (pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.08ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.02ms]
@bryance/orch test: (pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
@bryance/orch test: (pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
@bryance/orch test: (pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.03ms]
@bryance/orch test: 
@bryance/orch test: test\holder-death-costs-a-driver.test.ts:
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the lease closes `expired` ΓÇö not `released`, because no caller held it [210.33ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > the agent stays alive, unleased and adoptable ΓÇö nothing closes it [208.92ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > it receives no new work: the death hands the agent to nobody [238.33ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > expiry is recorded once and does not erase who held it [193.13ms]
@bryance/orch test: (pass) holder death costs a driver, not a life (D2) > clearing a dead holder's lease is never refused, and is idempotent [183.98ms]
@bryance/orch test: 
@bryance/orch test: test\orchd-rpc-reconnect.test.ts:
@bryance/orch test: (pass) RPC JSON framing > parses split and multiple newline-delimited frames [77.50ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality-tuning.test.ts:
@bryance/orch test: (pass) doctor declared tuning versus reality > different effort reports both ladder specs [272.48ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > different model reports both ladder specs [226.32ms]
@bryance/orch test: (pass) doctor declared tuning versus reality > missing status produces no tuning finding [189.88ms]
@bryance/orch test: 
@bryance/orch test: test\host.test.ts:
@bryance/orch test: (pass) host > maps supported platforms [0.11ms]
@bryance/orch test: (pass) host > rejects unsupported platforms [0.08ms]
@bryance/orch test: (pass) host > guards host operating systems [0.21ms]
@bryance/orch test: (pass) host > detects WSL from distro name or kernel release [0.25ms]
@bryance/orch test: (pass) host > detects the current host [0.32ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > Identity declares no plexer and no plexer grouping [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > rename renames orch's space and its home [211.55ms]
@bryance/orch test: 
@bryance/orch test: test\identity-is-not-environment.test.ts:
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > a key is the minted id itself, with no separator to split [0.11ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > the module never spells the sentinels that stand in for a missing place [0.02ms]
@bryance/orch test: (pass) A1 ΓÇö identity carries no environment > minted ids are unique per spawn [2.76ms]
@bryance/orch test: 
@bryance/orch test: test\work-notify.test.ts:
@bryance/orch test: (pass) orch presence notifications > delivers a presence transition through a configured command sink [346.61ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > a pane the plexer no longer has is CLOSED, not failed [341.27ms]
@bryance/orch test: 
@bryance/orch test: test\identity-launch.test.ts:
@bryance/orch test: (pass) an unset launch credential is absent [0.51ms]
@bryance/orch test: (pass) a minted launch credential is accepted [0.23ms]
@bryance/orch test: (pass) a malformed launch credential is refused, never exited [0.20ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.36ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.32ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.29ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.20ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.47ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [33.73ms]
@bryance/orch test: (pass) backend registry selection is backend-independent > implicit selection falls back to headless when no plexer answers [0.31ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [895.33ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [2.56ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a composite-named dir is not presence, whatever its file claims [233.85ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity stamps a minted id [1074.98ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: {"target":"ggdi2lhyq4","name":"reap-worker","reaped":true}
@bryance/orch test: (pass) lease commands > reap proceeds with a foreign live-holder lease [265.51ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > stores hostile values as data and preserves pack selection [223.67ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: (pass) fleet ownership scoping > close --all works from an unregistered shell [1439.02ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > delete closes the home and drops its coordinate [237.20ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > describes composed and absent backend roles [26.21ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lease.test.ts:
@bryance/orch test: (pass) lease commands > reset driving verb refuses a foreign live-holder lease [199.16ms]
@bryance/orch test: 
@bryance/orch test: test\close-reports-every-target.test.ts:
@bryance/orch test: (pass) close reports an outcome for every target it was given (U2) > the exit code still reflects whether every target closed [245.89ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > ending the spawner leaves the child live, unended and still listed [206.68ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: (pass) commands/queue > cmdQueue list emits the selected JSON view [319.21ms]
@bryance/orch test: 
@bryance/orch test: test\doctor.test.ts:
@bryance/orch test: (pass) runDoctor > accepts a live daemon and an answerable socket [554.93ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [278.96ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [4.61ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > capability helpers fail closed when absent [1.03ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > focus focuses the recorded coordinate [243.34ms]
@bryance/orch test: 
@bryance/orch test: test\commands-queue.test.ts:
@bryance/orch test: No queue tasks.
@bryance/orch test: (pass) commands/queue > round-trips add/list/cancel on an isolated store [192.48ms]
@bryance/orch test: (pass) commands/queue > renders empty queues without throwing [0.36ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-herdr-headless.test.ts:
@bryance/orch test: (pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [471.28ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > one adapter uses the same opaque key across headless and tmux routes [0.28ms]
@bryance/orch test: (pass) headless common path: identity key -> presence > a key carries no environment to read back out of it [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [6.06ms]
@bryance/orch test: (pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [2.95ms]
@bryance/orch test: (pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [12.61ms]
@bryance/orch test: (pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [8.73ms]
@bryance/orch test: 
@bryance/orch test: test\owner-scoping.test.ts:
@bryance/orch test: {"closed":["caller","klmine0001","other","klforeign1"],"results":[{"target":"caller","handle":null,"outcome":"done","error":null},{"target":"klmine0001","handle":"mine","outcome":"done","error":null},{"target":"other","handle":null,"outcome":"done","error":null},{"target":"klforeign1","handle":"foreign","outcome":"done","error":null}],"requested":4,"ok":4,"stream":false}
@bryance/orch test: (pass) fleet ownership scoping > close --all closes all managed records regardless of owner [318.11ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > is registered [0.41ms]
@bryance/orch test: 
@bryance/orch test: test\bridge-terminal.test.ts:
@bryance/orch test: (pass) bridge terminal turn seam > a settled turn with assistant text publishes done [219.93ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > explicit selection follows tmux availability [21.26ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > exposes pane roles [0.15ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > reflects the TMUX environment [0.16ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > a tmux agent's key is the minted id, never its pane [0.23ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > selects an available placing environment, whichever one the caller sits in [0.24ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > falls back to headless only when no environment can place an agent [0.06ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > an installed plexer is selectable from outside its session, and refuses in its own words [0.28ms]
@bryance/orch test: (pass) tmux backend registry and capabilities > herdr is selectable from outside a herdr session [0.06ms]
@bryance/orch test: 
@bryance/orch test: test\presence-dirs-are-reaped-not-migrated.test.ts:
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > the sweep REMOVES it rather than leaving it for a migration that never comes [217.33ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > nothing renames, rewrites or re-keys the old directory [151.87ms]
@bryance/orch test: (pass) a presence dir in the old shape is reaped, never migrated (J4) > a dead dir in the CURRENT shape is still reaped the ordinary way [198.45ms]
@bryance/orch test: 
@bryance/orch test: test\lease-authority.test.ts:
@bryance/orch test: (pass) C3 foreign agents are untouchable > a DEAD foreign holder is not a collision [225.14ms]
@bryance/orch test: (pass) C3 foreign agents are untouchable > the composed holder IS the open lease, with nothing beside it [238.69ms]
@bryance/orch test: (pass) C4 steal > adopt refuses a live holder, and --steal takes it [236.22ms]
@bryance/orch test: (pass) C4 steal > detach refuses a live holder, and --steal releases it [207.00ms]
@bryance/orch test: (pass) C4a fencing token > lease ids are monotonic across handoff and adoption [202.40ms]
@bryance/orch test: (pass) C4a fencing token > a stale fence cannot release the current holder's lease [248.61ms]
@bryance/orch test: (pass) C4a fencing token > openLeaseId is null when nothing is leased [201.11ms]
@bryance/orch test: (pass) C4b reads are never gated > status and events read straight through a live foreign lease [219.27ms]
@bryance/orch test: (pass) C4c/C4d name resolution > duplicate names are legal and an ambiguous target asks for the id [227.95ms]
@bryance/orch test: (pass) C4c/C4d name resolution > a unique name resolves, and an unknown target is a lookup miss [195.11ms]
@bryance/orch test: (pass) C4e naming at creation > a nameless spawn is refused [0.66ms]
@bryance/orch test: (pass) C4e naming at creation > a self-registering session gets <harness>-<first 8 of its id> [257.92ms]
@bryance/orch test: (pass) C4f self-rename > an agent renames itself whether or not a lease is in force [197.50ms]
@bryance/orch test: (pass) C4f self-rename > renaming another agent is driving and obeys the lease [182.93ms]
@bryance/orch test: (pass) C4f self-rename > an invalid name is refused [201.88ms]
@bryance/orch test: (pass) C5 a transfer does not disturb the agent > adoption writes lease rows and touches nothing else [201.64ms]
@bryance/orch test: (pass) C7 live by lease, history by provenance > adoption moves the live view and leaves provenance untouched [200.26ms]
@bryance/orch test: 
@bryance/orch test: test\provenance.test.ts:
@bryance/orch test: (pass) the one provenance walk > ancestors are parent-first, root last [0.12ms]
@bryance/orch test: (pass) the one provenance walk > depth counts hops to the root [0.03ms]
@bryance/orch test: (pass) the one provenance walk > an unknown id is its own root at depth 0
@bryance/orch test: (pass) the one provenance walk > an unknown parent ends the chain instead of throwing [0.03ms]
@bryance/orch test: (pass) the one provenance walk > descendant is any depth, never self, never a sibling tree [0.04ms]
@bryance/orch test: (pass) the one provenance walk > a cycle terminates [0.02ms]
@bryance/orch test: 
@bryance/orch test: test\work-survives-its-spawner.test.ts:
@bryance/orch test: (pass) work survives its spawner, always (D1) > a grandchild is untouched when the middle agent ends [175.21ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > the store has no lifetime column and no fate-sharing flag anywhere [0.78ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > spawn offers no flag that decides whether work outlives its spawner [2.07ms]
@bryance/orch test: (pass) work survives its spawner, always (D1) > closing the spawner never writes an ending for anything it spawned [179.14ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [1.44ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö the plexer's home > a home made in another plexer is not this environment's to focus [232.84ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > spawn clause follows maySpawn and stripping preserves the task [0.55ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > acquires once and refuses a second live owner [720.95ms]
@bryance/orch test: 
@bryance/orch test: test\reap-picker.test.ts:
@bryance/orch test: (pass) cmdReap > prints the --dead --json result shape [1260.72ms]
@bryance/orch test: (pass) cmdReap > refuses bare reap when stdin is not a TTY [0.99ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > an operator sees every agent in every space [0.08ms]
@bryance/orch test: (pass) session agent visibility > a session cannot reset a foreign-held agent [901.88ms]
@bryance/orch test: 
@bryance/orch test: test\identity-self.test.ts:
@bryance/orch test: (pass) selfIdentity > returns the launch id without touching the store [649.98ms]
@bryance/orch test: 
@bryance/orch test: test\cli-backends-tmux.test.ts:
@bryance/orch test: (pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-space [201.03ms]
@bryance/orch test: 
@bryance/orch test: test\identity.test.ts:
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is the minted id verbatim [0.16ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > round-trips a minted id [0.11ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > a key is one flat filesystem-safe segment with nothing to split [0.10ms]
@bryance/orch test: (pass) serializeIdentity / parseIdentity > two spawns never collide, so no plexer is needed to namespace them [1.23ms]
@bryance/orch test: (pass) isAgentId > accepts a minted id [0.13ms]
@bryance/orch test: (pass) isAgentId > rejects everything that is not one [0.18ms]
@bryance/orch test: (pass) malformed input > rejects malformed ids [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > a session cannot read runs by the exact key of a foreign-held agent [279.50ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a named space is orch's own id, and the workspace is its RECORDED home [1022.61ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-rpc-identity.test.ts:
@bryance/orch test: (pass) daemon identity RPCs > claim-identity refuses an unknown id by naming it [848.22ms]
@bryance/orch test: 
@bryance/orch test: test\worker-prompt.test.ts:
@bryance/orch test: (pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.10ms]
@bryance/orch test: (pass) worker prompt capability composition > the worker header does not instruct a lock that does not lock [0.08ms]
@bryance/orch test: (pass) worker prompt capability composition > the header addresses the agent, and names no plexer furniture [0.07ms]
@bryance/orch test: (pass) worker prompt capability composition > the verify clause names the configured commands, and asks for the repository's own when there are none [0.07ms]
@bryance/orch test: (pass) worker prompt capability composition > locked-commands clause names the commands, and asks for a report rather than a lock [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker [0.04ms]
@bryance/orch test: (pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.03ms]
@bryance/orch test: (pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker has no bridge [0.02ms]
@bryance/orch test: (pass) worker prompt capability composition > the ask clause follows the bridge actions [0.16ms]
@bryance/orch test: (pass) worker prompt capability composition > events strip both worker header variants [208.90ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) store hardening > a fresh store creates the full current schema with WAL enabled [189.60ms]
@bryance/orch test: (pass) store hardening > the store refuses a second open holding, so ownership cannot fork [181.30ms]
@bryance/orch test: (pass) store hardening > adoption closes the prior holding in the same step that opens the new one [179.95ms]
@bryance/orch test: (pass) store hardening > the attempt insert claim is exactly once [224.09ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: (pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [30.34ms]
@bryance/orch test: (pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [46.74ms]
@bryance/orch test: (pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [11.07ms]
@bryance/orch test: (pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [11.47ms]
@bryance/orch test: (pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [13.85ms]
@bryance/orch test: (pass) daemon lifecycle > retries if a stale lock disappears during reclaim [14.96ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > focus with no space-home role names the space and what is missing [224.88ms]
@bryance/orch test: 
@bryance/orch test: test\codex-adapter.test.ts:
@bryance/orch test: (pass) CodexAdapter > notify shim reports done presence and result over orchd [446.02ms]
@bryance/orch test: 
@bryance/orch test: test\worker-tools.test.ts:
@bryance/orch test: (pass) worker tool policy > no configured allowlist restricts nothing [1.40ms]
@bryance/orch test: (pass) worker tool policy > a configured allowlist always carries orch's own tools [0.08ms]
@bryance/orch test: (pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.04ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > every handler word names a spec, and every spec has a handler [19.77ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a dead agent with a live descendant is NOT reaped [190.29ms]
@bryance/orch test: 
@bryance/orch test: test\cli-help.test.ts:
@bryance/orch test: (pass) help from the registry > the map equals the golden file [1.03ms]
@bryance/orch test: (pass) help from the registry > the map starts with the header and lists every top-level usage under its section [0.38ms]
@bryance/orch test: (pass) help from the registry > a topic prints usage, doc, the flag table with spellings and placeholders, subcommands, then globals [0.80ms]
@bryance/orch test: (pass) help from the registry > a missing doc names the path and never throws [0.08ms]
@bryance/orch test: (pass) help from the registry > every shipped command has a doc that reads back, and doctor agrees [31.17ms]
@bryance/orch test: (pass) help from the registry > helpTopic resolves aliases and refuses unknown words [4.91ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > --agent, --pack and --space each select exactly one typed scope [305.94ms]
@bryance/orch test: 
@bryance/orch test: test\cli-parse.test.ts:
@bryance/orch test: (pass) parseInvocation > positionals stay in order and no-value flags read as has() [0.92ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag takes the next token or the assignment [0.27ms]
@bryance/orch test: (pass) parseInvocation > the value token is taken even when it starts with a dash [0.10ms]
@bryance/orch test: (pass) parseInvocation > a many-value flag collects in argv order, in both syntaxes [0.08ms]
@bryance/orch test: (pass) parseInvocation > an alias records under the long name [0.05ms]
@bryance/orch test: (pass) parseInvocation > a repeated one-value flag keeps the last value [0.03ms]
@bryance/orch test: (pass) parseInvocation > an unknown flag is refused with the usage line [0.77ms]
@bryance/orch test: (pass) parseInvocation > a one-value flag at the end of argv is refused [0.12ms]
@bryance/orch test: (pass) parseInvocation > a no-value flag with an assignment is refused [0.08ms]
@bryance/orch test: (pass) parseInvocation > a global flag is accepted on any command [0.09ms]
@bryance/orch test: (pass) parseInvocation > a subcommand word routes to the child and the path records the route [0.25ms]
@bryance/orch test: (pass) parseInvocation > openFlags keeps an undeclared flag as bare, assigned, or with the next token [0.09ms]
@bryance/orch test: (pass) parseInvocation > a closed spec refuses an undeclared flag and reports nothing undeclared [0.09ms]
@bryance/orch test: (pass) parseInvocation > no subcommand word stays on the parent [0.05ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö absence is an answer > the plain-text answer names the space too [203.21ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > with no space, orch INSIDE the plexer spawns beside itself and opens nothing [257.17ms]
@bryance/orch test: 
@bryance/orch test: test\cli-registry.test.ts:
@bryance/orch test: (pass) command registry > every spec has a usage line that starts with its path, and a summary [1.50ms]
@bryance/orch test: (pass) command registry > every flag has a help line, and a placeholder when it takes a value [1.74ms]
@bryance/orch test: (pass) command registry > no spec declares one spelling twice, or shadows a global flag [2.15ms]
@bryance/orch test: (pass) command registry > every top-level command has a section and a unique word; subcommands have neither a section nor a clash [0.58ms]
@bryance/orch test: (pass) command registry > every top-level command has a non-empty doc file in help/ [5.84ms]
@bryance/orch test: (pass) command registry > a command word resolves by name or alias [0.66ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)
@bryance/orch test: 
@bryance/orch test: Usage: bun <command> [...flags] [...args]
@bryance/orch test: 
@bryance/orch test: Commands:
@bryance/orch test:   run       ./my-script.ts       Execute a file with Bun
@bryance/orch test:             lint                 Run a package.json script
@bryance/orch test:   test                           Run unit tests with Bun
@bryance/orch test:   x         bun-repl             Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       hono                 Add a dependency to package.json (bun a)
@bryance/orch test:   remove    browserify           Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    react                Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      lyra                 Display package metadata from the registry
@bryance/orch test:   why       @remix-run/dev       Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    svelte               Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [346.35ms]
@bryance/orch test: 
@bryance/orch test: test\session-sees-only-held-agents.test.ts:
@bryance/orch test: (pass) session agent visibility > a session cannot widen status with --space-wide [156.33ms]
@bryance/orch test: (pass) session agent visibility > a session cannot resolve a foreign target, even when it shares provenance [181.95ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [178.49ms]
@bryance/orch test: (pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [190.57ms]
@bryance/orch test: 
@bryance/orch test: test\session.test.ts:
@bryance/orch test: (pass) parseSession > returns an empty view for null and missing paths [0.21ms]
@bryance/orch test: (pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [9.66ms]
@bryance/orch test: (pass) parseSession > joins text blocks and ignores non-text blocks [5.80ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > cmdSpace lists through the resolved environment [172.83ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > orch ws is gone [2.88ms]
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > space help never says workspace and offers create/rename/delete [4.07ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-lifecycle.test.ts:
@bryance/orch test: Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)
@bryance/orch test: 
@bryance/orch test: Usage: bun <command> [...flags] [...args]
@bryance/orch test: 
@bryance/orch test: Commands:
@bryance/orch test:   run       ./my-script.ts       Execute a file with Bun
@bryance/orch test:             lint                 Run a package.json script
@bryance/orch test:   test                           Run unit tests with Bun
@bryance/orch test:   x         prettier             Execute a package binary (CLI), installing if needed (bunx)
@bryance/orch test:   repl                           Start a REPL session with Bun
@bryance/orch test:   exec                           Run a shell script directly with Bun
@bryance/orch test: 
@bryance/orch test:   install                        Install dependencies for a package.json (bun i)
@bryance/orch test:   add       @evan/duckdb         Add a dependency to package.json (bun a)
@bryance/orch test:   remove    is-array             Remove a dependency from package.json (bun rm)
@bryance/orch test:   update    @zarfjs/zarf         Update outdated dependencies
@bryance/orch test:   audit                          Check installed packages for vulnerabilities
@bryance/orch test:   dedupe                         Remove duplicate versions from the lockfile
@bryance/orch test:   prune                          Remove packages that are not in the lockfile from node_modules
@bryance/orch test:   outdated                       Display latest versions of outdated dependencies
@bryance/orch test:   link      [<package>]          Register or link a local npm package
@bryance/orch test:   unlink                         Unregister a local npm package
@bryance/orch test:   publish                        Publish a package to the npm registry
@bryance/orch test:   patch <pkg>                    Prepare a package for patching
@bryance/orch test:   pm <subcommand>                Additional package management utilities
@bryance/orch test:   info      zod                  Display package metadata from the registry
@bryance/orch test:   why       tailwindcss          Explain why a package is installed
@bryance/orch test: 
@bryance/orch test:   build     ./a.ts ./b.jsx       Bundle TypeScript & JavaScript into a single file
@bryance/orch test: 
@bryance/orch test:   init                           Start an empty Bun project from a built-in template
@bryance/orch test:   create    svelte               Create a new project from a template (bun c)
@bryance/orch test:   upgrade                        Upgrade to latest version of Bun.
@bryance/orch test: 
@bryance/orch test:   <command> --help               Print help text for command.
@bryance/orch test: 
@bryance/orch test: Learn more about Bun:            https://bun.com/docs
@bryance/orch test: Join our Discord community:      https://bun.com/discord
@bryance/orch test: (pass) daemon lifecycle > reexecs with the current argv and hands over the lock [12.64ms]
@bryance/orch test: (pass) daemon lifecycle > rejects a recycled pid identity [30.00ms]
@bryance/orch test: (pass) daemon lifecycle > foreign machine registration cannot be signalled for another store [30.20ms]
@bryance/orch test: (pass) daemon lifecycle > only a provable lock owner may be signalled [47.96ms]
@bryance/orch test: (pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [6.64ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer whose recorded place is gone resolves no coordinate, never another [216.99ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > a name resolves to one id, and an ambiguous name asks for the id [251.17ms]
@bryance/orch test: 
@bryance/orch test: test\control-dispatch.test.ts:
@bryance/orch test: (pass) deliverControl bridge dispatch > pushes run and steer with their action ids [263.42ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > reports missing bridge pid without touching backend [0.18ms]
@bryance/orch test: 
@bryance/orch test: test\daemon-no-peer-credentials.test.ts:
@bryance/orch test: (pass) the daemon asks for a token and nothing else > no peer-credential or ancestry syscall appears in the daemon at all [5.26ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-declared-vs-reality.test.ts:
@bryance/orch test: (pass) doctor declared-vs-reality > reports a lease whose recorded holder process is dead [236.33ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports an environment handle missing from its plexer [193.02ms]
@bryance/orch test: (pass) doctor declared-vs-reality > reports a live agent with no lease and no live spawner [200.53ms]
@bryance/orch test: (pass) doctor declared-vs-reality > surfaces a missing task scope row as unrunnable [353.07ms]
@bryance/orch test: (pass) doctor declared-vs-reality > doctor -y does not delete an unrunnable task [252.15ms]
@bryance/orch test: 
@bryance/orch test: test\routing-hardening.test.ts:
@bryance/orch test: (pass) CLI offline routing > status --offline does not start or contact orchd [616.68ms]
@bryance/orch test: 
@bryance/orch test: test\commands-space.test.ts:
@bryance/orch test: (pass) orch space ΓÇö vocabulary and wiring > no space output ever says workspace [210.13ms]
@bryance/orch test: 
@bryance/orch test: test\commands-lifecycle.test.ts:
@bryance/orch test: (pass) commands/lifecycle > --all targets the agents this orch holds a live lease on, and drops them when it releases [1083.09ms]
@bryance/orch test: 
@bryance/orch test: test\broker-daemon-hardening.test.ts:
@bryance/orch test: (pass) broker daemon hardening > concurrent drains do not redeliver one message id [227.82ms]
@bryance/orch test: (pass) broker daemon hardening > replay after the newest sequence is empty without a gap [261.44ms]
@bryance/orch test: 
@bryance/orch test: test\spawn-placement.test.ts:
@bryance/orch test: (pass) spawn resolves orch's space and the plexer's workspace apart (E8, E9, E10) > a caller INSIDE the plexer with NO orch identity (a human's pane) spawns beside itself [199.34ms]
@bryance/orch test: 
@bryance/orch test: test\queue-cli-scope.test.ts:
@bryance/orch test: (pass) Cq2: all three scopes are choosable at enqueue > two scope flags at once are refused [195.98ms]
@bryance/orch test: 
@bryance/orch test: test\doctor-runtime.test.ts:
@bryance/orch test: (pass) shebangRuntime > reads #!/usr/bin/env node as node [19.85ms]
@bryance/orch test: 
@bryance/orch test: test\reap-walks-provenance.test.ts:
@bryance/orch test: (pass) reap walks the provenance tree (H3) > the tree is reaped from the LEAF up [207.19ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > a LIVE descendant blocks the reap of every ancestor [198.12ms]
@bryance/orch test: (pass) reap walks the provenance tree (H3) > provenance has no ON DELETE CASCADE, so no reap can erase a subtree [193.66ms]
@bryance/orch test: 
@bryance/orch test: test\commands-resolve.test.ts:
@bryance/orch test: (pass) commands/resolve > resolves one target with its view and ownership [1067.54ms]
