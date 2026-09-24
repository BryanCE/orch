import { ADAPTER_IDS, LIFECYCLE_VERBS, type AdapterId, type LifecycleVerb, type ShimRole, type SpawnOpts } from "../types/adapter.ts";

export function buildInteractiveArgv(command: string, opts: SpawnOpts): string[] {
  return [command, ...(opts.model ? ["--model", opts.model] : [])];
}

export function buildHeadlessArgv(command: string, mode: readonly string[], opts: SpawnOpts, prompt: string): string[] {
  return [command, ...mode, ...(opts.model ? ["--model", opts.model] : []), prompt];
}

/** The shim role, bound to the adapter that installs and diagnoses it. */
export function shimRole(adapter: ShimRole): ShimRole {
  return {
    installShim: (orchDir, settings, logger, opts) => adapter.installShim(orchDir, settings, logger, opts),
    diagnoseShim: (orchDir, settings, logger) => adapter.diagnoseShim(orchDir, settings, logger),
  };
}

export function isAdapterId(value: unknown): value is AdapterId {
  return typeof value === "string" && ADAPTER_IDS.some((id) => id === value);
}

export function isLifecycleVerb(value: unknown): value is LifecycleVerb {
  return typeof value === "string" && LIFECYCLE_VERBS.some((verb) => verb === value);
}

/** States an adapter may expose through orch's presence protocol. */
export type { AgentState } from "../agent-state.ts";

