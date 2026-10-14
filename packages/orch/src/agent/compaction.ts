// Compaction for a harness with no launch flag for it: the bridge watches context usage
// and compacts at the point `workers.compact_at_tokens` sets for the model the session
// runs now, so a model switch mid-session moves the point with it.
import type { HarnessApi, HarnessContext, HarnessIdentity } from "../types/agent.ts";
import type { SettingsManager } from "../types/services.ts";

/** The session's point for its current model, or undefined to keep the harness default. */
function currentPoint(settings: SettingsManager, identity: HarnessIdentity, ctx: HarnessContext): number | undefined {
  const model = ctx.model;
  if (model === undefined) return undefined;
  const table = settings.currentOrNull()?.workers.compact_at_tokens ?? {};
  const points = Object.entries(table).find(([harness]) => harness === identity.agentId)?.[1];
  return points?.[`${model.provider}/${model.id}`];
}

/** Compact once a turn ends at or past the point. One at a time: usage stays over the
 *  point until the summary lands, and a second request would summarize twice. */
export function registerCompaction(harness: HarnessApi, identity: HarnessIdentity, settings: SettingsManager): void {
  let compacting = false;
  harness.on("turn_end", (_event, ctx: HarnessContext) => {
    if (compacting || ctx.compact === undefined) return;
    const point = currentPoint(settings, identity, ctx);
    const tokens = ctx.getContextUsage()?.tokens;
    if (point === undefined || tokens === undefined || tokens < point) return;
    compacting = true;
    const settle = (): void => { compacting = false; };
    ctx.compact({ onComplete: settle, onError: settle });
  });
}
