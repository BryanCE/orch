# L22 restart paths

## 1. `restartOpts` and callers

`packages/orch/src/daemon/server/handlers/restart-form.ts:62`:
```ts
function restartOpts(state: DaemonState, adapter: AgentAdapter, agent: HereAgent, view: AgentView, form: FormId): BackendSpawnOpts {
  const { model, thinking } = view.tuning;
  const worktree = worktreeOf(state.directory, agent);
  const settings = agentSettings(state, view.id);
  const workers = relaunchPolicy(state.directory, settings, adapter, view.id);
  return {
    ...(worktree === null ? {} : { worktree }),
    form,
    key: view.id,
    name: view.name,
    orchDir: state.directory,
    project: projectDirectory(state.directory, view.id, view.environment.cwd),
    cwd: view.environment.cwd,
    ...(model === null ? {} : { model }),
    ...(isThinkingLevel(thinking) ? { thinking } : {}),
    preferredModels: settings.models.preferred[adapter.id] ?? [],
    ...(workers === undefined ? {} : { workers, tools: policyTools(workers), env: policyEnv(adapter, model ?? undefined, workers) }),
  };
}
```

- `restart-form.ts:119`, `restartPipes` (async): `const opts = restartOpts(state, adapter, agent, view, view.form);`
- `restart-form.ts:154`, `switchForm` (async): `const opts = restartOpts(state, adapter, agent, view, form);`

## 2. `relaunch.ts`

`planRelaunch`, `packages/orch/src/daemon/server/handlers/relaunch.ts:97`:
```ts
function planRelaunch(state: DaemonState, key: string, recorded: AgentAdapter, request: RestartRequest): { readonly adapter: AgentAdapter; readonly relaunch: Relaunch; readonly command: string } {
  const view = agentView(state.directory, key);
  const settings = agentSettings(state, key);
  const named = request.harness === null ? null : resolveAdapterOrDie(request.harness);
  const switched = named === null || named.id === recorded.id ? null : named;
  const adapter = switched ?? recorded;
  const flags: AgentFlags = { ...(request.model === null ? {} : { modelFlag: request.model }), ...(request.thinking === null ? {} : { thinkingFlag: request.thinking }) };
  const tuning = resolveTuningOrDie(flags, settings, adapter.id, switched === null ? view?.tuning ?? null : null);
  const model = admitLaunchModel(settings, adapter.id, state.services.models, tuning.model);
  const workers = relaunchPolicy(state.directory, settings, adapter, key);
  if (workers !== undefined && request.cmd !== null) throw new CommandRefusal("this agent is read-only, and --cmd replaces the launch that holds it to that; restart it without --cmd");
  const launch = { model, thinking: tuning.thinking, preferredModels: settings.models.preferred[adapter.id] ?? [] };
  const command = request.cmd ?? (workers === undefined ? adapterCommand(adapter.id, settings, launch) : policyCommand(adapter.id, workers, launch));
  return { adapter, relaunch: { harnessId: adapter.id, model, thinking: tuning.thinking }, command };
}
```

`restartAttached`, `:148`:
```ts
async function restartAttached(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest): Promise<LifecycleOutcome | null> {
  const key = agent.id;
  const role = terminalAttach(recorded);
  const view = agentView(state.directory, key);
  const form = view?.form ?? null;
  if (role === null || view === null || form === null || FORM_STDIO[form] !== "terminal" || request.cmd !== null || (request.harness !== null && request.harness !== recorded.id)) return null;
  const { text: quitText } = recordedHarness(state, key, "restart");
  const { relaunch } = planRelaunch(state, key, recorded, request);
  const sessionId = selectAgentStatus(state.directory, key)?.sessionId ?? null;
  await endSessionAgent(key);
  const workers = relaunchPolicy(state.directory, agentSettings(state, key), recorded, key);
  const opts: BackendSpawnOpts = {
    form,
    key,
    orchDir: state.directory,
    project: projectDirectory(state.directory, key, view.environment.cwd),
    cwd: view.environment.cwd,
    ...(relaunch.model === null ? {} : { model: relaunch.model }),
    ...(isThinkingLevel(relaunch.thinking) ? { thinking: relaunch.thinking } : {}),
    ...(workers === undefined ? {} : { workers, tools: policyTools(workers), env: policyEnv(recorded, relaunch.model ?? undefined, workers) }),
  };
  const prepared = await prepareTerminal(state, recorded, role, opts, sessionId);
  const command = shellLine(prepared.program);
  reclaim(state.directory, { target: key, relaunch });
  try {
    await relaunchTerminal(state, agent, quitText, command);
  } catch (error: unknown) {
    prepared.abandon();
    return outcomeOf(state, agent, { ok: false, reason: `relaunch failed: ${errorMessage(error)}`, command, relaunched: relaunch, bridge: false });
  }
  await prepared.adopt();
  return outcomeOf(state, agent, { ok: true, reason: null, command, relaunched: relaunch, bridge: true });
}
```

