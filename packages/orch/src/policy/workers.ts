import { NO_COMPACTION } from "../shared/harness.ts";
import type { AgentAdapter, CompactionLaunch, SpawnOpts } from "../types/adapter.ts";
import type { WorkerPolicy } from "../types/policy.ts";
import type { OrchSettings } from "../types/settings.ts";
import { WRITE_ROOT_ENV, writeRootTools, type ToolVocabulary } from "./write-root.ts";

/** Orch's own tools, always available — they are how a worker talks back. */
const ORCH_BASE_TOOLS = ["orch_ask"] as const;

/** Peer-messaging tools, added when `fleet.worker_peer_tools` is on. */
const ORCH_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

/** Every tool orch itself registers in a worker. None of them changes a file. */
export const ORCH_TOOLS: readonly string[] = [...ORCH_BASE_TOOLS, ...ORCH_PEER_TOOLS];

/** Orch's own tools for a worker under these settings. */
function orchTools(settings: OrchSettings): readonly string[] {
  return [...ORCH_BASE_TOOLS, ...(settings.fleet.worker_peer_tools ? ORCH_PEER_TOOLS : [])];
}

/** The tool allowlist a policy launches under, or undefined for no restriction. */
export function policyTools(policy: WorkerPolicy): string | undefined {
  return policy.allowTools.length ? policy.allowTools.join(",") : undefined;
}

/** The tool allowlist a worker launches under, or undefined for no restriction.
 *  Orch's own tools are always required; everything else is `workers.allow_tools`. */
export function workerTools(settings: OrchSettings): string | undefined {
  return policyTools(workerPolicyFrom(settings));
}

/** Resolve the worker policy from loaded settings. */
export function workerPolicyFrom(settings: OrchSettings): WorkerPolicy {
  const { workers } = settings;
  return {
    inheritExtensions: workers.inherit_extensions,
    inheritMcp: workers.inherit_mcp,
    excludeExtensions: workers.exclude_extensions,
    builtinTools: workers.builtin_tools,
    // An allowlist that omitted orch's tools would mute the worker, so they join it.
    allowTools: workers.allow_tools.length ? [...new Set([...workers.allow_tools, ...orchTools(settings)])] : [],
    compactAtTokens: workers.compact_at_tokens,
    writeRoot: null,
  };
}

/** The policy of a worker launched under a write root: its harness's read and write tools and
 *  orch's own, and no user extension or MCP server, since either can bring a tool that writes.
 *  The built-ins stay on, because the allowlist names the ones the worker keeps. */
export function confinedPolicy(settings: OrchSettings, root: string, tools: ToolVocabulary): WorkerPolicy {
  return {
    ...workerPolicyFrom(settings),
    inheritExtensions: false,
    inheritMcp: false,
    builtinTools: true,
    allowTools: [...writeRootTools(tools), ...orchTools(settings)],
    writeRoot: root,
  };
}

/** What a launch adds for its harness's compaction point, or nothing when none is set. */
function compactionLaunch(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): CompactionLaunch {
  const points = policy?.compactAtTokens[adapter.id];
  return points === undefined || adapter.compaction === null ? NO_COMPACTION : adapter.compaction.launch(points, model);
}

/** The env a launch's policy sets: its compaction point, and its write root when it has one. */
export function policyEnv(adapter: AgentAdapter, model: string | undefined, policy: WorkerPolicy | undefined): Readonly<Record<string, string>> {
  const root = policy === undefined ? null : policy.writeRoot;
  return { ...compactionLaunch(adapter, model, policy).env, ...(root === null ? {} : { [WRITE_ROOT_ENV]: root }) };
}

/** The launch arguments that set a launch's compaction point. */
export function compactionArgs(adapter: AgentAdapter, opts: Pick<SpawnOpts, "model" | "workers">): readonly string[] {
  return compactionLaunch(adapter, opts.model, opts.workers).args;
}
