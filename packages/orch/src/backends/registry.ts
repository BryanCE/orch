import { headlessBackend } from "./headless/index.ts";
import { herdrBackend } from "./herdr/index.ts";
import { tmuxBackend } from "./tmux/index.ts";
import type { Backend } from "../types/backend.ts";
import type { HeadlessHandle } from "../types/plexer.ts";

/** The pane-less backend a daemon-owned detached launch runs on. Named here so
 *  core reaches it through this boundary instead of reaching into a backend. */
export const detachedBackend: Backend<HeadlessHandle> = headlessBackend;

const backends = new Map<string, Backend>();

/** Register a backend by its stable id. Later registrations replace earlier ones.
 *  Registration is the composition seam: a provider is
 *  selected by registering it, never by mutating an already-registered one. */
export function registerBackend(backend: Backend): void {
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

/** Probe every registered backend without selecting one. */
export function detectBackends(): ReadonlyMap<string, { detected: boolean; insideSession: boolean }> {
  return new Map<string, { detected: boolean; insideSession: boolean }>(allBackends().map((backend): [string, { detected: boolean; insideSession: boolean }] => [backend.id, {
    detected: backend.isAvailable(),
    insideSession: backend.isInsideSession(),
  }]));
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
