# W18: every relaunch builds its policy through prepareLaunch, and a relaunch in place gets the new env

Context. Paths are from the repo root `/home/bryan/orch`. No `as` casts, no `any`. These exist and typecheck:
- `packages/orch/src/daemon/server/launch-policy.ts` exports `prepareLaunch(state, request, refusal): Promise<LaunchPolicy>`, `launchPolicy(services, request, refusal)`, `refreshShim(state, adapter): Promise<void>`.
  `request` is `{ adapter: AgentAdapter; project: string; model: string | undefined; name: string; readOnly: ReadOnly | null }`; `refusal` is `(message: string) => Error`.
- `LaunchPolicy` (type, `packages/orch/src/types/policy.ts`) is `{ workers: WorkerPolicy; tools: string | undefined; env: Readonly<Record<string, string>>; preferredModels: readonly string[] }`.
- `launchCommand(adapter: AgentAdapter, launch: LaunchPolicy, tuning: { readonly model?: string; readonly thinking?: ThinkingLevel }, orchDir: OrchDir | null): string` in `packages/orch/src/daemon/server/spawn/models.ts`. `adapterCommand` and `policyCommand` no longer exist.
- `TabSpawnSpec` (`packages/orch/src/types/command.ts`) has `launch: LaunchPolicy` in place of `tools`, `workers`, `preferredModels`.
- The `spawn-headless` RPC params have a required `readOnly: { out: string | null } | null`, and no `env`, `tools`, `workers` or `preferredModels`.

Shapes the tasks of this wave build against (each is written by the task named):
- T1 adds to `launch-policy.ts`:
  `prepareRelaunch(state: DaemonState, view: AgentView, adapter: AgentAdapter, model: string | null): Promise<LaunchPolicy>` and
  `restartOpts(state: DaemonState, agent: HereAgent, view: AgentView, launch: LaunchPolicy, tuning: AgentTuning, form: FormId): BackendSpawnOpts`.
