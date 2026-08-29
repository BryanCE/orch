import { describe, expect, test } from "bun:test";
import { projectFleet, projectHistory, partitionAgents, type FleetProjectionRow } from "./fleet";

const row = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: "agentkey01", paneId: null, name: null, state: "idle", exited: false,
  model: "", lastText: null, cost: 0, ctxPercent: null, tokens: null,
  capabilities: { panes: false, focusable: false, canSendKeys: false, canPruneLogs: false },
  lease: null, leaseKnown: false, spaceId: "space-1", spaceName: "Frontend", agentId: "agentkey01",
  spawnedBy: null, spawnedByLabel: null,
  ...overrides,
});

async function source(path: string): Promise<string> {
  return Bun.file(new URL(path, import.meta.url)).text();
}

/** Every route component, i.e. everything that renders inside the one shell. */
const ROUTE_SOURCES = [
  "../routes/index.tsx",
  "../routes/events.tsx",
  "../routes/queue.tsx",
  "../routes/spaces/$slug.tsx",
];

describe("web shell and fleet views", () => {
  test("the app shell scrolls only its content region", async () => {
    const root = await source("../routes/__root.tsx");
    // Fixed-height page: header and sidebar cannot move because the document
    // itself never scrolls.
    expect(root).toContain('<body className="h-screen overflow-hidden">');
    // The ScrollArea that owns the content region is bounded — one in an
    // unbounded parent silently never scrolls, which is the usual way this
    // is gotten wrong.
    expect(root).toMatch(
      /<ScrollArea className="min-h-0 flex-1">[\s\S]*?<div data-content-region/
    );
  });

  test("no route declares a scroll frame of its own", async () => {
    for (const path of ROUTE_SOURCES) {
      const src = await source(path);
      // `overflow-x-auto` stays allowed: wide content scrolls sideways inside
      // its own container so the shell never does.
      expect(src).not.toMatch(/overflow-(auto|scroll|y-)/);
      expect(src).not.toMatch(/\bh-(screen|dvh|svh)\b/);
    }
  });

  test("unleased agents are partitioned into an orphan bucket", () => {
    const leased = row({ key: "leased", name: "owned-agent", leaseKnown: true, lease: {
      holderId: "orch", holderName: "main-orch", holderAlive: true,
    } });
    const orphan = row({ key: "orphan", name: "adoptable-agent", leaseKnown: true, lease: null });
    const unknownOrphan = row({ key: "unknown-orphan", name: "unknown-adoptable", leaseKnown: false, lease: null });
    const [live, orphans] = partitionAgents(projectFleet([leased, orphan, unknownOrphan])[0]?.agents ?? []);
    expect(live.map((agent) => agent.name)).toEqual(["owned-agent"]);
    expect(orphans.map((agent) => agent.name)).toEqual(["adoptable-agent", "unknown-adoptable"]);
  });

  test("history groups exited agents by the agent that spawned them", () => {
    const first = row({ key: "first", exited: true, spawnedBy: "spawner-a", spawnedByLabel: "api-orch", name: "one" });
    const second = row({ key: "second", exited: true, spawnedBy: "spawner-a", spawnedByLabel: "api-orch", name: "two" });
    const third = row({ key: "third", exited: true, spawnedBy: "spawner-b", spawnedByLabel: "worker-orch", name: "three" });
    const history = projectHistory([first, second, third]);
    expect(history.map((group) => group.name)).toEqual(["api-orch", "worker-orch"]);
    expect(history[0]?.agents.map((agent) => agent.name)).toEqual(["one", "two"]);
  });

  test("visible names never expose a plexer coordinate or the forbidden term", async () => {
    const output = JSON.stringify(projectFleet([row({ paneId: "wF", name: "named-agent" })]));
    const visibleNames = projectFleet([row({ paneId: "wF", name: "named-agent" })])[0]?.agents.map((agent) => agent.name).join(" ") ?? "";
    expect(visibleNames).not.toContain("wF");
    expect(visibleNames.toLowerCase()).not.toContain("workspace");
    expect(output.toLowerCase()).not.toContain("workspace");
    const rendered = [
      await source("../routes/index.tsx"),
      await source("../routes/spaces/$slug.tsx"),
      await source("../routes/queue.tsx"),
      await source("../routes/events.tsx"),
      await source("../components/AppSidebar.tsx"),
      await source("../components/AgentCard.tsx"),
    ].join("\n");
    expect(rendered.toLowerCase()).not.toContain("workspace");
  });
});
