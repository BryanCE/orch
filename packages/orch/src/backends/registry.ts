import { headlessBackend } from "./headless/index.ts";
import { herdrBackend } from "./herdr/index.ts";
import { tmuxBackend } from "./tmux/index.ts";
import type { Backend } from "../types/backend.ts";

/** The environment that places an agent nowhere, which a daemon-owned launch
 *  runs on. Re-exported here so core
 *  reaches it through this boundary instead of reaching into a backend. */
export { headlessBackend } from "./headless/index.ts";

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
  return backend;
}

/** Resolve an explicitly selected, configured, or capability-probed backend. */
export function resolveBackend(opts: { explicit?: string | null; configured?: string | null }): Backend {
  if (opts.explicit !== undefined && opts.explicit !== null) return validateBackend(opts.explicit);
  if (opts.configured !== undefined && opts.configured !== null) return validateBackend(opts.configured);
  // WHERE THE CALLER SITS IS ENVIRONMENT (Rule 11) and never decides what orch
  // can drive. Asking isInsideSession() here silently downgraded every spawn to
  // headless whenever the terminal was not itself inside a plexer: the caller
  // asked for a fleet it could watch and got agents with no place to appear.
  // Availability is the question — can this environment take an agent at all.
  return allBackends().find((backend) => backend.groupHome !== null && backend.isAvailable()) ?? headlessBackend;
}

registerBackend(herdrBackend);
registerBackend(headlessBackend);
registerBackend(tmuxBackend);
