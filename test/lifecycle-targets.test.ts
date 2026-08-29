import { describe, expect, test } from "bun:test";
import { agentTargetMatches, resolveAgentView } from "../src/commands/target.ts";
import type { PresenceEntry } from "../src/presence/store.ts";
import type { AgentView } from "../src/store/agent-view.ts";

/**
 * TASKS/02-scope.md A1 — identity is the minted id and nothing else. A target
 * string is a LOOKUP (id, name, or pane handle); the pane is environment and
 * moving it must never change which agent answers.
 */

const presence = (key: string, alive: boolean): PresenceEntry => ({ key, dir: key, status: null, result: null, alive });

function view(id: string, name: string, handle: string | null = null): AgentView {
  return {
    id,
    name,
    label: null,
    harnessId: "pi",
    cwd: "/repo",
    createdAt: 1,
    spawnedBy: null, spawnedByName: null,
    rootAgentId: id,
    heldBy: null,
    environment: { plexer: handle === null ? null : "herdr", handle, space: null, worktree: null, branch: null },
    tuning: { model: null, thinking: null },
    endedAt: null,
  };
}

describe("lifecycle target resolution", () => {
  test("prefers one live agent over dead ones sharing its name", () => {
    const views = [view("live", "worker"), view("dead", "worker")];
    const found = resolveAgentView(views, new Map([
      ["live", presence("headless~local~live", true)],
      ["dead", presence("headless~local~dead", false)],
    ]), "worker");
    expect(found?.id).toBe("live");
  });

  test("reports the target and disambiguating ids for live ambiguity", () => {
    expect(() => resolveAgentView(
      [view("key-a", "worker"), view("key-b", "worker")],
      new Map([["key-a", presence("headless~local~key-a", true)], ["key-b", presence("headless~local~key-b", true)]]),
      "worker",
    )).toThrow(/Ambiguous target "worker".*key-a.*key-b/);
  });

  test("cleanup can still resolve a dead agent when no live match exists", () => {
    const found = resolveAgentView([view("dead", "worker")], new Map([["dead", presence("headless~local~dead", false)]]), "worker");
    expect(found?.id).toBe("dead");
  });

  test("an agent is addressable by its id, its name, or its pane handle", () => {
    expect(agentTargetMatches(view("aa", "lease-hardening", "w7:pW"), "lease-hardening")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening", "w7:pW"), "w7:pW")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening", "w7:pW"), "aa")).toBe(true);
    expect(agentTargetMatches(view("aa", "lease-hardening", "w7:pW"), "somebody-else")).toBe(false);
  });

  test("the pane is environment: moving it leaves every other address intact", () => {
    const moved = view("aa", "lease-hardening", "w9:p2");
    expect(agentTargetMatches(moved, "w7:pW")).toBe(false);
    expect(agentTargetMatches(moved, "aa")).toBe(true);
    expect(agentTargetMatches(moved, "lease-hardening")).toBe(true);
  });
});
