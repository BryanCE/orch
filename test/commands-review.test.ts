import { describe, expect, test } from "bun:test";
import { reviewTarget } from "../src/commands/review.ts";

describe("commands/review", () => {
  test("uses the short orch branch as review target", () => expect(reviewTarget({ pane: "p", branch: "orch/task-1" })).toBe("task-1"));
  test("falls back to branch then pane", () => {
    expect(reviewTarget({ pane: "p", branch: "feature" })).toBe("feature");
    expect(reviewTarget({ pane: "p" })).toBe("p");
  });
});
