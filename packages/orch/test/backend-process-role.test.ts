import { afterEach, describe, expect, test } from "bun:test";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { HerdrBackend } from "../src/backends/herdr/index.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { LocalProcessRole } from "../src/backends/process.ts";

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
    const role = new LocalProcessRole(() => 41, {
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

  test("running returns the process identity for a resolved handle", () => {
    const role = new LocalProcessRole(
      (handle: string) => handle === "agent" ? 42 : null,
      { startToken: () => "instance-token" },
    );
    expect(role.running("agent")).toEqual({ pid: 42, startToken: "instance-token" });
  });

  test("running throws when the environment reports no process", () => {
    const role = new LocalProcessRole<string>(() => null);
    expect(() => role.running("missing")).toThrow(/reports no process/);
  });

  test("running throws when the OS cannot provide a start token", () => {
    const role = new LocalProcessRole<string>(() => 42, { startToken: () => undefined });
    expect(() => role.running("agent")).toThrow(/could not prove/);
  });
});
