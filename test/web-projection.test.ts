import { describe, expect, test } from "bun:test";
import { projectFleet, projectHistory, type FleetProjectionRow } from "../packages/web/src/lib/fleet.ts";

const base = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: "herdr~wF~agent1234",
  agentId: "agent1234",
  paneId: "wF:p1",
  name: null,
  state: "idle",
  exited: false,
  model: "",
  lastText: null,
  cost: 0,
  ctxPercent: null,
  tokens: null,
  capabilities: null,
  lease: null,
  leaseKnown: false,
  spaceId: "wF",
  spaceName: null,
  rootAgentId: null,
  rootAgentName: null,
  ...overrides,
});

describe("web fleet projection", () => {
  test("uses the orch agent name and falls back to its minted id, never the plexer agent name", () => {
    const [named, unnamed] = projectFleet([
      base({ name: "reviewer" }),
      base({ key: "herdr~wF~agent5678", agentId: "agent5678", name: null }),
    ])[0]!.agents;

    expect(named!.name).toBe("reviewer");
    expect(unnamed!.name).toBe("agent5678");
    expect(unnamed!.name).not.toBe("herdr-agent-name");
    expect(unnamed!.name).not.toBe("wF:p1");
  });

  test("uses the orch space name and never exposes the plexer space id", () => {
    const [space] = projectFleet([base({ spaceId: "space-42", spaceName: "Release" })]);

    expect(space!.name).toBe("Release");
    expect(space!.name).not.toBe("wF");
    expect(space!.id).toBe("space-42");
  });

  test("unscoped agents use a neutral space label when no orch space exists", () => {
    const [space] = projectFleet([base({ spaceId: "wF", spaceName: null })]);

    expect(space!.name).toBe("unscoped");
    expect(space!.name).not.toBe("wF");
  });

  test("history groups ended agents by provenance root, never by their leases", () => {
    const rows = [
      base({ key: "herdr~wF~child-a", agentId: "child-a", rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-a", exited: true, lease: { holderId: "holder-a", holderName: "A", holderAlive: false }, leaseKnown: true }),
      base({ key: "herdr~wG~child-b", agentId: "child-b", rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-b", exited: true, lease: { holderId: "holder-b", holderName: "B", holderAlive: false }, leaseKnown: true }),
    ];

    const [pack] = projectHistory(rows);

    expect(pack!.id).toBe("pack-root");
    expect(pack!.name).toBe("Release pack");
    expect(pack!.agents.map((agent) => agent.key)).toEqual(["herdr~wF~child-a", "herdr~wG~child-b"]);
  });

  test("live projection excludes ended rows and keeps unleased live agents out of history", () => {
    const live = base({ key: "herdr~wF~live", agentId: "live", lease: null, leaseKnown: true });
    const ended = base({ key: "herdr~wF~ended", agentId: "ended", rootAgentId: "pack-root", exited: true });

    expect(projectFleet([live, ended])[0]!.agents.map((agent) => agent.key)).toEqual([live.key]);
    expect(projectHistory([live, ended]).flatMap((pack) => pack.agents).map((agent) => agent.key)).toEqual([ended.key]);
  });
});

/**
 * TASKS/02-scope.md C7 — "Live views group by lease; history groups by provenance."
 *
 * The containment the model states: a SPACE encompasses the orchs working in it,
 * and each orch encompasses the slaves it currently holds. Space stays the live
 * view's navigation (A7/adr-0001 — it is the user's own grouping of work), and
 * INSIDE it the live rows group by their LEASE HOLDER, never by provenance.
 *
 * Grouping live work by provenance is the concrete harm named at
 * TASKS/01-agent-model.md:370: adopt an orphaned fleet and a provenance-scoped
 * live view shows you none of it, because the agent that spawned those workers
 * is gone and the orch now driving them is not the one they were spawned by.
 */
describe("live views group by lease (C7)", () => {
  const held = (id: string, holderId: string, holderName: string, over: Partial<FleetProjectionRow> = {}) =>
    base({
      key: `herdr~wF~${id}`, agentId: id, name: id, spaceId: "space-1", spaceName: "Release",
      lease: { holderId, holderName, holderAlive: true }, leaseKnown: true, ...over,
    });

  test("a space encompasses its orchs, and each orch encompasses the agents it holds", () => {
    const [space] = projectFleet([
      held("child-a", "orch-1", "release-orch"),
      held("child-b", "orch-2", "hotfix-orch"),
      held("child-c", "orch-1", "release-orch"),
    ]);

    expect(space!.name).toBe("Release");
    expect(space!.orchs.map((orch) => [orch.id, orch.name])).toEqual([
      ["orch-1", "release-orch"],
      ["orch-2", "hotfix-orch"],
    ]);
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["child-a", "child-c"]);
    expect(space!.orchs[1]!.agents.map((agent) => agent.name)).toEqual(["child-b"]);
  });

  test("an ADOPTED agent is filed under the orch holding it now, never under its spawner", () => {
    // Provenance says `gone-orch` spawned it; the live view must show it under
    // the orch that adopted it, or an adopted fleet disappears from the view.
    const [space] = projectFleet([
      held("adopted", "new-orch", "new-orch", { spawnedBy: "gone-orch", spawnedByLabel: "gone-orch", rootAgentId: "gone-orch", rootAgentName: "gone-orch" }),
    ]);

    expect(space!.orchs.map((orch) => orch.id)).toEqual(["new-orch"]);
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["adopted"]);
  });

  test("an UNHELD agent is grouped as unheld, not hidden and not invented an orch", () => {
    // Rule 11: work survives its spawner. An unheld agent is adoptable, not gone.
    const [space] = projectFleet([held("orphan", "x", "x", { lease: null, leaseKnown: true })]);

    expect(space!.orchs.map((orch) => orch.id)).toEqual(["unheld"]);
    expect(space!.orchs[0]!.name).toBe("unheld");
    expect(space!.orchs[0]!.agents.map((agent) => agent.name)).toEqual(["orphan"]);
  });

  test("the space still lists every live agent flat, so the lease grouping adds a level and hides nothing", () => {
    const [space] = projectFleet([held("child-a", "orch-1", "release-orch"), held("child-b", "orch-2", "hotfix-orch")]);

    expect(space!.agents.map((agent) => agent.name)).toEqual(["child-a", "child-b"]);
    expect(space!.orchs.flatMap((orch) => orch.agents.map((agent) => agent.name)).sort())
      .toEqual(space!.agents.map((agent) => agent.name).sort());
  });

  test("history does NOT gain a lease level: a pack stays grouped by provenance", () => {
    const [pack] = projectHistory([
      base({ key: "herdr~wF~e1", agentId: "e1", name: "e1", exited: true, rootAgentId: "pack-root", rootAgentName: "pack", lease: { holderId: "h1", holderName: "h1", holderAlive: false }, leaseKnown: true }),
      base({ key: "herdr~wF~e2", agentId: "e2", name: "e2", exited: true, rootAgentId: "pack-root", rootAgentName: "pack", lease: { holderId: "h2", holderName: "h2", holderAlive: false }, leaseKnown: true }),
    ]);

    expect(pack!.id).toBe("pack-root");
    expect(pack!.agents.map((agent) => agent.name)).toEqual(["e1", "e2"]);
    expect("orchs" in pack!).toBe(false);
  });
});
