import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mintAgentId } from "../src/backends/identity.ts";

/**
 * Four facts never welded — identity, provenance, lease, environment. Never
 * encode environment into identity. No `<backend>~<workspace>~<handle>` key.
 * `"local"` is not a place, it is a missing value with a name.
 *
 * The audit (recon/a1-audit.md §1.1) found this is the ROOT weld: because the
 * key embeds the plexer and its grouping, an agent that MOVES cannot keep its
 * identity — which is why moving was never implemented. Every other weld in §1
 * exists only because this key exists.
 *
 * This test reads the module's source rather than only its behaviour, because
 * the defect is structural: a key that still has the fields will keep passing
 * any round-trip test you write against it.
 */

/** The module with its prose stripped. A doc comment explaining why a sentinel
 *  is forbidden must not read as that sentinel being used. */
const CODE = readFileSync(new URL("../src/backends/identity.ts", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("A1 — identity carries no environment", () => {
  test("Identity declares no plexer and no plexer grouping", () => {
    // `backend` is which plexer an agent sits in and `workspace` is that
    // plexer's own grouping word. Both are environment: they change when an
    // agent moves, and A1 forbids a mutable fact inside an immutable one.
    expect(CODE).not.toMatch(/readonly\s+backend\s*:/);
    expect(CODE).not.toMatch(/readonly\s+workspace\s*:/);
  });

  test("a key is the minted id itself, with no separator to split", () => {
    // The three-segment key is the documented shape of the bug.
    // A minted id is one opaque segment; if it can be split, something is
    // riding along inside it.
    const id = mintAgentId();
    expect(id).toMatch(/^[0-9a-z]{10}$/);
    expect(id).not.toContain("~");
  });

  test("the module never spells the sentinels that stand in for a missing place", () => {
    // `headless~local~…` is the exact key that made the web bucket every
    // detached agent into a fake space called "local". A driving session is in
    // no plexer and no space: that is NULL, not a name.
    expect(CODE).not.toMatch(/["']local["']/);
  });

  test("minted ids are unique per spawn", () => {
    const ids = new Set(Array.from({ length: 500 }, () => mintAgentId()));
    expect(ids.size).toBe(500);
  });
});
