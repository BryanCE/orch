import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { mintAgentId, parseIdentity, serializeIdentity } from "../src/backends/identity.ts";
import { allBackends, getBackend, resolveBackend } from "../src/backends/registry.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { HerdrBackend } from "../src/backends/herdr/index.ts";

const originalTmux = process.env.TMUX;
const originalHerdrEnv = process.env.HERDR_ENV;

afterEach(() => {
  if (originalTmux === undefined) delete process.env.TMUX;
  else process.env.TMUX = originalTmux;
  if (originalHerdrEnv === undefined) delete process.env.HERDR_ENV;
  else process.env.HERDR_ENV = originalHerdrEnv;
});

describe("tmux backend registry and capabilities", () => {
  test("is registered", () => {
    expect(allBackends().some((backend) => backend.id === "tmux")).toBe(true);
    expect(getBackend("tmux")?.id).toBe("tmux");
  });

  test("explicit selection follows tmux availability", () => {
    const backend = getBackend("tmux")!;
    if (!backend.isAvailable()) {
      expect(() => resolveBackend({ explicit: "tmux", configured: null })).toThrow(/unavailable/);
    } else if (!backend.isInsideSession()) {
      expect(() => resolveBackend({ explicit: "tmux", configured: null })).toThrow(/requires running inside a live tmux session/);
    } else {
      expect(resolveBackend({ explicit: "tmux", configured: null }).id).toBe("tmux");
    }
  });

  test("exposes pane roles", () => {
    const backend = new TmuxBackend();
    expect(backend.paneHost).not.toBeNull();
    expect(backend.paneInventory).not.toBeNull();
    expect(backend.paneInput).not.toBeNull();
    expect(backend.logPruning).toBeNull();
    expect(backend.identity).not.toBeNull();
  });

  test("reflects the TMUX environment", () => {
    process.env.TMUX = "/tmp/fake,0,0";
    expect(new TmuxBackend().isInsideSession()).toBe(true);
    delete process.env.TMUX;
    expect(new TmuxBackend().isInsideSession()).toBe(false);
  });

  test("a tmux agent's key is the minted id, never its pane", () => {
    // A pane id is ENVIRONMENT — it changes when the agent moves — so it is
    // never promoted into the key. The key is one filesystem-safe segment
    // because a minted id has nothing in it that needs escaping.
    const identity = { id: mintAgentId() } as const;
    const key = serializeIdentity(identity);
    expect(key).toBe(identity.id);
    expect(key.includes("/")).toBe(false);
    expect(parseIdentity(key)).toEqual(identity);
    expect(() => serializeIdentity({ id: "%5" })).toThrow(/minted id|lowercase alphanumerics/);
  });

  test("implicitly selects tmux inside a session", () => {
    const previous = process.env.TMUX;
    // eslint-disable-next-line typescript/unbound-method
    const oldHerdrInside = HerdrBackend.prototype.isInsideSession;
    // eslint-disable-next-line typescript/unbound-method
    const oldTmuxAvailable = TmuxBackend.prototype.isAvailable;
    try {
      HerdrBackend.prototype.isInsideSession = () => false;
      TmuxBackend.prototype.isAvailable = () => true;
      process.env.TMUX = "/tmp/fake-tmux,0,0";
      expect(resolveBackend({ explicit: null, configured: null }).id).toBe("tmux");
    } finally {
      HerdrBackend.prototype.isInsideSession = oldHerdrInside;
      TmuxBackend.prototype.isAvailable = oldTmuxAvailable;
      if (previous === undefined) delete process.env.TMUX;
      else process.env.TMUX = previous;
    }
  });

  test("fails tmux validation outside a session before pane work", () => {
    const previous = process.env.TMUX;
    // eslint-disable-next-line typescript/unbound-method
    const oldTmuxAvailable = TmuxBackend.prototype.isAvailable;
    try {
      TmuxBackend.prototype.isAvailable = () => true;
      delete process.env.TMUX;
      expect(() => resolveBackend({ explicit: "tmux", configured: null })).toThrow(/requires running inside a live tmux session/);
    } finally {
      TmuxBackend.prototype.isAvailable = oldTmuxAvailable;
      if (previous === undefined) delete process.env.TMUX;
      else process.env.TMUX = previous;
    }
  });

  test("fails herdr validation outside a herdr session before pane work", () => {
    /* eslint-disable typescript/unbound-method */
    const oldHerdrInside = HerdrBackend.prototype.isInsideSession;
    const oldHerdrAvailable = HerdrBackend.prototype.isAvailable;
    /* eslint-enable typescript/unbound-method */
    try {
      HerdrBackend.prototype.isAvailable = () => true;
      HerdrBackend.prototype.isInsideSession = () => false;
      expect(() => resolveBackend({ explicit: "herdr", configured: null })).toThrow(/requires running inside a live herdr session/);
    } finally {
      HerdrBackend.prototype.isInsideSession = oldHerdrInside;
      HerdrBackend.prototype.isAvailable = oldHerdrAvailable;
    }
  });

  test("refuses cross-session tmux steer without --cross-space", async () => {
    const { checkWall } = await import("../src/policy/space.ts");
    const { seedAgent } = await import("./helpers/agent.ts");
    const orchDir = mkdtempSync(join(tmpdir(), "orch-tmux-wall-"));
    const previousOrchDir = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    // The space is ENVIRONMENT, recorded beside the agent. The key carries none,
    // so the wall can only read it from the store — which is the whole point.
    // Spaces are user-created (TASKS A7), so the fixture creates both first.
    seedSpace(orchDir, "main");
    seedSpace(orchDir, "side");
    const operator = "tmuxopera1";
    const foreign = "tmuxforei1";
    seedAgent(operator, { adapter: "pi", backend: "tmux", space: "main" });
    seedAgent(foreign, { adapter: "pi", backend: "tmux", space: "side" });
    if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previousOrchDir;
    const decision = checkWall(orchDir, operator, foreign, { crossSpace: false });
    removeTempDir(orchDir);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(`space wall: actor space main cannot write to target space side (${foreign})`);
  });
});
