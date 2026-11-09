// Reload and restart: the harness relaunched in place, where the agent runs. This orchd does it
// for its own agents through their plexer and records the relaunch; an agent on a linked host is
// that host's orchd's to reload or restart, with its own settings and code.
import { retryingAsync } from "../../../retry.ts";
import { errorMessage, sleep } from "../../../util.ts";
import { refreshStaleShims } from "../doctor/runner.ts";
import { resolveTargetRoute } from "../../../control/dispatch.ts";
import { foregroundOf } from "../../../backends/shell-ready.ts";
import { atShellPrompt } from "../../../shared/shell-prompt.ts";
import { getAdapter } from "../../../adapters/registry.ts";
import { agentView } from "../../../store/agent-view.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { agentLocation } from "../../../store/interval-rows.ts";
import { hereIsLive } from "../../../process-place.ts";
import { resolveTuningOrDie } from "../../../shared/tuning.ts";
import { adapterCommand, admitLaunchModel, resolveAdapterOrDie } from "../spawn/models.ts";
import { applyVerb, reclaim } from "./lifecycle.ts";
import { governWrite } from "./write.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import type { AgentInputRole, Backend, BackendHandle } from "../../../types/backend.ts";
import type { AgentAdapter, LifecycleVerb } from "../../../types/adapter.ts";
import type { AgentFlags } from "../../../types/command.ts";
import type { ThinkingLevel } from "../../../types/policy.ts";
import type { LifecycleOutcome, LifecycleRequest, ParamsOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";
import type { HereAgent } from "../../../types/agent-place.ts";

type RestartRequest = Extract<LifecycleRequest, { verb: "restart" }>;

/** The pane an agent sits in, when its environment takes typed input. */
interface InputPane {
  readonly backend: Backend;
  readonly input: AgentInputRole;
  readonly handle: BackendHandle;
}

function inputPane(state: DaemonState, agent: HereAgent): InputPane | null {
  const route = resolveTargetRoute(state.directory, agent);
  const input = route?.backend.agentInput ?? null;
  return route === undefined || input === null ? null : { backend: route.backend, input, handle: route.handle };
}

/** Poll until `probe` holds, for as long as a reset waits on an agent. */
function pollReady(state: DaemonState, label: string, probe: () => boolean): Promise<boolean> {
  const { reset_ready_ms: readyMs, reset_poll_ms: pollMs } = state.services.settings.current().timeouts;
  return retryingAsync(label, probe, { attempts: Math.ceil(readyMs / pollMs), delayMs: pollMs, backoff: 1 }, { retryOnResult: (held) => !held });
}

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

/** Clear whatever is typed at the agent's prompt before typing a command of orch's. */
async function clearPrompt(state: DaemonState, pane: InputPane): Promise<void> {
  pane.input.sendKeys(pane.handle, ["Escape"]);
  await sleep(state.services.settings.current().timeouts.abort_gap_ms);
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
    return { ok: false, reason: errorMessage(error), command };
  }
  if (await pollReady(state, `await bridge after ${verb}`, () => bridgeLive(state, agent, wasUpdatedAt))) return { ok: true, reason: null, command };
  return { ok: false, reason: `bridge status did not refresh within ${readySeconds(state)}s after ${verb}`, command };
}

/** The recorded harness of an agent this orchd runs, and its text for `verb`. */
function recordedHarness(state: DaemonState, key: string, verb: LifecycleVerb): { readonly adapter: AgentAdapter; readonly text: string } {
  const harness = agentView(state.directory, key)?.harnessId;
  const adapter = harness === undefined ? undefined : getAdapter(harness);
  if (adapter === undefined) throw new Error(`${key} has no recorded harness - cannot determine its ${verb} mechanism`);
  const command = adapter.lifecycleControl?.lifecycleCmd(verb);
  if (!command) throw new Error(`adapter ${adapter.id} has no ${verb} mechanism`);
  return { adapter, text: command.text };
}

/** Reload an agent this orchd runs: stale shims for its harness redeploy first, since a reload
 *  exists to pick up new code. */
async function reloadHere(state: DaemonState, agent: HereAgent): Promise<LifecycleOutcome> {
  const { adapter } = recordedHarness(state, agent.id, "reload");
  await refreshStaleShims(state.directory, state.services.logger, [adapter.id], state.services.settings.current());
  return verbAndAwaitBridge(state, agent, "reload", null);
}

