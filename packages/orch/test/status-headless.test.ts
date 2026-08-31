import { describe, expect, test } from "bun:test";
import { formatNoRowsMessage, scopeFleetRows } from "../src/commands/status.ts";
import type { StatusRow } from "../src/types/command.ts";

function statusRow(overrides: Partial<StatusRow> = {}): StatusRow {
  return {
    key: "agent00001", paneId: null, managed: true, name: "worker", tab: null, agent: "pi",
    owner: null, spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null,
    focused: false, model: "pi/model", modelShort: "model", state: "working", stateFallback: false,
    staleExtension: false, exited: false, alive: true, cost: 0, ctxPercent: null, task: null,
    dispatchId: null, lastText: null, backendStatus: null, backend: null, capabilities: null,
    sessionPath: null, presenceDir: null, presenceOnly: true, tokens: null, turns: null,
    ...overrides,
  };
}

const defaultOptions = { all: false, allPanes: false };

describe("headless status visibility", () => {
  test("keeps an exited agent with a terminal state", () => {
    const row = statusRow({ key: "done-agent", state: "done", exited: true, alive: false });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([row]);
  });

  test("keeps an exited agent with a recorded result", () => {
    const row = statusRow({ key: "result-agent", state: "exited", exited: true, alive: false, lastText: "finished" });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([row]);
  });

  test("drops a dead row with no result or terminal state", () => {
    const row = statusRow({ key: "stale-agent", state: "working", exited: true, alive: false, lastText: "" });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([]);
  });

  test("keeps a live row", () => {
    const row = statusRow({ key: "live-agent", state: "working", exited: false, alive: true });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([row]);
  });

  test("--all keeps stale rows", () => {
    const row = statusRow({ key: "stale-agent", state: "working", exited: true, alive: false });
    expect(scopeFleetRows([row], { all: true, allPanes: false })).toEqual([row]);
  });

  test("uses agent language without backend details when no backend was asked", () => {
    const message = formatNoRowsMessage({ agentsSeen: 1, alive: 0, backendAnswered: false });
    expect(message).toContain("No agents found");
    expect(message.toLowerCase()).not.toContain("pane");
    expect(message.toLowerCase()).not.toContain("backend");
  });
});
