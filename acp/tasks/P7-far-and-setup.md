# P7: an ACP agent on a linked host, and setup installs bindings

Every path below is under `packages/orch/`. No two sections touch the same file.

## T1 Test an ACP agent held on a linked host, driven and read from here
Wave 6 T4. Read first: `test/acp-agents.test.ts` (how a fake ACP agent is wired to fake pipes),
`test/held-drive.test.ts` and `test/held-read.test.ts` (how a far orchd and a near orchd are
set up and driven), `test/helpers/far-orchd.ts`, `test/helpers/held-far.ts`,
`test/helpers/fake-acp-agent.ts`.

Edit test/helpers/fake-acp-agent.ts:
- Add, exported, the function `acpProgram` exactly as it is in `test/acp-agents.test.ts`
  (L60 to L74, with its doc comment). Import `fakePipes` from `./fake-pipes.ts` and the type
  `PipesProvider` from `../../src/types/pipes.ts`. Do not edit `test/acp-agents.test.ts`.

Edit test/helpers/far-orchd.ts:
- `FarOrchdOptions`: add `readonly pipes?: PipesProvider;` with the doc comment
  `/** Where its held pipes come from: fakes when absent. */`.
- `startFarOrchd`: pass `options.pipes` as the fourth argument of `idleDaemonState`.

Edit test/helpers/held-far.ts:
- `NearOrchdOptions`: add `readonly form?: FormId;` (doc: `The reference row's form: tui when absent.`)
  and `readonly harness?: AdapterId;` (doc: `The reference row's harness: pi when absent.`).
  Import the types from `../../src/types/form.ts` and `../../src/types/adapter.ts`.
- `nearOrchd`, in its `registerHostedAgent` call: `form: options.form ?? "tui"`,
  `harnessId: options.harness ?? "pi"`.

New file test/acp-far.test.ts. Header comment, two lines: an agent a linked host's orchd holds
in the acp form, driven and read from this host's orchd over the real link.
Setup, one function `acpThere(id: string, turns: FakeAcpScript["turns"])`:
- `const agent = fakeAcpAgent(defaultFakeScript({ turns }));`
  `const program = acpProgram(agent);`
- `const far = await startFarOrchd(greeting(id), { models: HELD_FAR_CATALOGUE, pipes: program.pipes });`
  `greeting` as in `test/held-drive.test.ts`.
- Before the spawn set `process.env.CODEX_HOME = far.orchDir`, so codex lists no models from
  the machine. Save the old value at module load and restore it in `afterEach` (delete when it
  was undefined).
- `await spawnHeadless(far.state, { form: "acp", key, name: "acp-far", spawner: null, adapter: "codex", model: "gpt-5.6-luna", thinking: "medium", prompt: null, cwd: far.orchDir }, hostIdentity().id);`
  with `key = mintAgentId()`.
- `const near = await nearOrchd(far, key, { name: "acp-far", form: "acp", harness: "codex", model: "gpt-5.6-luna", followEvents: true, serve: true });`
- Return `{ far, near, key, agent }`. Push `far` and `near` onto arrays; `afterEach` closes
  them in the order `test/held-drive.test.ts` uses, then `dropHeldPipes()` and
  `closeAllStores()`.
- Copy `OPERATOR`, `asOperator` and an `until(check)` poll (10 ms, 500 tries) from the files
  you read.

Cases, one `describe("an acp agent held on a linked host, from here")`:
1. "dispatch from here runs a turn there, and result here names the host". Turns:
   `[turn({ updates: [chunk("far acp done")] })]`. `await asOperator(near, dispatch, { target: key, text: "do it" })`.
   Wait until `selectAgentStatus(far.orchDir, key)?.state === "done"`. Expect
   `agentView(far.orchDir, key)?.form` to be `"acp"`. Expect
   `await rpcCall(near.orchDir, "agent-read", { caller: OPERATOR, key, read: { kind: "result" } })`
   `toMatchObject({ host: "box", reading: { kind: "result", lookup: { kind: "found", payload: "far acp done" } } })`.
2. "tail and peek here read the far transcript and name the host". Same turn and wait. For
   `{ kind: "tail", lines: 10 }` and `{ kind: "screen", lines: 50 }`: the near `agent-read`
   answer has `host` `"box"`, and `JSON.stringify(answer.reading)` contains `"far acp done"`.
3. "a permission ask there is a question here, and answer 2 from here selects the second option".
   Turns: `[turn({ permissions: [permission("call-1")], waitForCancel: true, stopReason: "cancelled" })]`.
   Dispatch as in case 1. Wait until the far state is `"asking"`.
   `const { questions } = await rpcCall(near.orchDir, "questions", { caller: OPERATOR });`
   expect one question with `key` equal to `key` and `question` `"Run call-1"`.
   `await asOperator(near, answer, { target: key, text: "2" })`. Wait until
   `agent.permissions.length === 1`, then expect `agent.permissions[0]` to match
   `{ toolCallId: "call-1", response: { outcome: { outcome: "selected", optionId: "call-1-always" } } }`.
4. "abort from here cancels the turn there". Turns:
   `[turn({ waitForCancel: true, stopReason: "cancelled", onStarted: () => { started = true; } })]`.
   Dispatch, wait until `started`. `await asOperator(near, abortAnywhere, { target: key })`.
   Wait until the far state is `"aborted"`. Expect `agent.received.map((entry) => entry.method)`
   to contain `methods.agent.session.cancel` (import `methods` from `@agentclientprotocol/sdk`).

