import { describe, expect, test } from "bun:test";
import type { WebStatusRow } from "./status-row";
import { projectFleet, projectHistory, partitionAgents } from "./fleet";

const row = (overrides: Partial<WebStatusRow> = {}): WebStatusRow => ({
  key: "agentkey01", agentId: "agentkey01", paneId: null, managed: false, name: null,
  tab: null, agent: null, owner: null, spawnedBy: null, spawnedByLabel: null,
  worktree: null, branch: null, cwd: null, focused: false, model: "", modelShort: "",
  state: "idle", stateFallback: false, exited: false, alive: true, cost: 0,
  ctxPercent: null, task: null, dispatchId: null, lastText: null, backendStatus: null,
  backend: null,
  bridgeAttached: null, tokens: null,
  lease: null, leaseKnown: false, spaceId: "space-1", spaceName: "Frontend",
  rootAgentId: null, rootAgentName: null,
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

  test("live work groups under its current lease holder", () => {
    const held = (key: string, holderId: string, holderName: string) => row({
      key, agentId: key, name: key, lease: { holderId, holderName, holderAlive: true }, leaseKnown: true,
    });
    const [space] = projectFleet([held("child-a", "orch-1", "release-orch"), held("child-b", "orch-2", "hotfix-orch"), held("child-c", "orch-1", "release-orch")]);
    expect(space!.orchs.map((orch) => [orch.id, orch.name])).toEqual([["orch-1", "release-orch"], ["orch-2", "hotfix-orch"]]);
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["child-a", "child-c"]);
    expect(space!.orchs[1]!.agents.map((agent) => agent.name)).toEqual(["child-b"]);
  });

  test("adopted work is filed under its current holder", () => {
    const [space] = projectFleet([row({ agentId: "adopted", name: "adopted", spawnedBy: "gone-orch", rootAgentId: "gone-orch", lease: { holderId: "new-orch", holderName: "new-orch", holderAlive: true }, leaseKnown: true })]);
    expect(space!.orchs.map((orch) => orch.id)).toEqual(["new-orch"]);
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["adopted"]);
  });

  test("unheld agents remain visible under the unheld group", () => {
    const [space] = projectFleet([row({ agentId: "orphan", name: "orphan", lease: null, leaseKnown: true })]);
    expect(space!.orchs.map((orch) => orch.id)).toEqual(["unheld"]);
    expect(space!.orchs[0]!.name).toBe("unheld");
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["orphan"]);
  });

  test("dead holders become unheld and do not drive work", () => {
    const [space] = projectFleet([row({ agentId: "stranded", name: "stranded", lease: { holderId: "gone", holderName: "gone", holderAlive: false }, leaseKnown: true })]);
    const [live, orphans] = partitionAgents(space!.agents);
    expect(live).toEqual([]);
    expect(orphans.map((agent) => agent.name)).toEqual(["stranded"]);
    expect(space!.orchs.map((orch) => orch.id)).toEqual(["unheld"]);
  });

  test("lease groups preserve every flat space member", () => {
    const [space] = projectFleet([row({ key: "a", name: "a", lease: { holderId: "o1", holderName: "o1", holderAlive: true } }), row({ key: "b", name: "b", lease: { holderId: "o2", holderName: "o2", holderAlive: true } })]);
    expect(space!.orchs.flatMap((orch) => orch.agents).map((agent) => agent.name).sort()).toEqual(space!.agents.map((agent) => agent.name).sort());
  });

  test("visible names never expose a plexer coordinate or the forbidden term", async () => {
    const visibleNames = projectFleet([row({ paneId: "wF", name: "named-agent" })])[0]?.agents.map((agent) => agent.name).join(" ") ?? "";
    expect(visibleNames).not.toContain("wF");
  });
});