`relaunchInPlace`, `:130` (async):
```ts
async function relaunchInPlace(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest, place: { readonly role: RelaunchRole; readonly handle: BackendHandle }): Promise<LifecycleOutcome> {
  const key = agent.id;
  const { adapter, relaunch, command } = planRelaunch(state, key, recorded, request);
  preTrust(state, agent, adapter, command);
  const wasUpdatedAt = selectAgentStatus(state.directory, key)?.updatedAt;
  reclaim(state.directory, { target: key, relaunch });
  try {
    await relaunchPlace(state, agent, place, command);
  } catch (error: unknown) {
    return outcomeOf(state, agent, { ok: false, reason: `relaunch failed: ${errorMessage(error)}`, command, relaunched: relaunch, bridge: false });
  }
  return awaitRelaunchedBridge(state, agent, wasUpdatedAt, command, relaunch);
}
```

`restartInForm`, `:185` (async):
```ts
async function restartInForm(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest): Promise<LifecycleOutcome | null> {
  const current = agentView(state.directory, agent.id)?.form ?? null;
  const switching = request.form !== null && request.form !== current;
  if (!switching && (current === null || FORM_STDIO[current] !== "pipes")) return null;
  if (request.harness !== null || request.model !== null || request.thinking !== null || request.cmd !== null) {
    throw new Error(`cannot restart ${agent.id} in a form and on another harness, model or command at once`);
  }
  const wasUpdatedAt = selectAgentStatus(state.directory, agent.id)?.updatedAt;
  const { awaitBridge } = request.form !== null && switching ? await switchForm(state, agent, recorded, request.form) : await restartPipes(state, agent, recorded);
  if (!awaitBridge) return outcomeOf(state, agent, { ok: true, reason: null, command: null, relaunched: null, bridge: false });
  if (await pollReady(state, "await relaunched bridge", () => bridgeLive(state, agent, wasUpdatedAt))) return outcomeOf(state, agent, { ok: true, reason: null, command: null, relaunched: null, bridge: true });
  return outcomeOf(state, agent, { ok: false, reason: `relaunched but bridge status did not refresh within ${readySeconds(state)}s`, command: null, relaunched: null, bridge: false });
}
```

`restartHere`, `:204` (async):
```ts
async function restartHere(state: DaemonState, agent: HereAgent, request: RestartRequest): Promise<LifecycleOutcome> {
  const key = agent.id;
  const recorded = recordedAdapter(state, key, "restart");
  const inForm = await restartInForm(state, agent, recorded, request);
  if (inForm !== null) return inForm;
  const attached = await restartAttached(state, agent, recorded, request);
  if (attached !== null) return attached;
  if (request.harness !== null) await refreshStaleShims(state.directory, state.services.logger, [resolveAdapterOrDie(request.harness).id], installSettings(state));
  const route = resolveTargetRoute(state.directory, agent);
  const relaunching = route?.backend.relaunching ?? null;
  if (route !== undefined && relaunching !== null) return relaunchInPlace(state, agent, recorded, request, { role: relaunching, handle: route.handle });
  const { text: quitText } = recordedHarness(state, key, "restart");
  const pane = inputPane(state, agent);
  if (pane === null) {
    const retuned = (request.harness !== null && request.harness !== recorded.id) || request.model !== null;
    if (retuned) throw new Error(`cannot relaunch ${key} on another harness or model: its environment takes no input. Close it and spawn again.`);
    reclaim(state.directory, { target: key });
    return verbAndAwaitBridge(state, agent, "restart", null);
  }
  const { adapter, relaunch, command } = planRelaunch(state, key, recorded, request);
  preTrust(state, agent, adapter, command);
  if (!await quitToShell(state, pane, quitText)) {
    state.services.logger.warn("lifecycle.restart-exit-timeout", { command: quitText }, { agentId: key });
    return outcomeOf(state, agent, { ok: false, reason: `agent did not exit after ${quitText} - skipping relaunch`, command, relaunched: null, bridge: false });
  }
  reclaim(state.directory, { target: key, relaunch });
  pane.input.submit(pane.handle, command);
  return awaitRelaunchedBridge(state, agent, undefined, command, relaunch);
}
```

`reloadHere`, `:89` (async):
```ts
async function reloadHere(state: DaemonState, agent: HereAgent): Promise<LifecycleOutcome> {
  const { adapter } = recordedHarness(state, agent.id, "reload");
  await refreshStaleShims(state.directory, state.services.logger, [adapter.id], installSettings(state));
  return verbAndAwaitBridge(state, agent, "reload", null);
}
```

