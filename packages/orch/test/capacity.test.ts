import { describe, expect, test } from "bun:test";
import { computeFleetCapacity, formatCapacityLine, packsUsed } from "../src/policy/capacity.ts";
import { agentViewFixture } from "./helpers/views.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";
import type { HostIdentity } from "../src/types/host.ts";
import { testHost } from "./helpers/host.ts";

/** The host whose orchd holds the fleet, and a host it asked to run one agent. */
const LAPTOP = testHost("laptop-id", "laptop");
const FAR = testHost("far-id", "far");

function view(id: string, name: string, rootAgentId: string, space: string, host: HostIdentity = LAPTOP): AgentView {
  return agentViewFixture(id, {
    name,
    rootAgentId,
    environment: { space, host },
  });
}

function livePresence(id: string): PresenceEntry {
  return { key: id, status: null, result: null, liveness: "alive" };
}

const settings = {
  fleet: {
    max_agents_per_pack: 10,
    max_agents_per_tab: 4,
    max_depth: 1,
    max_agents_total: undefined,
    max_agents_per_space: { main: 6 },
    min_free_memory_mb: 2048,
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

    const capacity = computeFleetCapacity(views, presence, settings, LAPTOP);
    expect(capacity.packs).toEqual([
      { root: { id: "foreign", name: "claude-skgrlw9n" }, used: 1, cap: 10 },
      { root: { id: "root", name: "you" }, used: 2, cap: 10 },
    ]);
    expect(packsUsed(capacity)).toBe(3);
  });

  test("an ended agent with alive presence does not count toward capacity", () => {
    const ended = agentViewFixture("ended", { endedAt: 10, environment: { space: "main", host: LAPTOP } });
    const views = new Map([["ended", ended]]);
    const presence = new Map([["ended", livePresence("ended")]]);

    expect(computeFleetCapacity(views, presence, settings, LAPTOP).total.used).toBe(0);
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

    const capacity = computeFleetCapacity(views, presence, settings, LAPTOP, { packRootId: "root" });
    expect(capacity.packs).toEqual([{ root: { id: "root", name: "you" }, used: 2, cap: 10 }]);
    expect(packsUsed(capacity)).toBe(2);
  });

  test("reports configured per-space caps", () => {
    const views = new Map([
      ["a", view("a", "a", "a", "main")],
      ["b", view("b", "b", "b", "other")],
    ]);
    const presence = new Map([["a", livePresence("a")], ["b", livePresence("b")]]);

    expect(computeFleetCapacity(views, presence, settings, LAPTOP).spaces).toEqual([
      { name: "main", used: 1, cap: 6 },
      { name: "other", used: 1, cap: null },
    ]);
  });

  test("uses null for an unlimited total", () => {
    const views = new Map([["a", view("a", "a", "a", "main")]]);
    const presence = new Map([["a", livePresence("a")]]);
    expect(computeFleetCapacity(views, presence, settings, LAPTOP).total).toEqual({ host: "laptop", used: 1, cap: null });
  });

  test("the total is one host's: an agent the fleet runs on another host fills its pack and space, not this host", () => {
    const views = new Map([
      ["root", view("root", "you", "root", "main")],
      ["here", view("here", "here", "root", "main")],
      ["there", view("there", "there", "root", "main", FAR)],
    ]);
    const presence = new Map([["root", livePresence("root")], ["here", livePresence("here")], ["there", livePresence("there")]]);

    const capacity = computeFleetCapacity(views, presence, settings, LAPTOP);
    expect(capacity.packs).toEqual([{ root: { id: "root", name: "you" }, used: 3, cap: 10 }]);
    expect(capacity.spaces).toEqual([{ name: "main", used: 3, cap: 6 }]);
    expect(capacity.total).toEqual({ host: "laptop", used: 2, cap: null });
    expect(computeFleetCapacity(views, presence, settings, FAR).total).toEqual({ host: "far", used: 1, cap: null });
  });

  test("formats one pack per root, the caller's first, then each space, then the host's total under its name", () => {
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
    }, LAPTOP);

    expect(formatCapacityLine(capacity, "root")).toBe(
      "pack you 2/10 - space main 2/6 - space other 1/unlimited - host laptop 3/7",
    );
  });

  test("keeps the caller's single-agent pack and omits other single-agent packs", () => {
    const views = new Map([
      ["root", view("root", "you", "root", "main")],
      ["other", view("other", "session", "other", "main")],
    ]);
    const presence = new Map([["root", livePresence("root")], ["other", livePresence("other")]]);
    const capacity = computeFleetCapacity(views, presence, settings, LAPTOP);

    expect(formatCapacityLine(capacity, "root")).toBe("pack you 1/10 - space main 2/6 - host laptop 2/unlimited");
  });
});
