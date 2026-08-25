import type { AgentAdapter } from "./adapter.ts";
import { forgetModelCatalogues } from "./model-catalogue.ts";
import { piAdapter } from "./pi.ts";
import { ompAdapter } from "./omp.ts";
import { codexAdapter } from "./codex.ts";
import { claudeAdapter } from "./claude.ts";

const adapters: readonly AgentAdapter[] = [piAdapter, ompAdapter, codexAdapter, claudeAdapter];

/** Return every registered agent adapter in registration order. */
export function allAdapters(): readonly AgentAdapter[] {
  return adapters;
}

/** Start every harness's registry query at once and wait for none of them. orch warms harnesses
 *  the user has not selected and may never select: whether a harness is installed on this machine
 *  is knowable without being asked, and knowing it already is what keeps setup instant. */
export function warmAdapterCatalogues(): void {
  for (const adapter of adapters) void adapter.warmModels?.();
}

/** Discard every stored catalogue and ask the harnesses again, resolving once they have all
 *  answered. The manual half of the refresh cycle, for a model installed minutes ago. */
export async function refreshAdapterCatalogues(): Promise<void> {
  forgetModelCatalogues();
  await Promise.all(adapters.map((adapter) => adapter.warmModels?.() ?? Promise.resolve()));
}

/** Find an adapter by id. */
export function getAdapter(id: string): AgentAdapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}

/** Find an adapter by id, throwing an actionable error for unknown ids. */
export function resolveAdapter(id: string): AgentAdapter {
  const adapter = getAdapter(id);
  if (adapter) return adapter;
  throw new Error(`Unknown adapter "${id}". Supported adapters: ${adapters.map((candidate) => candidate.id).join(", ")}.`);
}
