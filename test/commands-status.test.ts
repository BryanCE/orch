import { describe, expect, test } from "bun:test";
import { deriveView, formatWorkspace, warningStatusRow } from "../src/commands/status.ts";
import type { Entity } from "../src/entities.ts";

describe("commands/status", () => {
  test("derives view fields from seeded presence", () => {
    const entity = { key: "headless~local~1", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "headless~local~1", dir: "/tmp", alive: true, result: { text: "answer" }, status: { agent: "pi", state: "working", task: "task", cost: 1.25, context: { percent: 42 } } } } as unknown as Entity;
    const view = deriveView(entity, new Map());
    expect(view).toMatchObject({ agent: "pi", state: "working", task: "task", last: "answer", cost: 1.25, ctxPercent: 42, exited: false });
  });
  test("marks dead presence as exited", () => {
    const entity = { key: "headless~local~1", paneId: null, name: null, tabLabel: null, agent: "pi", focused: false, backendStatus: null, sessionPath: null, presenceOnly: true, workspace: "local", presence: { key: "headless~local~1", dir: "/tmp", alive: false, result: null, status: { agent: "pi", state: "working" } } } as unknown as Entity;
    expect(deriveView(entity, new Map())).toMatchObject({ state: "exited", exited: true });
  });
  test("formats workspace labels and warnings", () => {
    expect(formatWorkspace("w", "Workspace")).toBe("Workspace (w)");
    expect(formatWorkspace(null, null)).toBe("-");
    expect(warningStatusRow("remote", "down")).toMatchObject({ key: "warning:remote", state: "warning", warning: "down" });
  });
});
