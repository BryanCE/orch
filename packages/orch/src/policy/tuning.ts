import { modelSpec, resolveThinking, splitThinkingSuffix } from "./thinking.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { ThinkingLevel } from "../types/policy.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentTuning } from "../types/store.ts";

// THE one place a launch tuning comes from. Spawn, tile, dispatch, reset,
// restart, `orch model` and the daemon's settings-change re-pin all ask this and
// nothing else; a verb that assembled its own model/effort pair is how the fleet
// ran at an effort nobody configured. Pure: no settings loader, no exit, no I/O.
//
// THE CONTROL MODEL, in one line: what this command names, else what the agent
// already holds, else the configured default. An orchestrator that spawned an
// agent on `luna:low` said what it wanted; a dispatch, reset, restart or
// settings reload that names nothing keeps that. The default is for an agent
// nobody has tuned yet. Nothing else may reach for the default.

/** What a caller may say about the tuning it wants; every field is optional
 *  because the configured defaults are a complete answer on their own. */
export interface TuningRequest {
  /** An explicit model, bare or as a `provider/id:effort` ladder token. */
  readonly model?: string | null;
  /** An explicit effort; wins over any suffix on `model`. */
  readonly thinking?: string | null;
  /** The tuning the agent already holds. Absent on a launch, which has no agent
   *  yet; `null` model when the agent was never pinned. */
  readonly pinned?: AgentTuning | null;
  readonly harness: AdapterId;
  readonly settings: Pick<OrchSettings, "defaults">;
}

/** A resolved tuning: the bare model id and the effort, never welded. */
export interface Tuning {
  readonly model: string;
  readonly thinking: ThinkingLevel;
}

/**
 * Resolve the tuning a verb applies. The model is the explicit one, else the
 * harness's configured default; `null` when neither names one — the caller
 * decides how to refuse, because an unpinned session runs whatever the harness
 * happens to default to, which is never what orch asked for. The effort is
 * resolved through `resolveThinking`, so an explicit flag, a `:effort` suffix,
 * a per-harness setting and `defaults.thinking` rank the same way everywhere.
 */
export function resolveTuning(request: TuningRequest): Tuning | null {
  const pinned = request.pinned?.model ? modelSpec(request.pinned.model, request.pinned.thinking) : null;
  const requested = request.model ?? pinned ?? request.settings.defaults.models[request.harness] ?? "";
  if (!requested) return null;
  const { bare, thinking: suffix } = splitThinkingSuffix(requested);
  return {
    model: bare,
    thinking: resolveThinking({ flag: request.thinking, modelSuffix: suffix, harness: request.harness, settings: request.settings }),
  };
}
