import { describe, expect, test } from "bun:test";
import { assistantText, contentText, lastAssistantFromJsonl } from "../src/adapters/transcript.ts";

// A claude-format JSONL transcript: assistant entries wrap the message under a
// {type:"assistant"} envelope; the final assistant carries an empty-string part
// alongside a real one.
const TRANSCRIPT = [
  `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"first answer"}]}}`,
  `{"type":"user","message":{"role":"user","content":"a question"}}`,
  `not json — a stray log line`,
  `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":""},{"type":"text","text":"final answer"}]}}`,
].join("\n");

describe("lastAssistantFromJsonl", () => {
  test("returns the last assistant text, skipping user and malformed lines", () => {
    expect(lastAssistantFromJsonl(TRANSCRIPT)).toBe("final answer");
  });

  test("undefined for blank or empty input", () => {
    expect(lastAssistantFromJsonl(undefined)).toBeUndefined();
    expect(lastAssistantFromJsonl("   \n  ")).toBeUndefined();
  });

  test("an empty-content assistant does not overwrite an earlier real one", () => {
    const raw = [
      `{"type":"assistant","message":{"role":"assistant","content":"kept"}}`,
      `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":""}]}}`,
    ].join("\n");
    expect(lastAssistantFromJsonl(raw)).toBe("kept");
  });
});

describe("assistantText", () => {
  test("reads role-tagged records", () => {
    expect(assistantText({ role: "assistant", content: "hi" })).toBe("hi");
  });

  test("reads the {type:'assistant'} envelope with a nested message", () => {
    expect(assistantText({ type: "assistant", message: { content: "wrapped" } })).toBe("wrapped");
  });

  test("undefined for non-assistant roles", () => {
    expect(assistantText({ role: "user", content: "hi" })).toBeUndefined();
  });
});

describe("contentText empty-string part handling", () => {
  // The array filter is `part !== undefined`, not truthiness. Bare empty strings
  // collapse to undefined at the string boundary (via textValue) and are then
  // filtered out, so they never contribute a blank line to the join.
  test("empty parts drop out; real parts are joined without blank lines", () => {
    expect(contentText([{ text: "" }, { text: "a" }, { text: "b" }])).toBe("a\nb");
  });

  test("an all-empty content array yields undefined", () => {
    expect(contentText([{ text: "" }])).toBeUndefined();
    expect(contentText([])).toBeUndefined();
  });

  test("a bare empty string yields undefined", () => {
    expect(contentText("")).toBeUndefined();
  });
});
