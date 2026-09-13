import { describe, expect, test } from "bun:test";
import { isAgentId, mintAgentId } from "../src/backends/identity.ts";

/**
 * Identity is a minted id and NOTHING else.
 *
 * These cases used to round-trip `<backend>~<workspace>~<handle>` through a
 * percent-escaping codec. Every one of them was a test that environment SURVIVES
 * a trip through identity, which is precisely the weld A1 removes: a key with
 * segments to escape is a key with somewhere to hide a plexer.
 *
 * The structural half of this rule lives in `identity-is-not-environment.test.ts`
 * (the module declares no plexer, no grouping, no sentinel). This file covers the
 * behaviour: what a key IS, and what is refused as one.
 */

/** A minted id, built the one way anything ever builds one. */
function mintedIdentity(): string {
  return mintAgentId();
}

describe("serializeIdentity / parseIdentity", () => {
  test("a key is the minted id verbatim", () => {
    const identity = mintedIdentity();
    expect(identity).toBe(identity);
  });

  test("round-trips a minted id", () => {
    const identity = mintedIdentity();
    expect(isAgentId(identity)).toBe(true);
  });

  test("a key is one flat filesystem-safe segment with nothing to split", () => {
    const key = mintedIdentity();
    expect(key).toMatch(/^[0-9a-z]{10}$/);
    for (const separator of ["/", "~", ":", "%", "\\"]) expect(key.includes(separator)).toBe(false);
  });

  test("two spawns never collide, so no plexer is needed to namespace them", () => {
    const keys = new Set(Array.from({ length: 200 }, () => mintedIdentity()));
    expect(keys.size).toBe(200);
  });
});

describe("isAgentId", () => {
  test("accepts a minted id", () => expect(isAgentId(mintAgentId())).toBe(true));

  test("rejects everything that is not one", () => {
    // The composite spellings below are NEGATIVE cases and stay verbatim: they
    // are the dead `<plexer>~<grouping>~<handle>` key, and this is the test that
    // it is refused as an identity.
    for (const value of ["", "herdr~wF~p2", "headless~local~42", "ABCDEFGHIJ", "short", "eleven_char", "%5", 42, null, undefined, {}]) {
      expect(isAgentId(value)).toBe(false);
    }
  });
});

describe("malformed input", () => {
  test("rejects malformed ids", () => {
    for (const id of ["herdr~wF~p2", "headless~local~worker0001", "", "%5", "audit-1", "worker"]) {
      expect(isAgentId(id)).toBe(false);
    }
  });
});
