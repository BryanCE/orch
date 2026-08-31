import { describe, expect, test } from "bun:test";
import { ancestorsOf, depthOf, isDescendantOf } from "../src/policy/provenance.ts";
import type { ProvenanceLookup } from "../src/types/policy.ts";

/** The one walker every provenance question is derived from. */
function tree(edges: Record<string, string | null>): ProvenanceLookup {
  return (id) => (id in edges ? { spawnedBy: edges[id] ?? null } : null);
}

describe("the one provenance walk", () => {
  const lookup = tree({ root: null, child: "root", grandchild: "child", great: "grandchild", other: null });

  test("ancestors are parent-first, root last", () => {
    expect(ancestorsOf(lookup, "great")).toEqual(["grandchild", "child", "root"]);
    expect(ancestorsOf(lookup, "root")).toEqual([]);
  });

  test("depth counts hops to the root", () => {
    expect(depthOf(lookup, "root")).toBe(0);
    expect(depthOf(lookup, "child")).toBe(1);
    expect(depthOf(lookup, "great")).toBe(3);
  });

  test("an unknown id is its own root at depth 0", () => {
    expect(depthOf(lookup, "never-registered")).toBe(0);
  });

  test("an unknown parent ends the chain instead of throwing", () => {
    const orphan = tree({ child: "vanished-orch" });
    expect(ancestorsOf(orphan, "child")).toEqual(["vanished-orch"]);
    expect(depthOf(orphan, "child")).toBe(1);
  });

  test("descendant is any depth, never self, never a sibling tree", () => {
    expect(isDescendantOf(lookup, "great", "root")).toBe(true);
    expect(isDescendantOf(lookup, "great", "child")).toBe(true);
    expect(isDescendantOf(lookup, "child", "child")).toBe(false);
    expect(isDescendantOf(lookup, "other", "root")).toBe(false);
    expect(isDescendantOf(lookup, "root", "child")).toBe(false);
  });

  test("a cycle terminates", () => {
    const loop = tree({ a: "b", b: "a" });
    expect(ancestorsOf(loop, "a")).toEqual(["b"]);
    expect(isDescendantOf(loop, "a", "a")).toBe(false);
  });
});
