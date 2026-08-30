// Type-only: `keyof typeof` over a runtime binding, erased at compile time, so
// this creates no runtime edge out of the types layer.
import type { VOCABULARY } from "../policy/vocabulary.ts";
import type { OrchConfig } from "./config.ts";

export interface WallDecision {
  allowed: boolean;
  reason?: string;
}

export type SpaceResolver =
  | Readonly<Record<string, string>>
  | ((id: string) => string | null | undefined);

/**
 * Who launched a spawn, as every spawned agent should know it. Identity is
 * orch's own layer: it survives whichever harness or plexer either side runs
 * in, and both directions stay addressable — the spawner knows the worker by
 * name, and the worker knows exactly which session is orchestrating it.
 */
export interface SpawnerIdentity {
  /** Reply address when the spawner has a presence inbox; null when it has none. */
  key: string | null;
  /** Human description: "lead-1 (pi)", "pi session", "claude session", "operator". */
  label: string;
}

/** Thinking efforts orch's ladder token may name after the model id. */
export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** Inputs used to resolve one launch's independent thinking effort. */
export interface ThinkingResolutionInput {
  readonly flag?: unknown;
  readonly modelSuffix?: unknown;
  readonly harness: string;
  readonly config: Pick<OrchConfig, "defaults">;
}

export type Term = keyof typeof VOCABULARY;

/** A11: orch = pack root, slave = any non-root member. */
export type Role = Extract<Term, "orch" | "slave">;

/**
 * What a spawned worker is allowed to load, expressed in orch vocabulary and
 * resolved once here. Adapters translate this policy into their own harness's
 * flags; no adapter decides the policy itself.
 *
 * The defaults inherit: a worker runs with the same extensions and tools the
 * user gets interactively. Hardcoding a minimal set stripped every user
 * extension from every worker with no way to opt back in, which is why the
 * exclusions are now a named list the user owns.
 */
export interface WorkerPolicy {
  /** Load the harness's own discovered extensions alongside orch's bridge. */
  readonly inheritExtensions: boolean;
  /** Extension names to drop when inheriting (basename, no file suffix). */
  readonly excludeExtensions: readonly string[];
  /** Keep the harness's built-in tools; false restricts to `allowTools` only. */
  readonly builtinTools: boolean;
  /** The exact tool allowlist, or empty for no restriction. Orch's own tools are always in it. */
  readonly allowTools: readonly string[];
}

/** The two provenance facts a walk reads; `AgentView` satisfies it structurally. */
export interface ProvenanceNode {
  readonly spawnedBy: string | null;
}
/** Resolve one agent's provenance facts, or nothing when the id is unknown. */
export type ProvenanceLookup = (id: string) => ProvenanceNode | null | undefined;

export type CloseAuthority =
  | { readonly kind: "human" }
  | { readonly kind: "agent"; readonly agentId: string };
