import { describe, expect, test } from "bun:test";
import { computeFleetCapacity, formatCapacityLine, packsUsed } from "../src/policy/capacity.ts";
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
  return { key: id, status: null, result: null, alive: true };
}

const settings = {
  fleet: {
    max_agents_per_pack: 10,
    max_agents_per_tab: 4,
    max_depth: 1,
    max_agents_total: undefined,
    max_agents_per_space: { main: 6 },
    worker_peer_tools: false,
    cross_space: false,
  },
  spaces: { main: "main" },
} satisfies Parameters<typeof computeFleetCapacity>[2];

describe("fleet capacity", () => {
  test("one pack per root, each against the per-pack cap; roots never sum into one pack", () => {
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
    expect(capacity.packs).toEqual([
      { root: { id: "foreign", name: "claude-skgrlw9n" }, used: 1, cap: 10 },
      { root: { id: "root", name: "you" }, used: 2, cap: 10 },
    ]);
    expect(packsUsed(capacity)).toBe(3);
  });

  test("a selected root scopes the packs to that one pack", () => {
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

    const capacity = computeFleetCapacity(views, presence, settings, { packRootId: "root" });
    expect(capacity.packs).toEqual([{ root: { id: "root", name: "you" }, used: 2, cap: 10 }]);
    expect(packsUsed(capacity)).toBe(2);
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

  test("formats one pack per root, the caller's first, then space and machine capacity", () => {
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
      "pack you 2/10 - pack claude-skgrlw9n 1/10 - space main 2/6 - space other 1/unlimited - machine 3/7",
    );
  });
});