Imports: take each from where `test/held-drive.test.ts`, `test/held-read.test.ts` and
`test/acp-agents.test.ts` take it. `dispatch` and `answer` from `src/daemon/server/handlers/write.ts`,
`abortAnywhere` from `src/daemon/server/handlers/drive.ts`, `spawnHeadless` from
`src/daemon/server/handlers/lifecycle.ts`, `dropHeldPipes` from `src/daemon/server/held-pipes.ts`.
No `as` casts, no `any`.

Do not run `bun test`. The SDK is not installed yet, so the file cannot run. The orchestrator
runs it.
Verify: test/helpers/fake-acp-agent.ts test/helpers/far-orchd.ts test/helpers/held-far.ts test/acp-far.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 Setup installs a missing ACP binding
Wave 8 T3. The install command of a binding lives on its adapter's `acp` role.

Edit src/types/adapter.ts:
- `AcpRole` (L244): add, after `sharesSessions`,
  `/** How setup installs the binding when its executable is missing. */`
  `readonly install: Prerequisite;`
  `Prerequisite` is declared in this same file (L398).

Edit src/adapters/codex.ts:
- Add a module constant above the class:
  `const CODEX_ACP_INSTALL = "bun add -g @agentclientprotocol/codex-acp";`
- In the `acp` role (L114), after `sharesSessions: false,` add
  `install: { install: { linux: CODEX_ACP_INSTALL, darwin: CODEX_ACP_INSTALL, windows: CODEX_ACP_INSTALL }, needs: ["bun"] },`

Edit src/shared/prerequisites.ts:
- `bindingPrerequisites` (L5): return each binding with the role that declares it. New body:
  ```ts
  /** Each binding executable the adapters declare, with the role that declares it, once per executable. */
  export function bindingPrerequisites(adapters: readonly AgentAdapter[]): { readonly command: string; readonly acp: AcpRole }[] {
    const bindings = new Map<string, AcpRole>();
    for (const adapter of adapters) {
      if (!adapter.acp) continue;
      const [command] = adapter.acp.argv({});
      if (!command) throw new Error(`${adapter.id} declares an empty binding argv`);
      if (!bindings.has(command)) bindings.set(command, adapter.acp);
    }
    return [...bindings].map(([command, acp]) => ({ command, acp }));
  }
  ```
  Add `AcpRole` to the type import.
- `installCommand` (L45): take the entry, not an id:
  ```ts
  export function installCommand(entry: Prerequisite | undefined, nixos: boolean, os: HostOs): string | null {
    if (nixos) return null;
    return entry?.install?.[os] ?? null;
  }
  ```
  Keep its doc comment.

Edit src/daemon/server/doctor/bins.ts:
- `checkBindingPrerequisites` (L47): `.map(({ command }) => bindingLine(command, binaryPath(command), null))`.
- `checkBindingAnswers` (L52): map over `async ({ command, acp }) => { … }`. Delete the
  `adapters.find(...)` line (L55). The body: `const found = binaryPath(command); if (!found) return bindingLine(command, found, null); return bindingLine(command, found, await answerOf(acp, probe));`

Edit src/daemon/server/setup.ts, in `probePrerequisites`:
- `queueInstall` takes `(id: string, entry: Prerequisite | undefined)`. Delete its line
  `const entry = PREREQUISITES[id];`. Its two `installCommand` calls become
  `installCommand(entry, isNixOs(), hostOs())` and `installCommand(PREREQUISITES[need], isNixOs(), hostOs())`.
- The two existing callers become `queueInstall(id, PREREQUISITES[id])`.
- After the existing `for (const binding of checkBindingPrerequisites(...))` loop, add:
  ```ts
  for (const { command, acp } of bindingPrerequisites(selected)) {
    if (!binaryOnPath(command)) queueInstall(command, acp.install);
  }
  ```
  and hoist `const selected = adapters.map((id) => resolveAdapter(id));` above both loops; the
  existing loop uses `selected`. Import `bindingPrerequisites` from `../../shared/prerequisites.ts`
  and the type `Prerequisite` from `../../types/adapter.ts`.

Edit src/notify/remediation.ts L15: `installCommand(PREREQUISITES["notify-send"], isNixOs(), hostOs())`,
and import `PREREQUISITES` beside `installCommand`.

Fixtures. Every object literal that is an `AcpRole` gets `install: {}` after `sharesSessions`:
- test/acp-agents.test.ts L54
- test/commands-spawn.test.ts L71
- test/restart-form.test.ts L55 and L227
- test/prerequisites.test.ts L18 and L84

Tests, in test/prerequisites.test.ts, a new `describe("setup offers a missing binding")`.
Import `setupPrerequisites` from `../src/daemon/server/setup.ts`. Each case sets `PATH` to a
fresh temp dir and `PATHEXT` to `""`, and restores both in `finally`, as the cases at L20 to
L60 do.
1. "a missing codex-acp is queued with its install command, after bun": the dir is empty.
   `setupPrerequisites({ adapters: ["codex"], backends: [] }).missing` contains
   `{ bin: "codex-acp", cmd: "bun add -g @agentclientprotocol/codex-acp" }`, and the index of
   the `bun` entry is lower than the index of the `codex-acp` entry.
2. "a codex-acp on PATH is not queued": write an executable `codex-acp` into the dir (as L27
   does). `missing` has no entry with `bin` `"codex-acp"`.

Verify: src/types/adapter.ts src/adapters/codex.ts src/shared/prerequisites.ts src/daemon/server/doctor/bins.ts src/daemon/server/setup.ts src/notify/remediation.ts test/acp-agents.test.ts test/commands-spawn.test.ts test/restart-form.test.ts test/prerequisites.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
