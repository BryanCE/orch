import { describe, expect, test } from "bun:test";
import { computeFleetCapacity, formatCapacityLine } from "../src/policy/capacity.ts";
import { agentViewFixture } from "./helpers/views.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

function view(id: string, name: string, rootAgentId: string, space: string): AgentView {
  return agentViewFixture(id, {
    name,
    rootAgentId,
    environment: { space },
  });
}

function livePresence(id: string): PresenceEntry {
  return { key: id, dir: id, status: null, result: null, alive: true };
}

const settings = {
  fleet: {
    max_agents_per_pack: 10,
    max_depth: 1,
    max_agents_total: undefined,
    max_agents_per_space: { main: 6 },
    worker_peer_tools: false,
    cross_space: false,
  },
  spaces: { main: "main" },
} satisfies Parameters<typeof computeFleetCapacity>[2];

describe("fleet capacity", () => {
  test("counts live agents by root holder", () => {
    const views = new Map([
      ["root", view("root", "you", "root", "main")],
      ["child", view("child", "child", "root", "main")],
      ["foreign", view("foreign", "claude-skgrlw9n", "foreign", "other")],
    ]);
    const presence = new Map([
      ["root", livePresence("root")],
      ["child", livePresence("child")],
      ["foreign", livePresence("foreign")],
    ]);

    const capacity = computeFleetCapacity(views, presence, settings);
    expect(capacity.pack.used).toBe(3);
    expect(capacity.pack.holders).toEqual([
      { id: "foreign", name: "claude-skgrlw9n", count: 1 },
      { id: "root", name: "you", count: 2 },
    ]);
  });

  test("reports configured per-space caps", () => {
    const views = new Map([
      ["a", view("a", "a", "a", "main")],
      ["b", view("b", "b", "b", "other")],
    ]);
    const presence = new Map([["a", livePresence("a")], ["b", livePresence("b")]]);

    expect(computeFleetCapacity(views, presence, settings).spaces).toEqual([
      { name: "main", used: 1, cap: 6 },
      { name: "other", used: 1, cap: null },
    ]);
  });

  test("uses null for an unlimited total", () => {
    const views = new Map([["a", view("a", "a", "a", "main")]]);
    const presence = new Map([["a", livePresence("a")]]);
    expect(computeFleetCapacity(views, presence, settings).total).toEqual({ used: 1, cap: null });
  });

  test("formats holder, space, and machine capacity", () => {
    const views = new Map([
      ["root", view("root", "you", "root", "main")],
      ["child", view("child", "child", "root", "main")],
      ["foreign", view("foreign", "claude-skgrlw9n", "foreign", "other")],
    ]);
    const presence = new Map([
      ["root", livePresence("root")],
      ["child", livePresence("child")],
      ["foreign", livePresence("foreign")],
    ]);
    const capacity = computeFleetCapacity(views, presence, {
      ...settings,
      fleet: { ...settings.fleet, max_agents_total: 7 },
    });

    expect(formatCapacityLine(capacity, "root")).toBe(
      "pack 3/10 (you 2, claude-skgrlw9n 1) - space main 2/6 - space other 1/unlimited - machine 3/7",
    );
  });
});
