import { describe, expect, test } from "bun:test";
import { isAgentId, mintAgentId, parseIdentity, serializeIdentity, tryParseIdentity } from "../src/backends/identity.ts";
import type { Identity } from "../src/types/backend.ts";

/**
 * TASKS/02-scope.md A1 — identity is a minted id and NOTHING else.
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
function mintedIdentity(): Identity {
  return { id: mintAgentId() };
}

describe("serializeIdentity / parseIdentity", () => {
  test("a key is the minted id verbatim", () => {
    const identity = mintedIdentity();
    expect(serializeIdentity(identity)).toBe(identity.id);
  });

  test("round-trips a minted id", () => {
    const identity = mintedIdentity();
    expect(parseIdentity(serializeIdentity(identity))).toEqual(identity);
  });

  test("a key is one flat filesystem-safe segment with nothing to split", () => {
    const key = serializeIdentity(mintedIdentity());
    expect(key).toMatch(/^[0-9a-z]{10}$/);
    for (const separator of ["/", "~", ":", "%", "\\"]) expect(key.includes(separator)).toBe(false);
  });

  test("two spawns never collide, so no plexer is needed to namespace them", () => {
    const keys = new Set(Array.from({ length: 200 }, () => serializeIdentity(mintedIdentity())));
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
  test("rejects a plexer-and-space key on parse", () => {
    expect(() => parseIdentity("herdr~wF~p2")).toThrow(/malformed identity key/);
    expect(() => parseIdentity("headless~local~worker0001")).toThrow(/malformed identity key/);
  });

  test("rejects an empty key", () => {
    expect(() => parseIdentity("")).toThrow(/malformed identity key/);
  });

  test("rejects a pane handle, a name, and a wrong-length id on serialize", () => {
    for (const id of ["%5", "audit-1", "", "worker"]) {
      expect(() => serializeIdentity({ id })).toThrow(/10 lowercase alphanumerics/);
    }
  });

  test("tryParseIdentity returns null for malformed and non-string input", () => {
    expect(tryParseIdentity("herdr~wF~p2")).toBeNull();
    expect(tryParseIdentity("")).toBeNull();
    expect(tryParseIdentity(null)).toBeNull();
    expect(tryParseIdentity(undefined)).toBeNull();
  });

  test("tryParseIdentity parses a minted id", () => {
    const id = mintAgentId();
    expect(tryParseIdentity(id)).toEqual({ id });
  });
});
