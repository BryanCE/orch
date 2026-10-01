import { describe, expect, test } from "bun:test";
import { formatNoRowsMessage, scopeFleetRows } from "../src/commands/status/options.ts";
import { statusRowFixture } from "./helpers/status-row.ts";
import type { StatusRow } from "../src/types/command.ts";

function statusRow(overrides: Partial<StatusRow> = {}): StatusRow {
  return statusRowFixture({ key: "agent00001", name: "worker", agent: "pi", model: "pi/model", state: "working", owned: true, ...overrides });
}

const defaultOptions = { all: false };

describe("headless status visibility", () => {
  test("drops an exited agent that finished, however much it recorded", () => {
    const row = statusRow({ key: "done-agent", state: "done", exited: true, alive: false, lastText: "finished" });
    expect(scopeFleetRows([row], defaultOptions)).toEqual([]);
  });

  test("--hide removes the states it names; --agent brings one dead agent back", () => {
    const row = statusRow({ key: "result-agent", state: "exited", exited: true, alive: false, lastText: "finished" });
    expect(scopeFleetRows([row], { ...defaultOptions, agentKey: "result-agent" })).toEqual([row]);
    expect(scopeFleetRows([row], { ...defaultOptions, agentKey: "result-agent", hide: new Set(["exited"]) })).toEqual([]);
  });

  test("--hide drops live rows in the states it names", () => {
    const working = statusRow({ key: "busy", state: "working" });
    const done = statusRow({ key: "finished", state: "done" });
    expect(scopeFleetRows([working, done], { ...defaultOptions, hide: new Set(["done"]) })).toEqual([working]);
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
  test("--all widens the scope without resurrecting empty dead rows", () => {
    const row = statusRow({ key: "stale-agent", state: "working", exited: true, alive: false });
    expect(scopeFleetRows([row], { all: true })).toEqual([]);
  });

  test("reports the number of live agents outside the caller's ownership", () => {
    expect(formatNoRowsMessage({ otherLive: 2 })).toBe("you hold 0; 2 live agents belong to other orchs\n");
  });
});
