import type { WorkerPolicy } from "../types/policy.ts";
import type { OrchConfig } from "../types/config.ts";

/** Orch's own tools, always available — they are how a worker talks back. */
const ORCH_BASE_TOOLS = ["orch_ask"] as const;

/** Peer-messaging tools, added when `fleet.worker_peer_tools` is on. */
const ORCH_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

/** The tool allowlist a worker launches under, or undefined for no restriction.
 *  Orch's own tools are always required; everything else is `workers.allow_tools`. */
export function workerTools(config: OrchConfig): string | undefined {
  const policy = workerPolicyFrom(config);
  return policy.allowTools.length ? policy.allowTools.join(",") : undefined;
}

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
