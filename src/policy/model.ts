import { allowedModelPatterns } from "../config.ts";

/**
 * Orch's model vocabulary and the allowlist gate, owned by orch and applied to
 * every harness. A harness resolves a token against its own registry; it never
 * decides whether the token was permitted — that ruling happens once, in the
 * control dispatcher, before any adapter sees the request.
 */

/** Thinking efforts orch's ladder token may name after the model id. */
export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === "string" && (THINKING_LEVELS as readonly string[]).includes(value);
}

/**
 * Split orch's ladder token ("provider/id:medium") into the bare model id and the
 * thinking effort. Only a trailing `:token` whose token is itself a valid thinking
 * level is treated as a suffix — a colon anywhere else stays part of the model id,
 * so a provider whose ids legitimately contain colons is never truncated.
 */
export function splitThinkingSuffix(model: string): { bare: string; thinking?: ThinkingLevel } {
  const colon = model.lastIndexOf(":");
  if (colon <= 0) return { bare: model };
  const suffix = model.slice(colon + 1);
  if (!isThinkingLevel(suffix)) return { bare: model };
  return { bare: model.slice(0, colon), thinking: suffix };
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, (char) => `\\${char}`);
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

/** True when the bare `provider/id` passes the configured allowlist; no patterns means no restriction. */
export function isAllowedModel(orchDir: string, bareModel: string): boolean {
  const patterns = allowedModelPatterns(orchDir);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => globToRegex(pattern).test(bareModel));
}

/** Reject a malformed or disallowed model token, naming the patterns that refused it. */
export function assertModelAllowed(orchDir: string, model: string): void {
  const { bare } = splitThinkingSuffix(model);
  const slash = bare.indexOf("/");
  if (slash <= 0 || slash === bare.length - 1) throw new Error(`model must be a provider/id string: ${model}`);
  if (isAllowedModel(orchDir, bare)) return;
  throw new Error(`model ${bare} is not in models.allowed (${allowedModelPatterns(orchDir).join(", ")})`);
}
