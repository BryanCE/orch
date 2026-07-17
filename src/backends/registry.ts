import type { Backend } from "./backend.ts";
import { headlessBackend } from "./headless/index.ts";
import { herdrBackend } from "./herdr/index.ts";
import { tmuxBackend } from "./tmux/index.ts";

const backends = new Map<string, Backend>();

/** Register a backend by its stable id. Later registrations replace earlier ones. */
function registerBackend(backend: Backend): void {
  backends.set(backend.id, backend);
}

/** Find a backend by id. */
export function getBackend(id: string): Backend | undefined {
  return backends.get(id);
}

/** Return all registered backends in registration order. */
export function allBackends(): Backend[] {
  return [...backends.values()];
}

function supportedIds(): string {
  return allBackends().map((backend) => backend.id).join(", ");
}

function validateBackend(id: string): Backend {
  const backend = getBackend(id);
  if (!backend) throw new Error(`Unknown backend ${JSON.stringify(id)}. Supported backends: ${supportedIds()}`);
  if (!backend.isAvailable()) throw new Error(`Backend ${JSON.stringify(id)} is unavailable`);
  if (!backend.isInsideSession()) {
    throw new Error(`Backend ${JSON.stringify(id)} requires running inside a live ${id} session; start one and retry`);
  }
  return backend;
}

/** Resolve an explicitly selected, configured, or capability-probed backend. */
export function resolveBackend(opts: { explicit?: string | null; configured?: string | null }): Backend {
  if (opts.explicit !== undefined && opts.explicit !== null) return validateBackend(opts.explicit);
  if (opts.configured !== undefined && opts.configured !== null) return validateBackend(opts.configured);
  if (herdrBackend.isAvailable() && herdrBackend.isInsideSession()) return herdrBackend;
  if (tmuxBackend.isAvailable() && tmuxBackend.isInsideSession()) return tmuxBackend;
  return headlessBackend;
}

registerBackend(herdrBackend);
registerBackend(headlessBackend);
registerBackend(tmuxBackend);
