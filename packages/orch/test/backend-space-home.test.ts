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

// An orch that opens a home of its own must leave it visibly separate from
// other orchs' work and from the human's own panes —
// otherwise its agents read as random agents with no discoverable origin.
// Allowable, but never unmarked. A tmux `new-session` with no `-s` is named by
// tmux's own counter, which is exactly an unmarked home: nothing on screen says
// orch opened it or what for.
describe("a home orch opens is never unmarked (E8)", () => {
  test("an unlabelled pack home is named for the pack it was opened for", () => {
    const { backend, calls } = recordingTmux("orch-pack-p1\t%9\n");

    expect(backend.spaceHome.create({ kind: "pack", id: "p1" }, { cwd: "/w" }))
      .toEqual({ coordinate: "orch-pack-p1", rootHandle: "%9" });
    expect(calls[0]).toContain("-s");
    expect(calls[0]?.[calls[0].indexOf("-s") + 1]).toBe("orch-pack-p1");
  });

  test("an unlabelled space home is named for the space, not for the pack", () => {
    const { backend, calls } = recordingTmux("orch-space-s7\t%2\n");

    backend.spaceHome.create({ kind: "space", id: "s7" }, { cwd: "/w" });
    expect(calls[0]?.[calls[0].indexOf("-s") + 1]).toBe("orch-space-s7");
  });

  // The subject id reaches here from a caller that may have taken it from a path
  // (`orch spawn` names the fleet's home after the project directory), and tmux
  // refuses `.` and `:` in a session name.
  test("a subject id the plexer would refuse is made safe, never passed through", () => {
    const { backend, calls } = recordingTmux("orch-pack-my-proj-v1-2\t%3\n");

    backend.spaceHome.create({ kind: "pack", id: "my.proj:v1.2" }, { cwd: "/w" });
    expect(calls[0]?.[calls[0].indexOf("-s") + 1]).toBe("orch-pack-my-proj-v1-2");
  });

  // The human's own name wins: `orch space create release` asked for "release",
  // and `space rename` later drives the same home by that name.
  test("a caller-supplied label is used verbatim", () => {
    const { backend, calls } = recordingTmux("release\t%4\n");

    backend.spaceHome.create({ kind: "space", id: "s7" }, { cwd: "/w", label: "release" });
    expect(calls[0]?.[calls[0].indexOf("-s") + 1]).toBe("release");
  });
});
