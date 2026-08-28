import { execFile } from "node:child_process";
import { resolveAdapter } from "../adapters/registry.ts";
import { getBackend } from "../backends/registry.ts";
import { normalizeControlTarget } from "../backends/identity.ts";
import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { awaitControlOutcome } from "./outcome.ts";
import { loadConfigOrNull, SETTINGS_DEFAULTS } from "../config.ts";
import type { AdapterCommand, AgentAdapter, LifecycleVerb } from "../adapters/adapter.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";
import { agentChannel } from "../presence/roles.ts";

/**
 * Control-plane dispatcher (L5 facade). Runs inside the daemon only; the CLI
 * reaches it over the socket via the steer/set-model RPC handlers. This module
 * is the sole invoker of adapter control strategies — nothing else may call
 * adapter.steer/answer/setModel or execute a returned AdapterCommand.
 */

/** Control effect requested for one live agent. */
export type ControlAction =
  | { readonly kind: "run"; readonly text: string; readonly id?: string }
  | { readonly kind: "steer"; readonly text: string; readonly id?: string }
  | { readonly kind: "answer"; readonly text: string }
  | { readonly kind: "model"; readonly model: string; readonly id: string }
  | { readonly kind: "lifecycle"; readonly verb: LifecycleVerb };

/** Prompt text bound for a live agent: new work to submit, or a mid-run interjection. */
type PromptAction = Extract<ControlAction, { kind: "run" | "steer" }>;

function isPromptAction(action: ControlAction): action is PromptAction {
  return action.kind === "run" || action.kind === "steer";
}

const ADAPTER_COMMAND_TIMEOUT_MS = SETTINGS_DEFAULTS.timeouts.adapter_command_ms;

/** Resolve the adapter recorded for a target via presence status, then the spawn registry. */
export function resolveTargetAdapter(target: string): AgentAdapter | undefined {
  const agent = loadPresence().get(target)?.status?.agent ?? spawnedRecords().get(target)?.adapter;
  if (typeof agent !== "string" || !agent) return undefined;
  return resolveAdapter(agent);
}

