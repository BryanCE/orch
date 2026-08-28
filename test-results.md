bun test v1.4.0 (34cbb9a40)

test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.35ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.05ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.01ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.02ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.11ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.06ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

test\adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.75ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [2.35ms]

test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.73ms]
(pass) adapter and runtime hardening > rejects unknown config keys with a useful path [5.51ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [2.71ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [41.68ms]

test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.03ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.02ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.01ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.03ms]

test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.17ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.11ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.04ms]
(pass) PiAdapter > reads state from the presence status through store helpers [12.03ms]
(pass) PiAdapter > appends a steer message to the presence inbox [10.12ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [19.68ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [11.03ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.31ms]

test\agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [0.94ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.36ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.39ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.37ms]

test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [19.48ms]
(pass) answer via the control dispatcher > refuses answer when the adapter declares ask false, naming target and adapter [9.62ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [49.92ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [74.97ms]
(pass) answer over the daemon control socket > refuses a cross-workspace answer at the daemon wall [60.03ms]
(pass) answer over the daemon control socket > refuses a non-owner answer, naming the owning orchestrator [56.96ms]

test\backend-headless.test.ts:
(pass) HeadlessBackend > workspaceNames is empty ΓÇö headless has no name concept [0.17ms]
(pass) HeadlessBackend > refuses to spawn with no prompt ΓÇö a headless agent runs its prompt and exits [30.98ms]
(pass) HeadlessBackend > spawns a detached process and records its handle [31.06ms]
(pass) HeadlessBackend > completes a headless dispatch round-trip and leaves a readable result [63.00ms]
(pass) HeadlessBackend > records and mirrors the headless log for Codex session-tail parsing [41.09ms]
(pass) HeadlessBackend > closes only when registry and presence pid/key both match [41.71ms]
(pass) HeadlessBackend > signals a matching recorded handle through the injected killer [5.31ms]
(pass) HeadlessBackend > refuses when presence pid is missing or key does not match the recorded handle [4.36ms]
(pass) HeadlessBackend > never signals an unrecorded pid [1.09ms]

test\backend-herdr.test.ts:
(pass) HerdrBackend > starts an authority-bearing herdr agent with the adapter command [0.49ms]
(pass) HerdrBackend > starts the mapped herdr harness kind in the pane it created [0.07ms]
(pass) HerdrBackend > a caller pane is split rather than given a new tab [0.05ms]
(pass) HerdrBackend > split direction clamps to herdr's right|down [0.02ms]
(pass) HerdrBackend > env reaches the pane through herdr's --env, not an argv prefix [0.04ms]
(pass) HerdrBackend > a handed-over pane is launched into directly, never split or closed [0.02ms]
(pass) HerdrBackend > a group is created with the environment its own pane will launch under [0.07ms]
(pass) HerdrBackend > maps close and list to herdr helpers [0.14ms]
(pass) HerdrBackend > a planned target pane is split directly, never re-seated afterwards [0.05ms]
(pass) HerdrBackend > a pane split off the caller's own pane is moved into the fleet's tab [0.14ms]
(pass) HerdrBackend > a same-tab re-seat bounces through a throwaway tab so herdr executes it [0.04ms]
(pass) HerdrBackend > a refused move surfaces herdr's reason instead of claiming success [0.03ms]
(pass) HerdrBackend > groupLayout reads tab geometry straight off the pane listing [0.07ms]
(pass) HerdrBackend > workspaceNames reads each workspace's OWN label, never a tab's [0.08ms]
(pass) HerdrBackend > pane input submits through pane run [0.02ms]
(pass) HerdrBackend > waitAgentStatus uses agent wait --until, not the removed top-level wait [0.04ms]

test\backend-tmux.test.ts:
(pass) TmuxBackend > exposes tmux pane capabilities [0.12ms]
(pass) TmuxBackend > reports tmux availability [3.75ms]
(pass) TmuxBackend > workspaceNames is empty ΓÇö tmux sessions have no names distinct from ids [0.06ms]
(pass) TmuxBackend > reflects the TMUX environment [0.08ms]
(pass) TmuxBackend > rejects an empty handle without invoking tmux [0.04ms]
(pass) TmuxBackend > list() and inventory() surface only orch-spawned panes [0.50ms]
(pass) TmuxBackend > status-facing inventory displays the tmux session workspace [0.12ms]
(pass) TmuxBackend > inventory status is read from the pane's presence status.json [2.11ms]
(pass) TmuxBackend > inventory status is null when no presence status.json exists [0.15ms]
(pass) TmuxBackend > waitAgentStatus polls presence status.json until it matches or times out [254.68ms]
(pass) TmuxBackend > waitAgentStatus fails immediately when the pane has no presence key [0.32ms]
(pass) TmuxBackend > read returns captured text and throws when capture-pane fails [0.31ms]
(pass) TmuxBackend > renamePane and renameAgent write two distinct pane options [0.28ms]
(pass) TmuxBackend > spawn places the agent into an existing group via split-window when opts.group is set [0.35ms]
(pass) TmuxBackend > spawn splits the planned target pane, not whatever pane the window has active [0.06ms]
(pass) TmuxBackend > groupLayout reports every pane in a window with its cell geometry [0.22ms]
(pass) TmuxBackend > spawn opens a new window via new-window when no group is given [0.07ms]
(pass) TmuxBackend > groups() and workspaces() are scoped to windows/sessions containing an orch pane [0.31ms]
(pass) TmuxBackend > createGroup opens a window and reports its root pane, throwing on failure [0.12ms]

test\bridge-terminal.test.ts:
(pass) bridge terminal turn seam > empty and tool-only turn_end turns still publish a terminal idle state [15.38ms]
(pass) bridge terminal turn seam > a settled turn with assistant text publishes done [15.38ms]
(pass) bridge terminal turn seam > a failing end-hook reporter cannot strand the status as working [15.63ms]

test\broker-daemon-hardening.test.ts:
(pass) broker daemon hardening > dispatch/steer validation rejects null, arrays, and non-string fields [0.87ms]
(pass) broker daemon hardening > ack is idempotent when the same id is acknowledged twice [53.55ms]
(pass) broker daemon hardening > a throwing delivery is retried and does not poison later messages [52.94ms]
(pass) broker daemon hardening > concurrent drains do not redeliver one message id [54.08ms]
(pass) broker daemon hardening > replay after the newest sequence is empty without a gap [46.38ms]
(pass) broker daemon hardening > malformed request gets an error and the connection remains usable [11.21ms]

test\broker-governance.test.ts:
(pass) daemon governWrite enforcement > an unscoped actor is refused on an owned target [46.56ms]
(pass) daemon governWrite enforcement > an unscoped actor may write to an unowned target [37.02ms]
(pass) daemon governWrite enforcement > owner may write to its own agent [50.64ms]
(pass) daemon governWrite enforcement > a foreign owner in the same workspace is refused [50.82ms]
(pass) daemon governWrite enforcement > a cross-workspace write is refused by the wall before ownership [54.23ms]
(pass) daemon governWrite enforcement > --cross-workspace clears the wall but ownership still applies [54.63ms]
(pass) daemon governWrite enforcement > --steal transfers ownership to the actor [53.26ms]
(pass) daemon governWrite enforcement > ownership transfer rolls back when enqueue fails [56.58ms]
(pass) daemon governWrite enforcement > ownership transfer and enqueue commit together [51.10ms]
(pass) daemon governWrite enforcement > an unowned target is writable by any same-workspace actor [37.51ms]
(pass) daemon governWrite enforcement > the workspace operator writes to any same-workspace owned agent [59.32ms]
(pass) daemon governWrite enforcement > a foreign workspace's operator still hits the wall [55.15ms]

test\broker-ownership.test.ts:
(pass) broker ownership and workspace governance > refuses foreign-owner writes until the actor steals ownership [53.66ms]
(pass) broker ownership and workspace governance > refuses cross-workspace writes unless explicitly overridden [60.29ms]

test\broker-routing.test.ts:
(pass) broker CLI routing > status --offline reads seeded presence files without a daemon [167.56ms]

test\build-bin.test.ts:
(pass) build entrypoint > always stamps a node shebang and executable mode [12.35ms]

test\check-bridge.test.ts:
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete backend implementation import [0.07ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > flags a concrete agent adapter import [0.05ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > allows the registry / port / store / config seams [0.04ms]
(pass) 10.1 packages must not import concrete backends/adapters (checkPackageImportLine) > passes the clean tree: no line of the real web server is flagged [0.21ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > flags .steer / .answer / .setModel called from a command [0.06ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the dispatcher itself and the adapter implementations [0.01ms]
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > allows the shared harness model port outside the adapter dispatcher
(pass) 10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine) > passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts [0.17ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > flags a runtime adapter importing bridge-bundle.ts [0.06ms]
(pass) 10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine) > allows scripts and the build-tool module itself [0.01ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags === / !== against a quoted provider or backend id [0.29ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > flags ?? and || default-provider fallbacks [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > allows a benign line with none of those shapes [0.08ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > the setup smoke-test exemption is documented and load-bearing [0.03ms]
(pass) 10.4 string-form identity branches are forbidden in core (checkCoreScopeLine) > passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted [4.78ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > flags spawner key and spawnerIdentity key owner-token fallbacks [0.09ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > allows a benign line [0.01ms]
(pass) 10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine) > passes the clean tree: reply addresses never use owner-token fallbacks [0.91ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags object literals that synthesize an identity [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > flags concatenated and template identity keys [0.15ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > allows a fresh spawn mint and the issuer modules [0.03ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > the selfActor exemption is documented and load-bearing [0.02ms]
(pass) 10.5 identity construction is issuer-only (checkIdentityConstructionLine) > passes the clean tree: every identity construction is allowed or registered [1.49ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > flags a parseSession import or call [0.08ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > allows the port-based read [0.01ms]
(pass) 10.6 per-harness session parser banned from commands (checkCommandsParserLine) > passes the clean tree: no command imports parseSession [0.34ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags INSERT and UPDATE SQL that welds a lease holder into spawned_by [0.16ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > flags lease row types carrying a provenance field [0.02ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > allows separate lease and provenance rows [0.04ms]
(pass) 10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine) > passes the clean tree: no source line crosses lease and provenance columns [11.84ms]

test\claude-adapter.test.ts:
(pass) Claude adapter > declares its identity and capabilities [0.19ms]
(pass) Claude adapter > builds the interactive Claude launch command [0.07ms]
(pass) Claude adapter > pins headless print mode to the hook-driven presence path [0.08ms]
(pass) Claude adapter > detects state from a live presence status [11.51ms]
(pass) Claude adapter > extracts result.json before transcript and native output [9.97ms]
(pass) Claude adapter > reads the final assistant text from a Stop-hook transcript [2.45ms]
(pass) Claude adapter > shim and adapter extract identical text from one transcript (empty-string parts) [71.27ms]
(pass) Claude adapter > maps Claude hook events to presence states and schema [208.92ms]
(pass) Claude adapter > exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session) [42.13ms]
(pass) Claude adapter > fails hard and writes no presence on a malformed ORCH_AGENT_KEY [46.37ms]

test\claude-hooks-shim.test.ts:
(pass) claude-hooks shim > under node > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [46.22ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under node > exits 1 loudly on a present-but-malformed key [47.20ms]
(pass) claude-hooks shim > under node > writes status.json for a valid key [52.27ms]
(pass) claude-hooks shim > under bun > exits 0 silently in a non-orch session (no ORCH_AGENT_KEY) [34.13ms]
malformed identity key: expected 3 segments, got 1: "garbage"
(pass) claude-hooks shim > under bun > exits 1 loudly on a present-but-malformed key [32.97ms]
(pass) claude-hooks shim > under bun > writes status.json for a valid key [40.80ms]
(skip) claude-hooks shim tests need the dist bundle

test\clean-worktrees.test.ts:
Preparing worktree (new branch 'orch/empty')
Preparing worktree (new branch 'orch/merged')
Preparing worktree (new branch 'orch/unmerged')
(pass) clean worktrees > removes empty and merged orphan worktrees, but keeps unmerged work [1714.92ms]
Preparing worktree (new branch 'orch/discard')
(pass) clean worktrees > --force discards an unmerged orphan and its branch [756.10ms]

test\cli-backends-herdr-headless.test.ts:
(pass) backend registry selection is backend-independent > herdr, headless, and tmux are all registered [0.13ms]
(pass) backend registry selection is backend-independent > explicit headless selection resolves the headless backend [0.07ms]
(pass) backend registry selection is backend-independent > unknown explicit backend id throws with the supported list [0.08ms]
(pass) backend registry selection is backend-independent > unknown adapter is rejected with supported adapter ids [0.06ms]
(pass) backend registry selection is backend-independent > Claude fleet selection produces Claude launch commands [0.04ms]
(pass) backend registry selection is backend-independent > Claude and pi remain selectable on every registered backend [0.07ms]
(pass) backend registry selection is backend-independent > implicit selection follows the capability probe, never throwing [7.11ms]
(pass) backend registry selection is backend-independent > implicit selection falls back to headless when no herdr session exists [0.07ms]
(pass) headless common path: identity key -> presence > spawn uses the caller-minted key verbatim and creates its presence dir [52.07ms]
(pass) headless common path: identity key -> presence > spawn refuses a launch with no caller-minted key [0.41ms]
(pass) headless common path: identity key -> presence > headless rejects pane-only peek and zoom commands clearly [135.43ms]
(pass) headless common path: identity key -> presence > one adapter uses opaque keys across headless and tmux backend routes [0.12ms]
(pass) headless common path: identity key -> presence > workspaceOf reads the workspace from the structured key, not a regex [0.05ms]

test\cli-backends-tmux.test.ts:
(pass) tmux backend registry and capabilities > is registered [0.07ms]
(pass) tmux backend registry and capabilities > explicit selection follows tmux availability [5.13ms]
(pass) tmux backend registry and capabilities > exposes pane capabilities [0.05ms]
(pass) tmux backend registry and capabilities > reflects the TMUX environment [0.08ms]
(pass) tmux backend registry and capabilities > serializes tmux identities as one flat key [0.08ms]
(pass) tmux backend registry and capabilities > rejects an empty handle without invoking tmux [0.01ms]
(pass) tmux backend registry and capabilities > implicitly selects tmux inside a session [2.49ms]
(pass) tmux backend registry and capabilities > fails tmux validation outside a session before pane work [0.10ms]
(pass) tmux backend registry and capabilities > fails herdr validation outside a herdr session before pane work [0.05ms]
(pass) tmux backend registry and capabilities > refuses cross-session tmux steer without --cross-workspace [60.68ms]

test\close-always.test.ts:
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:107:7)
(fail) close always works > closes a foreign-workspace target by name, key, or pane id [63.27ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:148:7)
(fail) close always works > a successful backend close retains a pane that is still listed [311.47ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:189:7)
(fail) close always works > a failed signal retains the registry and presence and reports failure [294.39ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:216:11)
(fail) close always works > presence pid without a recorded process closes the pane without signalling and reaps [67.20ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:238:11)
(fail) close always works > close ignores owner and spawnedBy gates [52.53ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdAbort (C:\dev\personal\orch\src\commands\lifecycle.ts:559:39)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:256:11)
(fail) close always works > abort ignores owner gate [49.94ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:271:7)
(fail) close always works > duplicate close targets count once [49.07ms]
288 |       schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "done",
289 |     }));
290 | 
291 |     const result = runCli(dir, ["close", key, "--json"]);
292 | 
293 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (C:\dev\personal\orch\test\close-always.test.ts:293:27)
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [166.24ms]
(pass) close always works > steer remains blocked by the workspace wall [47.73ms]

test\cmd-lock-bridge.test.ts:
(pass) pi-bridge command-lock interception > wraps a matching locked command in acquireΓåÆrelease around the tool call [453.45ms]
(pass) pi-bridge command-lock interception > leaves a non-matching command untouched ΓÇö no acquire, no release [225.96ms]
(pass) pi-bridge command-lock interception > only bash tool calls are intercepted ΓÇö a non-bash tool never acquires [206.41ms]
(pass) pi-bridge command-lock interception > blocks a concurrent orch lock run while the bridge holds the shared lock [751.53ms]
(pass) pi-bridge command-lock interception > surfaces a present but broken settings load instead of silently disabling locks [210.70ms]

test\cmd-lock-serialize.test.ts:
(pass) command lock serialization > serializes two real CLI acquirers without overlapping their commands [1293.76ms]
(pass) command lock serialization > evicts a lock whose process instance token no longer matches [407.17ms]
(pass) command lock serialization > does not evict a lock held by a live foreign process [1547.23ms]
(pass) command lock serialization > release refuses a different process instance token [232.49ms]

test\cmd-lock.test.ts:
(pass) command lock > acquire and release round-trip [434.03ms]
(pass) command lock > second acquire blocks until first releases [1300.27ms]
(pass) command lock > dead-pid lock is reaped [447.39ms]
(pass) command lock > release with wrong pid refuses [652.56ms]
bun test held by agent-a (pid 15496)
(pass) command lock > matches locked command prefixes and probes settings [652.05ms]
(pass) command lock > run propagates the child exit code [223.27ms]

test\codex-adapter.test.ts:
(pass) CodexAdapter > uses the codex launch shapes and declares honest capabilities [0.19ms]
(pass) CodexAdapter > detects a completed notify turn and marks ambiguous output as fallback [0.12ms]
(pass) CodexAdapter > notify config editor preserves TOML, is idempotent, and refuses foreign hooks [0.25ms]
(pass) CodexAdapter > extracts layered result text from notify, output file, and assistant output [1.40ms]
(pass) CodexAdapter > reads a recorded Codex JSONL session tail and never guesses a path [1.07ms]
(pass) CodexAdapter > notify shim writes schema-current done presence and result atomically [103.65ms]

test\command-workspace-fields.test.ts:
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at <anonymous> (C:\dev\personal\orch\test\command-workspace-fields.test.ts:53:20)
(fail) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [57.73ms]
(pass) command workspace fields > skipBackends keeps the authoritative presence entity shape [48.19ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at <anonymous> (C:\dev\personal\orch\test\command-workspace-fields.test.ts:82:32)
(fail) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [56.94ms]

test\commands-clean.test.ts:
(pass) commands/clean > reaps dead agent dirs but preserves live pids [36.95ms]

test\commands-control.test.ts:
(pass) commands/control > parses dispatch flags without losing prompt words [0.12ms]
(pass) commands/control > parses --then destination and note [0.02ms]
(pass) commands/control > adds worker header unless raw [0.07ms]

test\commands-daemon.test.ts:
(pass) commands/daemon > parses governance and validates daemon status [0.11ms]
(pass) commands/daemon > reads a lock pid only from a complete lock record [2.82ms]

test\commands-events.test.ts:
(pass) commands/events > bare events is scoped to this session's agents and renders readable lines [0.09ms]
(pass) commands/events > parses filters and scope flags [0.04ms]
(pass) commands/events > parses the wake-up flags [0.01ms]
(pass) commands/events > includes an adopted agent whose open lease is mine [0.01ms]
(pass) commands/events > includes a reused pane leased by me even when another session spawned it
(pass) commands/events > does not use spawnedBy as a fallback when an agent is unleased
(pass) commands/events > excludes an agent while another orch holds its lease
(pass) commands/events > describes durable replay and reports pruned history gaps [0.03ms]
(pass) commands/events > names one agent by name or by identity key [0.02ms]
(pass) commands/events > a subscription with no daemon keeps redialing instead of exiting [0.36ms]
(pass) commands/events > rejects malformed event and labels sinks [0.06ms]

test\commands-help.test.ts:
(pass) per-command help topics > daemon help names every subcommand and the idle shutdown setting [0.02ms]
(pass) per-command help topics > aliases resolve to their command's topic [0.01ms]
(pass) per-command help topics > an unknown name has no topic
(pass) per-command help topics > every topic is printable text ending in a newline [0.04ms]

test\commands-index.test.ts:
(pass) commands/index > does not gate help or noninteractive commands [0.03ms]
(pass) commands/index > reads a package version string [0.13ms]
(pass) commands/index > announces unleased agents once per session [0.09ms]
(pass) commands/index > dispatches representative commands and reports unknown commands [2.14ms]

test\commands-lease.test.ts:
(pass) lease commands > detach releases the lease and is a no-op when already unleased [67.79ms]
(pass) lease commands > adopt takes an unleased agent and a dead holder [57.17ms]
(pass) lease commands > adopt refuses a holder with a live recorded process [459.90ms]
(pass) lease commands > reap refuses when a live descendant exists, regardless of lease [58.04ms]
(pass) lease commands > reap refuses while the recorded process is alive [464.02ms]
(pass) lease commands > reap is never lease-gated and removes the record and presence [58.12ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdAbort (C:\dev\personal\orch\src\commands\lifecycle.ts:559:39)
      at <anonymous> (C:\dev\personal\orch\test\commands-lease.test.ts:119:7)
(fail) lease commands > abort proceeds with a foreign live-holder lease [276.10ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\commands-lease.test.ts:140:5)
(fail) lease commands > close proceeds with a foreign live-holder lease [264.79ms]
{"target":"headless~workspace~reap-worker","name":"reap-worker","reaped":true}
(pass) lease commands > reap proceeds with a foreign live-holder lease [270.95ms]
(pass) lease commands > reset driving verb refuses a foreign live-holder lease [260.96ms]

test\commands-lifecycle.test.ts:
(pass) commands/lifecycle > capability helpers fail closed when absent [2.74ms]
(pass) commands/lifecycle > reports missing bridge pid without touching backend [0.12ms]

test\commands-models.test.ts:
(pass) orch models lists the whole catalogue > shows every offered model, quicklisted or not, allowed or not [0.21ms]
(pass) orch models lists the whole catalogue > marks the launch default (thinking suffix removed) and the quicklist members [0.04ms]
(pass) orch models lists the whole catalogue > keeps harness sections in configured order [0.02ms]
(pass) orch models lists the whole catalogue > a harness that enumerates nothing gets an empty section, not another's models [0.07ms]
(pass) orch models filters > --preferred narrows to the quicklist and renumbers what is shown [0.02ms]
(pass) orch models filters > --search matches spec and label case-insensitively [0.03ms]
(pass) orch models filters > filters combine, and no match is an empty result rather than the full list [0.01ms]
(pass) orch models --pick prints one spec > a numeric pick reads the displayed index of a single harness [0.06ms]
(pass) orch models --pick prints one spec > an exact spec pick resolves after filtering [0.02ms]
(pass) orch models --pick prints one spec > ambiguous, missing, zero, and out-of-range picks fail [0.16ms]
(pass) orch models --json > emits the pinned harness/model shape [0.04ms]

test\commands-panes.test.ts:
(pass) commands/panes > pane identity remains backend-neutral [0.02ms]
(pass) commands/panes > exports the pane listing command directly

test\commands-queue.test.ts:
(pass) commands/queue > cmdQueue list emits the selected JSON view [51.33ms]
(pass) commands/queue > round-trips add/list/cancel on an isolated store [54.05ms]
(pass) commands/queue > renders empty queues without throwing [0.10ms]
No queue tasks.

test\commands-results.test.ts:
(pass) commands/results > validates and extracts question payloads [0.06ms]
(pass) commands/results > formats invalid and recent timestamps [0.07ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdResult (C:\dev\personal\orch\src\commands\results.ts:105:15)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:62:11)
(fail) commands/results > routes a seeded result.json through the command module [63.13ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdResult (C:\dev\personal\orch\src\commands\results.ts:105:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:78:14)
(fail) commands/results > falls back to adapter session text when result.json is absent [60.14ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdResult (C:\dev\personal\orch\src\commands\results.ts:105:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:96:14)
(fail) commands/results > uses result.json even when the presence status has no agent [60.74ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdTail (C:\dev\personal\orch\src\commands\results.ts:354:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:120:20)
(fail) commands/results > orch tail resolves a non-pi target through that adapter's session view [58.17ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdTail (C:\dev\personal\orch\src\commands\results.ts:354:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:150:20)
(fail) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [69.71ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdTail (C:\dev\personal\orch\src\commands\results.ts:354:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:161:20)
(fail) commands/results > orch tail -n keeps last-N rendered entries for a pi session [64.29ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdSession (C:\dev\personal\orch\src\commands\results.ts:394:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:170:20)
(fail) commands/results > orch session reports the pi entry count [61.07ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdSession (C:\dev\personal\orch\src\commands\results.ts:394:15)
      at captureStdout (C:\dev\personal\orch\test\commands-results.test.ts:32:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-results.test.ts:187:20)
(fail) commands/results > orch session shows zero entries for an adapter view without them [64.50ms]

test\commands-review.test.ts:
(pass) commands/review > uses the short orch branch as review target [0.06ms]
(pass) commands/review > falls back to branch then pane [0.02ms]

test\commands-runs.test.ts:
(pass) commands/runs > lists newest first and honors -n [53.63ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveTarget (C:\dev\personal\orch\src\entities.ts:311:22)
      at cmdRuns (C:\dev\personal\orch\src\commands\runs.ts:90:42)
      at capture (C:\dev\personal\orch\test\commands-runs.test.ts:22:9)
      at <anonymous> (C:\dev\personal\orch\test\commands-runs.test.ts:61:22)
(fail) commands/runs > target filter and json preserve RunRecord rows [61.22ms]
(pass) commands/runs > running rows render as running, not zero duration [0.22ms]
(pass) commands/runs > result falls back to durable run history after presence reap [46.32ms]

test\commands-setup.test.ts:
(pass) commands/setup > reads value and assignment flags [0.21ms]
(pass) commands/setup > resolves noninteractive provider sets and defaults [0.31ms]
Selection recorded in C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-dzby7D\settings.json:
  runtime           = node
  adapters          = pi
  default adapter   = pi
  backends          = headless
  default backend   = headless
  model (pi)          = (none)  picker: none, allowed: all offered
Prerequisites:
  MISSING pi
  ok      headless
  install pi: bun add -g @earendil-works/pi-coding-agent
Presence dir:
  C:\Users\Bryan\AppData\Local\Temp\orch-setup-characterization-dzby7D\agents
Skills:
  not installed - turn it back on with: orch settings skills --install
bins:
266 | /** Point `dest` at `src`, replacing any existing entry (symlink, or a full copy under --copy). */
267 | function linkBin(src: string, dest: string, copy: boolean): void {
268 |   files.mkdirSync(path.dirname(dest), { recursive: true });
269 |   files.rmSync(dest, { recursive: true, force: true });
270 |   if (copy) files.cpSync(src, dest, { recursive: true });
271 |   else files.symlinkSync(src, dest);
                   ^
EPERM: operation not permitted, symlink 'C:\dev\personal\orch\dist\bin\orch.js' -> 'C:\Users\Bryan\.local\bin\orch'
    path: "C:\\dev\\personal\\orch\\dist\\bin\\orch.js",
    dest: "C:\\Users\\Bryan\\.local\\bin\\orch",
 syscall: "symlink",
   errno: -4048,
    code: "EPERM"

      at linkBin (C:\dev\personal\orch\src\commands\setup.ts:271:14)
      at wireBinaries (C:\dev\personal\orch\src\commands\setup.ts:478:5)
      at installSetupComposition (C:\dev\personal\orch\src\commands\setup.ts:694:3)
      at async cmdSetup (C:\dev\personal\orch\src\commands\setup.ts:751:22)
      at async <anonymous> (C:\dev\personal\orch\test\commands-setup.test.ts:44:13)
(fail) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [70.78ms]
(pass) commands/setup > resolves the runtime from the flag or the no-preference value, never from PATH [0.23ms]

test\commands-spawn.test.ts:
10 | 
11 | const tempDirs: string[] = [];
12 | const previousOrchDir = process.env.ORCH_DIR;
13 | 
14 | afterEach(() => {
15 |   while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
                               ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-spawn-required-name-kZ8VOK'
      at <anonymous> (C:\dev\personal\orch\test\commands-spawn.test.ts:15:27)
(fail) commands/spawn > refuses spawn without a name before any spawn mutations [546.65ms]
10 | 
11 | const tempDirs: string[] = [];
12 | const previousOrchDir = process.env.ORCH_DIR;
13 | 
14 | afterEach(() => {
15 |   while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
                               ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-spawn-unknown-flag-farM62'
      at <anonymous> (C:\dev\personal\orch\test\commands-spawn.test.ts:15:27)
(fail) commands/spawn > rejects --detached as an unknown spawn flag [549.28ms]
(pass) commands/spawn > preserves the existing named-spawn path [0.11ms]
(pass) commands/spawn > each pi flavor launches its own binary and preserves raw prompt [0.09ms]

test\commands-status.test.ts:
(pass) commands/status > zero-row message reports gathered counts and backend response [0.08ms]
(pass) commands/status > dead rows never display stale live state [0.02ms]
(pass) commands/status > shared row boundary normalizes stale state for every renderer [0.03ms]
(pass) commands/status > default status reads span every workspace [0.10ms]
(pass) commands/status > derives view fields from seeded presence [0.52ms]
(pass) commands/status > marks dead presence as exited [12.50ms]
(pass) commands/status > asking presence is surfaced as a question while still reporting live state [0.49ms]
(pass) commands/status > shared status row carries presence-derived fields [0.39ms]
(pass) commands/status > row carries the owning backend's declared capabilities [0.68ms]
(pass) commands/status > an agent whose backend orch cannot name reports no capabilities [0.43ms]
(pass) commands/status > row carries the spawning orchestrator, null for panes orch never recorded [0.70ms]
112 |       acquireLease(dir, "worker", "other", 4);
113 |       expect(deriveDriveState(key, "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "leased", owner: "other", mine: false });
114 |       expect(deriveDriveState("headless~local~missing", "legacy", { directory: dir, currentOrchId: "me" })).toMatchObject({ kind: "legacy", owner: "legacy" });
115 |     } finally {
116 |       closeAllStores();
117 |       rmSync(dir, { recursive: true, force: true });
            ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-status-cnxKT3'
      at <anonymous> (C:\dev\personal\orch\test\commands-status.test.ts:117:7)
(fail) commands/status > lease-backed status attribution distinguishes my lease, another lease, unleased, and legacy rows [91.97ms]
(pass) commands/status > json branch and local table branch derive identical rows apart from host [14.38ms]
(pass) commands/status > formats workspace labels and warnings [0.14ms]

test\commands-target.test.ts:
(pass) commands/target > splits known flags and preserves positional args [0.07ms]
(pass) commands/target > extracts target and joined prompt [0.08ms]
(pass) commands/target > reads only structured result text [0.02ms]
(pass) commands/target > quotes remote args and ORCH_DIR safely [0.06ms]
(pass) commands/target > lists only live serialized identity presence entries [20.70ms]

test\config-precedence.test.ts:
(pass) config precedence > returns a defaults value when no override is set [2.67ms]
(pass) config precedence > applies defaults when config, env, and flag are absent [2.01ms]
(pass) config precedence > uses env over config and flag over env [2.03ms]
(pass) config precedence > parses notify entries and hosts into expected shapes [3.00ms]
(pass) config precedence > reports a helpful validation error for invalid config [1.97ms]

test\config-watch.test.ts:
(pass) watchConfig > loads initially and applies a valid edit after the debounce [25.80ms]
(pass) watchConfig > keeps the last-good config, warns once, and recovers [401.70ms]
(pass) watchConfig > reloads on a touched reload.signal without a settings edit [25.01ms]
(pass) watchConfig > stop prevents further callbacks [413.44ms]

test\config.test.ts:
(pass) loadConfig > refuses to invent a configuration when settings.json is missing [0.96ms]
(pass) loadConfig > requires a top-level runtime and never defaults it [3.72ms]
(pass) loadConfig > rejects an unrecognized runtime naming the accepted values [8.49ms]
(pass) loadConfig > rejects a runtime misplaced under defaults [2.25ms]
(pass) loadConfig > reads the declared runtime [9.15ms]
(pass) loadConfig > parses every supported settings section [2.96ms]
(pass) loadConfig > rejects a file without the current schemaVersion [2.02ms]
(pass) loadConfig > rejects invalid JSON loudly [1.43ms]
(pass) loadConfig > names the key path for invalid fields [1.66ms]
(pass) loadConfig > rejects unknown settings keys [1.67ms]
(pass) loadConfig > parses models.allowed as a per-harness pattern map [1.92ms]
(pass) loadConfig > rejects old settings keys [7.64ms]
(pass) loadConfig > rejects legacy notify type and unknown ids [3.74ms]
(pass) loadConfig > applies every settings default when sections are absent [1.70ms]
(pass) loadConfig > preserves configured values while defaulting each missing section value [1.79ms]
(pass) loadConfig > rejects non-positive and non-integer retention windows [3.30ms]
(pass) loadConfig > rejects a host without dest [12.46ms]
(pass) loadConfig > rejects an unknown id in enabled.adapters [2.74ms]
(pass) loadConfig > rejects defaults.adapter not present in enabled.adapters [1.85ms]
(pass) loadConfig > rejects when settings.json is absent but a legacy config.toml exists [0.99ms]
(pass) allowedModelPatterns > restricts nothing when no config names patterns [0.55ms]
(pass) allowedModelPatterns > returns the configured patterns when set [1.72ms]
(pass) writeSettingsRuntime > records the runtime as a top-level scalar with no defaults or enabled entry [1.74ms]
(pass) writeSettingsRuntime > re-recording the same runtime leaves the file unchanged [3.11ms]
(pass) writeSettingsRuntime > a different runtime replaces the single value in place [2.56ms]
(pass) reapUnreadableSettings > moves an out-of-schema file aside so setup can re-record [2.94ms]
(pass) reapUnreadableSettings > leaves a readable file alone [1.84ms]
(pass) writeSettingsEnabled > round-trips both provider arrays [2.74ms]
(pass) writeSettingsDefault > creates settings.json with the schemaVersion stamp and records entries [10.93ms]
(pass) writeSettingsDefault > replaces an existing entry without disturbing other sections [2.63ms]
(pass) writeSettingsDefault > is idempotent when rewriting the same value [19.80ms]
(pass) writeSettingsDefault > refuses to write through an out-of-version settings file [1.69ms]
(pass) writeSettingsDefault > switches defaults.adapter between two enabled ids and loads clean [3.62ms]
(pass) writeSettingsFullTree > round-trips defaults without inventing max_agents [4.62ms]
(pass) config precedence > uses the fallback when env and settings.json omit a setting [2.29ms]
(pass) config precedence > uses the settings.json value over the fallback [1.93ms]
(pass) config precedence > uses the ORCH_* environment value over settings.json [1.67ms]
(pass) config precedence > uses an explicit flag override over the environment [0.06ms]
(pass) resolveSetting > uses flag, environment coercion, config, then fallback in precedence order [0.06ms]
(pass) resolveWithSource > reports the winning source at each precedence level [0.05ms]
(pass) models.preferred and models.allowed are independent > loadConfig parses a per-harness preferred quicklist [1.62ms]
(pass) models.preferred and models.allowed are independent > an absent preferred map normalizes to an empty map, not to allowed [1.50ms]
(pass) models.preferred and models.allowed are independent > writing one list leaves the other byte-for-value intact [26.18ms]
(pass) models.preferred and models.allowed are independent > an empty list is recorded as no list at all, so a cleared picker really clears [3.96ms]
(pass) models.preferred and models.allowed are independent > the full tree seeds both maps when absent and preserves both when present [5.71ms]
(pass) models.preferred and models.allowed are independent > the allowlist gate reads models.allowed only [11.65ms]

test\control-dispatch.test.ts:
(pass) deliverControl > steers pi through its presence inbox [51.57ms]
(pass) deliverControl > refuses to steer a pane awaiting an answer, naming the primitive that lands [12.13ms]
(pass) deliverControl > still answers a pane awaiting an answer [12.03ms]
(pass) deliverControl > a run dispatch is not blocked by an asking pane [51.74ms]
(pass) deliverControl > does not fall back from a keys strategy to the orch channel [48.62ms]
(pass) deliverControl > a run to a keys-strategy agent with no pane is answered, never queued on the channel [48.30ms]
(pass) deliverControl > fails unsupported steer and setModel capabilities [3.24ms]
(pass) deliverControl > requires presence for inbox delivery [47.69ms]
(pass) deliverControl > refuses inbox delivery to an agent whose bridge never registered [51.18ms]
(pass) deliverControl > refuses inbox delivery to an agent whose process is gone [47.87ms]

test\daemon-events.test.ts:
(pass) daemon presence events > an RPC subscriber receives a presence transition [73.82ms]
(pass) daemon presence events > a dispatched transition writes the full run row and preserves untruncated result [68.39ms]
(pass) daemon presence events > repeated transitions upsert one run and only terminal states set finishedAt [74.95ms]
(pass) daemon presence events > a status without a dispatch id does not write history [52.59ms]
(pass) daemon presence events > a throwing history write does not stop event delivery [71.41ms]
(pass) daemon presence events > a flapping status file cannot storm the stream with repeat transitions [0.33ms]
(pass) daemon presence events > a genuine repeat of the same transition for new work still publishes [0.05ms]
(pass) daemon presence events > a repeat transition publishes again once the suppression window passes [0.03ms]
(pass) daemon presence events > repeated observations cannot slide the suppression window forever [0.02ms]
(pass) daemon presence events > a working-to-done repeat after the dedupe window is emitted [0.03ms]
(pass) daemon presence events > presence transitions resolve the human name before emission [46.93ms]
(pass) daemon presence events > derivePresenceTransition preserves the complete asking transition payload [43.72ms]
(pass) daemon presence events > an asking transition drives command sink delivery [93.76ms]
(pass) daemon presence events > a dead daemon closes the subscription instead of falling back to files [17.65ms]
(pass) daemon presence events > a caller-initiated stop is not reported as a disconnect [64.44ms]

test\daemon-idle.test.ts:
(pass) orchd idle shutdown rule > a zero setting disables idle shutdown entirely [0.08ms]
(pass) orchd idle shutdown rule > a live agent holds the daemon open however long it has been quiet [0.01ms]
(pass) orchd idle shutdown rule > an event subscriber holds the daemon open [0.01ms]
(pass) orchd idle shutdown rule > recent activity holds the daemon open below the threshold [0.01ms]
(pass) orchd idle shutdown rule > a fully idle daemon past the threshold is due to exit [0.01ms]

test\daemon-lifecycle.test.ts:
(pass) daemon lifecycle > acquires once and refuses a second live owner [715.25ms]
(pass) daemon lifecycle > reclaims a dead lock only when its socket does not answer [490.63ms]
(pass) daemon lifecycle > reclaims an unreadable lock, which a crash truncated and no daemon owns [637.14ms]
(pass) daemon lifecycle > refuses an unreadable lock while the socket still answers [220.93ms]
(pass) daemon lifecycle > clears the lock, socket and port a departed daemon owned, keeping the log [4.71ms]
(pass) daemon lifecycle > refuses a stale lock when the socket probe cannot answer [218.89ms]
(pass) daemon lifecycle > retries if a stale lock disappears during reclaim [208.97ms]
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
  add       lyra                 Add a dependency to package.json (bun a)
  remove    left-pad             Remove a dependency from package.json (bun rm)
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
(pass) daemon lifecycle > daemonizes to an explicit orch dir and supports attached foreground mode [86.24ms]
(pass) daemon lifecycle > reexecs with the current argv and hands over the lock [204.93ms]
Bun is a fast JavaScript runtime, package manager, bundler, and test runner. (1.4.0+34cbb9a40)

Usage: bun <command> [...flags] [...args]

Commands:
  run       ./my-script.ts       Execute a file with Bun
            lint                 Run a package.json script
  test                           Run unit tests with Bun
  x         prisma               Execute a package binary (CLI), installing if needed (bunx)
  repl                           Start a REPL session with Bun
  exec                           Run a shell script directly with Bun

  install                        Install dependencies for a package.json (bun i)
  add       @shumai/shumai       Add a dependency to package.json (bun a)
  remove    moment               Remove a dependency from package.json (bun rm)
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
  create    elysia               Create a new project from a template (bun c)
  upgrade                        Upgrade to latest version of Bun.

  <command> --help               Print help text for command.

Learn more about Bun:            https://bun.com/docs
Join our Discord community:      https://bun.com/discord
(pass) daemon lifecycle > rejects a recycled pid identity [898.03ms]
(pass) daemon lifecycle > only a provable lock owner may be signalled [670.23ms]
(pass) daemon lifecycle > hash is stable and changes when entrypoint content changes [2.93ms]

test\daemon-registration.test.ts:
(pass) machine daemon registration > refuses a second start and names the live socket [836.48ms]
(pass) machine daemon registration > evicts a registration whose process instance no longer matches [625.26ms]
(pass) machine daemon registration > doctor distinguishes registered-but-dead from live-and-registered [1042.78ms]

test\daemon-rpc.test.ts:
(pass) daemon RPC > round-trips a call over the real unix socket [7.96ms]
(pass) daemon RPC > issues one session identity to sequential invocations from one session [475.04ms]
(pass) daemon RPC > hello returns live agents whose newest lease is closed or absent [521.29ms]
(pass) daemon RPC > hello returns an empty unleased list when none exist [267.65ms]
(pass) daemon RPC > a TCP hello with the daemon token gets an identity [479.10ms]
(pass) daemon RPC > refuses a hello that reports no session pid [11.27ms]
(pass) daemon RPC > refuses a hello without its environment [9.48ms]
(pass) daemon RPC > same session pid keeps its id and a different session pid gets another [677.24ms]
(pass) daemon RPC > refuses a TCP hello without a token [6.71ms]
(pass) daemon RPC > refuses a TCP hello with a wrong token [6.71ms]
(pass) daemon RPC > writes the daemon token with owner-only permissions [8.72ms]
(pass) daemon RPC > returns an error for an unknown method [6.46ms]
(pass) daemon RPC > reports malformed lines and keeps the connection alive [18.66ms]
(pass) daemon RPC > delivers pushed subscription events [59.69ms]
(pass) daemon RPC > replays durable events after a daemon restart without a gap [330.74ms]
(pass) daemon RPC > reports the oldest sequence when replay starts before the pruned window [51.53ms]
(pass) daemon RPC > removes a stale unix socket when the daemon owns the lock [628.85ms]
(pass) daemon RPC > has a catchable absent-daemon error [1.00ms]
(pass) daemon RPC > calls a slow daemon unreachable, not absent [110.21ms]
(pass) daemon RPC > calls a refused endpoint absent so a wedged daemon is still reclaimable [2.25ms]

test\daemon-status-lease.test.ts:
(pass) daemon status lease payload > reports the current holder and its liveness [467.52ms]
(pass) daemon status lease payload > distinguishes a known unleased agent from an unknown key [255.94ms]

test\doctor-backends.test.ts:
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at <anonymous> (C:\dev\personal\orch\src\backends\registry.ts:31:28)
      at map (1:11)
      at detectBackends (C:\dev\personal\orch\src\backends\registry.ts:29:87)
      at checkBackendCapabilities (C:\dev\personal\orch\src\doctor\backends.ts:131:20)
      at <anonymous> (C:\dev\personal\orch\test\doctor-backends.test.ts:31:20)
(fail) doctor backend and presence checks > reports every registered backend and boolean capability fields [6.52ms]
(pass) doctor backend and presence checks > passes with herdr active while an enabled tmux sits outside a session [0.17ms]
(pass) doctor backend and presence checks > marks the active backend and renders one backend per line [0.03ms]
(pass) doctor backend and presence checks > warns (not fails) when the available active backend is outside a live session [0.03ms]
(pass) doctor backend and presence checks > fails when any enabled backend is unavailable, active or not [0.02ms]
(pass) doctor backend and presence checks > honours the configured default over the probe order [0.02ms]
(pass) doctor backend and presence checks > reports only records missing the current schema stamp [2.88ms]

test\doctor-checks.test.ts:
(pass) doctor notification-sink checks > reports no sinks as healthy [161.36ms]
(pass) doctor notification-sink checks > rejects a webhook with a malformed URL [2.43ms]
(pass) doctor notification-sink checks > uses the notify-send prerequisite install command in desktop remediation [2.18ms]
(pass) doctor notification-sink checks > warns for a command binary missing from PATH [153.34ms]
(pass) doctor notification-sink checks > accepts a command binary present on the injected PATH [152.26ms]
103 |   test("warns when a notifier omits done from its on list", async () => {
104 |     const directory = tempDir();
105 |     writeConfig(directory, { notify: [{ id: "command", command: [process.execPath] }] });
106 | 
107 |     const result = notifierResult(await runDoctor(directory));
108 |     expect(result).toMatchObject({
                         ^
error: expect(received).toMatchObject(expected)

  {
-   "detail": "command: effective "on" list omits "done"; fix: orch settings notify add command --on=blocked,error,done",
-   "status": "warn",
+   "detail": "1 configured notifier are available",
+   "id": "notifiers",
+   "label": "Notifiers",
+   "status": "ok",
  }

- Expected  - 2
+ Received  + 4

      at <anonymous> (C:\dev\personal\orch\test\doctor-checks.test.ts:108:20)
(fail) doctor notification-sink checks > warns when a notifier omits done from its on list [576.62ms]
(pass) doctor notification-sink checks > does not warn when a notifier includes done in its on list [591.02ms]
(pass) doctor notification-sink checks > keeps unavailable notifier failures when done is omitted [616.29ms]

test\doctor-claude-hooks.test.ts:
(pass) doctor Claude hooks shim check > accepts orch hooks pointing at the current shim [15.72ms]
(pass) doctor Claude hooks shim check > accepts the node hook form when %s is the declared runtime [13.64ms]
(pass) doctor Claude hooks shim check > accepts the deno hook form when %s is the declared runtime [23.07ms]
(pass) doctor Claude hooks shim check > accepts the bun hook form when %s is the declared runtime [16.76ms]
(pass) doctor Claude hooks shim check > reports a deno hook as stale when node is declared [14.22ms]
(pass) doctor Claude hooks shim check > reports a bun hook as stale when node is declared [13.89ms]
(pass) doctor Claude hooks shim check > warns when orch hooks are missing with setup fix hint [7.59ms]
(pass) doctor Claude hooks shim check > warns on the legacy ungated bun command form [13.70ms]
(pass) doctor Claude hooks shim check > warns when hooks point at a stale shim [21.06ms]
(pass) doctor Claude hooks shim check > treats an absent settings file as not configured [0.24ms]
(pass) doctor Claude hooks shim check > handles malformed settings gracefully [1.57ms]

test\doctor-hosts.test.ts:
(pass) doctor remote host checks > accepts a reachable host with matching orch version and writable ORCH_DIR [565.01ms]
(pass) doctor remote host checks > reports unreachable hosts with a copy-paste SSH fix hint [581.45ms]
(pass) doctor remote host checks > flags a remote orch version/schema mismatch in detail [570.72ms]
(pass) doctor remote host checks > reports no remote hosts configured as healthy [554.15ms]

test\doctor-orphan-daemons.test.ts:
(pass) doctor orphaned-daemon check > a live foreign lock is reported, and an unproven owner is never killable [531.60ms]
(pass) doctor orphaned-daemon check > a dead pid's lock is not an orphan [515.59ms]
(pass) doctor orphaned-daemon check > the caller's own orch dir is never reported against itself [518.24ms]

test\doctor-runtime.test.ts:
(pass) shebangRuntime > reads #!/usr/bin/env node as node [12.80ms]
(pass) shebangRuntime > reads #!/usr/bin/env bun as bun [2.29ms]
(pass) shebangRuntime > reads #!/usr/bin/env deno as deno [1.64ms]
(pass) shebangRuntime > reads #!/usr/local/bin/node as node [1.29ms]
(pass) shebangRuntime > does not mistake a longer binary name for a runtime [1.18ms]
(pass) shebangRuntime > returns null for a file with no shebang [1.16ms]
(pass) shebangRuntime > returns null for an unreadable path [0.40ms]
(pass) runningRuntime > reports the runtime this suite is executing under [0.03ms]
(pass) doctor runtime verdict table > declared == actual (node) is ok, no runtime privileged [1.38ms]
(pass) doctor runtime verdict table > declared == actual (deno) is ok, no runtime privileged [1.24ms]
(pass) doctor runtime verdict table > declared == actual (bun) is ok, no runtime privileged [1.19ms]
(pass) doctor runtime verdict table > launching under bun while declaring node is fine [1.27ms]
(pass) doctor runtime verdict table > launching under node while declaring bun is fine [1.21ms]
(pass) doctor runtime verdict table > entrypoint shebang mismatch fails even when the running runtime matches [1.36ms]
(pass) doctor runtime verdict table > declared runtime absent from PATH fails [1.34ms]
(pass) doctor runtime verdict table > an unresolvable orch entrypoint is not itself a failure [1.21ms]
(pass) doctor runtime verdict table > remediation names both directions ΓÇö rebuild, or re-record the declaration [1.21ms]
(pass) doctor runtime verdict table > skips rather than throwing when settings cannot be read [0.39ms]

test\doctor-stale-presence.test.ts:
(pass) doctor stale presence safety > describes a dead agent by name and project, not a bare key [586.62ms]
(pass) doctor stale presence safety > the removal fix is marked destructive so UIs never pre-select it [568.01ms]
(pass) doctor stale presence safety > no dead agents leaves nothing to remove [584.28ms]

test\doctor-unscoped-tasks.test.ts:
(pass) doctor task scopes > a facade-enqueued task has exactly one typed scope [56.07ms]
(pass) doctor task scopes > the database rejects an unscoped task instead of keeping a legacy queue row [48.49ms]
(pass) doctor task scopes > doctor lists unrunnable tasks and deliberate resolutions without deleting [52.58ms]

test\doctor.test.ts:
(pass) runDoctor > detects DrvFs paths by mount path segment [0.10ms]
(pass) runDoctor > runs on an unconfigured install without failing for want of settings.json [566.54ms]
(pass) runDoctor > checks a healthy store [632.86ms]
(pass) runDoctor > warns when the store is absent [0.55ms]
(pass) runDoctor > fails when the store predates orch's migrations [47.31ms]
(pass) runDoctor > fails and names a missing store table [55.20ms]
(pass) runDoctor > reports a normal ORCH_DIR on the Linux filesystem [625.45ms]
(pass) runDoctor > reports an absent daemon as optional [575.48ms]
(pass) runDoctor > reports and fixes a stale daemon lock [583.39ms]
(pass) runDoctor > accepts a live daemon and an answerable socket [1169.50ms]
(pass) runDoctor > warns when the live daemon code hash is stale [551.61ms]
(pass) runDoctor > fails on an invalid lock and an unanswerable live socket [1131.49ms]
(pass) runDoctor > warns when the extension bundle is absent for a matching live hash [8.43ms]
(pass) runDoctor > warns when the extension bundle is absent for a stale live hash [9.26ms]
(pass) runDoctor > warns when the extension bundle is absent for a live status without a hash [10.12ms]
(pass) runDoctor > reports a dead presence pid [563.04ms]
(pass) runDoctor > bins check is driven by the enabled set and offers no fix [147.81ms]
(pass) runDoctor > applyFixes reports exactly the changes it applies [2.14ms]
(pass) runDoctor > validates configured notifier adapters [1697.66ms]
notify: could not load settings.json: C:\Users\Bryan\AppData\Local\Temp\orch-doctor-RBOcQg\settings.json: this settings file has invalid values: Γ£û Invalid input: expected number, received string ΓåÆ at queue.max_retries Fix those keys by hand, or re-record the file with: orch setup
(pass) runDoctor > reports invalid config and accepts missing config [1106.67ms]
(pass) runDoctor > never throws when individual checks encounter broken inputs [1145.19ms]

test\event-identity.test.ts:
(pass) published event identity > stamps a per-agent ordinal so a redelivery is recognizable [0.14ms]
(pass) the work loop is not a second presence-transition source > an agent state change publishes nothing from the queue loop [173.42ms]

test\herdr-notify-hardening.test.ts:
(pass) herdr and notification hardening > uses a non-empty agent name and preserves shell command as one argv value [0.45ms]
(pass) herdr and notification hardening > falls back to a real name when an adapter id is blank [0.07ms]
(pass) herdr and notification hardening > nameless notifications use a workspace label, never a bare pane key [0.15ms]

test\herdr-pane-state.test.ts:
(pass) retryableErrorMessage classifier > no assistant message ΓåÆ undefined [0.07ms]
(pass) retryableErrorMessage classifier > assistant that did not stop on error ΓåÆ undefined [0.02ms]
(pass) retryableErrorMessage classifier > error stop with non-retryable text ΓåÆ undefined [0.14ms]
(pass) retryableErrorMessage classifier > error stop with retryable text ΓåÆ the message [0.02ms]
(pass) retryableErrorMessage classifier > non-string retryable errorMessage is stringified before matching [0.01ms]
(pass) retryableErrorMessage classifier > only the last assistant turn is classified
(pass) createPaneStateMachine state ordering > run ΓåÆ blocked ΓåÆ unblock ΓåÆ idle debounce [6.01ms]
(pass) createPaneStateMachine state ordering > dedupes unchanged state [0.04ms]
(pass) createPaneStateMachine state ordering > retryable end holds working, then settles to blocked after grace [54.73ms]
(pass) createPaneStateMachine state ordering > duplicate end after settling does not publish a false idle [11.02ms]
(pass) createPaneStateMachine state ordering > openSession forces a publish even when state is unchanged [0.22ms]

test\identity.test.ts:
(pass) serializeIdentity / parseIdentity round-trip > round-trips herdr [0.04ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with % handle [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > round-trips tmux with : and % handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips headless pid handle
(pass) serializeIdentity / parseIdentity round-trip > round-trips empty workspace
(pass) serializeIdentity / parseIdentity round-trip > round-trips separator inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips slash inside parts
(pass) serializeIdentity / parseIdentity round-trip > round-trips percent-code-lookalike
(pass) serializeIdentity / parseIdentity round-trip > serialized key is a single flat segment (no nested path) [0.02ms]
(pass) serializeIdentity / parseIdentity round-trip > backend namespaces prevent collisions across equal workspace/handle [0.04ms]
(pass) malformed input > rejects wrong segment count [0.11ms]
(pass) malformed input > rejects empty key [0.02ms]
(pass) malformed input > rejects empty backend or id on serialize [0.03ms]
(pass) malformed input > tryParseIdentity returns null for malformed and non-string input [0.01ms]
(pass) malformed input > tryParseIdentity parses a valid key [0.01ms]

test\launch-model-gate.test.ts:
(pass) the model gate rules by harness membership, not by format > accepts a listed spec, with or without a thinking suffix [0.05ms]
(pass) the model gate rules by harness membership, not by format > refuses a ladder shorthand and names what the harness does offer [0.10ms]
(pass) the model gate rules by harness membership, not by format > accepts each harness's own vocabulary rather than one shared grammar [0.04ms]
(pass) the model gate rules by harness membership, not by format > cannot check a harness that publishes no catalogue, and does not pretend to
(pass) the settings allowlist applies on top of harness membership > an empty allowlist restricts nothing beyond the harness list [10.43ms]
(pass) the settings allowlist applies on top of harness membership > a configured allowlist refuses a listed model outside its patterns [2.06ms]
(pass) the settings allowlist applies on top of harness membership > harness membership is checked before the allowlist, so the message names the harness [0.71ms]

test\lifecycle-targets.test.ts:
(pass) lifecycle target resolution > matches a stale bare pane row by its handle without parsing pane as an identity [0.04ms]

test\notifier-adapters.test.ts:
(pass) notifier registry and built-in adapters > skips an unavailable adapter without affecting available adapters [0.24ms]
notify: webhook notifier has invalid configuration
(pass) notifier registry and built-in adapters > reports malformed required configuration instead of throwing [0.10ms]
(pass) notifier registry and built-in adapters > webhook POST contains the canonical payload [0.27ms]
(pass) notifier registry and built-in adapters > command adapter passes canonical JSON on stdin [22.40ms]
(pass) notifier registry and built-in adapters > desktop fallback selects notify-send, then WSL notify when it fails [3.50ms]
notify: bad sink failed
(pass) notifier registry and built-in adapters > isolates delivery failures and still delivers to other adapters [0.28ms]

test\notify-events-format.test.ts:
(pass) notification and presence event formatting > workspaceColor is stable and returns a palette hex [0.08ms]
(pass) notification and presence event formatting > nameless events use an identity-derived agent label [0.09ms]
(pass) notification and presence event formatting > named events prefer the human name over the harness id [0.02ms]
(pass) notification and presence event formatting > notificationText pins the canonical done, error, and blocked golden vectors [0.07ms]
(pass) notification and presence event formatting > webhook payload includes workspace and workspaceColor [0.25ms]
(pass) notification and presence event formatting > presence eventTask strips worker preamble, truncates plain tasks, and formats questions [37.64ms]
(pass) notification and presence event formatting > derivePresenceTransition leaves workspace to the registry [45.78ms]

test\notify-sinks.test.ts:
(pass) notify sinks > delivers command sink payload as JSON [24.51ms]
(pass) notify sinks > loadSinks parses command and webhook declarations [1.81ms]

test\notify.test.ts:
(pass) notify > parses valid sinks and applies default on states [11.80ms]
(pass) notify > delivers only to sinks whose on filter matches the event [28.88ms]
(pass) notify > command sink writes the event payload as JSON on stdin [30.26ms]
(pass) notify > titles lead with exactly one terminal state and agent [0.23ms]
(pass) notify > webhook failure is non-fatal and reports a warning [26.91ms]

test\orch-bugs-4-5.test.ts:
(pass) orch bugs 4 and 5 launch contracts > interactive launch routes use one argv composition [0.34ms]
(pass) orch bugs 4 and 5 launch contracts > headless launch routes use one argv composition [0.07ms]
(pass) orch bugs 4 and 5 launch contracts > inherited extension policy emits every discovered extension [0.07ms]

test\orchd-rpc-reconnect.test.ts:
(pass) subscribeEvents reconnect > resubscribes and receives events after the daemon restarts [349.03ms]
(pass) subscribeEvents reconnect > close stops the retry loop so a returning daemon delivers nothing [1084.14ms]

test\orchd-rpc-replay.test.ts:
(pass) orchd RPC replay buffer > assigns monotonic sequence numbers and replays after a sequence [49.91ms]
(pass) orchd RPC replay buffer > replays from inside the surviving range without a gap [57.22ms]
(pass) orchd RPC replay buffer > reports a gap when the requested sequence predates retained history [51.78ms]
(pass) orchd RPC replay buffer > empty history has no gap or oldest sequence [33.99ms]
(pass) orchd RPC replay buffer > limits replay size without pruning durable events [2135.38ms]

test\orchd-rpc-subscribe.test.ts:
(pass) orchd event subscription > replays only events missed between subscriptions [89.68ms]

test\orchd-rpc-transport.test.ts:
(pass) orchd RPC transports > round-trips over the default unix transport [6.63ms]
(pass) orchd RPC transports > round-trips over the TCP fallback transport [17.29ms]

test\outbox-ack.test.ts:
(pass) outbox ack fallback > consumes a fake agent ack from ack.jsonl on the next drain [61.18ms]
(pass) outbox ack fallback > keeps an unacknowledged delivery pending for retry [58.06ms]

test\outbox-replay.test.ts:
(pass) outbox restart replay > replays failed messages after restart without duplicates [61.74ms]

test\outbox.test.ts:
(pass) outbox delivery > selects pending messages and delivers each message once [52.78ms]
(pass) outbox delivery > checks one message's pending state without scanning the outbox [55.29ms]
(pass) outbox delivery > keeps failed messages pending until their backoff expires [55.31ms]

test\owner-scoping.test.ts:
(pass) fleet ownership scoping > owner token uses ORCH_OWNER, else the write actor (selfActor) [12.34ms]
(pass) fleet ownership scoping > spawn stamps the owner token from ORCH_OWNER on its record [69.90ms]
(pass) fleet ownership scoping > close --all works without an owner token [187.50ms]
{"closed":["foreign","mine"],"requested":2,"ok":2,"stream":false}
152 |       if (originalInventory) backend.inventory = originalInventory;
153 |       else delete backend.inventory;
154 |       backend.close = originalClose;
155 |     }
156 | 
157 |     expect(closed).toEqual(["mine", "foreign"]);
                         ^
error: expect(received).toEqual(expected)

  [
-   "mine",
    "foreign",
+   "mine",
  ]

- Expected  - 1
+ Received  + 1

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:157:20)
(fail) fleet ownership scoping > close --all closes all managed records regardless of owner [69.08ms]
170 |     recordProcess(dir, key, pid, startToken);
171 |     insertSpawnedRecord(dir, { pane: key, backend: "headless", adapter: "pi", handle: JSON.stringify({ pid, key }) });
172 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: JSON.stringify({ pid, key }), owner: "other-orchestrator" });
173 | 
174 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
175 |     expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
                                                                   ^
error: expect(received).toMatchObject(expected)

  {
-   "status": 0,
+   "output": 
+ "
+ 113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
+ 114 |     const value = parseHerdrOutput(output);
+ 115 |     listCache.set(cacheKey, { at: Date.now(), value });
+ 116 |     return value;
+ 117 |   } catch (error: unknown) {
+ 118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
+                     ^
+ error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
+       at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:15)
+       at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
+       at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
+       at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
+       at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
+       at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
+       at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
+       at runCommand (C:\dev\personal\orch\src\commands\index.ts:358:10)
+       at C:\dev\personal\orch\bin\orch.ts:14:1
+ 
+ Bun v1.4.0 (Windows x64)
+ "
+ ,
+   "status": 1,
  }

- Expected  - 1
+ Received  + 24

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:175:62)
(fail) fleet ownership scoping > explicit foreign target closes successfully [471.38ms]
193 |         schema: PRESENCE_SCHEMA, key, pid: process.pid, startToken: processStartToken(process.pid), agent: "pi", state: "working",
194 |       }));
195 |       recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
196 |       const result = runCli(dir, [verb, key, ...(arg ? [arg] : [])], "caller-orchestrator");
197 |       expect(result.status).not.toBe(0);
198 |       expect(result.output).toContain("other-orchestrator");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\nherdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: \"herdr\"\n"

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:198:29)
(fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [419.87ms]
211 |     writeFileSync(join(dir, "agents", key, "result.json"), JSON.stringify({ text: "other session's answer" }));
212 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "local", handle: key, owner: "other-orchestrator" });
213 | 
214 |     const refused = runCli(dir, ["result", key], "caller-orchestrator");
215 |     expect(refused.status).not.toBe(0);
216 |     expect(refused.output).toContain("other-orchestrator");
                                 ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\n113 |     const output = executeHerdr(\"herdr\", args, { timeout: 3000, encoding: \"utf8\", stdio: [\"ignore\", \"pipe\", \"pipe\"] });\n114 |     const value = parseHerdrOutput(output);\n115 |     listCache.set(cacheKey, { at: Date.now(), value });\n116 |     return value;\n117 |   } catch (error: unknown) {\n118 |     throw new Error(`herdr ${args.join(\" \")} failed: ${errorDetail(error)}`);\n                    ^\nerror: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: \"herdr\"\n      at herdr (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:118:15)\n      at herdrPanes (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:170:18)\n      at herdrReachable (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:165:3)\n      at entitiesFromBackend (C:\\dev\\personal\\orch\\src\\entities.ts:167:66)\n      at buildEntities (C:\\dev\\personal\\orch\\src\\entities.ts:245:21)\n      at resolveTarget (C:\\dev\\personal\\orch\\src\\entities.ts:311:22)\n      at cmdResult (C:\\dev\\personal\\orch\\src\\commands\\results.ts:105:15)\n      at runCommand (C:\\dev\\personal\\orch\\src\\commands\\index.ts:358:10)\n      at C:\\dev\\personal\\orch\\bin\\orch.ts:14:1\n\nBun v1.4.0 (Windows x64)\n"

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:216:28)
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [167.84ms]
235 |       ["move", key, "--new-tab"],
236 |     ];
237 |     for (const args of mutations) {
238 |       const result = runCli(dir, args, "caller-orchestrator");
239 |       expect(result.status).not.toBe(0);
240 |       expect(result.output).toContain("other-orchestrator");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "other-orchestrator"
Received: "\n113 |     const output = executeHerdr(\"herdr\", args, { timeout: 3000, encoding: \"utf8\", stdio: [\"ignore\", \"pipe\", \"pipe\"] });\n114 |     const value = parseHerdrOutput(output);\n115 |     listCache.set(cacheKey, { at: Date.now(), value });\n116 |     return value;\n117 |   } catch (error: unknown) {\n118 |     throw new Error(`herdr ${args.join(\" \")} failed: ${errorDetail(error)}`);\n                    ^\nerror: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: \"herdr\"\n      at herdr (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:118:15)\n      at herdrPanes (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:170:18)\n      at herdrReachable (C:\\dev\\personal\\orch\\src\\backends\\herdr\\cli.ts:165:3)\n      at entitiesFromBackend (C:\\dev\\personal\\orch\\src\\entities.ts:167:66)\n      at buildEntities (C:\\dev\\personal\\orch\\src\\entities.ts:245:21)\n      at resolveTarget (C:\\dev\\personal\\orch\\src\\entities.ts:311:22)\n      at backendTarget (C:\\dev\\personal\\orch\\src\\commands\\target.ts:161:15)\n      at cmdRename (C:\\dev\\personal\\orch\\src\\commands\\lifecycle.ts:375:36)\n      at runCommand (C:\\dev\\personal\\orch\\src\\commands\\index.ts:358:10)\n      at C:\\dev\\personal\\orch\\bin\\orch.ts:14:1\n\nBun v1.4.0 (Windows x64)\n"

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:240:29)
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [159.17ms]
258 |     expect(refused.status).not.toBe(0);
259 |     expect(refused.output).toContain("usage: orch close");
260 |     expect(spawnedRecords().has(key)).toBe(true);
261 | 
262 |     const result = runCli(dir, ["close", key], "caller-orchestrator");
263 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:263:27)
(fail) fleet ownership scoping > close has no force option and remains unconditional without it [500.51ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
      at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:285:7)
(fail) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [74.38ms]
(pass) a spawned agent touches only what it spawned > selfActor is the agent's own key inside a spawned agent [0.19ms]
(pass) a spawned agent touches only what it spawned > --cross-workspace from a spawned agent is refused [138.80ms]
(pass) a spawned agent touches only what it spawned > close --all sweeps every managed spawn [165.84ms]
339 |     mkdirSync(join(dir, "agents", key), { recursive: true });
340 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
341 |     recordSpawned(key, { backend: "headless", adapter: "pi", workspace: "wF", handle: key, owner: "herdr~wF~operator" });
342 | 
343 |     const result = runCli(dir, ["close", key], undefined, { ORCH_AGENT_KEY: agentKey });
344 |     expect(result.status).toBe(0);
                                ^
error: expect(received).toBe(expected)

Expected: 0
Received: 1

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:344:27)
(fail) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [168.25ms]
353 |     writeFileSync(join(dir, "agents", key, "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, key, pid: 99999999, agent: "pi", state: "working" }));
354 |     recordSpawned(key, { backend: "herdr", adapter: "pi", workspace: "wF", handle: key, owner: agentKey });
355 | 
356 |     const result = runCli(dir, ["close", key], "herdr~wF~operator");
357 |     // Assert on the pair so a non-zero exit prints what orch actually said.
358 |     expect({ status: result.status, output: result.output }).toMatchObject({ status: 0 });
                                                                   ^
error: expect(received).toMatchObject(expected)

  {
-   "status": 0,
+   "output": 
+ "
+ 113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
+ 114 |     const value = parseHerdrOutput(output);
+ 115 |     listCache.set(cacheKey, { at: Date.now(), value });
+ 116 |     return value;
+ 117 |   } catch (error: unknown) {
+ 118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
+                     ^
+ error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
+       at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:15)
+       at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
+       at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
+       at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
+       at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
+       at resolveLifecycleTarget (C:\dev\personal\orch\src\commands\target.ts:195:20)
+       at cmdClose (C:\dev\personal\orch\src\commands\lifecycle.ts:457:22)
+       at runCommand (C:\dev\personal\orch\src\commands\index.ts:358:10)
+       at C:\dev\personal\orch\bin\orch.ts:14:1
+ 
+ Bun v1.4.0 (Windows x64)
+ "
+ ,
+   "status": 1,
  }

- Expected  - 1
+ Received  + 24

      at <anonymous> (C:\dev\personal\orch\test\owner-scoping.test.ts:358:62)
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [160.90ms]

test\ownership.test.ts:
(pass) agent ownership > round-trips an owner [43.26ms]
(pass) agent ownership > allows unowned and same-owner writes [47.11ms]
(pass) agent ownership > denies foreign writes and supports stealing [49.57ms]

test\parse-target.test.ts:
(pass) <host>/<target> grammar > keeps targets without a host unchanged [0.03ms]
(pass) <host>/<target> grammar > parses configured host prefixes [0.03ms]
(pass) <host>/<target> grammar > rejects unknown hosts and lists configured hosts [0.07ms]
(pass) <host>/<target> grammar > rejects empty hosts and targets [0.03ms]
(pass) <host>/<target> grammar > formats local and host-prefixed targets [0.04ms]

test\peer-identity.test.ts:
(pass) spawner identity > a bare operator with no session markers is just the operator [0.94ms]
(pass) spawner identity > a Claude Code session names itself through its env marker [0.51ms]
(pass) spawner identity > a Claude Code session has NO reply address; its session id only names it apart [0.49ms]
(pass) spawner identity > a harness session with presence hands out its own reply address [7.54ms]
(pass) spawner identity > an orch-spawned orchestrator is named by its own agent name and harness [56.30ms]
(pass) spawner identity > agentIdentityEnv stamps a reply address only when the spawner has one [0.30ms]
(pass) spawner identity > worktreeEnv stamps worktree identity only for isolated agents [0.09ms]
(pass) spawner identity > the registry keeps the exact spawning session distinct from the workspace owner [47.90ms]
(pass) the spawner address invariant > a Claude Code session stamps no address, so no worker is handed an unreachable one [0.87ms]
(pass) the spawner address invariant > a bare operator stamps no address [0.54ms]
(pass) the spawner address invariant > an address that IS stamped resolves to a live inbox [2.62ms]
(pass) peer identity in messaging > orch_send reports the peer's NAME, and stamps the sender's name on the message [53.82ms]
(pass) peer identity in messaging > peers resolve by display name exactly like by key [45.40ms]
(pass) peer identity in messaging > "spawner" reaches the stamped spawner session across fleet scoping [42.43ms]
(pass) peer identity in messaging > a spawner with no inbox is refused BY NAME, not with a bare key [0.92ms]

test\peer-project-scope.test.ts:
(pass) peer discovery walls on the project > a same-workspace peer from another project is invisible by default [50.62ms]
(pass) peer discovery walls on the project > all_workspaces deliberately lifts the project wall [39.17ms]
(pass) peer discovery walls on the project > a cross-project target does not resolve for sends without the explicit flag [35.90ms]
(pass) peer discovery walls on the project > a record with no project stamp is malformed and never listed [42.22ms]
(pass) peer discovery walls on the project > a spawned agent's all_workspaces flag is ignored [42.55ms]

test\pi-model-control.test.ts:
(pass) splitThinkingSuffix > splits a valid ladder effort off the bare id [0.19ms]
(pass) splitThinkingSuffix > leaves a bare model untouched [0.01ms]
(pass) splitThinkingSuffix > keeps a trailing colon token that is not a thinking level as part of the id
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > looks up the BARE id and returns the effort suffix separately [0.25ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > retries until a still-booting registry answers [4.13ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > throws when the registry never yields the model [1.70ms]
(pass) resolveRegistryModel ΓÇö task 12.7 suffixed lookup > rejects a token without a provider/id shape [0.07ms]
(pass) createModelControl.applyControlCommand > applies a suffixed model command and records a success outcome [10.03ms]
(pass) createModelControl.applyControlCommand > records a failure outcome when the model is rejected [2020.60ms]
(pass) createModelControl.applyControlCommand > applies a thinking command directly [9.85ms]

test\pid-liveness.test.ts:
(pass) pidAlive liveness contract (shared by pi peers) > EPERM means the process exists under another user ΓÇö alive [0.11ms]
(pass) pidAlive liveness contract (shared by pi peers) > ESRCH means no such process ΓÇö dead [0.01ms]
(pass) pidAlive liveness contract (shared by pi peers) > the current process is alive [0.02ms]
(pass) pidAlive liveness contract (shared by pi peers) > non-positive and non-numeric pids are rejected without signalling [0.03ms]

test\plexer-versions.test.ts:
(pass) plexer version support > pins herdr to the tested range, including both exclusive boundaries [0.38ms]
(pass) plexer version support > compares numeric versions rather than lexical strings [0.02ms]
(pass) plexer version support > rotates one open host install row when the plexer changes version [56.44ms]
(pass) plexer version support > doctor names both versions and tells the operator to update orch [0.46ms]
(pass) plexer version support > a supported plexer the user never installed is not a complaint [0.06ms]
(pass) plexer version support > an in-range install reports ok with the version it read [0.04ms]
(pass) plexer version support > only an installed plexer that cannot report a version warns [0.03ms]

test\port-seam-boundary.test.ts:
(pass) port seam command boundary > headless target is answered without invoking its pane role [0.10ms]
(pass) port seam command boundary > paned environment without a role is answered at the boundary [0.02ms]
(pass) port seam command boundary > an invocation preserves the provider failure [0.06ms]

test\port-seam-channel.test.ts:
19 | 
20 | afterEach(() => {
21 |   // Windows keeps the store file locked while a connection is open, so the temp
22 |   // dir is only removable once every cached connection has been closed.
23 |   closeAllStores();
24 |   for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
                                            ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-port-seam-6YbMQn'
      at <anonymous> (C:\dev\personal\orch\test\port-seam-channel.test.ts:24:40)
(fail) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [72.51ms]
(pass) orch channel and capture roles > capture reads status and result from the orch presence record [9.99ms]

test\port-seam-errors.test.ts:
(pass) port seam error contract > provider mutation errors preserve argv, exit status, stderr, and stdout [0.19ms]
(pass) port seam error contract > provider query errors throw instead of returning a sentinel [0.07ms]

test\presence-schema.test.ts:
(pass) presence status schema > reads a spawned identity without placement fields in status [52.81ms]
(pass) presence status schema > orch status JSON exposes the agent status fields [50.81ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at <anonymous> (C:\dev\personal\orch\test\presence-schema.test.ts:87:20)
(fail) presence status schema > status and list report the same agent identity [90.72ms]
(pass) presence status schema > mixed pi and Claude status rows carry the same status field set [51.79ms]
(pass) presence status schema > rejects a status record that carries no schema stamp [51.61ms]
(pass) presence status schema > rejects a status record stamped with a non-current schema [53.66ms]
(pass) presence status schema > rejects a current-schema record carrying placement fields [52.20ms]
(pass) presence status schema > a malformed record is skipped without hiding the valid records beside it [49.88ms]
(pass) presence status schema > persists the complete spawned identity record [30.65ms]

test\queue-workspace-replay.test.ts:
(pass) queue replay keeps typed scope > stored scope offers pack work only to that pack [61.27ms]

test\queue.test.ts:
(pass) queue facade on tasks and attempts > enqueue selects exactly one typed scope and defaults to the enqueuer pack [70.92ms]
(pass) queue facade on tasks and attempts > agent scope requires the enqueuer to lease the target [68.82ms]
(pass) queue facade on tasks and attempts > claiming excludes another pack and space claims require open intake [69.86ms]
(pass) queue facade on tasks and attempts > a failed pack attempt retries on another member, never outside the pack [81.11ms]
(pass) queue facade on tasks and attempts > a claim is an insert and a lost race returns false [67.87ms]
(pass) queue facade on tasks and attempts > cancel rights are enqueuer, targeted agent's leasing orch, or human [79.09ms]
(pass) queue facade on tasks and attempts > state and attempt-derived values have no legacy flattened fields [62.43ms]

test\recipient-label.test.ts:
(pass) agent identity shown to an operator > names the agent and its harness, never the transport key [2.48ms]
(pass) agent identity shown to an operator > drops the routing prefix when nothing is known about it [0.10ms]
(pass) agent identity shown to an operator > a nameless agent gets a stable logical name, not its key [0.04ms]

test\reload-no-bundle-write.test.ts:
44 |     process.env.ORCH_OWNER = "test-owner";
45 | 
46 |     try {
47 |       await cmdReload(["--all", "--json"]);
48 |     } finally {
49 |       rmSync(tempOrchDir, { recursive: true, force: true });
           ^
EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-reload-qhyYeu'
    path: "C:\\Users\\Bryan\\AppData\\Local\\Temp\\orch-reload-qhyYeu",
 syscall: "rm",
   errno: -4082,
    code: "EBUSY"

      at <anonymous> (C:\dev\personal\orch\test\reload-no-bundle-write.test.ts:49:7)
(fail) reload > does not write installed extension bundles [42.39ms]

test\remote-fanout.test.ts:
(pass) async remote fan-out > parses valid JSON from a host [72.13ms]
(pass) async remote fan-out > returns a typed dead-host failure [67.61ms]
(pass) async remote fan-out > returns a typed timeout failure [512.80ms]
(pass) async remote fan-out > returns a typed non-JSON failure [72.75ms]
(pass) async remote fan-out > fans out and keeps per-host failures without throwing [530.01ms]

test\remote.test.ts:
(pass) host-prefixed targets > round-trips local and host-prefixed grammar [0.08ms]
(pass) host-prefixed targets > reports unknown host and configured names [0.04ms]

test\retention.test.ts:
(pass) retention sweep > retention windows are independently configurable [58.80ms]
(pass) retention sweep > uses each table's own window and keeps queued and claimed tasks [112.08ms]
(pass) retention sweep > returns zero counts when every row is inside its window [61.97ms]
Warning: retention sweep queue failed: no such table: tasks
(pass) retention sweep > continues sweeping when one table delete fails [53.95ms]
(pass) retention sweep > reaps expired agents with no presence dir and releases registry/name reservation [66.89ms]
(pass) retention sweep > reaps dead dirs by recorded instants, not a fresh directory mtime [64.15ms]
(pass) retention sweep > keeps dead dirs with a newer recorded instant despite an old mtime [43.08ms]
(pass) retention sweep > reaps malformed dead dirs with no recorded instant [44.89ms]
(pass) retention sweep > keeps result-only recorded instant despite an old mtime [50.39ms]
(pass) retention sweep > never reaps a live presence dir regardless of age [37.65ms]
(pass) retention sweep > sweeps old logs but preserves logs for live agents [37.13ms]
(pass) retention sweep > does not sweep again one minute after the first tick [49.80ms]

test\review.test.ts:
Preparing worktree (new branch 'orch/feature-1')
(pass) review plumbing > lists only done worktree agents with commits ahead [622.97ms]
Preparing worktree (new branch 'orch/iterate-1')
(pass) review plumbing > reject re-dispatches feedback through the adapter inbox [2745.39ms]
Preparing worktree (new branch 'orch/approve-1')
(pass) review plumbing > approve merges and removes the worktree and branch [770.55ms]
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
(pass) review plumbing > conflicting approval aborts without changing either branch [555.37ms]
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
(pass) review plumbing > non-fast-forward approval creates a merge commit [573.49ms]

test\routing-hardening.test.ts:
(pass) store hardening > stores hostile values as data and preserves pack selection [51.96ms]
(pass) store hardening > a fresh store creates the full current schema with WAL enabled [46.49ms]
(pass) store hardening > a steal updates ownership only when the observed owner still matches [52.52ms]
(pass) store hardening > the attempt insert claim is exactly once [55.02ms]
(pass) CLI offline routing > status --offline does not start or contact orchd [131.93ms]

test\seat-index.test.ts:
(pass) seat pure seams > countStates groups active, blocked, failed, and settled states [0.15ms]
(pass) seat pure seams > formatSeatStatus renders state counts and view hint [0.09ms]
(pass) seat pure seams > reconcileDashboardSelection preserves id and guards missing snapshots [0.11ms]

test\session.test.ts:
(pass) parseSession > returns an empty view for null and missing paths [0.09ms]
(pass) parseSession > handles model, thinking, user, assistant, tool, and unknown entries [1.97ms]
(pass) parseSession > joins text blocks and ignores non-text blocks [1.35ms]

test\settings-command.test.ts:
(pass) orch settings > --json reports value + source per setting, settings.json winning over defaults [89.85ms]
(pass) orch settings > --json reports env as the winning source over settings.json [84.73ms]
(pass) orch settings > --harness switches defaults.adapter between enabled ids and rejects a non-enabled id [265.81ms]
(pass) orch settings > reports each harness's picker quicklist and launch gate as separate rows [87.88ms]
(pass) orch settings > a load error surfaces loudly with no partial table [89.10ms]

test\settings-notify.test.ts:
(pass) orch settings notify > records a sink with the field that sink declares [4.85ms]
(pass) orch settings notify > re-adding one sink replaces it in place and keeps the fields the call omits [7.50ms]
(pass) orch settings notify > accepts asking as a first-class sink state [9.49ms]
(pass) orch settings notify > remove drops only the named sink [6.51ms]
(pass) orch settings notify > list reports each sink with the states it fires on, defaults included [4.90ms]
(pass) orch settings notify > an empty notify array lists as none configured [1.29ms]

test\setup-notifiers.test.ts:
(pass) notifier setup logic > probes the built-in adapters [3.06ms]
(pass) notifier setup logic > lists unavailable notifiers with remediation and disables selection [0.09ms]
(pass) notifier setup logic > collects only declared fields and rejects a missing webhook URL [0.06ms]
(pass) notifier setup logic > renders a command entry that loadConfig can parse [7.72ms]
(pass) notifier setup logic > builds valid entries and reports invalid selections [0.21ms]

test\setup-smoke.test.ts:
(pass) runSetupSmoke (12.5) > a clean round-trip returns true and reports orch can deliver work [0.34ms]
(pass) runSetupSmoke (12.5) > the agent is launched on the prompt it built [0.07ms]
(pass) runSetupSmoke (12.5) > an agent that launches but yields no result times out and fails non-zero [0.08ms]
(pass) runSetupSmoke (12.5) > a rejected spawn fails loudly and never polls for a result [0.08ms]

test\setup-wizard.test.ts:
(pass) setup model picker > switches large catalogues to searchable bounded mode and preserves effort [0.18ms]
(pass) setup model picker > keeps the compact selector for small catalogues [0.04ms]
(pass) setup model list picker > large catalogues use the bounded searchable multiselect [0.11ms]
(pass) setup model list picker > the prompt names both jobs the list does, and that an empty one forbids nothing [0.04ms]
(pass) setup model list picker > stored values start checked, and clearing them returns an empty selection [0.07ms]

test\skew-guard.test.ts:
(pass) CLI daemon skew guard > refuses mutating commands and names both hashes plus the reload remedy [116.74ms]
(pass) CLI daemon skew guard > allows read-only commands while the daemon is skewed [162.98ms]
104 | 
105 |     expect(result.status).not.toBe(0);
106 |     expect(text).not.toContain("orch daemon reload");
107 |     // Past the skew guard it reaches the lock, which names this live process ΓÇö
108 |     // unprovable as a daemon, so orch refuses to signal it instead of killing us.
109 |     expect(text).toContain("cannot verify is its daemon");
                       ^
error: expect(received).toContain(expected)

Expected to contain: "cannot verify is its daemon"
Received: "\nherdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: \"herdr\"\n"

      at <anonymous> (C:\dev\personal\orch\test\skew-guard.test.ts:109:18)
(fail) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [150.24ms]
  warning: pi --list-models failed; pi lists no models (pi --list-models failed after 2 attempts: Executable not found in $PATH: "pi")
(pass) CLI daemon skew guard > doctor reports skew as a warning without making skew itself a failure [1146.05ms]
(pass) CLI daemon skew guard > does not treat an absent daemon as skew and auto-starts a fresh daemon [229.12ms]

test\spawn-identity.test.ts:
(pass) one key per pane spawn (12.1) > identity is an opaque minted id ΓÇö never the name, never the pane handle [67.95ms]
(pass) one key per pane spawn (12.1) > a name freed by a dead agent is reusable, and the two agents differ in identity [75.78ms]
(pass) one key per pane spawn (12.1) > a spawned agent resolves to exactly one control-target candidate [75.37ms]

test\spawn-limits.test.ts:
(pass) spawn limits > schema loads global and workspace caps [2.29ms]
(pass) spawn limits > rejects invalid cap %s with file and key [8.27ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.79ms]
(pass) spawn limits > rejects invalid cap %s with file and key [1.59ms]
(pass) spawn limits > omitted fleet caps normalize to defaults [1.44ms]
(pass) spawn limits > global boundary refusal data counts the whole request [11.09ms]
(pass) spawn limits > one workspace may use the full global allotment [4.06ms]
(pass) spawn limits > workspace cap is independent of global headroom [3.73ms]
(pass) spawn limits > uncapped workspace is bounded only by global count [2.92ms]
(pass) spawn limits > foreign pack members do not consume the caller's pack cap [10.00ms]
(pass) spawn limits > dead pid records free capacity [1.50ms]
(pass) spawn limits > foreign panes never count [1.26ms]
(pass) spawn limits > doctor reports an unsatisfiable workspace cap without a fix [578.68ms]
(pass) spawn limits > doctor accepts satisfiable limits [616.90ms]

test\spawn-names.test.ts:
(pass) spawn name numbering > starts at 1 when no agent under the prefix is live [40.16ms]
(pass) spawn name numbering > continues past the highest live index so a live fleet is grown, not collided with [53.49ms]
(pass) spawn name numbering > a dead agent frees its name and its index [49.50ms]
(pass) spawn name numbering > another workspace's fleet never affects numbering [48.99ms]
(pass) spawn name numbering > a prefix that is another prefix's head never matches it [48.90ms]

test\spawn-policy.test.ts:
(pass) spawn policy caps > allows a pack spawn while under the cap [0.27ms]
(pass) spawn policy caps > blocks an at-cap spawn and offers dispatch or the pack queue [0.06ms]
(pass) spawn policy caps > blocks a spawn that would create depth three [0.02ms]
(pass) spawn policy caps > reads a pack cap override from settings [9.81ms]
14 | 
15 | const tempDirs: string[] = [];
16 | const oldOrchDir = process.env.ORCH_DIR;
17 | const oldAgentKey = process.env.ORCH_AGENT_KEY;
18 | afterEach(() => {
19 |   while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
                               ^
error: EBUSY: resource busy or locked, rm 'C:\Users\Bryan\AppData\Local\Temp\orch-spawn-policy-refused-R4xyVX'
      at <anonymous> (C:\dev\personal\orch\test\spawn-policy.test.ts:19:27)
(fail) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [543.88ms]

test\spawn-preferred-models.test.ts:
(pass) the preferred quicklist reaches every launch route > a pane spawn hands the exact array to the backend [78.00ms]
(pass) the preferred quicklist reaches every launch route > an unconfigured quicklist stays empty rather than becoming a default one [64.06ms]
(pass) the preferred quicklist reaches every launch route > the previewed command is the command a launch runs [0.28ms]
(pass) the preferred quicklist reaches every launch route > a headless launch forwards the quicklist into the adapter's own options [56.94ms]
(pass) orchd rules on the quicklist it is sent > accepts an absent value and an array of specs [0.25ms]
(pass) orchd rules on the quicklist it is sent > refuses a joined string or a blank entry instead of coercing it [0.17ms]

test\spawn-registry.test.ts:
(pass) spawn agent registration > writes the hub, environment, tuning, and lease [73.31ms]
(pass) spawn agent registration > headless writes no plexer or handle row [59.77ms]
(pass) spawn agent registration > worktree row is present only for a worktree launch [76.04ms]
(pass) spawn agent registration > an unknown or absent spawner produces a root pack of one and no lease [64.04ms]

test\store-agent-rows.test.ts:
(pass) agent store rows > insertAgent materializes the provenance root [62.88ms]
(pass) agent store rows > endAgent records who closed it, nullable for death [60.98ms]
(pass) agent store rows > liveAgents excludes agents with an ending [55.93ms]
(pass) agent store rows > packMembers selects the materialized root [57.08ms]
(pass) agent store rows > unknown harness is rejected by the foreign key [36.90ms]
(pass) agent store rows > unknown spawnedBy is rejected by the foreign key [36.97ms]
(pass) agent store rows > label maps both null and a value [53.09ms]
(pass) agent store rows > created_at is an INTEGER epoch millisecond [52.96ms]
(pass) agent store rows > worktreeOf distinguishes repo agents from worktree agents [57.01ms]
(pass) agent store rows > renameAgent is id-keyed and leaves identity history unchanged [62.92ms]
(pass) agent store rows > lookup ensure operations are insert-or-ignore [50.17ms]
(pass) agent store rows > childrenOf returns direct descendants [59.83ms]

test\store-catalogue.test.ts:
(pass) catalogue rows > empty store reads an empty Map [37.91ms]
(pass) catalogue rows > write then read round-trips at and stdout [46.96ms]
(pass) catalogue rows > writing the same command twice keeps one row with newer values [49.16ms]
(pass) catalogue rows > an entry with empty stdout is not stored [36.75ms]
(pass) catalogue rows > clearCatalogues empties the store [48.04ms]
(pass) catalogue rows > two commands coexist and updating one does not touch the other [50.87ms]

test\store-connection-guards.test.ts:
(pass) store migration guards > a store predating the migrations is refused, not rebuilt over [55.77ms]
(pass) store migration guards > names live presence as the thing to close before rebuilding [54.86ms]

test\store-events.test.ts:
(pass) event store rows > appendEvent assigns increasing sequence numbers and round-trips payload [50.63ms]
(pass) event store rows > appendEvent keeps sequence numbers across store reopen [77.17ms]
(pass) event store rows > pruned sequence numbers are never reused [57.77ms]
(pass) event store rows > selectEventsSince filters by sequence, orders ascending, and honours limit [49.51ms]
(pass) event store rows > oldestEventSeq reports undefined when empty and the surviving lowest sequence after pruning [52.48ms]

test\store-identity.test.ts:
(pass) hello agent identity rows > reuses the live agent for the same session process and mints for another [56.16ms]
(pass) hello agent identity rows > first sight creates a named root agent and open process row [50.98ms]

test\store-interval-rows.test.ts:
(pass) interval satellites > closeThenOpen is atomic [57.26ms]
(pass) interval satellites > only one open interval is allowed [60.30ms]
(pass) interval satellites > closed process intervals cannot overlap [58.69ms]
(pass) interval satellites > closed space intervals cannot overlap [58.16ms]
(pass) interval satellites > half-open adjacency is legal [63.00ms]
(pass) interval satellites > clearSpace closes without opening [60.23ms]
(pass) interval satellites > agent plexer is immutable one-shot [60.04ms]
(pass) interval satellites > process restart history closes at the successor since [61.54ms]
(pass) interval satellites > process rows carry host and process identity [60.40ms]
(pass) interval satellites > nullable process start_token round-trips as null [56.58ms]
(pass) interval satellites > space move history closes at the successor since [62.14ms]
(pass) interval satellites > tuning change history closes at the successor since [60.04ms]
(pass) interval satellites > handle history preserves each renumbered handle [61.32ms]
(pass) interval satellites > interval instants are stored as INTEGER values [74.59ms]
(pass) interval satellites > process wrapper rolls back predecessor close when successor fails [57.85ms]
(pass) interval satellites > space wrapper rolls back predecessor close when successor fails [57.97ms]
(pass) interval satellites > tuning carries model and nullable thinking [56.00ms]

test\store-lease-rows.test.ts:
(pass) agent lease rows > fencing ids are monotonic across agents and never reused after reap [65.96ms]
(pass) agent lease rows > a second open lease is rejected [58.96ms]
(pass) agent lease rows > release and expiry close rows with matching reason and exact until [62.11ms]
(pass) agent lease rows > handoff closes current and inserts a newer row without changing prior facts [58.96ms]
(pass) agent lease rows > adoption closes prior and inserts a strictly newer adopter row [60.96ms]
(pass) agent lease rows > adoption with no open lease is plain acquire and leaves closed history untouched [64.22ms]
(pass) agent lease rows > handoff rolls back close when successor insert fails [61.79ms]
(pass) agent lease rows > wrong-holder release and handoff are rejected [56.03ms]
(pass) agent lease rows > an agent cannot lease itself [54.86ms]
(pass) agent lease rows > expiry inserts nothing new [57.44ms]
(pass) agent lease rows > reads return only open rows [60.70ms]

test\store-outbox.test.ts:
(pass) outbox store rows > inserts pending messages and orders them by creation time [52.42ms]
(pass) outbox store rows > reports one message's pending state [50.01ms]
(pass) outbox store rows > bumps attempts and hides a message until its next attempt time [48.58ms]
(pass) outbox store rows > deletes delivered messages older than the cutoff [57.40ms]

test\store-queue.test.ts:
(pass) queue facade storage > state is derived from attempts rather than stored on tasks [59.99ms]
(pass) queue facade storage > retention deletes only settled tasks older than the cutoff [60.95ms]
(pass) queue facade storage > retention never removes a queued task based on its age [56.41ms]
(pass) queue facade storage > agent-scoped tasks become unrunnable when their agent ends [52.55ms]
(pass) queue facade storage > completed tasks stay done after their scope agent ends [58.64ms]
(pass) queue facade storage > a dead orch does not make a pack task unrunnable while a member lives [56.29ms]
(pass) queue facade storage > pack-scoped tasks become unrunnable when every pack member ends [57.06ms]

test\store-rebuild-schema.test.ts:
(pass) rebuild schema > rebuild DDL inventory is exact [38.21ms]
(pass) rebuild schema > the store opens migrated, with foreign keys enabled [38.94ms]
(pass) rebuild schema > documented column declarations are exact [37.13ms]
(pass) rebuild schema > all satellite overlap triggers use documented keys [607.35ms]
(pass) rebuild schema > all ten partial unique indexes allow only one open row [625.48ms]
(pass) rebuild schema > enforces foreign keys and agent checks [52.07ms]
(pass) rebuild schema > requires exactly one task scope [51.80ms]
(pass) rebuild schema > allows one open attempt only [55.30ms]
(pass) rebuild schema > enforces lease checks and one lease [55.44ms]
(pass) rebuild schema > rejects overlapping closed intervals [53.47ms]
(pass) rebuild schema > STRICT rejects text in integer instant [35.95ms]
(pass) rebuild schema > remaining documented CHECKs and cascades are enforced [68.64ms]
(pass) rebuild schema > task_states derives queued claimed and outcomes [72.36ms]

test\store-runs.test.ts:
(pass) run rows > round-trips every field, including a structured result [48.71ms]
(pass) run rows > upsert updates a row while preserving its original start time [48.22ms]
(pass) run rows > orders by started time, filters by agent, and honours limit [51.68ms]
(pass) run rows > omits absent optional fields instead of returning null [46.69ms]
(pass) run rows > deletes only rows older than the cutoff and returns the count [59.80ms]
(pass) run rows > stays readable after the agent presence directory is deleted [66.65ms]

test\store-spawned.test.ts:
(pass) spawned and ownership store rows > ownership table has no workspace column [39.40ms]
(pass) spawned and ownership store rows > selectSpawnedRecords joins every row to its owner in one query [126.02ms]
(pass) spawned and ownership store rows > writeSpawnedName updates an existing pane and reports missing panes [48.97ms]
(pass) spawned and ownership store rows > deleteOwner removes an ownership row [49.01ms]
(pass) spawned and ownership store rows > reapSpawnedRecord removes the spawned and ownership rows [55.10ms]
(pass) spawned and ownership store rows > removeDeadAgentDirs removes the spawned and ownership rows [55.88ms]
(pass) spawned and ownership store rows > headless spawn records the spawned table and does not create spawned.jsonl [57.88ms]

test\store-task-rows.test.ts:
(pass) task and attempt rows > enqueue accepts exactly one typed scope and round-trips JSON opts [59.90ms]
(pass) task and attempt rows > queued tasks can be edited only by their enqueuer [65.40ms]
(pass) task and attempt rows > two concurrent claims have one winner and one index violation [83.85ms]
(pass) task and attempt rows > failed attempts remain in history and retries are new attempts [65.03ms]
(pass) task and attempt rows > settlement stores exact integer instants and outcome payloads [63.12ms]
(pass) task and attempt rows > task state precedence covers queued, claimed, failed, done and cancelled [83.62ms]
(pass) task and attempt rows > intakes are half-open history and duplicate open intake is rejected [66.19ms]

test\store-values.test.ts:
(pass) store row values > uses null for optional database values without JSON text [0.05ms]
(pass) store row values > sets only non-null fields [0.03ms]

test\tiling.test.ts:
(pass) planTilePlacement > a lone pane needs no target: every backend's default split hits it [0.08ms]
(pass) planTilePlacement > first_split rules the opening split, however the screen is shaped [0.05ms]
(pass) planTilePlacement > first_split longest-edge leaves the opening split to the tab's own shape [0.03ms]
(pass) planTilePlacement > a tab with no geometry to read still opens the way first_split says [0.02ms]
(pass) planTilePlacement > past the first split, the biggest pane halves its longer side whatever first_split says [0.08ms]
(pass) planTilePlacement > the biggest pane is the target, whatever the caller's own pane is [0.02ms]
(pass) planTilePlacement > equal panes resolve top-left first, so enumeration order cannot decide [0.02ms]
(pass) planTilePlacement > four agents land in a 2x2 grid, not four columns [1.19ms]
(pass) planTilePlacement > four agents on an ultrawide screen still land in a 2x2 grid [0.04ms]
(pass) planTilePlacement > first_split rows stacks the second agent, columns seats it alongside [0.03ms]
(pass) planTilePlacement > longest-edge on an ultrawide screen is the four-thin-columns layout first_split exists to avoid [0.02ms]
(pass) planTilePlacement > the same pane count yields the same grid whatever pane order the plexer reports [0.34ms]

test\transcript.test.ts:
(pass) lastAssistantFromJsonl > returns the last assistant text, skipping user and malformed lines [0.17ms]
(pass) lastAssistantFromJsonl > undefined for blank or empty input [0.01ms]
(pass) lastAssistantFromJsonl > an empty-content assistant does not overwrite an earlier real one [0.03ms]
(pass) assistantText > reads role-tagged records [0.02ms]
(pass) assistantText > reads the {type:'assistant'} envelope with a nested message [0.02ms]
(pass) assistantText > undefined for non-assistant roles [0.02ms]
(pass) contentText empty-string part handling > empty parts drop out; real parts are joined without blank lines [0.03ms]
(pass) contentText empty-string part handling > an all-empty content array yields undefined [0.01ms]
(pass) contentText empty-string part handling > a bare empty string yields undefined

test\wall-single-owner.test.ts:
(pass) workspace wall ownership > keeps the wall decision primitive in one source module [7.12ms]

test\web-projection.test.ts:
(pass) web fleet projection > uses the orch agent name and falls back to its minted id, never the plexer agent name [0.19ms]
(pass) web fleet projection > uses the orch space name and never exposes the plexer workspace id [0.03ms]
(pass) web fleet projection > unscoped agents use a neutral space label when no orch space exists [0.02ms]
(pass) web fleet projection > history groups ended agents by provenance root, never by their leases [0.08ms]
(pass) web fleet projection > live projection excludes ended rows and keeps unleased live agents out of history [0.04ms]

test\work-loop-binding.test.ts:
(pass) work loop attempt binding > statusSpeaksForTask verifies the current attempt dispatch id [0.07ms]

test\work-notify.test.ts:
(pass) orch presence notifications > delivers a presence transition through a configured command sink [87.44ms]

test\worker-prompt.test.ts:
(pass) worker prompt capability composition > orch run composition selects the same header per adapter [0.11ms]
(pass) worker prompt capability composition > locked-commands clause names the commands when the list is non-empty [0.04ms]
(pass) worker prompt capability composition > no locked-commands clause when the list is empty [0.01ms]
(pass) worker prompt capability composition > the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker [0.02ms]
(pass) worker prompt capability composition > unreachable spawner tells the worker to finish and end without relaying [0.01ms]
(pass) worker prompt capability composition > reachable spawner permits replying to the spawner only [0.01ms]
(pass) worker prompt capability composition > a reachable spawner still earns no clause when the worker cannot be steered by inbox
(pass) worker prompt capability composition > events strip both worker header variants [36.61ms]

test\worker-tools.test.ts:
(pass) worker tool policy > no configured allowlist restricts nothing [0.11ms]
(pass) worker tool policy > a configured allowlist always carries orch's own tools [0.03ms]
(pass) worker tool policy > peer tools join the allowlist when the fleet enables them [0.02ms]

test\workspace-policy.test.ts:
(pass) workspace policy > reads workspaces from the spawned registry [51.41ms]
(pass) workspace policy > resolves workspace names through records and functions [0.10ms]
(pass) workspace policy > compares serialized keys by their workspace [54.01ms]
(pass) workspace policy > enforces the workspace wall [56.07ms]
(pass) workspace policy > scopes serialized identity keys to the current workspace [47.10ms]
(pass) workspace policy > null current workspace leaves items unscoped [1.06ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at <anonymous> (C:\dev\personal\orch\test\workspace-policy.test.ts:101:20)
(fail) workspace policy > 2.7 status displays the reported workspace identity field [64.99ms]
113 |     const output = executeHerdr("herdr", args, { timeout: 3000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
114 |     const value = parseHerdrOutput(output);
115 |     listCache.set(cacheKey, { at: Date.now(), value });
116 |     return value;
117 |   } catch (error: unknown) {
118 |     throw new Error(`herdr ${args.join(" ")} failed: ${errorDetail(error)}`);
                                                                                 ^
error: herdr pane list failed: stderr: null; stdout: null; Executable not found in $PATH: "herdr"
      at herdr (C:\dev\personal\orch\src\backends\herdr\cli.ts:118:76)
      at herdrPanes (C:\dev\personal\orch\src\backends\herdr\cli.ts:170:18)
      at herdrReachable (C:\dev\personal\orch\src\backends\herdr\cli.ts:165:3)
      at entitiesFromBackend (C:\dev\personal\orch\src\entities.ts:167:66)
      at buildEntities (C:\dev\personal\orch\src\entities.ts:245:21)
      at <anonymous> (C:\dev\personal\orch\test\workspace-policy.test.ts:109:22)
(fail) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [54.01ms]

test\workspace-walls.test.ts:
(pass) workspace helpers > reads workspace ids from the spawned registry [0.49ms]
(pass) workspace helpers > derives an entity workspace from the registry [0.22ms]
(pass) workspace helpers > returns the same entities when all workspaces are requested [6.30ms]
(pass) workspace wall writes > allows a write within the same workspace [0.14ms]
(pass) workspace wall writes > denies a cross-workspace write with both workspaces in the reason [0.12ms]
(pass) workspace wall writes > applies the same wall rule to herdr, tmux, and headless identities [0.49ms]
(pass) workspace wall writes > allows a cross-workspace write with an explicit override [0.08ms]
(pass) workspace wall writes > allows legacy unscoped targets [0.07ms]

test\worktree.test.ts:
Preparing worktree (new branch 'orch/fixes-1')
(pass) worktree primitives > creates and lists an agent worktree on an orch branch [259.05ms]
Preparing worktree (new branch 'orch/feature')
(pass) worktree primitives > detects commits ahead of a base branch [379.97ms]
Preparing worktree (new branch 'orch/remove-me')
(pass) worktree primitives > removes an agent worktree [256.13ms]
fatal: not a git repository (or any of the parent directories): .git
(pass) worktree primitives > rejects a non-repository path with a clear error [23.15ms]

1 tests skipped:
(skip) claude-hooks shim tests need the dist bundle


43 tests failed:
(fail) close always works > closes a foreign-workspace target by name, key, or pane id [63.27ms]
(fail) close always works > a successful backend close retains a pane that is still listed [311.47ms]
(fail) close always works > a failed signal retains the registry and presence and reports failure [294.39ms]
(fail) close always works > presence pid without a recorded process closes the pane without signalling and reaps [67.20ms]
(fail) close always works > close ignores owner and spawnedBy gates [52.53ms]
(fail) close always works > abort ignores owner gate [49.94ms]
(fail) close always works > duplicate close targets count once [49.07ms]
(fail) close always works > dead pane-less close is a successful no-op that reaps registry and presence [166.24ms]
(fail) command workspace fields > status and wall entities use persisted workspace instead of serialized-key text [57.73ms]
(fail) command workspace fields > status reports a mixed pi and Claude fleet with the same identity fields [56.94ms]
(fail) lease commands > abort proceeds with a foreign live-holder lease [276.10ms]
(fail) lease commands > close proceeds with a foreign live-holder lease [264.79ms]
(fail) commands/results > routes a seeded result.json through the command module [63.13ms]
(fail) commands/results > falls back to adapter session text when result.json is absent [60.14ms]
(fail) commands/results > uses result.json even when the presence status has no agent [60.74ms]
(fail) commands/results > orch tail resolves a non-pi target through that adapter's session view [58.17ms]
(fail) commands/results > orch tail renders pi's per-turn entries with role rows and a tool-call summary [69.71ms]
(fail) commands/results > orch tail -n keeps last-N rendered entries for a pi session [64.29ms]
(fail) commands/results > orch session reports the pi entry count [61.07ms]
(fail) commands/results > orch session shows zero entries for an adapter view without them [64.50ms]
(fail) commands/runs > target filter and json preserve RunRecord rows [61.22ms]
(fail) commands/setup > runs non-interactive setup against the requested ORCH_DIR and records the selected composition [70.78ms]
(fail) commands/spawn > refuses spawn without a name before any spawn mutations [546.65ms]
(fail) commands/spawn > rejects --detached as an unknown spawn flag [549.28ms]
(fail) commands/status > lease-backed status attribution distinguishes my lease, another lease, unleased, and legacy rows [91.97ms]
(fail) doctor backend and presence checks > reports every registered backend and boolean capability fields [6.52ms]
(fail) doctor notification-sink checks > warns when a notifier omits done from its on list [576.62ms]
(fail) fleet ownership scoping > close --all closes all managed records regardless of owner [69.08ms]
(fail) fleet ownership scoping > explicit foreign target closes successfully [471.38ms]
(fail) fleet ownership scoping > driving verbs remain gated against a live foreign holder [419.87ms]
(fail) fleet ownership scoping > result refuses a foreign-owned agent and names its owner [167.84ms]
(fail) fleet ownership scoping > pane mutations refuse a foreign-owned agent and name its owner [159.17ms]
(fail) fleet ownership scoping > close has no force option and remains unconditional without it [500.51ms]
(fail) fleet ownership scoping > close cleans up a mismatched recorded process without signalling [74.38ms]
(fail) a spawned agent touches only what it spawned > close from a spawned agent is unconditional [168.25ms]
(fail) a spawned agent touches only what it spawned > the workspace operator keeps control of an agent-owned fleet [160.90ms]
(fail) orch channel and capture roles > headless delivery reaches the inbox and is acknowledged without a screen [72.51ms]
(fail) presence status schema > status and list report the same agent identity [90.72ms]
(fail) reload > does not write installed extension bundles [42.39ms]
(fail) CLI daemon skew guard > --stale-ok overrides refusal for a mutating command [150.24ms]
(fail) spawn policy caps > a refused cmdSpawn makes no name, worktree, registry, or queue mutation [543.88ms]
(fail) workspace policy > 2.7 status displays the reported workspace identity field [64.99ms]
(fail) workspace policy > 6.6 structured identity drives status and policy, not serialized key text [54.01ms]

 905 pass
 1 skip
 43 fail
 4547 expect() calls
Ran 949 tests across 143 files. [85.21s]
