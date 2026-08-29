import { afterAll, describe, expect, test } from "bun:test";
import { setHerdrExecutor } from "../src/backends/herdr/cli.ts";
import { HerdrBackend } from "../src/backends/herdr/index.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { paneBoundary } from "../src/commands/panes.ts";

const herdrCalls: string[][] = [];
const restoreHerdr = setHerdrExecutor((_command, args) => {
  herdrCalls.push([...args]);
  if (args[0] === "workspace" && args[1] === "create") {
    return JSON.stringify({ workspace: { workspace_id: "w-space", label: "space-home" }, root_pane: { pane_id: "w-space:p1" } });
  }
  if (args[0] === "workspace" && args[1] === "list") {
    return JSON.stringify({ workspaces: [{ workspace_id: "w-space", label: "space-home" }] });
  }
  return "";
});

afterAll(() => restoreHerdr());

describe("space and pack home role", () => {
  test("herdr composes complete home operations and returns a persistent coordinate", () => {
    const role = new HerdrBackend().spaceHome;
    expect(role).toBeDefined();
    if (!role) return;
    expect(typeof role.list).toBe("function");
    expect(typeof role.create).toBe("function");
    expect(typeof role.rename).toBe("function");
    expect(typeof role.close).toBe("function");
    expect(typeof role.focus).toBe("function");
    const created = role.create({ kind: "space", id: "space-1" }, { cwd: "/tmp", label: "space-home" });
    expect(created.coordinate).toBe("w-space");
    expect(role.list().some((home) => home.coordinate === created.coordinate)).toBe(true);
    role.rename(created.coordinate, "renamed");
    role.focus(created.coordinate);
    role.close(created.coordinate);
    expect(herdrCalls).toContainEqual(["workspace", "rename", "w-space", "renamed"]);
    expect(herdrCalls).toContainEqual(["workspace", "focus", "w-space"]);
    expect(herdrCalls).toContainEqual(["workspace", "close", "w-space"]);
  });

  test("tmux composes complete home operations and returns a persistent coordinate", () => {
    const calls: string[][] = [];
    const role = new TmuxBackend({ homeExec: (args) => {
      calls.push([...args]);
      if (args[0] === "new-session") return "@space\t%1";
      if (args[0] === "list-sessions") return "@space\n";
      return "";
    }}).spaceHome;
    expect(role).toBeDefined();
    if (!role) return;
    const created = role.create({ kind: "pack", id: "pack-1" }, { cwd: "/tmp", label: "pack-home" });
    expect(created.coordinate).toBe("@space");
    expect(role.list().some((home) => home.coordinate === created.coordinate)).toBe(true);
    role.rename(created.coordinate, "renamed");
    role.focus(created.coordinate);
    role.close(created.coordinate);
    expect(calls).toContainEqual(["rename-session", "-t", "@space", "renamed"]);
    expect(calls).toContainEqual(["select-window", "-t", "@space"]);
    expect(calls).toContainEqual(["kill-session", "-t", "@space"]);
  });

  test("headless has no home role and answers at the boundary", () => {
    const backend = new HeadlessBackend();
    expect(backend.spaceHome).toBeNull();
    expect(paneBoundary("space-1", "space home", backend.spaceHome, true)).toEqual({
      outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide space home",
    });
  });
});
