/**
 * The ONE place orch's own words are spelled.
 *
 * TASKS/02-scope.md A8: vocabulary is a display map, never stored. A role is
 * not a fact orch records about an agent — it is a fact about where that agent
 * sits in the provenance tree, so it is READ (see {@link roleOf}) and can never
 * disagree with the tree. There is no `role` column and there must never be one.
 *
 * Making the terms user-configurable is later polish. The constraint that holds
 * from day one is that there is exactly ONE map: the day a term is renamed, it
 * changes here and everywhere at once, rather than surviving in half the
 * messages because they spelled it themselves.
 */
export const VOCABULARY = {
  /** The driver of a pack: its provenance root. An orch IS an agent (Rule 11). */
  orch: "orch",
  /** Any non-root member of a pack. */
  slave: "slave",
  /** One provenance tree, rooted at an orch (A10). */
  pack: "pack",
  /** The user's grouping of work, and the reachability boundary (A7, ADR 0001). */
  space: "space",
} as const satisfies Readonly<Record<string, string>>;

export type Term = keyof typeof VOCABULARY;

/** A11: orch = pack root, slave = any non-root member. */
export type Role = Extract<Term, "orch" | "slave">;

/** How a term is spelled for a human. The only way to render one. */
export function term(key: Term): string {
  return VOCABULARY[key];
}

/**
 * A11: a role is tree position and nothing else.
 *
 * `rootAgentId` is provenance — immutable, and self-referential at the root
 * (`agents_root_is_self` in the schema). So an agent that is its own root drives
 * a pack, and every other member is driven. A name, a lease and an environment
 * are all mutable and none of them is a rank: losing a holder costs a driver,
 * never a role (Rule 11).
 */
export function roleOf(agent: { readonly id: string; readonly rootAgentId: string }): Role {
  return agent.rootAgentId === agent.id ? "orch" : "slave";
}