`refreshStaleShims` calls: `relaunch.ts:91` in `reloadHere`; `relaunch.ts:211` in `restartHere`.

## 3. `relaunchPolicy` callers

`packages/orch/src/daemon/server/handlers/restart-form.ts:66` in `restartOpts`; `packages/orch/src/daemon/server/handlers/relaunch.ts:106` in `planRelaunch`; `packages/orch/src/daemon/server/handlers/relaunch.ts:158` in `restartAttached`.

## 4. Terminal relaunch callers

- `relaunchPlace`, `terminal-relaunch.ts:42`: called from `terminal-relaunch.ts:67` in async `relaunchTerminal`, and `handlers/relaunch.ts:137` in async `relaunchInPlace`. Neither has `BackendSpawnOpts` nor launch opts in scope; each passes a command string.
- `relaunchTerminal`, `terminal-relaunch.ts:63`: called from `handlers/relaunch.ts:173` in async `restartAttached`, where `opts: BackendSpawnOpts` is in scope and used for `prepareTerminal`; and `session-agents.ts:259` in async `adoptTerminal`, where no `BackendSpawnOpts` or launch opts are in scope (it relaunches `shellLine(argv)`).

## 5. Held PTY

`packages/orch/src/daemon/server/held.ts:135`, full `relaunchPid`:
```ts
async relaunchPid(pid: number, args: readonly string[]): Promise<{ readonly pid: number } | null> {
  const held = this.byPid(pid);
  if (held === null) return null;
  const { key, entry, source } = held;
  const subscribers = [...entry.subscribers];
  entry.subscribers.clear();
  const { cols, rows } = entry.terminal;
  const exit = await new Promise<PtyExit>((resolve) => {
    entry.subscribers.add({ onData: () => undefined, onExit: resolve });
    source.pty.kill();
  });
  let started: { readonly pid: number };
  try {
    started = await this.start(key, { ...source.request, args: [...args] });
  } catch (error: unknown) {
    for (const subscriber of subscribers) subscriber.onExit(exit);
    throw error;
  }
  const next = this.entry(key);
  if (next.source.kind === "pty") next.source.pty.resize(cols, rows);
  next.terminal.resize(cols, rows);
  for (const subscriber of subscribers) {
    subscriber.onData(RESET_SCREEN);
    next.subscribers.add(subscriber);
  }
  return started;
}
```

`packages/orch/src/backends/held/index.ts:170`, `heldLaunchEnv`:
```ts
export function heldLaunchEnv(opts: BackendSpawnOpts, extra: Readonly<Record<string, string>> = {}): Record<string, string> {
  return definedEnv({ ...process.env, ...heldAgentEnv(opts), ...extra });
}
```

`heldRelaunch`, `:99`:
```ts
const heldRelaunch: RelaunchRole<HeldHandle> = {
  relaunch: async (handle, command) => {
    const pid = requirePid(handle);
    const relaunched = await boundPtys().relaunchPid(pid, shellRun(command).args);
    if (relaunched === null) throw new Error(`no PTY held here runs pid ${pid}`);
    const next = String(relaunched.pid);
    return { handle: next, process: heldBackend.process.running(next) };
  },
};
```

The environment reaches the PTY at `backends/held/index.ts:226-232`, in `startHeldAgent`: `holder.start(key, { ...program, cwd: heldCwd(opts), env: heldLaunchEnv(opts) })`. `relaunchPid` preserves `source.request` and changes only `args`; thus the recorded request's env reaches the restarted PTY.

## 6. `session-agents.ts` relaunching function

`packages/orch/src/daemon/server/session-agents.ts:251`, whole function:
```ts
async function adoptTerminal(state: DaemonState, adapter: AgentAdapter, key: string, session: TerminalSession): Promise<void> {
  const directory = state.directory;
  if (held.has(key)) throw new Error(`a session is already held for ${key}`);
  const quit = adapter.lifecycleControl?.lifecycleCmd("restart")?.text;
  const terminal: TerminalControl = {
    relaunch: async (argv) => {
      if (quit === undefined) throw new Error(`harness ${adapter.id} declares no text that quits its terminal program`);
      await relaunchTerminal(state, placeHere(directory, key), quit, shellLine(argv));
    },
  };
  let opened: HeldSession;
  try {
    opened = await session.open(sessionEvents(state, key, null, { current: null }), terminal);
  } catch (error: unknown) {
    session.release();
    throw error;
  }
  const link = opened.link;
  let ended = false;
  held.set(key, {
    shared: false,
    async end() {
      if (ended) return;
      ended = true;
      detachLink(directory, key, link);
```

