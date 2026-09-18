import { describe, expect, test } from "bun:test";
import type { WebStatusRow } from "./status-row";
import { projectFleet, projectHistory } from "./fleet";

const row = (overrides: Partial<WebStatusRow> = {}): WebStatusRow => ({
  key: "agent-key", agentId: null, paneId: null, managed: false, name: null,
  tab: null, agent: null, owner: null, spawnedBy: null, spawnedByLabel: null,
  worktree: null, branch: null, cwd: null, focused: false, model: "", modelShort: "",
  state: "idle", stateFallback: false, exited: false, alive: true, cost: 0,
  ctxPercent: null, task: null, dispatchId: null, lastText: null, backendStatus: null,
  backend: null,
  bridgeAttached: null, tokens: null,
  lease: null, leaseKnown: false, spaceId: null, spaceName: null,
  rootAgentId: null, rootAgentName: null,
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

  test("unknown daemon states use the neutral fallback", () => {
    const [space] = projectFleet([row({ state: "future-state" })]);
    expect(space!.agents[0]!.state).toBe("unknown");
    expect(space!.agents[0]!.stateFallback).toBe(false);
  });

  test("uses names from orch rows and falls back to the minted id", () => {
    const [named, unnamed] = projectFleet([
      row({ name: "reviewer", agentId: "agent1234" }),
      row({ name: null, agentId: "agent5678" }),
    ])[0]!.agents;
    expect(named!.name).toBe("reviewer");
    expect(unnamed!.name).toBe("agent5678");
  });

  test("uses the orch space name and id", () => {
    const [space] = projectFleet([row({ spaceId: "space-42", spaceName: "Release" })]);
    expect(space!.name).toBe("Release");
    expect(space!.id).toBe("space-42");
  });

  test("history groups ended agents by provenance root", () => {
    const history = projectHistory([
      row({ key: "child-a", agentId: "child-a", exited: true, rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-a" }),
      row({ key: "child-b", agentId: "child-b", exited: true, rootAgentId: "pack-root", rootAgentName: "Release pack", name: "child-b" }),
    ]);
    expect(history[0]!.id).toBe("pack-root");
    expect(history[0]!.name).toBe("Release pack");
    expect(history[0]!.agents.map((agent) => agent.key)).toEqual(["child-a", "child-b"]);
    expect("orchs" in history[0]!).toBe(false);
  });

  test("live projection excludes ended rows", () => {
    const live = row({ agentId: "live" });
    const ended = row({ agentId: "ended", rootAgentId: "pack-root", exited: true });
    expect(projectFleet([live, ended])[0]!.agents.map((agent) => agent.key)).toEqual([live.key]);
    expect(projectHistory([live, ended]).flatMap((group) => group.agents).map((agent) => agent.key)).toEqual([ended.key]);
  });

  test("renderers contain no provider-id branches or backend capability imports", async () => {
    const files = ["./fleet.ts", "../components/AgentCard.tsx", "../routes/spaces/$slug.tsx", "../routes/index.tsx", "../components/AppSidebar.tsx"];
    const source = (await Promise.all(files.map((file) => Bun.file(new URL(file, import.meta.url)).text()))).join("\\n");
    expect(source).toContain('label="Backend status"');
    const forbidden = ["Capabilities", "herdr", "tmux", "headless"];
    expect(forbidden.some((word) => source.includes(word))).toBe(false);
  });
});
