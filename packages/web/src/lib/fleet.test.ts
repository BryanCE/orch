import { describe, expect, test } from "bun:test";
import { projectFleet, type FleetProjectionRow } from "./fleet";

const row = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: "agent-key", paneId: null, name: null, state: "idle", exited: false,
  model: "", lastText: null, cost: 0, ctxPercent: null, tokens: null,
  capabilities: { panes: false, focusable: false, canSendKeys: false, canPruneLogs: false },
  lease: null, leaseKnown: false, spaceId: null, spaceName: null,
  spawnedBy: null, spawnedByLabel: null,
  ...overrides,
});

describe("web environment projection", () => {
  test("novel plexers still render a detached environment", () => {
    // The row carries no plexer id at all, so a plexer this build has never heard
    // of is indistinguishable from a known one: no pane means a detached
    // environment, and a coordinate is carried through verbatim, never parsed.
    const [detached] = projectFleet([row({ paneId: null })]);
    expect(detached?.agents[0]?.environment.pane).toBeNull();
    const [novel] = projectFleet([row({ paneId: "novel-plexer:42" })]);
    expect(novel?.agents[0]?.environment.pane).toBe("novel-plexer:42");
  });

  test("missing space is absent rather than local", () => {
    const [space] = projectFleet([row()]);
    expect(space?.name).toBe("unscoped");
    expect(JSON.stringify(space)).not.toContain(["lo", "cal"].join(""));
  });

  test("pane coordinates are not chosen names", () => {
    const [space] = projectFleet([row({ paneId: "wF", name: null, agentId: "minted-id" })]);
    expect(space?.agents[0]?.name).toBe("minted-id");
  });

  test("renderers contain no provider-id branches or backend capability imports", async () => {
    const files = ["./fleet.ts", "../components/AgentCard.tsx", "../routes/spaces/$slug.tsx", "../routes/index.tsx", "../components/AppSidebar.tsx"];
    const source = (await Promise.all(files.map((file) => Bun.file(new URL(file, import.meta.url)).text()))).join("\\n");
    const forbidden = ["Backend", "Capabilities", "herdr", "tmux", "headless"];
    expect(forbidden.some((word) => source.includes(word))).toBe(false);
  });
});
