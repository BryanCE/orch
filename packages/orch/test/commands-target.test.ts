import { describe, expect, test } from "bun:test";
import { resultText } from "../src/commands/target.ts";

describe("commands/target", () => {
  test("reads only structured result text", () => {
    expect(resultText({ text: "done" })).toBe("done");
    expect(resultText({ text: 1 })).toBeUndefined();
    expect(resultText(null)).toBeUndefined();
  });
});
