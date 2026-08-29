import { describe, expect, test } from "bun:test";
import { projectFleet, type FleetProjectionRow } from "./fleet";

const row = (overrides: Partial<FleetProjectionRow> = {}): FleetProjectionRow => ({
  key: "agent-key", paneId: null, name: null, agent: null, state: "idle", exited: false,
  model: "", lastText: null, cost: 0, ctxPercent: null, tokens: null,
  capabilities: { panes: false, focusable: false, canSendKeys: false, canPruneLogs: false },
  lease: null, leaseKnown: false, spaceId: null, spaceName: null,
  spawnedBy: null, spawnedByLabel: null,
  ...overrides,
});

describe("web environment projection", () => {
  test("novel plexers still render a detached environment", () => {
    const [space] = projectFleet([row({ plexer: "novel-plexer", paneId: null })]);
    expect(space?.agents[0]?.environment.pane).toBeNull();
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
    const files = ["./fleet.ts", "../components/AgentCard.tsx", "../routes/ws/$slug.tsx"];
    const source = (await Promise.all(files.map((file) => Bun.file(new URL(file, import.meta.url)).text()))).join("\\n");
    const forbidden = ["Backend", "Capabilities", "herdr", "tmux", "headless"];
    expect(forbidden.some((word) => source.includes(word))).toBe(false);
  });
});
