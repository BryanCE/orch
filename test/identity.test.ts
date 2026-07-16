import { describe, expect, test } from "bun:test";
import { parseIdentity, serializeIdentity, tryParseIdentity, type Identity } from "../src/backends/identity.ts";

describe("serializeIdentity / parseIdentity round-trip", () => {
  const cases: readonly (readonly [string, Identity])[] = [
    ["herdr", { backend: "herdr", workspace: "wD", handle: "p2" }],
    ["tmux with % handle", { backend: "tmux", workspace: "main", handle: "%5" }],
    ["tmux with : and % handle", { backend: "tmux", workspace: "main:pane", handle: "%5" }],
    ["headless pid handle", { backend: "headless", workspace: "local", handle: "1234" }],
    ["empty workspace", { backend: "headless", workspace: "", handle: "1234" }],
    ["separator inside parts", { backend: "he~rdr", workspace: "w~s", handle: "p~2" }],
    ["slash inside parts", { backend: "tmux", workspace: "a/b", handle: "c/d" }],
    ["percent-code-lookalike", { backend: "tmux", workspace: "%7E", handle: "%3A" }],
  ];

  for (const [name, id] of cases) {
    test(`round-trips ${name}`, () => {
      const key = serializeIdentity(id);
      expect(parseIdentity(key)).toEqual(id);
    });
  }

  test("serialized key is a single flat segment (no nested path)", () => {
    const key = serializeIdentity({ backend: "tmux", workspace: "main", handle: "%5" });
    expect(key.includes("/")).toBe(false);
    expect(key).toBe("tmux~main~%255");
  });

  test("backend namespaces prevent collisions across equal workspace/handle", () => {
    const shared = { workspace: "main", handle: "5" };
    const herdrKey = serializeIdentity({ backend: "herdr", ...shared });
    const tmuxKey = serializeIdentity({ backend: "tmux", ...shared });
    expect(herdrKey).not.toBe(tmuxKey);
  });
});

describe("malformed input", () => {
  test("rejects wrong segment count", () => {
    expect(() => parseIdentity("herdr~wD")).toThrow(/expected 3 segments/);
    expect(() => parseIdentity("herdr~wD~p2~extra")).toThrow(/expected 3 segments/);
  });

  test("rejects empty key", () => {
    expect(() => parseIdentity("")).toThrow(/non-empty string/);
  });

  test("rejects empty backend or handle on serialize", () => {
    expect(() => serializeIdentity({ backend: "", workspace: "w", handle: "h" })).toThrow(/backend/);
    expect(() => serializeIdentity({ backend: "b", workspace: "w", handle: "" })).toThrow(/handle/);
  });

  test("tryParseIdentity returns null for malformed and non-string input", () => {
    expect(tryParseIdentity("herdr~wD")).toBeNull();
    expect(tryParseIdentity(null)).toBeNull();
    expect(tryParseIdentity(undefined)).toBeNull();
  });

  test("tryParseIdentity parses a valid key", () => {
    expect(tryParseIdentity("herdr~wD~p2")).toEqual({ backend: "herdr", workspace: "wD", handle: "p2" });
  });
});