/** What a restart relaunches: the harness named, else the recorded one; the model and thinking
 *  named, else the tuning the agent holds, which another harness never inherits. */
function planRelaunch(state: DaemonState, key: string, recorded: AgentAdapter, request: RestartRequest): { readonly adapter: AgentAdapter; readonly model: string; readonly thinking: ThinkingLevel; readonly command: string } {
  const view = agentView(state.directory, key);
  const settings = state.services.settings.current();
  const named = request.harness === null ? null : resolveAdapterOrDie(request.harness);
  const switched = named === null || named.id === recorded.id ? null : named;
  const adapter = switched ?? recorded;
  const flags: AgentFlags = { ...(request.model === null ? {} : { modelFlag: request.model }), ...(request.thinking === null ? {} : { thinkingFlag: request.thinking }) };
  const tuning = resolveTuningOrDie(flags, settings, adapter.id, switched === null ? view?.tuning ?? null : null);
  const model = admitLaunchModel(settings, adapter.id, state.services.models, tuning.model);
  const command = request.cmd ?? adapterCommand(adapter.id, settings, { model, thinking: tuning.thinking, preferredModels: settings.models.preferred[adapter.id] ?? [] });
  return { adapter, model, thinking: tuning.thinking, command };
}

/** Restart an agent this orchd runs: type its harness's quit, wait for the shell, then launch the
 *  planned harness in the same pane. The store moves to the new harness only after the old one
 *  exits. An agent whose environment takes no input is restarted by its lifecycle mechanism, on
 *  what it runs now. */
async function restartHere(state: DaemonState, agent: HereAgent, request: RestartRequest): Promise<LifecycleOutcome> {
  const key = agent.id;
  const { adapter: recorded, text: quitText } = recordedHarness(state, key, "restart");
  if (request.harness !== null) await refreshStaleShims(state.directory, state.services.logger, [resolveAdapterOrDie(request.harness).id], state.services.settings.current());
  const pane = inputPane(state, agent);
  if (pane === null) {
    const retuned = (request.harness !== null && request.harness !== recorded.id) || request.model !== null;
    if (retuned) throw new Error(`cannot relaunch ${key} on another harness or model: its environment takes no input. Close it and spawn again.`);
    // The relaunched harness claims the row afresh, so the old claim goes first.
    reclaim(state.directory, { target: key });
    return verbAndAwaitBridge(state, agent, "restart", null);
  }
  const relaunch = planRelaunch(state, key, recorded, request);
  const cwd = agentLocation(state.directory, agent.id)?.cwd;
  if (cwd !== undefined) relaunch.adapter.workspaceTrust?.preTrustWorkspace(cwd, relaunch.command);
  await clearPrompt(state, pane);
  pane.input.submit(pane.handle, quitText);
  const atPrompt = (): boolean => atShellPrompt(foregroundOf(pane.backend, pane.handle));
  if (!await pollReady(state, "await shell prompt", atPrompt)) {
    state.services.logger.warn("lifecycle.restart-exit-timeout", { command: quitText }, { agentId: key });
    return { ok: false, reason: `agent did not exit after ${quitText} - skipping relaunch`, command: relaunch.command };
  }
  reclaim(state.directory, { target: key, relaunch: { harnessId: relaunch.adapter.id, model: relaunch.model, thinking: relaunch.thinking } });
  pane.input.submit(pane.handle, relaunch.command);
  if (await pollReady(state, "await relaunched bridge", () => bridgeLive(state, agent, undefined))) return { ok: true, reason: null, command: relaunch.command };
  state.services.logger.warn("lifecycle.restart-bridge-timeout", {}, { agentId: key });
  return { ok: false, reason: `relaunched but bridge status did not refresh within ${readySeconds(state)}s`, command: relaunch.command };
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

/** `lifecycle`: reload or restart an agent where it runs. */
export async function applyLifecycle(state: DaemonState, params: ParamsOf<"lifecycle">): Promise<LifecycleOutcome> {
  const { target, request } = params;
  governWrite(state, target, params);
  return atAgentHost(state, target, {
    here: (agent) => lifecycleHere(state, agent, request),
    there: async (link) => {
      const { ok, reason, command } = await driveOnHost(state, link, { action: "lifecycle", key: target, request, actor: params.actor ?? null });
      return { ok, reason, command };
    },
  });
}