/** Resolve the backend and native handle addressing a canonical target. */
export function resolveTargetRoute(target: string): { backend: Backend; handle: BackendHandle } | undefined {
  // The registry owns the live native handle; the identity carries no pane
  // information at all, so this is the only source for it.
  const record = spawnedRecords().get(target);
  if (record?.backend && record.handle !== undefined) {
    const backend = getBackend(record.backend);
    if (backend) return { backend, handle: record.handle };
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
 * Refuse inbox delivery unless the agent is still running. A presence dir and its
 * status file both outlive the process that wrote them, so an existence-only check
 * appends work to a file nobody reads: the write is "accepted", the pane sits idle
 * with no task, and the only symptom is a generic RPC timeout further up. Orch owns
 * this ruling for every harness; the adapter is named in the message, never branched on.
 */
function requireLiveAgent(target: string, adapter: AgentAdapter, action: string): void {
  const presence = loadPresence().get(target);
  if (!presence) throw new Error(`cannot ${action} ${target}: no presence dir for ${adapter.id} inbox delivery`);
  if (!presence.status) throw new Error(`cannot ${action} ${target}: ${adapter.id} bridge never registered - respawn required`);
  if (!presence.alive) throw new Error(`cannot ${action} ${target}: ${adapter.id} bridge is disconnected (pid ${presence.status.pid ?? "unknown"} is gone) - respawn required`);
}

/**
 * A steer at an agent waiting on an answer is accepted by the inbox and then lost
 * inside the harness's blocked turn — and `Steered` printed for a dropped message
 * is worse than an error, because the orchestrator believes the question is
 * answered while the pane sits in `asking` with no transition to notice. A pending
 * question has its own primitive; refuse and name it.
 */
function refuseSteerWhileAsking(target: string, action: PromptAction): void {
  if (action.kind !== "steer") return;
  if (loadPresence().get(target)?.status?.state !== "asking") return;
  throw new Error(`cannot steer ${target}: it is awaiting an answer - use 'orch answer ${target} "<text>"'`);
}

/**
 * Route prompt text into a live agent through the mechanism its ADAPTER declares.
 * New work and a mid-run steer travel the same way — an agent has exactly one text
 * channel, and which one it is belongs to the adapter, never to the backend it
 * happens to be running in. The keystroke path is the sole point where a backend
 * is touched, and only an adapter declaring `steer: "keys"` ever reaches it.
 */
export type ControlBoundaryOutcome =
  | { readonly outcome: "invoke" }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "no-pane" | "no-environment-role" };

function paneAnswer(target: string, command: string, route: { backend: Backend; handle: BackendHandle } | undefined): ControlBoundaryOutcome {
  if (!route?.backend.paneInventory) return { outcome: "answer", reason: "no-pane", text: `${target} has no pane; ${command} does not apply.` };
  return { outcome: "answer", reason: "no-environment-role", text: `this pane environment does not provide ${command}` };
}

async function deliverPrompt(target: string, adapter: AgentAdapter, action: PromptAction, timeoutMs: number): Promise<ControlBoundaryOutcome> {
  const mechanism = adapter.capabilities.steer;
  if (mechanism === "none") throw new Error(`cannot ${action.kind} ${target}: adapter ${adapter.id} declares steer "none"`);
  const route = mechanism === "keys" ? resolveTargetRoute(target) : undefined;
  if (mechanism === "keys" && !route?.backend.paneInput) return paneAnswer(target, action.kind, route);
  if (mechanism === "inbox") requireLiveAgent(target, adapter, action.kind);
  refuseSteerWhileAsking(target, action);
  if (mechanism === "inbox") {
    const route = resolveTargetRoute(target);
    (route?.backend.channel ?? agentChannel).deliver(target, { id: action.id, text: action.text, action: action.kind === "run" ? "dispatch" : "steer" });
    return { outcome: "invoke" };
  }
  const command = adapter.steer({ key: target, text: action.text, id: action.id });
  if (command) {
    await runAdapterCommand(command, timeoutMs);
    return { outcome: "invoke" };
  }
  if (mechanism === "keys") {
    process.stderr.write(`${action.kind} ${target} via ${adapter.id} keys fallback (degraded delivery)\n`);
    route!.backend.paneInput!.submit(route!.handle, action.text);
    return { outcome: "invoke" };
  }
  throw new Error(`cannot ${action.kind} ${target}: adapter ${adapter.id} returned no ${mechanism} command`);
}

async function deliverAnswer(target: string, adapter: AgentAdapter, text: string, timeoutMs: number): Promise<ControlBoundaryOutcome> {
  if (!adapter.capabilities.ask) {
    throw new Error(`cannot answer ${target}: adapter ${adapter.id} declares ask false`);
  }
  requireLiveAgent(target, adapter, "answer");
  const command = adapter.answer({ key: target, text });
  if (command) await runAdapterCommand(command, timeoutMs);
  return { outcome: "invoke" };
}

/**
 * Retarget an agent's model, then confirm the agent actually took it. Orch rules
 * on the allowlist here — once, for every harness — and the agent reports back
 * through the presence control outcome, so a model the harness could not resolve
 * surfaces as an error instead of a false "accepted".
 */
async function deliverModel(target: string, adapter: AgentAdapter, model: string, id: string, timeoutMs: number): Promise<void> {
  if (!adapter.capabilities.setModel || !adapter.setModel) {
    throw new Error(`cannot set model on ${target}: adapter ${adapter.id} declares setModel false`);
  }
  const directory = orchDir();
  assertModelAllowed(directory, adapter, model);
  requireLiveAgent(target, adapter, "set model on");
  const command = adapter.setModel({ key: target, model, id });
  if (command) await runAdapterCommand(command, timeoutMs);
  const dir = loadPresence().get(target)?.dir;
  if (!dir) throw new Error(`cannot confirm model on ${target}: presence dir vanished`);
  await awaitControlOutcome(dir, id, timeoutMs);
}

/** The backend holding a target, and its current handle. Reads the registry pane
 *  handle first, then asks a handle-owning backend — a detached agent records no
 *  pane handle at all, so only the backend can name its live one. */
function resolveBackendHandle(target: string): { backend: Backend; handle: BackendHandle } | undefined {
  const route = resolveTargetRoute(target);
  if (route) return route;
  const backendId = spawnedRecords().get(target)?.backend;
  const backend = backendId ? getBackend(backendId) : undefined;
  const handle = backend?.handleFor?.(target);
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
function deliverLifecycle(target: string, adapter: AgentAdapter, verb: LifecycleVerb): void {
  if (!adapter.capabilities.lifecycle.includes(verb)) {
    throw new Error(`cannot ${verb} ${target}: adapter ${adapter.id} declares no ${verb} mechanism`);
  }
  const route = resolveBackendHandle(target);
  if (!route) throw new Error(`cannot ${verb} ${target}: no live backend handle`);
  if (!route.backend.paneInput) {
    throw new Error(`cannot ${verb} ${target}: target environment has no pane input role`);
  }
  const command = adapter.lifecycleCmd?.(verb);
  if (!command) throw new Error(`cannot ${verb} ${target}: adapter ${adapter.id} returned no ${verb} command`);
  route.backend.paneInput.submit(route.handle, command.text);
}

/** Apply one control action to a target through its recorded adapter, failing loudly on any gap. */
export async function deliverControl(target: string, action: ControlAction): Promise<ControlBoundaryOutcome> {
  const timeoutMs = loadConfigOrNull(orchDir())?.timeouts.adapter_command_ms ?? ADAPTER_COMMAND_TIMEOUT_MS;
  const canonicalTarget = normalizeControlTarget(target);
  const adapter = resolveTargetAdapter(canonicalTarget);
  if (!adapter) throw new Error(`target ${canonicalTarget} has no recorded adapter (presence or spawn registry)`);
  if (isPromptAction(action)) return deliverPrompt(canonicalTarget, adapter, action, timeoutMs);
  if (action.kind === "answer") { await deliverAnswer(canonicalTarget, adapter, action.text, timeoutMs); return { outcome: "invoke" }; }
  if (action.kind === "lifecycle") { deliverLifecycle(canonicalTarget, adapter, action.verb); return { outcome: "invoke" }; }
  await deliverModel(canonicalTarget, adapter, action.model, action.id, timeoutMs);
  return { outcome: "invoke" };
}
