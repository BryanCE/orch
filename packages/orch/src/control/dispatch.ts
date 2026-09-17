import type { OrchDir } from "../types/core.ts";
import { execFile } from "node:child_process";
import { resolveAdapter } from "../adapters/registry.ts";
import { getBackend } from "../backends/registry.ts";
import { normalizeControlTarget } from "./normalize-target.ts";
import { AgentGoneError } from "./agent-gone.ts";
import { presenceEntry } from "../presence/store.ts";
import { pendingQuestion } from "../store/question-rows.ts";
import { agentView } from "../store/agent-view.ts";
import { admitModel } from "../policy/model.ts";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { agentProcessLive, setTuning } from "../store/interval-rows.ts";
import { awaitControlOutcome } from "./outcome.ts";
import { pushToBridge } from "./bridge-links.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { Backend, BackendHandle } from "../types/backend.ts";
import type { AdapterCommand, AgentAdapter, LifecycleVerb, ModelCatalogue } from "../types/adapter.ts";
import type { ControlAction, ControlBoundaryOutcome } from "../types/control.ts";

/**
 * Control-plane dispatcher (L5 facade). Runs inside the daemon only; the CLI
 * reaches it over the socket via the steer/set-model RPC handlers. This module
 * is the sole invoker of adapter control strategies — nothing else may call
 * adapter.steer/answer/setModel or execute a returned AdapterCommand.
 */

/** Prompt text bound for a live agent: new work to submit, or a mid-run interjection. */
type PromptAction = Extract<ControlAction, { kind: "run" | "steer" }>;

function isPromptAction(action: ControlAction): action is PromptAction {
  return action.kind === "run" || action.kind === "steer";
}

/** Resolve the adapter recorded for a target via presence status, then the spawn registry. */
export function resolveTargetAdapter(orchDir: OrchDir, target: string): AgentAdapter | undefined {
  const agent = agentView(orchDir, target)?.harnessId;
  if (typeof agent !== "string" || !agent) return undefined;
  return resolveAdapter(agent);
}

/** Resolve the backend and native handle addressing a canonical target. */
export function resolveTargetRoute(orchDir: OrchDir, target: string): { backend: Backend; handle: BackendHandle } | undefined {
  // Environment owns the live native handle; the identity carries no pane
  // information at all, so the composer is the only source for it.
  const environment = agentView(orchDir, target)?.environment;
  if (environment?.plexer && environment.handle !== null) {
    const backend = getBackend(environment.plexer);
    if (backend) return { backend, handle: environment.handle };
  }
  // Without a registry row there is no pane handle to deliver to: the identity
  // id names the agent, never its backend pane.
  return undefined;
}

/** Execute an adapter-built argv machine-locally, throwing on spawn failure or nonzero exit. */
function runAdapterCommand(command: AdapterCommand, timeoutMs: number): Promise<void> {
  const [bin, ...args] = command.argv;
  if (!bin) return Promise.reject(new Error("adapter returned an empty command"));
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { timeout: timeoutMs }, (error) => {
      if (error) reject(new Error(`${bin} failed: ${error.message}`));
      else resolve();
    });
    if (command.stdin !== undefined) child.stdin?.write(command.stdin);
    child.stdin?.end();
  });
}

/**
 * Refuse bridge delivery unless the agent is still running. A presence dir and its
 * status file both outlive the process that wrote them, so an existence-only check
 * pushes work toward a dead session: the write is "accepted", the agent sits idle
 * with no task, and the only symptom is a generic RPC timeout further up. Orch owns
 * this ruling for every harness; the adapter is named in the message, never branched on.
 */
/** The store decides liveness; a live agent whose bridge is not yet attached queues, it is not gone. */
function requireLiveAgent(orchDir: OrchDir, target: string, adapter: AgentAdapter, action: string): void {
  if (!agentProcessLive(orchDir, target)) throw new AgentGoneError(target, `${adapter.id} process is gone; ${action} needs a respawn`);
}

