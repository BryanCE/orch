import { describe, expect, test } from "bun:test";
import { TmuxBackend } from "../src/backends/tmux/index.ts";

/** A tmux backend whose every tmux invocation is recorded instead of run. */
function recordingTmux(reply = ""): { backend: TmuxBackend; calls: string[][] } {
  const calls: string[][] = [];
  const backend = new TmuxBackend({ homeExec: (args: string[]): string => { calls.push(args); return reply; } });
  return { backend, calls };
}

describe("tmux space home", () => {
  test("focus switches the client to the session holding the space", () => {
    const { backend, calls } = recordingTmux();
    backend.spaceHome.focus("release");
    expect(calls).toEqual([["switch-client", "-t", "release"]]);
  });

  test("create names the session after the space and returns its root pane", () => {
    const { backend, calls } = recordingTmux("release\t%7\n");
    expect(backend.spaceHome.create({ kind: "space", id: "abc" }, { cwd: "/w", label: "release" }))
      .toEqual({ coordinate: "release", rootHandle: "%7" });
    expect(calls[0]).toContain("new-session");
    expect(calls[0]).toContain("release");
  });

  test("rename and close address the session coordinate", () => {
    const { backend, calls } = recordingTmux();
    backend.spaceHome.rename("release", "ship");
    backend.spaceHome.close("ship");
    expect(calls).toEqual([["rename-session", "-t", "release", "ship"], ["kill-session", "-t", "ship"]]);
  });

  test("list reports every session as a coordinate with a label", () => {
    const { backend } = recordingTmux("release\nship\n");
    expect(backend.spaceHome.list()).toEqual([
      { coordinate: "release", label: "release" },
      { coordinate: "ship", label: "ship" },
    ]);
  });
});
