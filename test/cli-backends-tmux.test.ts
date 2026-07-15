import { afterEach, describe, expect, test } from "bun:test";
import { parseIdentity, serializeIdentity } from "../src/backends/identity.ts";
import { allBackends, getBackend, resolveBackend } from "../src/backends/registry.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";

const originalTmux = process.env.TMUX;

afterEach(() => {
  if (originalTmux === undefined) delete process.env.TMUX;
  else process.env.TMUX = originalTmux;
});

describe("tmux backend registry and capabilities", () => {
  test("is registered", () => {
    expect(allBackends().some((backend) => backend.id === "tmux")).toBe(true);
    expect(getBackend("tmux")?.id).toBe("tmux");
  });

  test("explicit selection follows tmux availability", () => {
    const backend = getBackend("tmux")!;
    if (backend.isAvailable()) {
      expect(resolveBackend({ explicit: "tmux", configured: null }).id).toBe("tmux");
    } else {
      expect(() => resolveBackend({ explicit: "tmux", configured: null })).toThrow(/unavailable/);
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
});
