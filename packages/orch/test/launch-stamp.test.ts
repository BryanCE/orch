import { afterEach, describe, expect, test } from "bun:test";
import { launchStamp } from "../src/presence/writer.ts";

const names = ["ORCH_AGENT_NAME", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL", "ORCH_AGENT_WORKTREE", "ORCH_AGENT_BRANCH"];
const saved = new Map(names.map((name) => [name, process.env[name]]));
afterEach(() => {
  for (const name of names) {
    const value = saved.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("canonical launch stamp", () => {
  test("claude and codex launches produce the same status shape", () => {
    process.env.ORCH_AGENT_NAME = "worker";
    process.env.ORCH_SPAWNER = "pi~main~a";
    process.env.ORCH_SPAWNER_LABEL = "lead (pi)";
    process.env.ORCH_AGENT_WORKTREE = "/tmp/worktree";
    process.env.ORCH_AGENT_BRANCH = "worker-branch";
    const claude = launchStamp({}, "claude", "key");
    const codex = launchStamp({}, "codex", "key");
    expect({ ...claude, agent: "harness" }).toEqual({ ...codex, agent: "harness" });
    expect(claude).toMatchObject({ cost: 0, turns: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, tabLabel: null });
  });
});
