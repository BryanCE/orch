import { describe, expect, test } from "bun:test";
import { statusSpeaksForTask } from "../src/daemon/work-loop.ts";
import type { TaskRec } from "../src/queue.ts";

function claimedTask(): TaskRec {
  return {
    id: "t1", text: "x", opts: {}, enqueuedBy: "orch", scopeAgentId: null,
    scopePackId: "orch", scopeSpaceId: null, createdAt: "", updatedAt: "",
    state: "claimed", attempts: [{ since: 1, until: null, agentId: "worker", dispatchId: "mine", outcome: null, result: null, error: null }],
  };
}

describe("work loop attempt binding", () => {
  test("statusSpeaksForTask verifies the current attempt dispatch id", () => {
    const task = claimedTask();
    expect(statusSpeaksForTask(null, task)).toBe(false);
    expect(statusSpeaksForTask({}, task)).toBe(true);
    expect(statusSpeaksForTask({ dispatchId: "mine" }, task)).toBe(true);
    expect(statusSpeaksForTask({ dispatchId: "other" }, task)).toBe(false);
  });
});
