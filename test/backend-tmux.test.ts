import { describe, expect, test } from "bun:test";
import { TmuxBackend } from "../src/backends/tmux/index.ts";

describe("TmuxBackend", () => {
  test("exposes tmux pane capabilities", () => {
    const backend = new TmuxBackend();
    expect(backend.panes).toBe(true);
    expect(backend.focusable).toBe(true);
    expect(backend.canSendKeys).toBe(true);
    expect(backend.caps).toEqual({ panes: true, focusable: true, canSendKeys: true });
  });

  test("reports tmux availability", () => {
    const backend = new TmuxBackend();
    expect(backend.isAvailable()).toBe(Bun.which("tmux") !== null);
  });

  test("reflects the TMUX environment", () => {
    const previous = process.env.TMUX;
    try {
      process.env.TMUX = "1";
      expect(new TmuxBackend().isInsideSession()).toBe(true);
      delete process.env.TMUX;
      expect(new TmuxBackend().isInsideSession()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.TMUX;
      else process.env.TMUX = previous;
    }
  });

  test("mints identity from the owning session", () => {
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

  test("rejects an empty handle without invoking tmux", () => {
    expect(new TmuxBackend().close("")).toBe(false);
  });
});
