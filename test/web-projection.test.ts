import { describe, expect, test } from "bun:test";
import { partitionAgents, projectFleet, projectHistory, type FleetProjectionRow } from "../packages/web/src/lib/fleet.ts";
import { mintAgentId } from "../src/backends/identity.ts";

// A1: a row's key is a minted agent id and nothing else. The plexer coordinates
// below (`paneId`, the `wF` spaceId) stay where they belong — in environment
// fields the projection must never promote to a name.
const base = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: mintAgentId(),
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
      base({ agentId: "agent5678", name: null }),
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
    const childAKey = mintAgentId();
    const childBKey = mintAgentId();
    const rows = [
      base({ key: childAKey, agentId: "child-a", rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-a", exited: true, lease: { holderId: "holder-a", holderName: "A", holderAlive: false }, leaseKnown: true }),
      base({ key: childBKey, agentId: "child-b", rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-b", exited: true, lease: { holderId: "holder-b", holderName: "B", holderAlive: false }, leaseKnown: true }),
    ];

    const [pack] = projectHistory(rows);

    expect(pack!.id).toBe("pack-root");
    expect(pack!.name).toBe("Release pack");
    expect(pack!.agents.map((agent) => agent.key)).toEqual([childAKey, childBKey]);
  });

  test("live projection excludes ended rows and keeps unleased live agents out of history", () => {
    const live = base({ agentId: "live", lease: null, leaseKnown: true });
    const ended = base({ agentId: "ended", rootAgentId: "pack-root", exited: true });

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
      agentId: id, name: id, spaceId: "space-1", spaceName: "Release",
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
      base({ agentId: "e1", name: "e1", exited: true, rootAgentId: "pack-root", rootAgentName: "pack", lease: { holderId: "h1", holderName: "h1", holderAlive: false }, leaseKnown: true }),
      base({ agentId: "e2", name: "e2", exited: true, rootAgentId: "pack-root", rootAgentName: "pack", lease: { holderId: "h2", holderName: "h2", holderAlive: false }, leaseKnown: true }),
    ]);

    expect(pack!.id).toBe("pack-root");
    expect(pack!.agents.map((agent) => agent.name)).toEqual(["e1", "e2"]);
    expect("orchs" in pack!).toBe(false);
  });
});

/**
 * TASKS/02-scope.md G9 — "Orphan bucket — unleased agents separated from live
 * work, never mixed."
 *
 * The CLI already gets this right: `deriveDriveState` treats a lease whose
 * HOLDER PROCESS IS GONE as unleased, and the OWNER column reads "no orch
 * driving it (holder gone)". The web split on `lease === null` alone, so the
 * same agent — the one Rule 11 calls unleased and adoptable — rendered in the
 * live list underneath a dead orch. A stale row is worse than a missing one:
 * it tells the user work is being driven when nothing is driving it.
 */
describe("the orphan bucket holds every undriven agent (G9)", () => {
  const withLease = (id: string, lease: FleetProjectionRow["lease"]) =>
    base({ agentId: id, name: id, spaceId: "space-1", spaceName: "Release", lease, leaseKnown: true });

  test("a lease whose holder is DEAD is an orphan, not live work", () => {
    const [space] = projectFleet([
      withLease("driven", { holderId: "orch-1", holderName: "orch-1", holderAlive: true }),
      withLease("stranded", { holderId: "gone", holderName: "gone", holderAlive: false }),
    ]);
    const [live, orphans] = partitionAgents(space!.agents);

    expect(live.map((a) => a.name)).toEqual(["driven"]);
    expect(orphans.map((a) => a.name)).toEqual(["stranded"]);
  });

  test("an agent with no lease at all is still an orphan", () => {
    const [space] = projectFleet([withLease("loose", null)]);
    const [live, orphans] = partitionAgents(space!.agents);

    expect(live).toEqual([]);
    expect(orphans.map((a) => a.name)).toEqual(["loose"]);
  });

  test("the two buckets never overlap and never lose an agent", () => {
    const rows = [
      withLease("a", { holderId: "o1", holderName: "o1", holderAlive: true }),
      withLease("b", { holderId: "dead", holderName: "dead", holderAlive: false }),
      withLease("c", null),
    ];
    const [space] = projectFleet(rows);
    const [live, orphans] = partitionAgents(space!.agents);

    expect([...live, ...orphans].map((a) => a.name).sort()).toEqual(["a", "b", "c"]);
    expect(live.map((a) => a.name).filter((n) => orphans.some((o) => o.name === n))).toEqual([]);
  });

  test("a dead holder is not shown as an orch driving work in the lease grouping either", () => {
    const [space] = projectFleet([withLease("stranded", { holderId: "gone", holderName: "gone", holderAlive: false })]);
    // C7 groups live work by holder. A dead holder is not a holder, so it must
    // not appear as an orch with a fleet under it.
    expect(space!.orchs.map((orch) => orch.id)).toEqual(["unheld"]);
  });
});
