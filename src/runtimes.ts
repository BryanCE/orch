// The closed runtime vocabulary, importable without pulling any provider code.
// A true leaf: this module imports NOTHING, so config.ts (which builds its zod
// schema at module scope) can reach these values without entering the adapter
// registry's graph and hitting the temporal dead zone.

/**
 * Every runtime orch supports. All three are first-class choices: orch's own code
 * is runtime-agnostic by construction (Rule 6 bans `Bun.*` and `bun:*` in source
 * precisely SO the tree runs anywhere), so whichever of these a user has is a
 * valid way to run it. Rule 6 constrains what orch's code may depend on, not what
 * a user may execute it with.
 */
export const ORCH_RUNTIMES = ["node", "deno", "bun"] as const;

/** The declared runtime recorded as the top-level `runtime` key of settings.json. */
export type OrchRuntime = (typeof ORCH_RUNTIMES)[number];

/**
 * What a fresh install records absent an explicit choice. `node` only because it
 * is the most universally present and is what an `npm install -g` lands under —
 * a starting point, not a judgment about the others.
 */
export const DEFAULT_RUNTIME: OrchRuntime = "node";
