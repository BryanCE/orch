import { afterEach, describe, expect, test } from "bun:test";
import { parseIdentity, serializeIdentity } from "../src/backends/identity.ts";
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

  test("exposes pane capabilities", () => {
    const backend = new TmuxBackend();
    expect(backend.panes).toBe(true);
    expect(backend.focusable).toBe(true);
    expect(backend.canSendKeys).toBe(true);
    expect(backend.caps).toEqual({ panes: true, focusable: true, canSendKeys: true });
  });

  test("reflects the TMUX environment", () => {
    process.env.TMUX = "/tmp/fake,0,0";
    expect(new TmuxBackend().isInsideSession()).toBe(true);
    delete process.env.TMUX;
    expect(new TmuxBackend().isInsideSession()).toBe(false);
  });

  test("mints identity from a protected session seam", () => {
    class FakeTmuxBackend extends TmuxBackend {
      protected override sessionOf(_pane: string): string {
        return "main";
      }
    }

    expect(new FakeTmuxBackend().mintIdentity("%5")).toEqual({
      backend: "tmux",
      workspace: "main",
      handle: "%5",
    });
  });

  test("serializes tmux identities as one flat key", () => {
    const identity = { backend: "tmux", workspace: "main", handle: "%5" } as const;
    const key = serializeIdentity(identity);
    expect(key).toBe("tmux~main~%255");
    expect(key.includes("/")).toBe(false);
    expect(parseIdentity(key)).toEqual(identity);
  });

  test("rejects an empty handle without invoking tmux", () => {
    expect(new TmuxBackend().close("")).toBe(false);
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

  test("refuses cross-session tmux steer without --cross-workspace", async () => {
    const { checkWall } = await import("../src/policy/workspace.ts");
    const decision = checkWall("tmux~main~operator", "tmux~side~%25foreign", { crossWorkspace: false });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("workspace wall: actor workspace main cannot write to target workspace side (tmux~side~%25foreign)");
  });
});
