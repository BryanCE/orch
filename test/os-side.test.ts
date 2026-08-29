import { describe, expect, test } from "bun:test";
import { osSide } from "../src/util.ts";

describe("osSide", () => {
  test("supports both platform branches independent of ambient host", () => {
    expect(osSide("win32")).toBe("windows");
    expect(osSide("linux")).toBe("linux");
    expect(osSide("darwin")).toBe("darwin");
  });
});
