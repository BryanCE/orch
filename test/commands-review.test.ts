import { describe, expect, test } from "bun:test";
import { reviewTarget } from "../src/commands/review.ts";

describe("commands/review", () => {
  test("uses the short orch branch as review target", () => expect(reviewTarget({ key: "p", branch: "orch/task-1" })).toBe("task-1"));
  test("falls back to branch then the agent's address", () => {
    expect(reviewTarget({ key: "p", branch: "feature" })).toBe("feature");
    // A branch is an environment axis an agent may not have; the address it is
    // reachable by is what remains, and it is never invented from a pane.
    expect(reviewTarget({ key: "p", branch: null })).toBe("p");
  });
});
