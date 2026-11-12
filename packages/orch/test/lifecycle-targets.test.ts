import { hostIdentity } from "../src/hosts/identity.ts";
import { describe, expect, test } from "bun:test";
import { agentTargetMatches, resolveAgentView } from "../src/entities/lifecycle.ts";
import type { AgentView } from "../src/types/store.ts";
import type { AgentPane } from "../src/store/agent-view.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

/**
 * Identity is the minted id and nothing else. A target string is a LOOKUP (id,
 * name, or pane handle); the pane is environment and
 * moving it must never change which agent answers. Only an agent here has a pane, so
 * its handle is read from the panes of the agents placed here, never from a view.
 */

const presence = (key: string, alive: boolean): PresenceEntry => ({ key, status: null, result: null, liveness: alive ? "alive" : "dead" });

function view(id: string, name: string): AgentView {
  return {
    id,
    name,
    label: null,
    harnessId: "pi",
    createdAt: 1,
    kind: "agent",
    spawnedBy: null, spawnedByName: null,
    rootAgentId: id,
    heldBy: null,
    environment: { plexer: null, handle: null, space: null, worktree: null, branch: null, worktreeBase: null, worktreeProvider: null, host: hostIdentity(), cwd: "/repo" },
    tuning: { model: null, thinking: null },
    endedAt: null,
    form: null,
  };
}

/** The panes of the agents placed here: one agent, in one herdr pane. */
const panes = (id: string, handle: string): ReadonlyMap<string, AgentPane> => new Map([[id, { plexer: "herdr", handle }]]);
const noPanes: ReadonlyMap<string, AgentPane> = new Map();

describe("lifecycle target resolution", () => {
  test("prefers one live agent over dead ones sharing its name", () => {
    const views = [view("live", "worker"), view("dead", "worker")];
    const found = resolveAgentView(views, noPanes, new Map([
      ["live", presence("liveagent1", true)],
      ["dead", presence("deadagent1", false)],
    ]), "worker");
    expect(found?.id).toBe("live");
  });

  test("reports the target and disambiguating ids for live ambiguity", () => {
    expect(() => resolveAgentView(
      [view("key-a", "worker"), view("key-b", "worker")],
      noPanes,
      new Map([["key-a", presence("keyaagent1", true)], ["key-b", presence("keybagent1", true)]]),
      "worker",
      // U3: ONE wording for this refusal, built in `src/refusal.ts`. It names
      // the failure, the target string, every candidate, and what to send
      // instead - a list with no advice reads as a listing command's output.
    )).toThrow(/Ambiguous target "worker"[\s\S]*key-a[\s\S]*key-b[\s\S]*address it by its key/);
  });

  test("cleanup can still resolve a dead agent when no live match exists", () => {
    const found = resolveAgentView([view("dead", "worker")], noPanes, new Map([["dead", presence("deadagent1", false)]]), "worker");
    expect(found?.id).toBe("dead");
  });

  test("an agent is addressable by its id, its name, or its pane handle", () => {
    const here = panes("aa", "w7:pW");
    expect(agentTargetMatches(view("aa", "lease-hardening"), here, "lease-hardening")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening"), here, "w7:pW")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening"), here, "aa")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening"), here, "somebody-else")).toBe(false);
  });

  test("the pane is environment: moving it leaves every other address intact", () => {
    const moved = panes("aa", "w9:p2");
    expect(agentTargetMatches(view("aa", "lease-hardening"), moved, "w7:pW")).toBe(false);
    expect(agentTargetMatches(view("aa", "lease-hardening"), moved, "aa")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening"), moved, "lease-hardening")).toBe(true);
  });

  test("an agent on another host has no pane here, so no handle addresses it", () => {
    expect(agentTargetMatches(view("aa", "lease-hardening"), noPanes, "w7:pW")).toBe(false);
  });
});
