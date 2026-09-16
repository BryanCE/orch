import { describe, expect, test } from "bun:test";
import { formatNoRowsMessage, scopeFleetRows } from "../src/commands/status/options.ts";
import type { StatusRow } from "../src/types/command.ts";

function statusRow(overrides: Partial<StatusRow> = {}): StatusRow {
  return {
    key: "agent00001", paneId: null, managed: true, name: "worker", tab: null, agent: "pi",
    owner: null, spawnedBy: null, spawnedByLabel: null, worktree: null, branch: null, cwd: null,
    focused: false, model: "pi/model", modelShort: "model", state: "working", stateFallback: false,
    exited: false, alive: true, cost: 0, ctxPercent: null, task: null,
    dispatchId: null, lastText: null, backendStatus: null, backend: null, capabilities: null,
    sessionPath: null, bridgeAttached: null, tokens: null, turns: null,
    ...overrides,
  };
}

const defaultOptions = { spaceWide: false, allPanes: false };

describe("headless status visibility", () => {
  test("drops an exited agent that finished, however much it recorded", () => {
    const row = statusRow({ key: "done-agent", state: "done", exited: true, alive: false, lastText: "finished" });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([]);
  });

  test("--filter removes the states it names; --agent brings one dead agent back", () => {
    const row = statusRow({ key: "result-agent", state: "exited", exited: true, alive: false, lastText: "finished" });
    expect(scopeFleetRows([row], { ...defaultOptions, agent: "result-agent" })).toEqual([row]);
    expect(scopeFleetRows([row], { ...defaultOptions, agent: "result-agent", states: new Set(["exited"]) })).toEqual([]);
  });

  test("--filter drops live rows in the states it names", () => {
    const working = statusRow({ key: "busy", state: "working" });
    const done = statusRow({ key: "finished", state: "done" });
    expect(scopeFleetRows([working, done], { ...defaultOptions, states: new Set(["done"]) })).toEqual([working]);
  });

  test("drops a dead row with no result or terminal state", () => {
    const row = statusRow({ key: "stale-agent", state: "working", exited: true, alive: false, lastText: "" });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([]);
  });

  test("keeps a live row", () => {
    const row = statusRow({ key: "live-agent", state: "working", exited: false, alive: true });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([row]);
  });

  // Widening scope is not the same question as keeping a dead agent that reported
  // nothing, and one flag answering both is what made `--all` mean two things.
  test("--space-wide widens the scope without resurrecting empty dead rows", () => {
    const row = statusRow({ key: "stale-agent", state: "working", exited: true, alive: false });
    expect(scopeFleetRows([row], { spaceWide: true, allPanes: false })).toEqual([]);
  });

  test("uses agent language without backend details when no backend was asked", () => {
    const message = formatNoRowsMessage({ agentsSeen: 1, alive: 0, backendAnswered: false });
    expect(message).toContain("No agents found");
    expect(message.toLowerCase()).not.toContain("pane");
    expect(message.toLowerCase()).not.toContain("backend");
  });
});
