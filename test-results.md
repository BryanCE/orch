bun test v1.4.0 (34cbb9a40)

packages\orch\test\a-backend-exposes-each-operation-once.test.ts:
(pass) a backend exposes each operation exactly once (2.2) > herdr publishes no operation beside the role that owns it [0.13ms]
(pass) a backend exposes each operation exactly once (2.2) > tmux publishes no operation beside the role that owns it [0.03ms]
(pass) a backend exposes each operation exactly once (2.2) > headless publishes no operation beside the role that owns it [0.02ms]

packages\orch\test\a-row-is-not-a-pane.test.ts:
(pass) a row is not evidence that a pane exists (U1, U4) > a recorded handle the plexer does not list is reported as NO pane [91.48ms]
(pass) a row is not evidence that a pane exists (U1, U4) > the agent itself is still there ΓÇö losing a pane costs a shortcut, not a life [70.35ms]
(pass) a row is not evidence that a pane exists (U1, U4) > a handle the plexer DOES list is kept [69.92ms]

packages\orch\test\adapter-allowlist.test.ts:
(pass) pi worker launch obeys the worker policy > orch's bridge extension always loads, whatever the policy [0.33ms]
(pass) pi worker launch obeys the worker policy > an inheriting policy restricts neither tools nor built-ins [0.06ms]
(pass) pi worker launch obeys the worker policy > a locked-down policy passes exactly its allowlist and drops the built-ins [0.02ms]
(pass) pi worker launch obeys the worker policy > an explicit tool allowlist from the launcher wins over the policy's [0.01ms]
(pass) pi worker launch obeys the worker policy > headless pif launches under the same policy and keeps the prompt last [0.09ms]
(pass) pi worker launch obeys the worker policy > the model flag lands on the launch line [0.04ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp loads its own bundle from its own config root, never pi's [0.07ms]
(pass) omp worker launch obeys the worker policy through its own harness > omp drops built-ins with --no-tools, the flag its CLI actually has [0.01ms]
(pass) omp worker launch obeys the worker policy through its own harness > headless omp needs no wrapper binary and keeps the prompt last [0.02ms]

packages\orch\test\adapter-bundle-diagnosis.test.ts:
(pass) adapter bundle installation > reports a missing shipped bundle as a structured diagnosis [0.88ms]
pi extensions:
(pass) adapter bundle installation > diagnoses a missing shipped bundle without writing [2.21ms]

packages\orch\test\adapter-hardening.test.ts:
(pass) adapter and runtime hardening > malformed or empty adapter output never throws and yields no result [0.93ms]
(pass) adapter and runtime hardening > rejects unknown settings keys with a useful path [19.78ms]
(pass) adapter and runtime hardening > doctor returns failures for malformed notifier config and broken agent directories [10.75ms]
(pass) adapter and runtime hardening > headless refuses to spawn without a caller-minted presence key [1.12ms]

packages\orch\test\adapter-model-flag.test.ts:
(pass) interactive launches carry the resolved model (12.6) > pi.interactiveCmd includes --model when set and omits it cleanly when not [0.07ms]
(pass) interactive launches carry the resolved model (12.6) > pi.restrictedInteractiveCmd includes --model when set and omits it cleanly when not [0.05ms]
(pass) interactive launches carry the resolved model (12.6) > claude.interactiveCmd includes --model when set and omits it cleanly when not [0.04ms]
(pass) interactive launches carry the resolved model (12.6) > codex.interactiveCmd includes a quoted --model when set and omits it cleanly when not [0.05ms]
(pass) preferred models fill the harness's native picker quicklist > pi interactive builders pass the quicklist as one quoted --models argument [0.06ms]
(pass) preferred models fill the harness's native picker quicklist > pi headless builders pass the quicklist as one verbatim argv entry [0.07ms]
(pass) preferred models fill the harness's native picker quicklist > pi omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > pi keeps quicklist order and provider punctuation intact [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp interactive builders pass the quicklist as one quoted --models argument [0.03ms]
(pass) preferred models fill the harness's native picker quicklist > omp headless builders pass the quicklist as one verbatim argv entry [0.02ms]
(pass) preferred models fill the harness's native picker quicklist > omp omits --models cleanly for an absent or empty quicklist [0.04ms]
(pass) preferred models fill the harness's native picker quicklist > omp keeps quicklist order and provider punctuation intact
(pass) preferred models fill the harness's native picker quicklist > a model outside the quicklist is still what the launch runs on [0.02ms]

packages\orch\test\adapter-pi.test.ts:
(pass) PiAdapter > uses pi interactively, pif headlessly, and declares honest capabilities [0.17ms]
(pass) PiAdapter > restricted workers explicitly load the bundled pi extension [0.10ms]
(pass) PiAdapter > declares its lifecycle slash-commands [0.05ms]
(pass) PiAdapter > reads state from the presence status through store helpers [8.40ms]
(pass) PiAdapter > appends a steer message to the presence inbox [13.49ms]
(pass) PiAdapter > writes a blocking answer to the presence answer file [18.99ms]
(pass) PiAdapter > reads result.json and falls back to the last assistant session text [21.82ms]
(pass) PiAdapter > parses pi's supported model table without importing harness internals [0.29ms]

packages\orch\test\adapter-roles.test.ts:
(pass) adapter role composition > composes complete roles per adapter [0.07ms]
(pass) adapter role composition > answers with zero exit code when a shim role is absent [0.03ms]

packages\orch\test\adapter-session-env.test.ts:
(pass) adapter-owned session environment > resolves each caller harness through the public session resolver [0.33ms]
43 |   test("keeps harness env literals inside adapter modules", () => {
44 |     const forbidden = /PI_CODING_AGENT|CLAUDECODE|CLAUDE_PID|CODEX_PID/;
45 |     const offenders = sourceFiles(join(import.meta.dir, "..", "src"))
46 |       .filter((path) => !path.includes(`${join("src", "adapters")}/`))
47 |       .filter((path) => forbidden.test(readFileSync(path, "utf8")));
48 |     expect(offenders).toEqual([]);
                           ^
error: expect(received).toEqual(expected)

- []
+ [
+   "C:\dev\personal\orch\packages\orch\src\adapters\claude.ts",
+   "C:\dev\personal\orch\packages\orch\src\adapters\session-env.ts",
+ ]

- Expected  - 1
+ Received  + 4

      at <anonymous> (C:\dev\personal\orch\packages\orch\test\adapter-session-env.test.ts:48:23)
(fail) adapter-owned session environment > keeps harness env literals inside adapter modules [7.87ms]
(pass) adapter-owned session environment > a registered adapter resolves a novel marker without resolver changes [0.13ms]

packages\orch\test\agent-key-is-minted-id.test.ts:
(pass) a driving session mints an id, it is not placed by name > the key an interactive session addresses itself by is a bare minted id [4.04ms]
(pass) a driving session mints an id, it is not placed by name > the presence directory is named by that id alone [3.51ms]
(pass) a driving session mints an id, it is not placed by name > a launch that handed over a minted id is used verbatim [2.10ms]
(pass) this process's own identity is the id and nothing else > a spawned agent answers with the id its launch handed it [0.80ms]
(pass) the fleet wall is lifted by the absence of a launch, not by a key's shape > an agent orch launched may not cross into another project's fleet [75.52ms]
(pass) who drives an agent is looked up by its id > the key IS the agent id ΓÇö no segment is split out of it [755.67ms]
(pass) who drives an agent is looked up by its id > a composite key addresses no agent at all [369.06ms]
(pass) doctor reads a presence directory name as an id > a composite directory name is a malformed identity key [8.49ms]
(pass) doctor reads a presence directory name as an id > a minted id with a current stamp is well formed [2.51ms]

packages\orch\test\agent-launch-carries-project-scope.test.ts:
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent in a worktree carries the FLEET's project, not its own cwd [0.65ms]
(pass) an agent is launched with its fleet's project scope (1.13) > a tmux agent opened in a fresh window carries it too [0.13ms]
(pass) an agent is launched with its fleet's project scope (1.13) > an empty value is dropped rather than exported as a configured blank [0.08ms]

packages\orch\test\agent-model-unwelded.test.ts:
(pass) A1 ΓÇö the four facts are never welded > no table welds identity, provenance, ownership and environment into one row [1.51ms]
(pass) A1 ΓÇö the four facts are never welded > ownership is a lease table, not a second id space [0.37ms]
(pass) A1 ΓÇö the four facts are never welded > the agents hub carries identity and provenance only [0.11ms]
(pass) A1 ΓÇö the four facts are never welded > no table anywhere carries a lifetime [3.65ms]

packages\orch\test\agent-monitor.test.ts:
(pass) agent fleet monitor > surfaces only agents spawned by this session [0.96ms]
(pass) agent fleet monitor > empty model renders no status line or widget [0.41ms]
(pass) agent fleet monitor > worker process registers no monitor regardless of events [0.41ms]
(pass) agent fleet monitor > does not replay history into a plain pi session [0.42ms]

packages\orch\test\agent-view.test.ts:
(pass) the agent composer > an agent with no environment rows has every axis absent, not defaulted [53.49ms]
(pass) the agent composer > each axis composes independently, and moving one leaves identity untouched [78.13ms]
(pass) the agent composer > tuning is not environment: it survives a move [62.97ms]
(pass) the agent composer > ownership reads as a live lease, and a released one is not ownership [63.00ms]
(pass) the agent composer > provenance is on the view and is not the same fact as ownership [59.17ms]
(pass) the agent composer > provenance carries the spawner's name, read as a join and never stored twice [61.75ms]
(pass) the agent composer > an agent with no spawner reports no spawner name [56.04ms]
(pass) the agent composer > agentViews is oldest-first and liveAgentViews drops ended agents [65.36ms]
(pass) the agent composer > the axis list is the only place every axis is enumerated [0.60ms]
(pass) the agent composer > the composed shape is exactly the axis list, with nothing extra and nothing missing [56.92ms]
(pass) the agent composer > an unknown agent is null, never an empty shell [56.24ms]

packages\orch\test\ambiguous-target-says-what-to-do.test.ts:
(pass) an ambiguous target names the failure and the way out (U3) > the message names the failure, the target string, and every candidate [0.19ms]
(pass) an ambiguous target names the failure and the way out (U3) > it says what to send instead, so the caller is not left guessing [0.02ms]
(pass) an ambiguous target names the failure and the way out (U3) > it is a refusal, not an exit ΓÇö the caller can act on it [0.03ms]
(pass) an ambiguous target names the failure and the way out (U3) > resolveAgentView raises that same one message [0.17ms]

packages\orch\test\answer-dispatch.test.ts:
(pass) answer via the control dispatcher > writes pi's answer.json through the adapter's answer port [16.37ms]
(pass) answer via the control dispatcher > answers, rather than failing, when the adapter composes no question role [9.78ms]
(pass) answer via the control dispatcher > refuses answer for a target with no recorded adapter identity [9.01ms]
(pass) answer over the daemon control socket > delivers a pi answer end-to-end through the real socket [67.02ms]
(pass) answer over the daemon control socket > refuses a cross-space answer at the daemon wall [73.68ms]
