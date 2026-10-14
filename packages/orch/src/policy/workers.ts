import { NO_COMPACTION } from "../adapters/adapter.ts";
import type { AgentAdapter, CompactionLaunch, SpawnOpts } from "../types/adapter.ts";
import type { WorkerPolicy } from "../types/policy.ts";
import type { OrchSettings } from "../types/settings.ts";

/** Orch's own tools, always available — they are how a worker talks back. */
const ORCH_BASE_TOOLS = ["orch_ask"] as const;

/** Peer-messaging tools, added when `fleet.worker_peer_tools` is on. */
const ORCH_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

/** The tool allowlist a worker launches under, or undefined for no restriction.
 *  Orch's own tools are always required; everything else is `workers.allow_tools`. */
export function workerTools(settings: OrchSettings): string | undefined {
  const policy = workerPolicyFrom(settings);
  return policy.allowTools.length ? policy.allowTools.join(",") : undefined;
}

/** Resolve the worker policy from loaded settings. */
export function workerPolicyFrom(settings: OrchSettings): WorkerPolicy {
  const { workers } = settings;
  const orchTools = [...ORCH_BASE_TOOLS, ...(settings.fleet.worker_peer_tools ? ORCH_PEER_TOOLS : [])];
  return {
    inheritExtensions: workers.inherit_extensions,
    excludeExtensions: workers.exclude_extensions,
    builtinTools: workers.builtin_tools,
    // An allowlist that omitted orch's tools would mute the worker, so they join it.
    allowTools: workers.allow_tools.length ? [...new Set([...workers.allow_tools, ...orchTools])] : [],
    compactAtTokens: workers.compact_at_tokens,
  };
}

/** What a launch adds for its harness's compaction point, or nothing when none is set. */
function compactionLaunch(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): CompactionLaunch {
  const points = policy?.compactAtTokens[adapter.id];
  return points === undefined || adapter.compaction === null ? NO_COMPACTION : adapter.compaction.launch(points, model);
}

/** The env that sets a launch's compaction point. */
export function compactionEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>> {
  return compactionLaunch(adapter, model, policy).env;
}

/** The launch arguments that set a launch's compaction point. */
export function compactionArgs(adapter: AgentAdapter, opts: Pick<SpawnOpts, "model" | "workers">): readonly string[] {
  return compactionLaunch(adapter, opts.model, opts.workers).args;
}