- T3 changes `relaunchPlace(state, agent, place, command, opts: BackendSpawnOpts)` and `relaunchTerminal(state, agent, quitText, command, opts: BackendSpawnOpts)` in `terminal-relaunch.ts`, and adds `opts: BackendSpawnOpts` to `PreparedTerminal` (the opts the terminal launches under, with its own env laid over the launch's).
- T4 adds `testLaunch(preferredModels: readonly string[] = []): LaunchPolicy` in `packages/orch/test/helpers/launch.ts`.
- T5 adds `writeClaudeInstallSettings(orchDir: OrchDir): string` in `packages/orch/test/helpers/settings.ts`.

## T1 The relaunch builders in launch-policy.ts, and restart-form.ts on them
Edit `packages/orch/src/daemon/server/launch-policy.ts`:
- Add imports: `CommandRefusal` from `../../refusal.ts`; `readOnlyOf` from `../../store/read-only-rows.ts`; `worktreeOf` from `../../store/agent-rows.ts`; `isThinkingLevel` from `../../policy/thinking.ts`; add `agentProjectDirectory` to the existing `./project-settings.ts` import; types `BackendSpawnOpts` from `../../types/backend.ts`, `FormId` from `../../types/form.ts`, `AgentTuning` and `AgentView` from `../../types/store.ts`, `HereAgent` from `../../types/agent-place.ts`.
- Append at the end of the file:
  ```ts
  /** The project an agent that exists relaunches in: the one recorded for it, else the directory it runs in. */
  function relaunchProject(state: DaemonState, view: AgentView): string {
    return agentProjectDirectory(state.directory, view.id) ?? view.environment.cwd;
  }

  /** Prepare the launch of an agent that already exists, on `adapter` with `model`: from its
   *  recorded project, and read-only when the store holds its read-only request. */
  export function prepareRelaunch(state: DaemonState, view: AgentView, adapter: AgentAdapter, model: string | null): Promise<LaunchPolicy> {
    const request = { adapter, project: relaunchProject(state, view), model: model ?? undefined, name: view.name, readOnly: readOnlyOf(state.directory, view.id) };
    return prepareLaunch(state, request, (message) => new CommandRefusal(message));
  }

  /** The spawn opts of a relaunch, from its prepared launch and its tuning: the one builder a
   *  restart, a form switch and a relaunch in place each use. */
  export function restartOpts(state: DaemonState, agent: HereAgent, view: AgentView, launch: LaunchPolicy, tuning: AgentTuning, form: FormId): BackendSpawnOpts {
    const worktree = worktreeOf(state.directory, agent);
    return {
      ...(worktree === null ? {} : { worktree }),
      form,
      key: view.id,
      name: view.name,
      orchDir: state.directory,
      project: relaunchProject(state, view),
      cwd: view.environment.cwd,
      ...(tuning.model === null ? {} : { model: tuning.model }),
      ...(isThinkingLevel(tuning.thinking) ? { thinking: tuning.thinking } : {}),
      preferredModels: launch.preferredModels,
      workers: launch.workers,
      tools: launch.tools,
      env: launch.env,
    };
  }
  ```
- Update the file's top comment's last sentence to: `a headless or held launch, one a linked host asked for, a form switch, a restart and a relaunch in place.`
Edit `packages/orch/src/daemon/server/handlers/restart-form.ts`:
- Delete the local `restartOpts` function (L62) and the doc comment above it that starts `/** The spawn opts of a restart, from what the store holds`.
- Add `import { prepareRelaunch, restartOpts } from "../launch-policy.ts";`.
- In `restartPipes`, replace `const opts = restartOpts(state, adapter, agent, view, view.form);` with
  `const launch = await prepareRelaunch(state, view, adapter, view.tuning.model);` and `const opts = restartOpts(state, agent, view, launch, view.tuning, view.form);`
- In `switchForm`, replace `const opts = restartOpts(state, adapter, agent, view, form);` with
  `const launch = await prepareRelaunch(state, view, adapter, view.tuning.model);` and `const opts = restartOpts(state, agent, view, launch, view.tuning, form);`
- Delete every import of the file that is then unused (likely `policyEnv`, `policyTools`, `relaunchPolicy`, `isThinkingLevel`, `worktreeOf`, `projectDirectory`, `agentSettings`; keep `installSettings`, which `requireReopen` uses).
Edit `packages/orch/src/daemon/server/agent-policy.ts`:
- Delete `relaunchPolicy` and its doc comment. Keep `storedHeaderContext`. Delete the imports that are then unused (`readOnlyPolicy`, `CommandRefusal`, `AgentAdapter`, `WorkerPolicy`, `OrchSettings`). Change the file's top comment to: `// What a worker header says about an agent that already exists, read back from the store.`
Verify: packages/orch/src/daemon/server/launch-policy.ts packages/orch/src/daemon/server/handlers/restart-form.ts packages/orch/src/daemon/server/agent-policy.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T2 relaunch.ts on the launch builders
Builds against T1's `prepareRelaunch` and `restartOpts`, and T3's `relaunchPlace(..., opts)`, `relaunchTerminal(..., opts)` and `PreparedTerminal.opts` (see the shapes at the top). Their files are not yours: a verify error that is only in them, or only about those names before they land, means report "pending".
Edit `packages/orch/src/daemon/server/handlers/relaunch.ts`:
- Imports: add `import { prepareRelaunch, refreshShim, restartOpts } from "../launch-policy.ts";`, `import type { LaunchPolicy } from "../../../types/policy.ts";`, `import type { AgentView } from "../../../types/store.ts";`. In the `../spawn/models.ts` import replace `adapterCommand` and `policyCommand` with `launchCommand`. Delete the imports of `refreshStaleShims`, `relaunchPolicy`, `policyEnv`/`policyTools`. After the edits below delete every other import that is unused (likely `installSettings`, `isThinkingLevel`, `projectDirectory`, `BackendSpawnOpts`).
- `reloadHere`: replace the `await refreshStaleShims(...)` line with `await refreshShim(state, adapter);`.
- Replace the whole `planRelaunch` function with these two:
  ```ts
  /** The harness and tuning a restart moves `key` onto, from its project's settings. Nothing is written. */
  function relaunchTarget(state: DaemonState, key: string, recorded: AgentAdapter, request: RestartRequest): { readonly adapter: AgentAdapter; readonly relaunch: Relaunch } {
    const view = agentView(state.directory, key);
    const settings = agentSettings(state, key);
    const named = request.harness === null ? null : resolveAdapterOrDie(request.harness);
    const switched = named === null || named.id === recorded.id ? null : named;
    const adapter = switched ?? recorded;
    const flags: AgentFlags = { ...(request.model === null ? {} : { modelFlag: request.model }), ...(request.thinking === null ? {} : { thinkingFlag: request.thinking }) };
    const tuning = resolveTuningOrDie(flags, settings, adapter.id, switched === null ? view?.tuning ?? null : null);
    const model = admitLaunchModel(settings, adapter.id, state.services.models, tuning.model);
    return { adapter, relaunch: { harnessId: adapter.id, model, thinking: tuning.thinking } };
  }

  /** What relaunching `agent` in place runs: its target, its launch prepared on this host, and the command. */
  async function planRelaunch(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest): Promise<{ readonly adapter: AgentAdapter; readonly relaunch: Relaunch; readonly view: AgentView; readonly launch: LaunchPolicy; readonly command: string }> {
    const view = agentView(state.directory, agent.id);
    if (view === null) throw new Error(`unknown agent: ${agent.id}`);
    const { adapter, relaunch } = relaunchTarget(state, agent.id, recorded, request);
    const launch = await prepareRelaunch(state, view, adapter, relaunch.model);
    if (launch.workers.readOnly !== null && request.cmd !== null) throw new CommandRefusal("this agent is read-only, and --cmd replaces the launch that holds it to that; restart it without --cmd");
    const command = request.cmd ?? launchCommand(adapter, launch, relaunch, state.directory);
    return { adapter, relaunch, view, launch, command };
  }
  ```
- `relaunchInPlace`: the first lines become
  ```ts
    const key = agent.id;
    const { adapter, relaunch, view, launch, command } = await planRelaunch(state, agent, recorded, request);
    if (view.form === null) throw new Error(`${view.name} records no form to relaunch in`);
    const opts = restartOpts(state, agent, view, launch, relaunch, view.form);
  ```
  and the `relaunchPlace(state, agent, place, command)` call gains `opts` as its last argument.
- `restartAttached`: replace the lines from `const { relaunch } = planRelaunch(state, key, recorded, request);` through the end of the `const opts: BackendSpawnOpts = { ... };` object with:
  ```ts
    const { relaunch } = relaunchTarget(state, key, recorded, request);
    // Built before the running session ends, so a refusal leaves the agent running.
    const launch = await prepareRelaunch(state, view, recorded, relaunch.model);
    const opts = restartOpts(state, agent, view, launch, relaunch, form);
    const sessionId = selectAgentStatus(state.directory, key)?.sessionId ?? null;
    await endSessionAgent(key);
  ```
  and the `relaunchTerminal(state, agent, quitText, command)` call gains `prepared.opts` as its last argument.
- `restartHere`: delete the line `if (request.harness !== null) await refreshStaleShims(...);`. The later `const { adapter, relaunch, command } = planRelaunch(state, key, recorded, request);` becomes `const { adapter, relaunch, command } = await planRelaunch(state, agent, recorded, request);`.
Verify: packages/orch/src/daemon/server/handlers/relaunch.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T3 A relaunch in place starts with the launch's env
Edit `packages/orch/src/types/backend.ts`, `RelaunchRole` (L90):
- `relaunch(handle: Handle, command: string, opts: BackendSpawnOpts): Promise<...>` (keep the return type). Above the method add the doc line `/** End the place's program and run \`command\` in a fresh place with the env \`opts\` builds. */` unless the interface already documents it; then extend that doc with the same sentence.
Edit `packages/orch/src/types/pty.ts` L75-77:
- `relaunchPid(pid: number, args: readonly string[], env: HeldStartRequest["env"]): Promise<{ readonly pid: number } | null>;` and its doc's end: `with the same program and directory, and \`env\` as its environment.`
Edit `packages/orch/src/daemon/server/held.ts`, `relaunchPid` (L135):
- Signature as in pty.ts. The `this.start(key, { ...source.request, args: [...args] })` call becomes `this.start(key, { ...source.request, args: [...args], env })`. In its doc comment, after the first sentence, add: `The new program starts with \`env\`, not the old one's, so a key the launch no longer sets is gone.`
Edit `packages/orch/src/backends/held/index.ts`, `heldRelaunch` (L99):
- `relaunch: async (handle, command, opts) => {` and the call becomes `boundPtys().relaunchPid(pid, shellRun(command).args, heldLaunchEnv(opts))`. The doc above it ends: `in a new PTY with the same directory and the environment the launch's opts build, as a held spawn does.`
Edit `packages/orch/src/daemon/server/terminal-relaunch.ts`:
- Add `BackendSpawnOpts` to the `../../types/backend.ts` type import.
- `relaunchPlace(state, agent, place, command, opts: BackendSpawnOpts)`: the call becomes `place.role.relaunch(place.handle, command, opts)`. Doc: append ` The fresh place starts with the env \`opts\` builds.`
- `relaunchTerminal(state, agent, quitText, command, opts: BackendSpawnOpts)`: pass `opts` to `relaunchPlace`. Append to its doc: `Only the relaunching environment takes \`opts\`'s env; a pane's shell keeps its own.`
Edit `packages/orch/src/types/held-session.ts`, `PreparedTerminal` (L128): after `env`, add
  ```ts
    /** The opts the terminal launches under: the launch's, with `env` laid over its env. */
    readonly opts: BackendSpawnOpts;
  ```
Edit `packages/orch/src/daemon/server/session-agents.ts`:
- `adoptTerminal` gains a last parameter `opts: BackendSpawnOpts`, and its `relaunchTerminal(state, placeHere(directory, key), quit, shellLine(argv))` call gains `opts`.
- `prepareTerminal`: after `const session = await role.attach(...)` add `const launched: BackendSpawnOpts = { ...opts, env: { ...opts.env, ...session.env } };`. The returned object gains `opts: launched,` after `env: session.env,`, and `adopt: () => adoptTerminal(state, adapter, key, session, launched),`.
- `startAttachedTerminal`: the `startHeldAgent(state.held, adapter, { ...opts, env: { ...opts.env, ...prepared.env } }, recording, { file, args })` call becomes `startHeldAgent(state.held, adapter, prepared.opts, recording, { file, args })`.
Edit `packages/orch/test/held-pty.test.ts` L54: `hold.relaunchPid(process.pid, [], {})`.
Any other `PreparedTerminal` object literal or `RelaunchRole` implementation the compiler names in `packages/orch/src` or `packages/orch/test` gets the same change. Do not run held-pty.test.ts.
Verify: packages/orch/src/types/backend.ts packages/orch/src/types/pty.ts packages/orch/src/daemon/server/held.ts packages/orch/src/backends/held/index.ts packages/orch/src/daemon/server/terminal-relaunch.ts packages/orch/src/types/held-session.ts packages/orch/src/daemon/server/session-agents.ts packages/orch/test/held-pty.test.ts
`relaunch.ts` is T2's: its errors about `relaunchPlace`/`relaunchTerminal` arguments are not yours, report "pending".
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T4 Test fixtures: the launch on a spec, readOnly on spawn-headless
Create `packages/orch/test/helpers/launch.ts`:
```ts
// A launch's policy for a test that builds a spawn spec by hand: the default settings' worker policy.
import { policyTools, workerPolicyFrom } from "../../src/policy/workers.ts";
import { SETTINGS_DEFAULTS } from "../../src/settings/schema.ts";
import type { LaunchPolicy } from "../../src/types/policy.ts";

/** The default settings' launch policy, with `preferredModels` as the harness's quicklist and no env. */
export function testLaunch(preferredModels: readonly string[] = []): LaunchPolicy {
  const workers = workerPolicyFrom(SETTINGS_DEFAULTS);
  return { workers, tools: policyTools(workers), env: {}, preferredModels };
}
```
In each `TabSpawnSpec` object literal below, replace `preferredModels: <value>,` with `launch: testLaunch(<value>),` (write `testLaunch()` when the value is `[]`), and add `import { testLaunch } from "./helpers/launch.ts";`:
- `packages/orch/test/one-writer-records-a-spawned-agent.test.ts` L92 and L123
- `packages/orch/test/owner-scoping.test.ts` L207
- `packages/orch/test/spawn-identity.test.ts` L102, L141, L174
In each `spawn-headless` params object below, add `readOnly: null,` after `project: ...,`:
- `packages/orch/test/acp-far.test.ts` L54
- `packages/orch/test/held-spawn.test.ts` L56, L71, L105, L119, L134, L148
- `packages/orch/test/helpers/held-far.ts` L96
Verify: packages/orch/test/helpers/launch.ts packages/orch/test/one-writer-records-a-spawned-agent.test.ts packages/orch/test/owner-scoping.test.ts packages/orch/test/spawn-identity.test.ts packages/orch/test/acp-far.test.ts packages/orch/test/held-spawn.test.ts packages/orch/test/helpers/held-far.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".

## T5 The tests that asserted the old plan, preview and request
Builds against T4's `testLaunch` in `packages/orch/test/helpers/launch.ts` (shape at the top). Do not run any test.
Edit `packages/orch/test/helpers/settings.ts`: add, with the imports it needs (`node:fs`, `node:path` if not imported; `claudeSettingsPath` and `CLAUDE_HOOK_EVENTS` from `../../src/adapters/claude-hooks.ts`):
```ts
/** The install's Claude settings file a Claude launch needs: one orch hook entry per hook event. */
export function writeClaudeInstallSettings(orchDir: OrchDir): string {
  const file = claudeSettingsPath(orchDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const hooks = Object.fromEntries(CLAUDE_HOOK_EVENTS.map((event) => [event, [{ hooks: [{ type: "command", command: `orch-hook ${event}` }] }]]));
  fs.writeFileSync(file, JSON.stringify({ hooks }));
  return file;
}
```
(Use the file's existing import names for fs and path if it has them.)
Edit `packages/orch/test/spawn-preferred-models.test.ts`:
- Import: replace `adapterCommand` with `launchCommand` from the same module; add `import { testLaunch } from "./helpers/launch.ts";`.
- `HEADLESS_BASE` (L49) gains `readOnly: null` after `project: "/repo"`.
- The three `spawnOneIntoTab` specs (near L125, L151, L178): `preferredModels: X,` becomes `launch: testLaunch(X),` (`testLaunch()` for `[]`). The `expect(seen()?.preferredModels)` assertions stay.
- The test "the previewed command is the command a launch runs" body becomes:
  ```ts
    const previewed = launchCommand(piAdapter, testLaunch(QUICKLIST), { model: "openai/gpt-5.6" }, null);
    expect(previewed).toContain("--model openai/gpt-5.6");
    expect(previewed).toContain(`--models '${QUICKLIST.join(",")}'`);

    expect(launchCommand(piAdapter, testLaunch(), { model: "openai/gpt-5.6" }, null)).not.toContain("--models");
  ```
- Replace the whole `describe("orchd rules on the quicklist it is sent", ...)` block with:
  ```ts
  describe("orchd takes only the read-only request on a spawn-headless", () => {
    test("accepts no request, and a request with or without an out directory", () => {
      expect(RPC_PARAMS["spawn-headless"].safeParse(HEADLESS_BASE).success).toBe(true);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: null } }).success).toBe(true);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: "/repo/out" } }).success).toBe(true);
    });

    test("refuses an absent request, a blank out directory, and a value that is not a request", () => {
      const absent = Object.fromEntries(Object.entries(HEADLESS_BASE).filter(([name]) => name !== "readOnly"));
      expect(RPC_PARAMS["spawn-headless"].safeParse(absent).success).toBe(false);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: { out: "" } }).success).toBe(false);
      expect(RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, readOnly: true }).success).toBe(false);
    });

    test("a policy the asking host sends is dropped: the launching host builds its own", () => {
      const parsed = RPC_PARAMS["spawn-headless"].safeParse({ ...HEADLESS_BASE, preferredModels: QUICKLIST, env: { A: "1" } });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect("preferredModels" in parsed.data).toBe(false);
        expect("env" in parsed.data).toBe(false);
      }
    });
  });
  ```
- Delete the `settings` helper (L51) and any import that is then unused.
Edit `packages/orch/test/commands-spawn.test.ts`:
- L234-235: replace the two `cmd.startsWith` lines with `expect(settings.agents.map((agent) => agent.cmd)).toEqual([null, null]);` and put the comment `// With no --cmd the plan carries no command: each launch builds its own.` above it.
- L255: delete the `preferredModels` assertion line.
- The test "a read-only agent is planned under a policy of its own" (near L365): rename it "a read-only agent is planned with its read-only request", and replace its four `expect` lines with:
  ```ts
      expect(plan.agents.map((agent) => agent.readOnly)).toEqual([{ out: "/repo/out/a" }, { out: "/repo/out/b" }]);
      expect(planned(parseSpawnFlags(["a", "--harness", "pi", "--read-only"]), settingsFor(dir)).agents[0]?.readOnly).toEqual({ out: null });
      expect(planned(parseSpawnFlags(["a", "--harness", "pi"]), settingsFor(dir)).agents[0]?.readOnly).toBeNull();
  ```
Edit `packages/orch/test/commands-lifecycle.test.ts`, the test "restart --harness quits with the old harness, launches the new one, and records it":
- Remove `adapterCommand` from the import at L8 (delete the import line if it held only that). Add `import { writeClaudeInstallSettings } from "./helpers/settings.ts";` (merge into an existing import of that file if there is one).
- Right after `seedLiveProcess(root, key);` add `writeClaudeInstallSettings(root);` with the comment `// A Claude launch refuses an install with no Claude settings file.`
- Replace `expect(submitted).toEqual([ quit.text, adapterCommand(...), ]);` with:
  ```ts
      expect(submitted).toHaveLength(2);
      expect(submitted[0]).toBe(quit.text);
      // The restart's command is the real launch: on the new model, under a worker settings snapshot.
      expect(submitted[1]).toStartWith("claude ");
      expect(submitted[1]).toContain(`--model ${tuning.model}`);
      expect(submitted[1]).toMatch(/--settings \S*settings\.[0-9a-f]{64}\.json/);
  ```
- If `settings` in that test is then unused except by `resolveTuningOrDie`, keep it.
Verify: packages/orch/test/helpers/settings.ts packages/orch/test/spawn-preferred-models.test.ts packages/orch/test/commands-spawn.test.ts packages/orch/test/commands-lifecycle.test.ts
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>, verify clean", "pending: <files>", or "blocked: <exact error>".
