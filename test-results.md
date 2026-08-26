$ bun test --parallel
bun test v1.4.0 (34cbb9a40) 24x PARALLEL

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.92ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.32ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.02ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.70ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.18ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.11ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.02ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.04ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.68ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.06ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id [0.03ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.45ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [3.88ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.76ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.12ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [23.49ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [0.18ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.04ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.10ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [1.40ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.12ms]

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.17ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [10.91ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [10.99ms]

test\commands-status.test.ts:
(pass) commands/status > derives view fields from seeded presence [1.39ms]

test\tiling.test.ts:
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.08ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.04ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.03ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.14ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.03ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.04ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [9.31ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [4.29ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.08ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.05ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [10.84ms]

test\notifier-adapters.test.ts:
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [10.98ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [1.45ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > reports every registered backend and boolean capability fields [30.00ms]

test\commands-status.test.ts:
(pass) commands/status > marks dead presence as exited [0.48ms]
(pass) commands/status > shared status row carries presence-derived fields [10.05ms]
(pass) commands/status > row carries the owning backend's declared capabilities [1.59ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.36ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.13ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [0.08ms]
(pass) commands/status > formats workspace labels and warnings [0.12ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.57ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.83ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.78ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.05ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.08ms]
(pass) assistantText > reads role-tagged records [0.04ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.01ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.04ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [3.29ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined [0.04ms]

test\doctor-backends.test.ts:
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.08ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.06ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.05ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.03ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.03ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [26.55ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.13ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.02ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.20ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.04ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.03ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified [0.02ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.25ms]
(pass) commands/control > parses --then destination and note [0.05ms]
(pass) commands/control > adds worker header unless raw [0.13ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [6.97ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.08ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [47.80ms]

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [28.83ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [1.16ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.23ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [84.93ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [36.61ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [42.28ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [146.36ms]

test\notifier-adapters.test.ts:
notify: bad sink failed
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [10.49ms]
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.41ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.82ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [154.00ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [40.87ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [32.40ms]

test\herdr-pane-state.test.ts:
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [12.55ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.15ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.29ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.05ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.06ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.04ms]
(pass) malformed input > rejects wrong segment count [0.14ms]
(pass) malformed input > rejects empty key [0.03ms]
(pass) malformed input > rejects empty backend or id on serialize [0.04ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.07ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.02ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [1.10ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [1.96ms]

test\commands-target.test.ts:
(pass) commands/target > extracts target and joined prompt [0.15ms]
(pass) commands/target > reads only structured result text [0.05ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.14ms]
(pass) commands/target > lists only live serialized identity presence entries [35.12ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves origin workspace selection [151.69ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > statusSpeaksForTask demands an id match whenever the bridge reports one [0.32ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [1.26ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [11.43ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [1.51ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.91ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.46ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [19.27ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [7.10ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [3.89ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [3.37ms]
(pass) shebangRuntime > returns null for a file with no shebang [12.22ms]
(pass) shebangRuntime > returns null for an unreadable path [2.42ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.12ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [15.33ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [10.37ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [9.55ms]
(pass) doctor runtime verdict table > declared node but executing under bun fails [5.61ms]
(pass) doctor runtime verdict table > declared bun but executing under node fails just as loudly [6.23ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [11.72ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [6.27ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [7.12ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [9.61ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [1.43ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [151.77ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > reads a lock pid only from a complete lock record [29.38ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.40ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.09ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.21ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.09ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.49ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [209.17ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [2.03ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.47ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.13ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.24ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.13ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.32ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.19ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.46ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.13ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [1.89ms]
(pass) orch models --json > emits the pinned harness/model shape [0.14ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [161.58ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.21ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.53ms]
106 | /** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
107 | export function openStore(orchDir: string): DatabaseLike {
108 |   const path = databasePath(orchDir);
109 |   const cached = connections.get(path);
110 |   if (cached) return cached;
111 |   mkdirSync(orchDir, { recursive: true });
        ^
error: ENOENT: no such file or directory, mkdir
      at openStore (C:\dev\personal\orch\src\store\connection.ts:111:3)
      at selectSpawnedRecord (C:\dev\personal\orch\src\store\spawned-rows.ts:111:15)
      at placementOf (C:\dev\personal\orch\src\agent\registry.ts:12:18)
      at derivePresenceTransition (C:\dev\personal\orch\src\daemon\events.ts:117:21)
      at <anonymous> (C:\dev\personal\orch\test\worker-prompt.test.ts:41:21)
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.07ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.03ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.04ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox [0.02ms]
(fail) worker prompt capability composition > events strip both worker header variants [1.62ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [14.39ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [21.50ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.15ms]

test\commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.31ms]

test\notify-events-format.test.ts:
106 | /** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
107 | export function openStore(orchDir: string): DatabaseLike {
108 |   const path = databasePath(orchDir);
109 |   const cached = connections.get(path);
110 |   if (cached) return cached;
111 |   mkdirSync(orchDir, { recursive: true });
        ^
error: ENOENT: no such file or directory, mkdir
      at openStore (C:\dev\personal\orch\src\store\connection.ts:111:3)
      at selectSpawnedRecord (C:\dev\personal\orch\src\store\spawned-rows.ts:111:15)
      at placementOf (C:\dev\personal\orch\src\agent\registry.ts:12:18)
      at derivePresenceTransition (C:\dev\personal\orch\src\daemon\events.ts:117:21)
      at <anonymous> (C:\dev\personal\orch\test\notify-events-format.test.ts:107:12)
106 | /** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
107 | export function openStore(orchDir: string): DatabaseLike {
108 |   const path = databasePath(orchDir);
109 |   const cached = connections.get(path);
110 |   if (cached) return cached;
111 |   mkdirSync(orchDir, { recursive: true });
        ^
error: ENOENT: no such file or directory, mkdir
      at openStore (C:\dev\personal\orch\src\store\connection.ts:111:3)
      at selectSpawnedRecord (C:\dev\personal\orch\src\store\spawned-rows.ts:111:15)
      at placementOf (C:\dev\personal\orch\src\agent\registry.ts:12:18)
      at derivePresenceTransition (C:\dev\personal\orch\src\daemon\events.ts:117:21)
      at <anonymous> (C:\dev\personal\orch\test\notify-events-format.test.ts:118:27)
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.55ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.14ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.42ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.66ms]
(fail) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.97ms]
(fail) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [0.38ms]

test\commands-events.test.ts:
(pass) commands/events > parses filters and scope flags [0.11ms]
(pass) commands/events > parses the wake-up flags [0.03ms]
(pass) commands/events > describes durable replay and reports pruned history gaps [0.06ms]
(pass) commands/events > names one agent by name or by identity key [0.04ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [1.13ms]
(pass) commands/events > rejects malformed event and labels sinks [1.05ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.20ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.03ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.02ms]
(pass) per-command help topics > an unknown name has no topic [0.02ms]
(pass) per-command help topics > every topic is printable text ending in a newline [0.08ms]

test\worker-tools.test.ts:
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.06ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.03ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.25ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.21ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.11ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to [0.02ms]
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [11.38ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [21.27ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [11.15ms]

test\commands-panes.test.ts:
(pass) commands/panes > exports the pane listing command directly [0.03ms]

test\config-precedence.test.ts:
(pass) config precedence > applies defaults when config, env, and flag are absent [6.62ms]
(pass) config precedence > uses env over config and flag over env [5.83ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [17.27ms]
(pass) config precedence > reports a helpful validation error for invalid config [8.32ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.38ms]

test\cmd-lock.test.ts:
(pass) command lock > second acquire blocks until first releases [68.69ms]

test\store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [239.11ms]

test\adapter-hardening.test.ts:
210 | 
211 | export function loadPresence(root = orchDir()): Map<string, PresenceEntry> {
212 |   const presence = new Map<string, PresenceEntry>();
213 |   let keys: string[];
214 |   try {
215 |     keys = readdirSync(presenceDir(root));
                 ^
ENOTDIR: not a directory, scandir 'C:\Users\Bryan\AppData\Local\Temp\orch-hardening-gCfwDV\agents'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-hardening-gCfwDV\\agents",
 syscall: "scandir",
   errno: -4052,
    code: "ENOTDIR"

      at loadPresence (C:\dev\personal\orch\src\presence\store.ts:215:12)
      at checkExtensionStaleness (C:\dev\personal\orch\src\doctor\extensions.ts:33:19)
      at async <anonymous> (C:\dev\personal\orch\test\adapter-hardening.test.ts:40:18)
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [25.14ms]
(fail) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [26.04ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [232.95ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.12ms]
(pass) commands/index > reads a package version string [0.76ms]

test\notify-sinks.test.ts:
43 |       command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`),
44 |     };
45 |     expect(await deliverToSink(sink, event)).toBe(true);
46 | 
47 |     const payload = JSON.parse(readFileSync(output, "utf8")) as Record<string, unknown>;
48 |     expect(payload).toMatchObject({
                         ^
error: expect(received).toMatchObject(expected)

  {
    "agent": "w-2",
+   "body": 
+ "DONE [workspace] w-2: x
+ Workspace: workspace (#db2777)
+ Task: x"
+ ,
+   "cost": null,
+   "host": null,
+   "key": "w6:p21",
+   "lastError": null,
+   "model": null,
+   "name": null,
    "newState": "done",
+   "oldState": "working",
+   "seq": null,
+   "tab": null,
    "task": "x",
-   "workspace": "w6",
-   "workspaceColor": "#2563eb",
+   "title": "DONE [workspace] w-2: x",
+   "ts": "2026-01-01T00:00:00.000Z",
+   "workspace": "workspace",
+   "workspaceColor": "#db2777",
  }

- Expected  - 2
+ Received  + 18

      at <anonymous> (C:\dev\personal\orch\test\notify-sinks.test.ts:48:21)
(fail) notify sinks > delivers command sink payload as JSON [59.91ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [8.38ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [42.83ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed dead-host failure [155.28ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.13ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.16ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.27ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.10ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.15ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.18ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.16ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.20ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.08ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.08ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.09ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.05ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.06ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.46ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.08ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.36ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.92ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.14ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.24ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.09ms]
(pass) 10.3 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [12.64ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.21ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.08ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [2.23ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.21ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.16ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.44ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.91ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.07ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.44ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > reports tmux availability [10.28ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.33ms]
(pass) TmuxBackend > reflects the TMUX environment [0.28ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.12ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [1.91ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.38ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [26.17ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.38ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [66.85ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.22ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.21ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.16ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.40ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.09ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.28ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.20ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.49ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.16ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.45ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [40.72ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [262.13ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [13.08ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.54ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.16ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [229.88ms]

test\cmd-lock.test.ts:
bun test held by agent-a (pid 21196)
(pass) command lock > dead-pid lock is reaped [32.42ms]
(pass) command lock > release with wrong pid refuses [14.49ms]
(pass) command lock > matches locked command prefixes and probes settings [27.44ms]
(pass) command lock > run propagates the child exit code [108.56ms]

test\commands-queue.test.ts:
(pass) commands/queue > round-trips add/list/cancel on an isolated store [209.66ms]

test\notify.test.ts:
(pass) notify > delivers only to sinks whose on filter matches the event [106.24ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [222.59ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.17ms]

test\commands-queue.test.ts:
No queue tasks.
(pass) commands/queue > renders empty queues without throwing [3.02ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > declares its lifecycle slash-commands [0.14ms]
(pass) PiAdapter > reads state from the presence status through store helpers [19.80ms]
(pass) PiAdapter > appends a steer message to the presence inbox [26.93ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [77.37ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [33.16ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.90ms]

test\notify.test.ts:
125 |     };
126 | 
127 |     expect(await deliverToSink(sink, event)).toBe(true);
128 |     await waitForFile(output);
129 | 
130 |     expect(JSON.parse(readFileSync(output, "utf8"))).toEqual({
                                                           ^
error: expect(received).toEqual(expected)

  {
    "agent": "worker",
    "body": 
- "ERROR [task-1] worker: boom
- Workspace: task-1 (#db2777)
+ "ERROR [workspace] worker: boom
+ Workspace: workspace (#db2777)
  Tab: workers
  Model: terra:medium
  Task: run tests
  Cost: $1.25"
  ,
    "cost": 1.25,
    "host": "gpu1",
    "key": "task-1",
    "lastError": "boom",
    "model": "terra:medium",
    "name": null,
    "newState": "error",
    "oldState": "working",
    "seq": null,
    "tab": "workers",
    "task": "run tests",
-   "title": "ERROR [task-1] worker: boom",
+   "title": "ERROR [workspace] worker: boom",
    "ts": "2026-01-01T00:00:00.000Z",
-   "workspace": "task-1",
+   "workspace": "workspace",
    "workspaceColor": "#db2777",
  }

- Expected  - 4
+ Received  + 4

      at <anonymous> (C:\dev\personal\orch\test\notify.test.ts:130:54)
(fail) notify > command sink writes the event payload as JSON on stdin [54.66ms]
158 |       model: null,
159 |       oldState: "working",
160 |       newState: "done",
161 |       task: "ship it",
162 |       ts: "2026-01-01T00:00:00.000Z",
163 |     }).title).toBe("DONE [w6] w-2: ship it");
                    ^
error: expect(received).toBe(expected)

Expected: "DONE [w6] w-2: ship it"
Received: "DONE [workspace] w-2: ship it"

      at <anonymous> (C:\dev\personal\orch\test\notify.test.ts:163:15)
(fail) notify > titles lead with exactly one terminal state and agent [0.78ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.21ms]

test\notify.test.ts:
(pass) notify > webhook failure is non-fatal and reports a warning [31.96ms]

test\claude-hooks-shim.test.ts:
malformed identity key: expected 3 segments, got 1: "garbage"
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [135.77ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [119.42ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [111.78ms]
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [60.81ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [63.01ms]
(skip) claude-hooks shim tests need the dist bundle

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.24ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.39ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.14ms]

test\commands-spawn.test.ts:
(pass) commands/spawn > parses spawn flags and rejects no implicit adapter assumptions [0.30ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.14ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.46ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.27ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [2.99ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [2.29ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [151.12ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [322.69ms]

test\config-watch.test.ts:
(pass) watchConfig > keeps the last-good config, warns once, and recovers [428.50ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [632.34ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [12.80ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.10ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.29ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.25ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.06ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [5.94ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.27ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.17ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [205.24ms]

test\config-watch.test.ts:
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [39.42ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed timeout failure [529.00ms]

test\routing-hardening.test.ts:
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [227.76ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [278.73ms]
(pass) store hardening > the conditional claim is exactly once [212.05ms]

test\answer-dispatch.test.ts:
113 |     const foreign = key("wB", "foreign");
114 |     seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
115 |     await startAnswerServer(directory);
116 | 
117 |     expect(await refusalOf(rpcCall(directory, "answer", { target: foreign, text: "yes", actor: key("wA", "boss") })))
118 |       .toMatch(/workspace wall/);
             ^
error: Received value must be a string: undefined
      at <anonymous> (C:\dev\personal\orch\test\answer-dispatch.test.ts:118:8)
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [251.68ms]

test\store-outbox.test.ts:
(pass) outbox store rows > reports one message's pending state [215.34ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [215.38ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [224.84ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [251.73ms]

test\work-loop-binding.test.ts:
(pass) work loop dispatch binding > a claimed task settles only from a status carrying its own dispatch id [327.07ms]
(pass) work loop dispatch binding > a claimed task whose agent died fails instead of re-binding to a new pane [244.03ms]
(pass) work loop dispatch binding > a bound retry whose agent died fails too, never reaching another agent [310.75ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > returns a typed non-JSON failure [182.31ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [495.30ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > builds the interactive Claude launch command [0.50ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [63.70ms]
(pass) Claude adapter > detects state from a live presence status [25.40ms]
(pass) Claude adapter > extracts result.json before transcript and native output [25.09ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [4.09ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [87.67ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [286.02ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [129.74ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [84.90ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [234.51ms]
(pass) spawn name numbering > a dead agent frees its name and its index [260.87ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [216.56ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [278.79ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [268.21ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [233.49ms]

test\owner-scoping.test.ts:
{"closed":["mine"],"requested":1,"ok":1,"stream":false}
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [205.77ms]
(pass) fleet ownership scoping > headless bulk operations refuse without an owner token [182.64ms]
(pass) fleet ownership scoping > close --all leaves foreign-owned records untouched [258.21ms]

test\config-watch.test.ts:
(pass) watchConfig > stop prevents further callbacks [408.57ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > explicit foreign target fails and names its owner [492.19ms]

test\routing-hardening.test.ts:
(pass) CLI offline routing > status --offline does not start or contact orchd [384.87ms]

test\store-queue.test.ts:
(pass) queue store rows > countTasksInState returns a count per state and zero for an empty state [293.89ms]

test\answer-dispatch.test.ts:
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [314.66ms]

test\command-workspace-fields.test.ts:
(pass) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [316.21ms]

test\close-always.test.ts:
{"closed":["pane-name","pane-key","pane-id"],"requested":3,"ok":3,"stream":false}
(pass) close always works > closes a foreign-workspace target by name, key, or pane id [447.58ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [1.96ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.51ms]

test\control-dispatch.test.ts:
steer headless~local~claude-fail via claude keys fallback (degraded delivery)
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [27.63ms]
(pass) deliverControl > still answers a pane awaiting an answer [35.03ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [27.77ms]
(pass) deliverControl > warns and succeeds when claude keys fallback delivers [298.04ms]
(pass) deliverControl > fails when claude keys fallback cannot deliver [238.11ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [7.91ms]
(pass) deliverControl > requires presence for inbox delivery [201.86ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [264.33ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [194.05ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [236.19ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [349.33ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [312.33ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [192.17ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [41.39ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [153.66ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [255.02ms]

test\commands-results.test.ts:
(pass) commands/results > formats invalid and recent timestamps [0.20ms]
(pass) commands/results > routes a seeded result.json through the command module [237.10ms]
(pass) commands/results > orch tail resolves a non-pi target through that adapter's session view [290.71ms]
(pass) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [233.52ms]
(pass) commands/results > orch tail -n keeps last-N rendered entries for a pi session [318.86ms]
(pass) commands/results > orch session reports the pi entry count [218.67ms]
(pass) commands/results > orch session shows zero entries for an adapter view without them [236.66ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [209.15ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > spawns a detached process and records its handle [99.88ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [2.76ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [184.73ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [162.03ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.07ms]
(pass) commands/review > falls back to branch then pane [0.03ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [572.17ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.18ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.08ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [176.83ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > persists workspace through append-only replay [239.12ms]

test\workspace-policy.test.ts:
(pass) workspace policy > resolves workspace names through records and functions [0.34ms]
(pass) workspace policy > compares serialized keys by their workspace [245.47ms]
(pass) workspace policy > enforces the workspace wall [339.56ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [179.96ms]
(pass) workspace policy > null current workspace leaves items unscoped [0.99ms]
(pass) workspace policy > 2.7 status displays the reported workspace identity field [219.86ms]
(pass) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [251.41ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [1525.59ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [407.55ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [184.90ms]

test\commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [210.06ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [73.94ms]

test\pi-model-control.test.ts:
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2054.14ms]

test\retention.test.ts:
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [288.13ms]

test\pi-model-control.test.ts:
(pass) createModelControl.applyControlCommand > applies a thinking command directly [19.77ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.14ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.04ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

test\outbox.test.ts:
(pass) outbox delivery > checks one message's pending state without scanning the outbox [304.74ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [193.21ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > reads workspace ids from the spawned registry [0.72ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [22.50ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [12.20ms]
(pass) HeadlessBackend > never signals an unrecorded pid [12.90ms]

test\daemon-events.test.ts:
106 |       lastError: "last problem",
107 |     });
108 |     await waitFor(() => events.some((event) => eventState(event) === "done"));
109 | 
110 |     const [run] = selectRuns(orchDir);
111 |     expect(run).toMatchObject({
                      ^
error: expect(received).toMatchObject(expected)

@@ -13,7 +13,6 @@
    "state": "done",
    "task": "the complete task",
    "tokensIn": 11,
    "tokensOut": 22,
    "turns": 7,
-   "workspace": "workspace-full",
  }

- Expected  - 1
+ Received  + 0

      at <anonymous> (C:\dev\personal\orch\test\daemon-events.test.ts:111:17)
(fail) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [243.47ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [327.67ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.74ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [237.75ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.19ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.18ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.64ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.16ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > maps close and list to herdr helpers [0.28ms]
(pass) HerdrBackend > a planned target pane is honoured by re-seating the fresh pane against it [0.30ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.08ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.07ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.21ms]
(pass) HerdrBackend > workspaceNames maps tab labels by workspace, first label wins, unlabeled skipped [0.21ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > derives an entity workspace from the registry [0.35ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [12.58ms]
(pass) workspace wall writes > allows a write within the same workspace [0.42ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.25ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [1.10ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.18ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.18ms]
(pass) workspace-aware queued task selection > excludes tasks pinned to another workspace [0.18ms]
(pass) workspace-aware queued task selection > skips a malformed unscoped task in every workspace [0.06ms]
(pass) workspace-aware queued task selection > selects the earliest eligible task and respects agent constraints [0.90ms]

test\close-always.test.ts:
(pass) close always works > dead pane-less close is a successful no-op that reaps registry and presence [648.63ms]
(pass) close always works > steer remains blocked by the workspace wall [202.88ms]

test\config.test.ts:
(pass) loadConfig > requires a top-level runtime and never defaults it [20.97ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [25.87ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [16.52ms]
(pass) loadConfig > reads the declared runtime [5.28ms]
(pass) loadConfig > parses every supported settings section [11.51ms]
(pass) loadConfig > rejects a file without the current schemaVersion [8.01ms]
(pass) loadConfig > rejects invalid JSON loudly [3.91ms]
(pass) loadConfig > names the key path for invalid fields [5.07ms]
(pass) loadConfig > rejects unknown settings keys [7.14ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [4.27ms]
(pass) loadConfig > rejects old settings keys [45.28ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [46.80ms]
(pass) loadConfig > applies every settings default when sections are absent [6.65ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [41.38ms]
(pass) loadConfig > rejects a host without dest [6.87ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [5.54ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [17.39ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [3.03ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [4.21ms]
(pass) allowedModelPatterns > returns the configured patterns when set [18.40ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [6.47ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [106.70ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [21.84ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [23.50ms]
(pass) reapUnreadableSettings > leaves a readable file alone [102.42ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [25.23ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [32.86ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [26.65ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [24.59ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [3.97ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [19.63ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [32.30ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [4.36ms]
(pass) config precedence > uses the settings.json value over the fallback [5.97ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [5.31ms]
(pass) config precedence > uses an explicit flag override over the environment [0.28ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.28ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.19ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [4.66ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [4.42ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [52.67ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [13.09ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [49.28ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [16.08ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [80.40ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [59.10ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [43.00ms]

test\store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [191.92ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1249.02ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.27ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.24ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.13ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.10ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.06ms]

test\commands-runs.test.ts:
(pass) commands/runs > target filter and json preserve RunRecord rows [253.31ms]
(pass) commands/runs > running rows render as running, not zero duration [0.32ms]
(pass) commands/runs > result falls back to durable run history after presence reap [234.96ms]

test\store-spawned.test.ts:
(pass) spawned and ownership store rows > ownership table has no workspace column [234.96ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [5.47ms]

test\daemon-events.test.ts:
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [322.87ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.20ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.32ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [8.53ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.66ms]

test\store-identity.test.ts:
(pass) identity store rows > accepts session identity values and rejects malformed values [0.13ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [21.64ms]

test\queue-workspace-replay.test.ts:
(pass) queue workspace replay > a malformed null-workspace row replays but is never claimable [286.80ms]
(pass) queue workspace replay > replays separate workspace values for multiple tasks [239.01ms]
(pass) queue workspace replay > selects only tasks eligible for the requested workspace [214.07ms]

test\broker-governance.test.ts:
45 |   });
46 | 
47 |   test("a cross-workspace write is refused by the wall before ownership", () => {
48 |     const dir = freshDir();
49 |     setOwner(dir, "herdr~wB~p1", "herdr~wB~p9");
50 |     expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~p9", text: "hi" })).toThrow(/workspace wall/);
                                                                                             ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "agent is owned by herdr~wB~p9"

      at <anonymous> (C:\dev\personal\orch\test\broker-governance.test.ts:50:89)
101 |   // it, whichever agent spawned them; a spawned agent's actor token is its own
102 |   // key, never `operator`, so this lane grants an agent nothing.
103 |   test("the workspace operator writes to any same-workspace owned agent", () => {
104 |     const dir = freshDir();
105 |     setOwner(dir, "herdr~wA~p1", "herdr~wA~worker-9");
106 |     expect(() => governWrite(dir, "herdr~wA~p1", { actor: "herdr~wA~operator", text: "hi" })).not.toThrow();
                                                                                                        ^
error: expect(received).not.toThrow()

Error name: "Error"
Error message: "agent is owned by herdr~wA~worker-9"

      at <anonymous> (C:\dev\personal\orch\test\broker-governance.test.ts:106:99)
109 |   });
110 | 
111 |   test("a foreign workspace's operator still hits the wall", () => {
112 |     const dir = freshDir();
113 |     setOwner(dir, "herdr~wB~p1", "herdr~wB~worker-9");
114 |     expect(() => governWrite(dir, "herdr~wB~p1", { actor: "herdr~wA~operator", text: "hi" })).toThrow(/workspace wall/);
                                                                                                    ^
error: expect(received).toThrow(expected)

Expected pattern: /workspace wall/
Received message: "agent is owned by herdr~wB~worker-9"

      at <anonymous> (C:\dev\personal\orch\test\broker-governance.test.ts:114:95)
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [200.90ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [237.75ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [183.90ms]
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [298.02ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [162.63ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [194.62ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [152.79ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [277.19ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [174.80ms]
(fail) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [209.24ms]
(fail) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [191.04ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [26.12ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [451.16ms]

test\store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.09ms]
(pass) store row values > sets only non-null fields [0.05ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a status without a dispatch id does not write history [239.97ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.38ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > issues one session identity to sequential invocations from one session [235.25ms]

test\queue.test.ts:
(pass) queue > add then list shows a queued task [186.31ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [197.57ms]

test\peer-identity.test.ts:
(pass) spawner identity > a Claude Code session names itself through its env marker [1.08ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [2.67ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [20.62ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [323.70ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.39ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.29ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [221.97ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [1.60ms]
(pass) the spawner address invariant > a bare operator stamps no address [1.94ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [8.77ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [231.54ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [205.42ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [197.36ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [1.35ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [2173.10ms]

test\store-queue.test.ts:
(pass) queue store rows > selectTasksInStates returns only named states in created-at order [213.27ms]
(pass) queue store rows > deleteSettledTasksBefore removes only old settled rows and returns the number removed [265.06ms]
(pass) queue store rows > withTransaction commits every write on normal return [292.68ms]
(pass) queue store rows > withTransaction rolls back every write when the body throws [189.10ms]
(pass) queue store rows > selectQueueTask finds a claimed row without scanning settled rows [653.86ms]

test\store-identity.test.ts:
(pass) identity store rows > reuses an identity for the same process start and replaces it after pid recycling [199.35ms]
(pass) identity store rows > deletes identities older than the cutoff [244.74ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a throwing history write does not stop event delivery [277.76ms]
106 | /** Open (create-if-absent) the WAL store for one orch dir; connection is cached. */
107 | export function openStore(orchDir: string): DatabaseLike {
108 |   const path = databasePath(orchDir);
109 |   const cached = connections.get(path);
110 |   if (cached) return cached;
111 |   mkdirSync(orchDir, { recursive: true });
        ^
error: ENOENT: no such file or directory, mkdir
      at openStore (C:\dev\personal\orch\src\store\connection.ts:111:3)
      at selectSpawnedRecord (C:\dev\personal\orch\src\store\spawned-rows.ts:111:15)
      at placementOf (C:\dev\personal\orch\src\agent\registry.ts:12:18)
      at derivePresenceTransition (C:\dev\personal\orch\src\daemon\events.ts:117:21)
      at <anonymous> (C:\dev\personal\orch\test\daemon-events.test.ts:215:19)
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.52ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.21ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.05ms]
(fail) daemon presence events > presence transitions resolve the human name before emission [0.41ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.55ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.41ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.54ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [1.55ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.50ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [29.24ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.21ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [209.88ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.99ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [294.47ms]
(pass) daemon RPC > refuses a hello that reports no session pid [29.57ms]

test\presence-schema.test.ts:
125 |   });
126 | 
127 |   test("rejects a current-schema record carrying placement fields", () => {
128 |     writeStatus("placement-copy", { schema: PRESENCE_SCHEMA, agent: "pi", workspace: "wrong", pid: process.pid, state: "idle" });
129 | 
130 |     expect(readStatuses()["placement-copy"]).toBeUndefined();
                                                   ^
error: expect(received).toBeUndefined()

Received: {
  schema: 2,
  agent: "pi",
  workspace: "wrong",
  pid: 1528,
  state: "idle",
}

      at <anonymous> (C:\dev\personal\orch\test\presence-schema.test.ts:130:46)
(pass) presence status schema > orch status JSON exposes the agent status fields [66.80ms]
(pass) presence status schema > status and list report the same agent identity [281.38ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [77.03ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [77.75ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [57.89ms]
(fail) presence status schema > rejects a current-schema record carrying placement fields [91.22ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [91.87ms]
(pass) presence status schema > persists the complete spawned identity record [96.03ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > refuses a hello without a process start time [32.82ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [231.30ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports env as the winning source over settings.json [318.01ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [732.65ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [253.58ms]
(pass) orch settings > a load error surfaces loudly with no partial table [248.90ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.64ms]

test\cli-backends-herdr-headless.test.ts:
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [185.23ms]

test\store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [204.82ms]

test\cli-backends-herdr-headless.test.ts:
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.30ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.09ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [286.96ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [252.66ms]
(pass) broker ownership and workspace governance > work-loop selection stays within the origin workspace [244.04ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.26ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.04ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.03ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.02ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.28ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a blocked transition drives command sink delivery [317.28ms]

test\settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [35.97ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [24.61ms]

test\retention.test.ts:
Warning: retention sweep queue failed: no such table: queue
(pass) retention sweep > returns zero counts when every row is inside its window [205.32ms]
(pass) retention sweep > continues sweeping when one table delete fails [245.19ms]
(pass) retention sweep > reaps only old dead presence dirs through clean's shared path [228.21ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [221.32ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [191.73ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [77.27ms]

test\daemon-events.test.ts:
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [62.80ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > issues a new identity when a pid is recycled [282.44ms]
(pass) daemon RPC > refuses a TCP hello without a token [19.12ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [15.64ms]

test\retention.test.ts:
(pass) retention sweep > does not sweep again one minute after the first tick [286.55ms]

test\store-catalogue.test.ts:
(pass) catalogue rows > write then read round-trips at and stdout [203.86ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [186.36ms]
(pass) catalogue rows > an entry with empty stdout is not stored [248.47ms]
(pass) catalogue rows > clearCatalogues empties the store [249.99ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [184.57ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > writes the daemon token with owner-only permissions [31.55ms]
(pass) daemon RPC > returns an error for an unknown method [15.93ms]

test\settings-notify.test.ts:
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [45.41ms]
(pass) orch settings notify > remove drops only the named sink [61.78ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [39.47ms]
(pass) orch settings notify > an empty notify array lists as none configured [10.55ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > reports malformed lines and keeps the connection alive [27.26ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > only scoped tasks pass [170.22ms]

test\event-identity.test.ts:
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [389.32ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [1392.74ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [294.02ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [224.20ms]

test\store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [229.83ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > delivers pushed subscription events [231.09ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [2074.04ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [195.18ms]

test\spawn-limits.test.ts:
(pass) spawn limits > rejects invalid cap %s with file and key [15.65ms]
(pass) spawn limits > rejects invalid cap %s with file and key [5.71ms]
(pass) spawn limits > rejects invalid cap %s with file and key [11.79ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [5.22ms]
(pass) spawn limits > global boundary refusal data counts the whole request [22.91ms]
(pass) spawn limits > one workspace may use the full global allotment [4.09ms]
(pass) spawn limits > workspace cap is independent of global headroom [9.10ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [8.41ms]
(pass) spawn limits > dead pid records free capacity [12.16ms]
(pass) spawn limits > foreign panes never count [3.54ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [435.94ms]
(pass) spawn limits > doctor accepts satisfiable limits [741.90ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [227.34ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [159.87ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [223.30ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [139.17ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [76.53ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [88.75ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [61.17ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [71.72ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [55.17ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [38.38ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [28.24ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [84.08ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.53ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [3.43ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [347.85ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [378.79ms]

test\ownership.test.ts:
(pass) agent ownership > allows unowned and same-owner writes [138.02ms]
(pass) agent ownership > denies foreign writes and supports stealing [215.05ms]

test\store-spawned.test.ts:
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner in one query [560.82ms]
(pass) spawned and ownership store rows > writeSpawnedName updates an existing pane and reports missing panes [258.47ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [211.29ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [246.98ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [206.36ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [233.20ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > replays durable events after a daemon restart without a gap [448.19ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [847.90ms]
(pass) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [1707.16ms]

test\store-runs.test.ts:
(pass) run rows > upsert updates a row while preserving its original start time [247.40ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [189.97ms]
(pass) run rows > omits absent optional fields instead of returning null [173.23ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [182.02ms]
(pass) run rows > stays readable after the agent presence directory is deleted [310.11ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [206.26ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [252.35ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor unscoped queue tasks > reports a null-workspace row as reappable and names it [208.32ms]
(pass) doctor unscoped queue tasks > stays report-only ΓÇö no pre-selected destructive fix [135.38ms]
(pass) doctor unscoped queue tasks > the check is wired into runDoctor [409.78ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [2155.87ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [399.01ms]

test\doctor-checks.test.ts:
103 |   test("warns when a notifier omits done from its on list", async () => {
104 |     const directory = tempDir();
105 |     writeConfig(directory, { notify: [{ id: "command", command: [process.execPath] }] });
106 | 
107 |     const result = notifierResult(await runDoctor(directory));
108 |     expect(result).toMatchObject({
                         ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": "command: effective "on" list omits "done"; fix: add "on": ["blocked","error","done"] to that notify entry in settings.json",
+   "detail": "command: effective "on" list omits "done"; fix: orch settings notify add command --on=blocked,error,done",
+   "id": "notifiers",
+   "label": "Notifiers",
    "status": "warn",
  }

- Expected  - 1
+ Received  + 3

      at <anonymous> (C:\dev\personal\orch\test\doctor-checks.test.ts:108:20)
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [7.24ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [10.12ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [457.60ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [344.60ms]
(fail) doctor notification-sink checks > warns when a notifier omits done from its on list [1849.25ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [547.73ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [435.02ms]

test\store-events.test.ts:
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [223.69ms]
(pass) event store rows > pruned sequence numbers are never reused [244.93ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [226.94ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [200.22ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [377.43ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [387.34ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [305.82ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [218.91ms]

test\queue.test.ts:
(pass) queue > exactly one claimer wins, including parallel attempts [215.69ms]
(pass) queue > replays done, failed, and retry transitions [285.39ms]
(pass) queue > cancels queued tasks and returns an error result for claimed tasks [196.01ms]
(pass) queue > picks queued tasks FIFO, honoring the agent constraint [199.30ms]
(pass) queue > caps retries: requeue below the cap, terminal failed at it [185.73ms]
(pass) queue > settles a claimed task to done and blocks any later claim [214.13ms]
(pass) queue > exactly one of two racing claimers wins [224.44ms]
(pass) queue > rejects an unscoped task at enqueue [176.30ms]
(pass) queue > a claim stamps the dispatch id the settle path verifies against [174.90ms]
(pass) queue > a once-claimed task is only ever offered back to its own agent [157.25ms]
(pass) queue > a bound-but-requeued task can fail terminally instead of re-binding [114.65ms]
(pass) queue > a malformed null-workspace row is skipped at claim, never dispatched [127.31ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/feature')
Preparing worktree (new branch 'orch/remove-me')
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > detects commits ahead of a base branch [895.22ms]
(pass) worktree primitives > removes an agent worktree [632.70ms]
(pass) worktree primitives > rejects a non-repository path with a clear error [58.84ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [1887.12ms]

test\owner-scoping.test.ts:
271 |     // A dead pid: close must reap the record, never signal a live process here.
272 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
273 |     recordSpawned(key, { backend: "herdr", adapter: "pi", workspace: "wF", handle: key, owner: agentKey });
274 | 
275 |     const result = runCli(dir, ["close", key], "herdr~wF~operator");
276 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:276:27)
(pass) fleet ownership scoping > --force allows an explicit foreign target [434.11ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [1.92ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [351.68ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps only the caller's own spawns [426.85ms]
(pass) a spawned agent touches only what it spawned > --force from a spawned agent is refused outright [342.57ms]
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [279.89ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [5049.98ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [1381.09ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.14ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [112.86ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [7.08ms]

test\doctor.test.ts:
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [1125.42ms]
(pass) runDoctor > checks a healthy store [634.87ms]
(pass) runDoctor > warns when the store is absent [2.23ms]
(pass) runDoctor > fails when the store schema stamp is wrong [227.70ms]
(pass) runDoctor > fails and names a missing store table [215.85ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [345.89ms]
(pass) runDoctor > reports an absent daemon as optional [272.46ms]
(pass) runDoctor > reports and fixes a stale daemon lock [966.41ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [341.32ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [228.25ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [223.23ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [186.94ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [5536.26ms]

test\daemon-lifecycle.test.ts:
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         vite                 Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @shumai/shumai       Add a dependency to package.json (bun a)
  remove    browserify           Remove a dependency from package.json (bun rm)
  update    hono                 Update outdated dependencies
  audit                          Check installed packages for vulnerabilities
  dedupe                         Remove duplicate versions from the lockfile
  prune                          Remove packages that are not in the lockfile from node_modules
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
  create    svelte               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [1312.12ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [1376.59ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [318.97ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [6.23ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [298.35ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [303.31ms]
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [96.32ms]

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [1132.17ms]

test\daemon-lifecycle.test.ts:
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [322.27ms]
(pass) daemon lifecycle > rejects a recycled pid identity [1087.86ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [831.93ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [6.80ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [383.58ms]
(pass) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [1479.66ms]
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [1430.84ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [5536.06ms]

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
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [1514.57ms]
(pass) review plumbing > approve merges and removes the worktree and branch [1050.32ms]
(pass) review plumbing > conflicting approval aborts without changing either branch [820.78ms]
(pass) review plumbing > non-fast-forward approval creates a merge commit [789.16ms]

test\doctor.test.ts:
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-yEqeKU\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > warns when the live daemon code hash is stale [209.65ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [765.33ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [11.51ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [9.63ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [9.09ms]
(pass) runDoctor > reports a dead presence pid [407.95ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [124.97ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [9.11ms]
(pass) runDoctor > validates configured notifier adapters [1264.47ms]
(pass) runDoctor > reports invalid config and accepts missing config [601.84ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [258.28ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


16 tests failed:
(fail) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [243.47ms]
(fail) daemon presence events > presence transitions resolve the human name before emission [0.41ms]
(fail) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [298.02ms]
(fail) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [209.24ms]
(fail) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [191.04ms]
(fail) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [251.68ms]
(fail) presence status schema > rejects a current-schema record carrying placement fields [91.22ms]
(fail) doctor notification-sink checks > warns when a notifier omits done from its on list [1849.25ms]
(fail) worker prompt capability composition > events strip both worker header variants [1.62ms]
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [279.89ms]
(fail) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [0.97ms]
(fail) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [0.38ms]
(fail) notify sinks > delivers command sink payload as JSON [59.91ms]
(fail) notify > command sink writes the event payload as JSON on stdin [54.66ms]
(fail) notify > titles lead with exactly one terminal state and agent [0.78ms]
(fail) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [26.04ms]

 757 pass
 1 skip
 16 fail
 3981 expect() calls
Ran 774 tests across 116 files. [10.25s]
error: script "test" exited with code 1
