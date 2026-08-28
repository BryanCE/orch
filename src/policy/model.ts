import { allowedModelPatterns } from "../config.ts";
import { splitThinkingSuffix, THINKING_LEVELS } from "./thinking.ts";
import type { AdapterId, AgentAdapter, HarnessModel } from "../adapters/adapter.ts";

/**
 * The allowlist gate, owned by orch and applied to every harness. A harness
 * resolves a token against its own registry; it never decides whether the token
 * was permitted — that ruling happens once, in the control dispatcher, before
 * any adapter sees the request.
 */

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, (char) => `\\${char}`);
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

/** True when the bare model passes that harness's configured allowlist; no patterns means no restriction. */
function isAllowedModel(orchDir: string, harness: AdapterId, bareModel: string): boolean {
  const patterns = allowedModelPatterns(orchDir, harness);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => globToRegex(pattern).test(bareModel));
}

/** The handful of listed specs closest to a rejected one, for the refusal message. */
function nearestOffered(offered: readonly HarnessModel[], bare: string): string[] {
  const needle = bare.toLowerCase();
  const near = offered.filter((model) => model.spec.toLowerCase().includes(needle));
  return (near.length ? near : offered).slice(0, 5).map((model) => model.spec);
}

/** What to paste instead of the spec that was refused: one concrete `--model`
 *  argument, the thinking levels orch's ladder accepts after it, and the command
 *  that lists the rest. A refusal that only names what is wrong costs a round trip. */
function correctedSpecHint(harness: AdapterId, candidates: readonly string[]): string {
  const best = candidates[0];
  if (!best) return `run: orch models --agent=${harness}`;
  return `try: --model ${best}[:${THINKING_LEVELS.join("|")}] — full list: orch models --agent=${harness}`;
}

/**
 * Reject a model the harness does not list.
 *
 * Membership in the adapter's OWN registry is the only honest check orch can make:
 * what a valid token looks like is the harness's vocabulary (pi wants `provider/id`,
 * codex wants `gpt-5.6-luna`, claude wants `sonnet`), so a format rule here would be
 * one harness's grammar imposed on the rest. It is also the strongest check — it is
 * what stops a shorthand reaching a harness resolver that would fuzzy-match it onto
 * whatever registry entry shares a prefix. A harness that enumerates nothing cannot
 * be checked, and orch does not pretend otherwise.
 */
export function assertModelOffered(adapter: AgentAdapter, model: string): void {
  assertModelListed(adapter.id, adapter.listModels?.() ?? [], model);
}

/** The same rejection against a catalogue the caller already holds, so a caller that has asked
 *  the harness once never asks again and never sees two different answers. */
export function assertModelListed(harness: AdapterId, offered: readonly HarnessModel[], model: string): void {
  if (!offered.length) return;
  const { bare } = splitThinkingSuffix(model);
  if (offered.some((candidate) => candidate.spec === bare)) return;
  const near = nearestOffered(offered, bare);
  throw new Error(`${harness} does not list model ${bare}; it offers ${near.join(", ")}. ${correctedSpecHint(harness, near)}`);
}

/** Reject a model the harness does not offer or the settings allowlist refuses. */
export function assertModelAllowed(orchDir: string, adapter: AgentAdapter, model: string): void {
  assertModelOffered(adapter, model);
  const { bare } = splitThinkingSuffix(model);
  if (isAllowedModel(orchDir, adapter.id, bare)) return;
  const permitted = (adapter.listModels?.() ?? [])
    .map((candidate) => candidate.spec)
    .filter((spec) => isAllowedModel(orchDir, adapter.id, spec));
  throw new Error(`model ${bare} is not in models.allowed.${adapter.id} (${allowedModelPatterns(orchDir, adapter.id).join(", ")}); ${correctedSpecHint(adapter.id, permitted)}`);
}
