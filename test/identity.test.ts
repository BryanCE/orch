import { describe, expect, test } from "bun:test";
import { parseIdentity, serializeIdentity, tryParseIdentity, type Identity } from "../src/backends/identity.ts";

describe("serializeIdentity / parseIdentity round-trip", () => {
  const cases: readonly (readonly [string, Identity])[] = [
    ["herdr", { backend: "herdr", workspace: "wD", id: "p2" }],
    ["tmux with % handle", { backend: "tmux", workspace: "main", id: "%5" }],
    ["tmux with : and % handle", { backend: "tmux", workspace: "main:pane", id: "%5" }],
    ["headless pid handle", { backend: "headless", workspace: "local", id: "1234" }],
    ["empty workspace", { backend: "headless", workspace: "", id: "1234" }],
    ["separator inside parts", { backend: "he~rdr", workspace: "w~s", id: "p~2" }],
    ["slash inside parts", { backend: "tmux", workspace: "a/b", id: "c/d" }],
    ["percent-code-lookalike", { backend: "tmux", workspace: "%7E", id: "%3A" }],
  ];

  for (const [name, id] of cases) {
    test(`round-trips ${name}`, () => {
      const key = serializeIdentity(id);
      expect(parseIdentity(key)).toEqual(id);
    });
  }

  test("serialized key is a single flat segment (no nested path)", () => {
    const key = serializeIdentity({ backend: "tmux", workspace: "main", id: "%5" });
    expect(key.includes("/")).toBe(false);
    expect(key).toBe("tmux~main~%255");
  });

  test("backend namespaces prevent collisions across equal workspace/handle", () => {
    const shared = { workspace: "main", id: "5" };
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

  test("rejects empty backend or id on serialize", () => {
    expect(() => serializeIdentity({ backend: "", workspace: "w", id: "h" })).toThrow(/backend/);
    expect(() => serializeIdentity({ backend: "b", workspace: "w", id: "" })).toThrow(/id/);
  });

  test("tryParseIdentity returns null for malformed and non-string input", () => {
    expect(tryParseIdentity("herdr~wD")).toBeNull();
    expect(tryParseIdentity(null)).toBeNull();
    expect(tryParseIdentity(undefined)).toBeNull();
  });

  test("tryParseIdentity parses a valid key", () => {
    expect(tryParseIdentity("herdr~wD~p2")).toEqual({ backend: "herdr", workspace: "wD", id: "p2" });
  });
});
