// Orch's ladder token vocabulary: the thinking efforts a model spec may name and
// how a spec splits into its two halves. A leaf on purpose — it decides nothing
// about which models are permitted (that is `policy/model.ts`, which reads
// settings), so an in-process bridge can parse a ladder token without carrying
// the settings loader.

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
