import { describe, expect, test } from "bun:test";
import { paneBoundary } from "../src/commands/panes.ts";

describe("port seam command boundary", () => {
  test("headless target is answered without invoking its pane role", () => {
    let calls = 0;
    const role = { setZoom: () => { calls++; } };
    const plan = paneBoundary("worker-1", "zoom", role, false);
    expect(plan).toEqual({ outcome: "answer", reason: "no-pane", text: "worker-1 has no pane; zoom does not apply." });
    expect(calls).toBe(0);
  });

  test("paned environment without a role is answered at the boundary", () => {
    const plan = paneBoundary("worker-1", "zoom", null, true);
    expect(plan).toEqual({ outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide zoom" });
  });

  test("an invocation preserves the provider failure", () => {
    const plan = paneBoundary("worker-1", "zoom", { setZoom: () => { throw new Error("real provider failure"); } }, true);
    expect(plan.outcome).toBe("invoke");
    if (plan.outcome === "invoke") expect(() => plan.role.setZoom()).toThrow("real provider failure");
  });
});
