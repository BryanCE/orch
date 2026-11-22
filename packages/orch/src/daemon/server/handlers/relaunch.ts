import { shellCommand, shellLaunchLine } from "../../../shared/shell.ts";
import { agentLaunchEnv } from "../../../policy/spawner.ts";
import { policyEnvNames } from "../../../policy/workers.ts";
import type { LaunchProgram } from "../../../types/backend.ts";
// Reload and restart: the harness relaunched in place, where the agent runs. This orchd does it
// for its own agents through their plexer and records the relaunch; an agent on a linked host is
// that host's orchd's to reload or restart, with its own settings and code.
import { agentSettings } from "../project-settings.ts";
import { errorMessage } from "../../../util.ts";
import { prepareRelaunch, refreshShim, restartOpts } from "../launch-policy.ts";
import type { LaunchPolicy } from "../../../types/policy.ts";
import type { AgentView } from "../../../types/store.ts";
import { resolveTargetRoute } from "../../../control/dispatch.ts";
import { getAdapter } from "../../../adapters/registry.ts";
import { agentView } from "../../../store/agent-view.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { agentLocation } from "../../../store/interval-rows.ts";
import { hereIsLive } from "../../../process-place.ts";
import { resolveTuningOrDie } from "../../../shared/tuning.ts";
import { CommandRefusal } from "../../../refusal.ts";
import { launchArgv, admitLaunchModel, resolveAdapterOrDie } from "../spawn/models.ts";
import { applyVerb, reclaim } from "./lifecycle.ts";
import { restartPipes, switchForm } from "./restart-form.ts";
import { governWrite } from "./write.ts";
import { clearPrompt, inputPane, pollReady, quitToShell, relaunchPlace, relaunchTerminal } from "../terminal-relaunch.ts";
import { endSessionAgent, prepareTerminal, terminalAttach } from "../session-agents.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import type { BackendHandle, RelaunchRole } from "../../../types/backend.ts";
import type { AgentAdapter, LifecycleVerb } from "../../../types/adapter.ts";
import type { AgentFlags } from "../../../types/command.ts";
import { FORM_STDIO } from "../../../types/form.ts";
import type { LifecycleOutcome, LifecycleRequest, ParamsOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";
import type { HereAgent } from "../../../types/agent-place.ts";

type RestartRequest = Extract<LifecycleRequest, { verb: "restart" }>;

/** The harness and tuning a restart moves an agent onto. */
type Relaunch = NonNullable<LifecycleOutcome["relaunched"]>;

function readySeconds(state: DaemonState): number {
  return Math.round(state.services.settings.current().timeouts.reset_ready_ms / 1000);
}

/** The agent's bridge reports while its process is live, from a report newer than `wasUpdatedAt`. */
function bridgeLive(state: DaemonState, agent: HereAgent, wasUpdatedAt: number | undefined): boolean {
  const status = selectAgentStatus(state.directory, agent.id);
  return status !== undefined
    && hereIsLive(state.directory, agent)
    && (wasUpdatedAt === undefined || status.updatedAt > wasUpdatedAt);
}

/** A lifecycle outcome with the form the agent runs in now. */
function outcomeOf(state: DaemonState, agent: HereAgent, fields: Omit<LifecycleOutcome, "form">): LifecycleOutcome {
  return { ...fields, form: agentView(state.directory, agent.id)?.form ?? null };
}

/** Apply a lifecycle verb through the agent's one lifecycle mechanism, and answer once its
 *  bridge reports again. */
async function verbAndAwaitBridge(state: DaemonState, agent: HereAgent, verb: LifecycleVerb, command: string | null): Promise<LifecycleOutcome> {
  const wasUpdatedAt = selectAgentStatus(state.directory, agent.id)?.updatedAt;
  const pane = inputPane(state, agent);
  try {
    if (pane !== null) await clearPrompt(state, pane);
    await applyVerb(state, agent, verb);
  } catch (error: unknown) {
    return outcomeOf(state, agent, { ok: false, reason: errorMessage(error), command, relaunched: null, bridge: false });
  }
  if (await pollReady(state, `await bridge after ${verb}`, () => bridgeLive(state, agent, wasUpdatedAt))) return outcomeOf(state, agent, { ok: true, reason: null, command, relaunched: null, bridge: true });
  return outcomeOf(state, agent, { ok: false, reason: `bridge status did not refresh within ${readySeconds(state)}s after ${verb}`, command, relaunched: null, bridge: false });
}

/** The recorded harness of an agent this orchd runs. */
function recordedAdapter(state: DaemonState, key: string, verb: LifecycleVerb): AgentAdapter {
  const harness = agentView(state.directory, key)?.harnessId;
  const adapter = harness === undefined ? undefined : getAdapter(harness);
  if (adapter === undefined) throw new Error(`${key} has no recorded harness - cannot determine its ${verb} mechanism`);
  return adapter;
}

/** The recorded harness of an agent this orchd runs, and its text for `verb`. */
function recordedHarness(state: DaemonState, key: string, verb: LifecycleVerb): { readonly adapter: AgentAdapter; readonly text: string } {
  const adapter = recordedAdapter(state, key, verb);
  const command = adapter.lifecycleControl?.lifecycleCmd(verb);
  if (!command) throw new Error(`adapter ${adapter.id} has no ${verb} mechanism`);
  return { adapter, text: command.text };
}

/** Reload an agent this orchd runs: stale shims for its harness redeploy first, since a reload
 *  exists to pick up new code. */
async function reloadHere(state: DaemonState, agent: HereAgent): Promise<LifecycleOutcome> {
  const { adapter } = recordedHarness(state, agent.id, "reload");
  await refreshShim(state, adapter);
  return verbAndAwaitBridge(state, agent, "reload", null);
}

/** The harness and tuning a restart moves onto, without writing state. */
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

/** Prepare the target launch and its command before ending the running agent. */
async function planRelaunch(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest): Promise<{ readonly adapter: AgentAdapter; readonly relaunch: Relaunch; readonly view: AgentView; readonly launch: LaunchPolicy; readonly program: LaunchProgram; readonly command: string }> {
  const view = agentView(state.directory, agent.id);
  if (view === null) throw new Error(`unknown agent: ${agent.id}`);
  const { adapter, relaunch } = relaunchTarget(state, agent.id, recorded, request);
  const launch = await prepareRelaunch(state, view, adapter, relaunch.model);
  if (launch.workers.readOnly !== null && request.cmd !== null) throw new CommandRefusal("this agent is read-only, and --cmd replaces the launch that holds it to that; restart it without --cmd");
  const program: LaunchProgram = request.cmd === null ? { kind: "argv", argv: launchArgv(adapter, launch, relaunch, state.directory) } : { kind: "shell", line: request.cmd };
  const command = shellCommand("posix", program);
  return { adapter, relaunch, view, launch, program, command };
}

/** The planned harness may need its workspace trusted before it starts there. */
function preTrust(state: DaemonState, agent: HereAgent, adapter: AgentAdapter, command: string): void {
  const cwd = agentLocation(state.directory, agent.id)?.cwd;
  if (cwd !== undefined) adapter.workspaceTrust?.preTrustWorkspace(cwd, command);
}

/** Answer a restart once the relaunched harness's bridge reports, from a report newer than
 *  `wasUpdatedAt`; the store has moved the agent onto `relaunch` either way. */
async function awaitRelaunchedBridge(state: DaemonState, agent: HereAgent, wasUpdatedAt: number | undefined, command: string, relaunch: Relaunch): Promise<LifecycleOutcome> {
  if (await pollReady(state, "await relaunched bridge", () => bridgeLive(state, agent, wasUpdatedAt))) return outcomeOf(state, agent, { ok: true, reason: null, command, relaunched: relaunch, bridge: true });
  state.services.logger.warn("lifecycle.restart-bridge-timeout", {}, { agentId: agent.id });
  return outcomeOf(state, agent, { ok: false, reason: `relaunched but bridge status did not refresh within ${readySeconds(state)}s`, command, relaunched: relaunch, bridge: false });
}

/** Restart an agent whose place is its harness's own program: the environment ends it and runs
 *  the planned harness in a fresh place for the same agent, whose process and handle the store
 *  then records. The relaunched harness claims the row afresh, so the old claim goes first. */
async function relaunchInPlace(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest, place: { readonly role: RelaunchRole; readonly handle: BackendHandle }): Promise<LifecycleOutcome> {
  const key = agent.id;
  const { adapter, relaunch, view, launch, program, command } = await planRelaunch(state, agent, recorded, request);
  if (view.form === null) throw new Error(`${view.name} records no form to relaunch in`);
  const opts = restartOpts(state, agent, view, launch, relaunch, view.form);
  preTrust(state, agent, adapter, command);
  const wasUpdatedAt = selectAgentStatus(state.directory, key)?.updatedAt;
  reclaim(state.directory, { target: key, relaunch });
  try {
    await relaunchPlace(state, agent, place, program, opts);
  } catch (error: unknown) {
    return outcomeOf(state, agent, { ok: false, reason: `relaunch failed: ${errorMessage(error)}`, command, relaunched: relaunch, bridge: false });
  }
  return awaitRelaunchedBridge(state, agent, wasUpdatedAt, command, relaunch);
}

/** Restart a terminal agent whose terminal program attaches to its session on a server orchd
 *  holds: orchd lets the session go, relaunches the terminal program on the recorded session, or a
 *  fresh one when none is recorded, and drives it again. Null for any other agent, and for a
 *  restart onto another harness or command, which relaunches the plain way. */
async function restartAttached(state: DaemonState, agent: HereAgent, recorded: AgentAdapter, request: RestartRequest): Promise<LifecycleOutcome | null> {
  const key = agent.id;
  const role = terminalAttach(recorded);
  const view = agentView(state.directory, key);
  const form = view?.form ?? null;
  if (role === null || view === null || form === null || FORM_STDIO[form] !== "terminal" || request.cmd !== null || (request.harness !== null && request.harness !== recorded.id)) return null;
  const { text: quitText } = recordedHarness(state, key, "restart");
  const { relaunch } = relaunchTarget(state, key, recorded, request);
  // Built before the running session ends, so a refusal leaves the agent running.
  const launch = await prepareRelaunch(state, view, recorded, relaunch.model);
  const opts = restartOpts(state, agent, view, launch, relaunch, form);
  const sessionId = selectAgentStatus(state.directory, key)?.sessionId ?? null;
  await endSessionAgent(key);
  const prepared = await prepareTerminal(state, recorded, role, opts, sessionId);
  const program: LaunchProgram = { kind: "argv", argv: prepared.program };
  const command = shellCommand("posix", program);
  reclaim(state.directory, { target: key, relaunch });
  try {
    await relaunchTerminal(state, agent, quitText, program, prepared.opts);
  } catch (error: unknown) {
    prepared.abandon();
    return outcomeOf(state, agent, { ok: false, reason: `relaunch failed: ${errorMessage(error)}`, command, relaunched: relaunch, bridge: false });
  }
  await prepared.adopt();
  return outcomeOf(state, agent, { ok: true, reason: null, command, relaunched: relaunch, bridge: true });
}

/** Restart an agent whose process orchd holds in a form: in `request.form` when that is another
 *  form, else in the form it has when that one needs pipes. Null when neither applies. A harness
 *  that reports through a bridge is done once it reports again. */
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

/** Restart an agent this orchd runs. A place whose program is the harness itself is relaunched
 *  by its environment. Otherwise: type the harness's quit, wait for the shell, then launch the
 *  planned harness in the same pane; the store moves to the new harness only after the old one
 *  exits. An agent whose environment takes no input is restarted by its lifecycle mechanism, on
 *  what it runs now. */
async function restartHere(state: DaemonState, agent: HereAgent, request: RestartRequest): Promise<LifecycleOutcome> {
  const key = agent.id;
  const recorded = recordedAdapter(state, key, "restart");
  const inForm = await restartInForm(state, agent, recorded, request);
  if (inForm !== null) return inForm;
  const attached = await restartAttached(state, agent, recorded, request);
  if (attached !== null) return attached;
  const route = resolveTargetRoute(state.directory, agent);
  const relaunching = route?.backend.relaunching ?? null;
  if (route !== undefined && relaunching !== null) return relaunchInPlace(state, agent, recorded, request, { role: relaunching, handle: route.handle });
  const { text: quitText } = recordedHarness(state, key, "restart");
  const pane = inputPane(state, agent);
  if (pane === null) {
    const retuned = (request.harness !== null && request.harness !== recorded.id) || request.model !== null;
    if (retuned) throw new Error(`cannot relaunch ${key} on another harness or model: its environment takes no input. Close it and spawn again.`);
    // The relaunched harness claims the row afresh, so the old claim goes first.
    reclaim(state.directory, { target: key });
    return verbAndAwaitBridge(state, agent, "restart", null);
  }
  const { adapter, relaunch, view, launch, program, command } = await planRelaunch(state, agent, recorded, request);
  preTrust(state, agent, adapter, command);
  if (view.form === null) throw new Error(`${view.name} records no form to relaunch in`);
  // The pane's shell still holds the old launch's env: the line sets the new one and removes what it dropped.
  const opts = restartOpts(state, agent, view, launch, relaunch, view.form);
  const line = shellLaunchLine(pane.input.shell, program, agentLaunchEnv(opts), policyEnvNames(adapter));
  if (!await quitToShell(state, pane, quitText)) {
    state.services.logger.warn("lifecycle.restart-exit-timeout", { command: quitText }, { agentId: key });
    return outcomeOf(state, agent, { ok: false, reason: `agent did not exit after ${quitText} - skipping relaunch`, command, relaunched: null, bridge: false });
  }
  reclaim(state.directory, { target: key, relaunch });
  pane.input.submit(pane.handle, line);
  return awaitRelaunchedBridge(state, agent, undefined, command, relaunch);
}

/** Reload or restart an agent this orchd runs, ruled on already. */
export function lifecycleHere(state: DaemonState, agent: HereAgent, request: LifecycleRequest): Promise<LifecycleOutcome> {
  switch (request.verb) {
    case "reload":
      return reloadHere(state, agent);
    case "restart":
      return restartHere(state, agent, request);
    default: {
      const exhaustive: never = request;
      throw new Error(`unknown lifecycle request ${String(exhaustive)}`);
    }
  }
}

/** `lifecycle`: reload or restart an agent where it runs. One on a linked host is relaunched by
 *  that host's orchd; this host's row then follows it onto the harness and tuning it moved to. */
export async function applyLifecycle(state: DaemonState, params: ParamsOf<"lifecycle">): Promise<LifecycleOutcome> {
  const { target, request } = params;
  governWrite(state, target, params);
  return atAgentHost(state, target, {
    here: (agent) => lifecycleHere(state, agent, request),
    there: async (link) => {
      const { ok, reason, command, relaunched, bridge, form } = await driveOnHost(state, link, { action: "lifecycle", key: target, request, actor: params.actor ?? null });
      if (relaunched !== null) reclaim(state.directory, { target, relaunch: relaunched });
      return { ok, reason, command, relaunched, bridge, form };
    },
  });
}
