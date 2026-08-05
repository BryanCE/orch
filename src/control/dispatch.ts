import { execFile } from "node:child_process";
import { resolveAdapter } from "../adapters/registry.ts";
import { getBackend } from "../backends/registry.ts";
import { normalizeControlTarget } from "../backends/identity.ts";
import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { awaitControlOutcome } from "./outcome.ts";
import { loadConfigOrNull, SETTINGS_DEFAULTS } from "../config.ts";
import { workerPolicyFrom, workerTools } from "../policy/workers.ts";
import type { AdapterCommand, AgentAdapter, LifecycleVerb } from "../adapters/adapter.ts";
import type { Backend, BackendHandle, DeliverPayload } from "../backends/backend.ts";

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

/** How each prompt action reaches a console when keystrokes are the only channel. */
export const KEYSTROKE_KIND: Record<PromptAction["kind"], DeliverPayload["kind"]> = {
  run: "run",
  steer: "message",
};

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
 * Route prompt text into a live agent through the mechanism its ADAPTER declares.
 * New work and a mid-run steer travel the same way — an agent has exactly one text
 * channel, and which one it is belongs to the adapter, never to the backend it
 * happens to be running in. The keystroke path is the sole point where a backend
 * is touched, and only an adapter declaring `steer: "keys"` ever reaches it.
 */
async function deliverPrompt(target: string, adapter: AgentAdapter, action: PromptAction, timeoutMs: number): Promise<void> {
  const mechanism = adapter.caps.steer;
  if (mechanism === "none") throw new Error(`cannot ${action.kind} ${target}: adapter ${adapter.id} declares steer "none"`);
  if (mechanism === "inbox") requireLiveAgent(target, adapter, action.kind);
  const command = adapter.steer({ key: target, text: action.text, id: action.id });
  if (command) {
    await runAdapterCommand(command, timeoutMs);
    return;
  }
  if (mechanism === "inbox") return;
  if (mechanism === "keys") {
    process.stderr.write(`${action.kind} ${target} via ${adapter.id} keys fallback (degraded delivery)\n`);
    const route = resolveTargetRoute(target);
    if (!route?.backend.deliver(route.handle, { kind: KEYSTROKE_KIND[action.kind], text: action.text })) {
      throw new Error(`cannot ${action.kind} ${target}: backend cannot deliver keys for adapter ${adapter.id}`);
    }
    return;
  }
  throw new Error(`cannot ${action.kind} ${target}: adapter ${adapter.id} returned no ${mechanism} command`);
}

async function deliverAnswer(target: string, adapter: AgentAdapter, text: string, timeoutMs: number): Promise<void> {
  if (!adapter.caps.ask) {
    throw new Error(`cannot answer ${target}: adapter ${adapter.id} declares ask false`);
  }
  requireLiveAgent(target, adapter, "answer");
  const command = adapter.answer({ key: target, text });
  if (command) await runAdapterCommand(command, timeoutMs);
}

/**
 * Retarget an agent's model, then confirm the agent actually took it. Orch rules
 * on the allowlist here — once, for every harness — and the agent reports back
 * through the presence control outcome, so a model the harness could not resolve
 * surfaces as an error instead of a false "accepted".
 */
async function deliverModel(target: string, adapter: AgentAdapter, model: string, id: string, timeoutMs: number): Promise<void> {
  if (!adapter.caps.setModel || !adapter.setModel) {
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
 *  handle first, then asks a handle-owning backend — a detached process handle is
 *  replaced on every relaunch, so only the backend knows the live one. */
function resolveBackendHandle(target: string): { backend: Backend; handle: BackendHandle } | undefined {
  const route = resolveTargetRoute(target);
  if (route) return route;
  const backendId = spawnedRecords().get(target)?.backend;
  const backend = backendId ? getBackend(backendId) : undefined;
  const handle = backend?.handleFor?.(target);
  return backend && handle !== undefined ? { backend, handle } : undefined;
}

/** Relaunch a detached agent under its existing identity. Its process IS its
 *  session — there is no console to type a lifecycle command into — so a fresh
 *  process is what reset, reload, and restart all mean for it. Reusing the key
 *  keeps presence, the registry, and every control target naming the same agent. */
function relaunchAgent(target: string, adapter: AgentAdapter, backend: Backend, handle: BackendHandle): void {
  const record = spawnedRecords().get(target);
  if (!record?.model) throw new Error(`cannot relaunch ${target}: registry row records no model to launch on`);
  const config = loadConfigOrNull(orchDir());
  if (!config) throw new Error(`cannot relaunch ${target}: settings are unreadable`);
  backend.close(handle);
  backend.spawn(adapter, {
    key: target,
    orchDir: orchDir(),
    cwd: record.cwd,
    model: record.model,
    tools: workerTools(config),
    workers: workerPolicyFrom(config),
  });
}

/**
 * Apply a session-lifecycle verb through the mechanism the target actually has.
 * A console-backed agent is sent the text its adapter declares for the verb; an
 * agent with no console has nothing to type into, so it is relaunched instead.
 * The branch is on the backend's declared keystroke capability, never its id.
 */
function deliverLifecycle(target: string, adapter: AgentAdapter, verb: LifecycleVerb): void {
  if (!adapter.caps.lifecycle.includes(verb)) {
    throw new Error(`cannot ${verb} ${target}: adapter ${adapter.id} declares no ${verb} mechanism`);
  }
  const route = resolveBackendHandle(target);
  if (!route) throw new Error(`cannot ${verb} ${target}: no live backend handle`);
  if (!route.backend.canSendKeys) {
    relaunchAgent(target, adapter, route.backend, route.handle);
    return;
  }
  const command = adapter.lifecycleCmd?.(verb);
  if (!command) throw new Error(`cannot ${verb} ${target}: adapter ${adapter.id} returned no ${verb} command`);
  if (!route.backend.deliver(route.handle, { kind: "run", text: command.text })) {
    throw new Error(`cannot ${verb} ${target}: backend ${route.backend.id} refused the delivery`);
  }
}

/** Apply one control action to a target through its recorded adapter, failing loudly on any gap. */
export async function deliverControl(target: string, action: ControlAction): Promise<void> {
  const timeoutMs = loadConfigOrNull(orchDir())?.timeouts.adapter_command_ms ?? ADAPTER_COMMAND_TIMEOUT_MS;
  const canonicalTarget = normalizeControlTarget(target);
  const adapter = resolveTargetAdapter(canonicalTarget);
  if (!adapter) throw new Error(`target ${canonicalTarget} has no recorded adapter (presence or spawn registry)`);
  if (isPromptAction(action)) await deliverPrompt(canonicalTarget, adapter, action, timeoutMs);
  else if (action.kind === "answer") await deliverAnswer(canonicalTarget, adapter, action.text, timeoutMs);
  else if (action.kind === "lifecycle") deliverLifecycle(canonicalTarget, adapter, action.verb);
  else await deliverModel(canonicalTarget, adapter, action.model, action.id, timeoutMs);
}
