import { describe, expect, test } from "bun:test";
import { checkWall, sameWorkspace, scopeToWorkspace, workspaceName, workspaceOf } from "../src/policy/workspace.ts";

describe("workspace policy", () => {
  test("reads workspaces from serialized identity keys", () => {
    expect(workspaceOf("herdr~wD~p2")).toBe("wD");
    expect(workspaceOf("tmux~main~%255")).toBe("main");
    expect(workspaceOf("headless~local~1234")).toBe("local");
    expect(workspaceOf("wD:p1")).toBeNull();
    expect(workspaceOf("session-123")).toBeNull();
    expect(workspaceOf(null)).toBeNull();
    expect(workspaceOf(undefined)).toBeNull();
  });

  test("resolves workspace names through records and functions", () => {
    expect(workspaceName("wD", { wD: "Design" })).toBe("Design");
    expect(workspaceName("wC", (id) => id === "wC" ? "Code" : undefined)).toBe("Code");
    expect(workspaceName("wX", { wD: "Design" })).toBe("wX");
    expect(workspaceName(null, {})).toBeNull();
  });

  test("compares serialized keys by their workspace", () => {
    expect(sameWorkspace(workspaceOf("herdr~wD~p0"), workspaceOf("herdr~wD~p2"))).toBe(true);
    expect(sameWorkspace(workspaceOf("herdr~w1~p1"), workspaceOf("herdr~w2~p2"))).toBe(false);
    expect(sameWorkspace(null, "w8")).toBe(false);
  });

  test("enforces the workspace wall", () => {
    expect(checkWall("herdr~wD~p0", "herdr~wD~p2", { crossWorkspace: false }).allowed).toBe(true);
    expect(checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: false }).allowed).toBe(false);
    expect(checkWall("herdr~w1~p1", "herdr~w2~p2", { crossWorkspace: true }).allowed).toBe(true);
    expect(checkWall(null, "herdr~w2~p2", { crossWorkspace: false }).allowed).toBe(true);
    expect(checkWall("headless~local~1", "tmux~local~%5", { crossWorkspace: false }).allowed).toBe(true);
  });

  test("scopes serialized identity keys to the current workspace", () => {
    const items = ["herdr~w1~p1", "tmux~w2~%5", "session-123"];
    expect(scopeToWorkspace(items, (item) => item, "w1", { all: false })).toEqual(["herdr~w1~p1"]);
  });

  test("null current workspace leaves items unscoped", () => {
    const items = ["herdr~w1~p1", "herdr~w2~p2", "session-123"];
    expect(scopeToWorkspace(items, (item) => item, null, { all: false })).toBe(items);
  });
});
