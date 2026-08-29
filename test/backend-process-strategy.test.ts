import { afterEach, describe, expect, test } from "bun:test";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { HerdrBackend } from "../src/backends/herdr/index.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { LocalProcessRole } from "../src/backends/process.ts";
import { dispatchStrategies, type HarnessStrategies } from "../src/backends/strategies.ts";

const children: number[] = [];

afterEach(() => {
  for (const pid of children.splice(0)) {
    try { process.kill(pid, "SIGKILL"); } catch { /* already gone */ }
  }
});

describe("ProcessRole", () => {
  test.each([
    ["headless", () => new HeadlessBackend()],
    ["herdr", () => new HerdrBackend()],
    ["tmux", () => new TmuxBackend()],
  ])("%s provider records pid and start token and safely kills it", async (_name, makeBackend) => {
    const backend = makeBackend();
    const started = backend.process.start({ argv: [process.execPath, "-e", "setTimeout(() => {}, 10000)"] });
    children.push(started.pid);
    expect(started.startToken.length).toBeGreaterThan(0);
    expect(backend.process.state(started)).toBe("alive");
    backend.process.kill(started, "SIGTERM");
    for (let attempt = 0; attempt < 20 && backend.process.state(started) === "alive"; attempt++) await Bun.sleep(25);
    expect(backend.process.state(started)).not.toBe("alive");
  });

  test("reports replaced when a pid is reused by a different process token", () => {
    let token = "first";
    const role = new LocalProcessRole({
      isAlive: () => true,
      startToken: () => token,
      spawn: () => ({ pid: 41, startToken: "first" }),
      signal: () => undefined,
    });
    const started = role.start({ argv: ["ignored"] });
    token = "second";
    expect(role.state(started)).toBe("replaced");
    expect(() => role.kill(started, "SIGTERM")).toThrow(/replaced/);
  });
});

describe("harness strategy dispatcher", () => {
  test("dispatches one control path across harness and environment combinations", () => {
    const seen: string[] = [];
    const bundles: HarnessStrategies[] = [
      { steer: { steer: () => { seen.push("pi-headless"); } }, ask: null, model: null, lifecycle: null },
      { steer: { steer: () => { seen.push("claude-tmux"); } }, ask: { answer: () => { seen.push("ask"); } }, model: null, lifecycle: null },
      { steer: { steer: () => { seen.push("codex-herdr"); } }, ask: null, model: { setModel: () => { seen.push("model"); } }, lifecycle: null },
    ];
    for (const strategies of bundles) dispatchStrategies(strategies, { kind: "steer" });
    expect(seen).toEqual(["pi-headless", "claude-tmux", "codex-herdr"]);
  });

  test("returns a successful boundary answer when a strategy role is absent", () => {
    const result = dispatchStrategies({ steer: null, ask: null, model: null, lifecycle: null }, { kind: "steer" });
    expect(result).toEqual({ outcome: "answer", reason: "no-environment-role", exitCode: 0 });
  });
});