/**
 * A steer at an agent waiting on an answer is accepted by the bridge and then lost
 * inside the harness's blocked turn — and `Steered` printed for a dropped message
 * is worse than an error, because the orchestrator believes the question is
 * answered while the pane sits in `asking` with no transition to notice. A pending
 * question has its own primitive; refuse and name it.
 */
function refuseSteerWhileAsking(orchDir: OrchDir, target: string, action: PromptAction): void {
  if (action.kind !== "steer") return;
  if (presenceEntry(orchDir, target)?.status?.state !== "asking") return;
  throw new Error(`cannot steer ${target}: it is awaiting an answer - use 'orch answer ${target} "<text>"'`);
}

async function deliverPrompt(orchDir: OrchDir, target: string, adapter: AgentAdapter, action: PromptAction, timeoutMs: number): Promise<ControlBoundaryOutcome> {
  refuseSteerWhileAsking(orchDir, target, action);
  const bridgeAction = action.kind === "run" ? "dispatch" : "steer";
  if (adapter.bridge?.takes.includes(bridgeAction)) {
    requireLiveAgent(orchDir, target, adapter, action.kind);
    pushToBridge(orchDir, target, { id: action.id, message: { action: bridgeAction, text: action.text } });
    return { outcome: "invoke", ack: "expected" };
  }
  const command = adapter.steer({ key: target, text: action.text, id: action.id });
  if (command) {
    await runAdapterCommand(command, timeoutMs);
    return { outcome: "invoke", ack: "none" };
  }
  const route = resolveTargetRoute(orchDir, target);
  if (!route?.backend.placementInventory) return { outcome: "answer", reason: "not-placed", text: `${target} is placed nowhere; ${action.kind} does not apply.` };
  if (!route.backend.agentInput) return { outcome: "answer", reason: "no-environment-role", text: `this environment does not provide ${action.kind}` };
  route.backend.agentInput.submit(route.handle, action.text);
  return { outcome: "invoke", ack: "none" };
}

function deliverAnswer(orchDir: OrchDir, target: string, adapter: AgentAdapter, action: Extract<ControlAction, { kind: "answer" }>): ControlBoundaryOutcome {
  if (!adapter.bridge?.takes.includes("answer")) {
    return { outcome: "answer", reason: "no-environment-role", text: `cannot answer ${target}: adapter ${adapter.id} takes no answers` };
  }
  requireLiveAgent(orchDir, target, adapter, "answer");
  const questionId = pendingQuestion(orchDir, target)?.id;
  if (questionId === undefined) return { outcome: "answer", reason: "not-asking", text: `${target} is not asking a question` };
  pushToBridge(orchDir, target, { id: action.id, message: { action: "answer", text: action.text, questionId } });
  return { outcome: "invoke", ack: "expected" };
}

/**
 * Retarget an agent's model, then confirm the agent actually took it. Orch rules
 * on the allowlist here — once, for every harness — and the agent reports back
 * through the presence control outcome, so a model the harness could not resolve
 * surfaces as an error instead of a false "accepted".
 */
async function deliverModel(orchDir: OrchDir, settings: OrchSettings, catalogue: ModelCatalogue, target: string, adapter: AgentAdapter, requested: string, id: string, timeoutMs: number): Promise<ControlBoundaryOutcome> {
  if (adapter.modelControl === null && !adapter.bridge?.takes.includes("model")) {
    return { outcome: "answer", reason: "no-environment-role", text: `cannot set the model on ${target}: adapter ${adapter.id} has no running-session model control` };
  }
  // The daemon admits every caller's spec itself, so a short name from any RPC
  // client expands here exactly as it does at the CLI.
  const model = admitModel(settings, adapter, catalogue, requested);
  requireLiveAgent(orchDir, target, adapter, "set model on");
  const command = adapter.modelControl?.setModel({ key: target, model, id });
  if (command) await runAdapterCommand(command, timeoutMs);
  if (adapter.bridge?.takes.includes("model")) {
    pushToBridge(orchDir, target, { id, message: { action: "model", model } });
  }
  const outcome = await awaitControlOutcome(id, timeoutMs);
  const { bare, thinking } = splitThinkingSuffix(model);
  const applied = outcome.applied;
  const reported = applied === undefined
    ? "missing applied result"
    : `${applied.model}${applied.thinking === undefined ? "" : `:${applied.thinking}`}`;
  if (applied === undefined || applied.model !== bare || applied.thinking !== thinking) {
    throw new Error(`pinned ${model}, agent reports ${reported}`);
  }
  setTuning(orchDir, target, Date.now(), { model: applied.model, thinking: applied.thinking });
  return { outcome: "invoke", ack: "none" };
}

