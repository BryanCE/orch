import type { OrchConfig } from "../config.ts";

/**
 * What a spawned worker is allowed to load, expressed in orch vocabulary and
 * resolved once here. Adapters translate this policy into their own harness's
 * flags; no adapter decides the policy itself.
 *
 * The defaults inherit: a worker runs with the same extensions and tools the
 * user gets interactively. Hardcoding a minimal set stripped every user
 * extension from every worker with no way to opt back in, which is why the
 * exclusions are now a named list the user owns.
 */
export interface WorkerPolicy {
  /** Load the harness's own discovered extensions alongside orch's bridge. */
  readonly inheritExtensions: boolean;
  /** Extension names to drop when inheriting (basename, no file suffix). */
  readonly excludeExtensions: readonly string[];
  /** Keep the harness's built-in tools; false restricts to `allowTools` only. */
  readonly builtinTools: boolean;
  /** The exact tool allowlist, or empty for no restriction. Orch's own tools are always in it. */
  readonly allowTools: readonly string[];
}

/** Orch's own tools, always available — they are how a worker talks back. */
const ORCH_BASE_TOOLS = ["orch_ask"] as const;

/** Peer-messaging tools, added when `fleet.worker_peer_tools` is on. */
const ORCH_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

/** Resolve the worker policy from loaded settings. */
export function workerPolicyFrom(config: OrchConfig): WorkerPolicy {
  const { workers } = config;
  const orchTools = [...ORCH_BASE_TOOLS, ...(config.fleet.worker_peer_tools ? ORCH_PEER_TOOLS : [])];
  return {
    inheritExtensions: workers.inherit_extensions,
    excludeExtensions: workers.exclude_extensions,
    builtinTools: workers.builtin_tools,
    // An allowlist that omitted orch's tools would mute the worker, so they join it.
    allowTools: workers.allow_tools.length ? [...new Set([...workers.allow_tools, ...orchTools])] : [],
  };
}
