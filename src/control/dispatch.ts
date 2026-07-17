import { execFile } from "node:child_process";
import { resolveAdapter } from "../adapters/registry.ts";
import { getBackend } from "../backends/registry.ts";
import { normalizeControlTarget, parseIdentity } from "../backends/identity.ts";
import { loadPresence, spawnedRecords } from "../store.ts";
import type { AdapterCommand, AgentAdapter } from "../adapters/adapter.ts";
import type { Backend, BackendHandle } from "../backends/backend.ts";

/**
 * Control-plane dispatcher (L5 facade). Runs inside the daemon only; the CLI
 * reaches it over the socket via the steer/set-model RPC handlers. This module
 * is the sole invoker of adapter control strategies — nothing else may call
 * adapter.steer/setModel or execute a returned AdapterCommand.
 */

/** Control effect requested for one live agent. */
export type ControlAction =
  | { readonly kind: "steer"; readonly text: string }
  | { readonly kind: "model"; readonly model: string };

const ADAPTER_COMMAND_TIMEOUT_MS = 60_000;

/** Resolve the adapter recorded for a target via presence status, then the spawn registry. */
export function resolveTargetAdapter(target: string): AgentAdapter | undefined {
  const agent = loadPresence().get(target)?.status?.agent ?? spawnedRecords().get(target)?.adapter;
  if (typeof agent !== "string" || !agent) return undefined;
  return resolveAdapter(agent);
}

/** Resolve the backend and native handle addressing a canonical target. */
export function resolveTargetRoute(target: string): { backend: Backend; handle: BackendHandle } | undefined {
  // The registry owns the live native handle. Prefer it over the serialized
  // identity's handle: a backend may mint the key from a display/name handle
  // while the registry stores the actual pane id used for delivery.
  const record = spawnedRecords().get(target);
  if (record?.backend && record.handle !== undefined) {
    const backend = getBackend(record.backend);
    if (backend) return { backend, handle: record.handle };
  }
  try {
    const id = parseIdentity(target);
    const backend = getBackend(id.backend);
    if (backend) return { backend, handle: id.handle };
  } catch {
    // The canonical target has no parseable backend identity.
  }
  return undefined;
}

/** Execute an adapter-built argv machine-locally, throwing on spawn failure or nonzero exit. */
function runAdapterCommand(command: AdapterCommand): Promise<void> {
  const [bin, ...args] = command.argv;
  if (!bin) return Promise.reject(new Error("adapter returned an empty command"));
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { timeout: ADAPTER_COMMAND_TIMEOUT_MS }, (error) => {
      if (error) reject(new Error(`${bin} failed: ${error.message}`));
      else resolve();
    });
    if (command.stdin !== undefined) child.stdin?.write(command.stdin);
    child.stdin?.end();
  });
}

function requirePresence(target: string, adapter: AgentAdapter, action: string): void {
  if (!loadPresence().has(target)) {
    throw new Error(`cannot ${action} ${target}: no presence dir for ${adapter.id} inbox delivery`);
  }
}

async function deliverSteer(target: string, adapter: AgentAdapter, text: string): Promise<void> {
  const mechanism = adapter.caps.steer;
  if (mechanism === "none") throw new Error(`cannot steer ${target}: adapter ${adapter.id} declares steer "none"`);
  if (mechanism === "inbox") requirePresence(target, adapter, "steer");
  const command = adapter.steer({ key: target, text });
  if (command) {
    await runAdapterCommand(command);
    return;
  }
  if (mechanism === "inbox") return;
  if (mechanism === "keys") {
    process.stderr.write(`steering ${target} via ${adapter.id} keys fallback (degraded delivery)\n`);
    const route = resolveTargetRoute(target);
    if (!route || !route.backend.deliver(route.handle, { kind: "message", text })) {
      throw new Error(`cannot steer ${target}: backend cannot deliver keys for adapter ${adapter.id}`);
    }
    return;
  }
  throw new Error(`cannot steer ${target}: adapter ${adapter.id} returned no ${mechanism} command`);
}

async function deliverModel(target: string, adapter: AgentAdapter, model: string): Promise<void> {
  if (!adapter.caps.setModel || !adapter.setModel) {
    throw new Error(`cannot set model on ${target}: adapter ${adapter.id} declares setModel false`);
  }
  requirePresence(target, adapter, "set model on");
  const command = adapter.setModel({ key: target, model });
  if (command) await runAdapterCommand(command);
}

/** Apply one control action to a target through its recorded adapter, failing loudly on any gap. */
export async function deliverControl(target: string, action: ControlAction): Promise<void> {
  const canonicalTarget = normalizeControlTarget(target);
  const adapter = resolveTargetAdapter(canonicalTarget);
  if (!adapter) throw new Error(`target ${canonicalTarget} has no recorded adapter (presence or spawn registry)`);
  if (action.kind === "steer") await deliverSteer(canonicalTarget, adapter, action.text);
  else await deliverModel(canonicalTarget, adapter, action.model);
}