/** The backend holding a target, and its current handle. Reads the registry pane
 *  handle first, then asks a handle-owning backend — a detached agent records no
 *  pane handle at all, so only the backend can name its live one. */
function resolveBackendHandle(orchDir: OrchDir, target: string): { backend: Backend; handle: BackendHandle } | undefined {
  const route = resolveTargetRoute(orchDir, target);
  if (route) return route;
  const backendId = agentView(orchDir, target)?.environment.plexer;
  const backend = backendId ? getBackend(backendId) : undefined;
  const handle = backend?.handleLookup?.handleFor(target, orchDir);
  return backend && handle !== undefined ? { backend, handle } : undefined;
}

/**
 * Apply a session-lifecycle verb through the mechanism the target actually has.
 * A console-backed agent is sent the text its adapter declares for the verb. An
 * agent with no console has neither a console to type into nor a session to
 * carry over — it runs the prompt it launched on and exits — so the verb is
 * refused. The branch is on the backend's declared keystroke capability, never
 * its id.
 */
function deliverLifecycle(orchDir: OrchDir, target: string, adapter: AgentAdapter, verb: LifecycleVerb): ControlBoundaryOutcome {
  if (adapter.lifecycleControl === null) {
    return { outcome: "answer", reason: "no-environment-role", text: `this environment does not provide ${verb}` };
  }
  const route = resolveBackendHandle(orchDir, target);
  if (!route) throw new Error(`cannot ${verb} ${target}: no live backend handle`);
  if (!route.backend.agentInput) {
    throw new Error(`cannot ${verb} ${target}: target environment cannot take input`);
  }
  const command = adapter.lifecycleControl.lifecycleCmd(verb);
  if (!command) throw new Error(`cannot ${verb} ${target}: adapter ${adapter.id} returned no ${verb} command`);
  route.backend.agentInput.submit(route.handle, command.text);
  return { outcome: "invoke", ack: "none" };
}

/** Apply one control action to a target through its recorded adapter, failing loudly on any gap. */
export async function deliverControl(orchDir: OrchDir, settings: OrchSettings, catalogue: ModelCatalogue, target: string, action: ControlAction): Promise<ControlBoundaryOutcome> {
  const timeoutMs = settings.timeouts.adapter_command_ms;
  const canonicalTarget = normalizeControlTarget(orchDir, target);
  const adapter = resolveTargetAdapter(orchDir, canonicalTarget);
  if (!adapter) throw new Error(`target ${canonicalTarget} has no recorded adapter (presence or spawn registry)`);
  if (isPromptAction(action)) return deliverPrompt(orchDir, canonicalTarget, adapter, action, timeoutMs);
  // Return what deliverAnswer decided. Discarding it and reporting "invoke"
  // regardless turned every boundary answer into a silent success, which is the
  // one thing E14 says an absence must never become.
  if (action.kind === "answer") return deliverAnswer(orchDir, canonicalTarget, adapter, action);
  if (action.kind === "lifecycle") return deliverLifecycle(orchDir, canonicalTarget, adapter, action.verb);
  return deliverModel(orchDir, settings, catalogue, canonicalTarget, adapter, action.model, action.id, timeoutMs);
}
