import { describe, expect, test } from "bun:test";
import { checkWall, sameWorkspace, scopeToWorkspace, workspaceName, workspaceOf } from "../src/policy/workspace.ts";

describe("workspace policy", () => {
  test("extracts workspace ids from base32 Herdr pane keys", () => {
    expect(workspaceOf("w8:p5")).toBe("w8");
    expect(workspaceOf("w12:p3")).toBe("w12");
    expect(workspaceOf("wD:pJ")).toBe("wD");
    expect(workspaceOf("wD:pF")).toBe("wD");
    expect(workspaceOf("wD:p9")).toBe("wD");
    expect(workspaceOf("session-1234")).toBeNull();
    expect(workspaceOf("wD:t1")).toBeNull();
    expect(checkWall("wD:p0", "wD:pJ", { crossWorkspace: false }).allowed).toBe(true);
  });

  test("resolves workspace names through records and functions", () => {
    expect(workspaceName("wD", { wD: "Design" })).toBe("Design");
    expect(workspaceName("wC", (id) => id === "wC" ? "Code" : undefined)).toBe("Code");
    expect(workspaceName("wX", { wD: "Design" })).toBe("wX");
    expect(workspaceName(null, {})).toBeNull();
  });

  test("treats headless and session keys as unscoped", () => {
    expect(workspaceOf("session-123")).toBeNull();
    expect(workspaceOf("p5")).toBeNull();
    expect(workspaceOf(null)).toBeNull();
    expect(workspaceOf(undefined)).toBeNull();
    expect(sameWorkspace(null, "w8")).toBe(false);
  });

  test("denies a cross-workspace wall without override", () => {
    expect(checkWall("w1:p1", "w2:p2", { crossWorkspace: false }).allowed).toBe(false);
  });

  test("allows a cross-workspace wall with override", () => {
    expect(checkWall("w1:p1", "w2:p2", { crossWorkspace: true }).allowed).toBe(true);
  });

  test("scopes items to the current workspace and excludes unscoped keys", () => {
    const items = ["w1:p1", "w2:p2", "session-123"];
    expect(scopeToWorkspace(items, (item) => item, "w1", { all: false })).toEqual(["w1:p1"]);
  });

  test("null current workspace leaves items unscoped", () => {
    const items = ["w1:p1", "w2:p2", "session-123"];
    expect(scopeToWorkspace(items, (item) => item, null, { all: false })).toBe(items);
    expect(checkWall(null, "w2:p2", { crossWorkspace: false }).allowed).toBe(true);
  });

  test("accepts base32 pane ids beyond the existing coverage", () => {
    expect(workspaceOf("wD:pE")).toBe("wD");
    expect(workspaceOf("wD:pJ")).toBe("wD");
    expect(workspaceOf("wD:pT")).toBe("wD");
    expect(workspaceOf("wD:pX")).toBe("wD");
    expect(workspaceOf("wD:p9")).toBe("wD");
    expect(workspaceOf("wD:pT")).toBe(workspaceOf("wD:pX"));
    expect(sameWorkspace("wD", "wD")).toBe(true);
    expect(sameWorkspace("wD", "wC")).toBe(false);
    expect(checkWall("wD:pT", "wD:pX", { crossWorkspace: false }).allowed).toBe(true);
  });
});
