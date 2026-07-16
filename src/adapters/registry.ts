import type { AgentAdapter } from "./adapter.ts";
import { piAdapter } from "./pi.ts";
import { codexAdapter } from "./codex.ts";
import { claudeAdapter } from "./claude.ts";

const adapters: readonly AgentAdapter[] = [piAdapter, codexAdapter, claudeAdapter];

/** Return every registered agent adapter in registration order. */
export function allAdapters(): readonly AgentAdapter[] {
  return adapters;
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
