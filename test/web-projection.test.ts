import { describe, expect, test } from "bun:test";
import { projectFleet, projectHistory, type FleetProjectionRow } from "../packages/web/src/lib/fleet.ts";

const base = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: "herdr~wF~agent1234",
  agentId: "agent1234",
  paneId: "wF:p1",
  name: null,
  agent: "herdr-agent-name",
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
  workspace: "wF",
  workspaceName: null,
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

  test("uses the orch space name and never exposes the plexer workspace id", () => {
    const [space] = projectFleet([base({ spaceId: "space-42", spaceName: "Release" })]);

    expect(space!.name).toBe("Release");
    expect(space!.name).not.toBe("wF");
    expect(space!.id).toBe("space-42");
  });

  test("unscoped agents use a neutral space label when no orch space exists", () => {
    const [space] = projectFleet([base({ workspace: "wF", workspaceName: null })]);

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
