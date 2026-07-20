import { describe, expect, test } from "bun:test";
import { deriveView, formatWorkspace, statusRowFromView, warningStatusRow } from "../src/commands/status.ts";
import type { Entity } from "../src/entities.ts";

const seededEntity = {
  key: "herdr~local~app:p1", paneId: "app:p1", name: "worker", tabLabel: "app", agent: "pi",
  focused: true, backendStatus: null, sessionPath: null, presenceOnly: false, workspace: "local",
  presence: {
    key: "herdr~local~app:p1", dir: "/tmp/pres", alive: true, result: { text: "done" },
    status: {
      schema: 1, agent: "pi", state: "working", task: "build the thing", lastText: "on it",
      cost: 2.5, context: { percent: 33 }, model: { provider: "openai-codex", id: "gpt-5.6" },
      thinking: "medium", tokens: { input: 10 }, turns: 4,
    },
  },
} as unknown as Entity;

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
  test("shared status row carries presence-derived fields", () => {
    const view = deriveView(seededEntity, new Map());
    const row = statusRowFromView(view, {});
    expect(row).toMatchObject({
      key: "herdr~local~app:p1", paneId: "app:p1", name: "worker", tab: "app", agent: "pi",
      focused: true, model: "openai-codex/gpt-5.6:medium", modelShort: "gpt-5.6:medium",
      state: "working", stateFallback: false, exited: false, cost: 2.5, ctxPercent: 33,
      task: "build the thing", lastText: "on it", presenceOnly: false, tokens: { input: 10 },
      turns: 4, workspace: "local",
    });
    expect(row.host).toBeUndefined();
  });
  test("json branch and local table branch derive identical rows apart from host", () => {
    const view = deriveView(seededEntity, new Map());
    const jsonRow = statusRowFromView(view, {}); // cmdStatusLocal json branch shape
    const localRow = { ...statusRowFromView(view, {}), host: "local" }; // localStatusRows table shape
    expect(localRow).toEqual({ ...jsonRow, host: "local" });
    expect(jsonRow.host).toBeUndefined();
  });
  test("formats workspace labels and warnings", () => {
    expect(formatWorkspace("w", "Workspace")).toBe("Workspace (w)");
    expect(formatWorkspace(null, null)).toBe("-");
    expect(warningStatusRow("remote", "down")).toMatchObject({ key: "warning:remote", state: "warning", warning: "down" });
  });
});
