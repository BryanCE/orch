import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import { AGENT_START_TIMEOUT_MS, setHerdrExecutor } from "../src/backends/herdr/cli.ts";
import { projectRoot } from "../src/util.ts";

// Replace the CLI boundary before loading HerdrBackend. This records argv without
// ever starting a herdr process (and therefore cannot create a live pane).
const herdrArgv: string[][] = [];
const moveResults: { changed: boolean; reason?: string }[] = [];
// Panes that have been typed into. A pane runs its shell until the launch line
// lands and the harness takes the terminal — the transition spawn verifies.
const launched = new Set<string>();
const SHELL_PID = 100;

function paneProcessInfo(pane: string): string {
  const running = launched.has(pane);
  return JSON.stringify({
    result: {
      process_info: {
        shell_pid: SHELL_PID,
        foreground_process_group_id: running ? 200 : SHELL_PID,
        foreground_processes: [{ name: running ? "fake-agent" : "bash" }],
      },
    },
  });
}

/** A newly opened pane runs nothing but its shell, whatever a pane of that id ran
 *  before — the mock reuses ids that herdr would never hand out twice. */
function freshPane(pane: string): string {
  launched.delete(pane);
  return pane;
}

/** The last call herdr received for one command, so an assertion names what it
 *  means instead of counting backwards past the launch checks. */
function lastCall(command: string, subcommand: string): string[] | undefined {
  return herdrArgv.filter((args) => args[0] === command && args[1] === subcommand).at(-1);
}

/** The launch line orch sends herdr. It carries the same start budget orch then
 *  outwaits, so neither side can decide alone who gave up first. */
function agentStart(name: string, pane: string): string[] {
  return ["agent", "start", name, "--kind", "pi", "--pane", pane, "--timeout", String(AGENT_START_TIMEOUT_MS)];
}
// The fake goes at the process runner, not over the module. Stubbing the cli
// module replaces it for every test file in the process, so these fixtures were
// being served to unrelated suites that had asked for the real thing. Injecting
// the runner scopes the fake to this file and keeps the real argv building,
// parsing and error wrapping under test.
const restoreExecutor = setHerdrExecutor((_command, args) => {
  herdrArgv.push([...args]);
  const [command, subcommand] = args;
  if (command === "pane" && subcommand === "process-info") return paneProcessInfo(args[3] ?? "");
  if (command === "pane" && subcommand === "list") {
    return JSON.stringify({ panes: [
      { pane_id: "w0:p1", workspace_id: "ws-test", tab_id: "t1", rect: { width: 100, height: 50, x: 0, y: 0 } },
      { pane_id: "w0:p2", workspace_id: "ws-test", tab_id: "t1", rect: { width: 100, height: 50, x: 100, y: 0 } },
    ] });
  }
  if (command === "agent" && subcommand === "list") return JSON.stringify({ agents: [] });
  if (command === "tab" && subcommand === "list") {
    return JSON.stringify({ tabs: [
      { tab_id: "t1", workspace_id: "ws-test", label: "Alpha" },
      { tab_id: "t2", workspace_id: "ws-test", label: "Beta" },
      { tab_id: "t3", workspace_id: "ws-2", label: "Gamma" },
      { tab_id: "t4", workspace_id: "ws-3" },
    ] });
  }
  if (command === "pane" && subcommand === "move") return JSON.stringify({ move_result: moveResults.shift() ?? { changed: true } });
  if (command === "pane" && subcommand === "split") return JSON.stringify({ pane: { pane_id: freshPane("w0:p3") } });
  if (command === "tab" && subcommand === "create") {
    return JSON.stringify({ tab: { tab_id: "t9", workspace_id: "ws-test" }, root_pane: { pane_id: freshPane("w0:p9") } });
  }
  if (command === "workspace" && subcommand === "list") {
    return JSON.stringify({ workspaces: [
      { workspace_id: "ws-test", label: "t3reports" },
      { workspace_id: "ws-2", label: "dev" },
      { workspace_id: "ws-3" },
    ] });
  }
  if (command === "agent" && subcommand === "start") launched.add(args[args.indexOf("--pane") + 1] ?? "");
  // Every mutation answers with an empty body, never JSON.
  return "";
});

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-herdr-"));
const { HerdrBackend } = await import("../src/backends/herdr/index.ts");
const backend = new HerdrBackend();

const fakeAdapter: AgentAdapter = {
  id: "pi",
  capabilities: { steer: "none", ask: false, setModel: false, sessionTail: false, registersPresenceOnStart: false, lifecycle: [], enforcesCommandLocks: false },
  interactiveCmd: () => "fake-agent",
  headlessCmd: () => ["true"],
  detectState: () => "unknown",
  steer: () => undefined,
  answer: () => undefined,
  extractResult: () => undefined,
};

// These tests decide the split-vs-new-tab path on whether a caller pane exists,
// so the real one must not leak in when the suite is run from inside herdr.
const callerPane = process.env.HERDR_PANE_ID;
delete process.env.HERDR_PANE_ID;

afterAll(() => {
  restoreExecutor();
  if (callerPane === undefined) delete process.env.HERDR_PANE_ID;
  else process.env.HERDR_PANE_ID = callerPane;
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe("HerdrBackend", () => {
  test("starts an authority-bearing herdr agent with the adapter command", () => {
    expect(backend.id).toBe("herdr");
    expect(backend.panes).toBe(true);
    expect(backend.focusable).toBe(true);
    expect(backend.capabilities).toEqual({ panes: true, focusable: true, canSendKeys: true, canPruneLogs: false });

    // No caller pane, so the agent gets its own tab in the workspace it was
    // handed — never one this process went looking for.
    const handle = backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test" });

    expect(handle).toBe("w0:p9");
    // The launch line is typed once the shell owns the terminal, and the pane is
    // read again afterwards to prove the harness — not the shell — now holds it.
    expect(herdrArgv).toEqual([
      ["tab", "create", "--workspace", "ws-test", "--cwd", testDir, "--env", `ORCH_PROJECT=${projectRoot()}`, "--no-focus"],
      ["pane", "rename", "w0:p9", "pi-agent"],
      agentStart("pi-agent", "w0:p9"),
    ]);
  });

  test("starts the mapped herdr harness kind in the pane it created", () => {
    herdrArgv.length = 0;
    backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", cmd: "ignored-by-herdr-start" });

    expect(lastCall("agent", "start")).toEqual(agentStart("pi-agent", "w0:p9"));
  });

  test("a caller pane is split rather than given a new tab", () => {
    herdrArgv.length = 0;
    backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", split: "down", targetPane: "w0:p1" });

    expect(herdrArgv[0]).toEqual(
      ["pane", "split", "w0:p1", "--direction", "down", "--cwd", testDir, "--env", `ORCH_PROJECT=${projectRoot()}`, "--no-focus"],
    );
  });

  test("split direction clamps to herdr's right|down", () => {
    herdrArgv.length = 0;
    backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", split: "right", targetPane: "w0:p1" });

    expect(herdrArgv[0]?.[4]).toBe("right");
  });

  test("env reaches the pane through herdr's --env, not an argv prefix", () => {
    herdrArgv.length = 0;
    backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", targetPane: "w0:p1", key: "k1", orchDir: "/tmp/orchdir", env: { FOO: "bar" } });

    const split = herdrArgv[0] ?? [];
    expect(split).toContain("--env");
    expect(split).toContain("FOO=bar");
    expect(split).toContain("ORCH_AGENT_KEY=k1");
    expect(split).toContain("ORCH_DIR=/tmp/orchdir");
    expect(split).not.toContain("env");
  });

  test("a handed-over pane is launched into directly, never split or closed", () => {
    // A tab is born with a shell pane and the root agent runs IN it. Splitting
    // off it and closing it instead left an orphan whenever herdr declined the
    // close, and every later tiling decision balanced against that phantom.
    herdrArgv.length = 0;
    const handle = backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", group: "t9", intoPane: "w0:p9" });

    expect(handle).toBe("w0:p9");
    expect(herdrArgv).toEqual([
      ["pane", "rename", "w0:p9", "pi-agent"],
      agentStart("pi-agent", "w0:p9"),
    ]);
  });

  test("a group is created with the environment its own pane will launch under", () => {
    herdrArgv.length = 0;
    const created = backend.createGroup({ workspace: "ws-test", cwd: testDir, label: "fleet", env: { ORCH_AGENT_KEY: "k9" } });

    expect(created.rootHandle).toBe("w0:p9");
    expect(herdrArgv[0]).toEqual([
      "tab", "create", "--workspace", "ws-test", "--cwd", testDir, "--no-focus",
      "--label", "fleet", "--env", "ORCH_AGENT_KEY=k9", "--env", `ORCH_PROJECT=${projectRoot()}`,
    ]);
  });

  test("maps close and list to herdr helpers", () => {
    expect(backend.list()).toEqual(["w0:p1", "w0:p2"]);
    expect(backend.close("")).toBe(false);
    expect(backend.close("w0:p2")).toBe(true);
    expect(herdrArgv.at(-1)).toEqual(["pane", "close", "w0:p2"]);
  });

  test("a planned target pane is split directly, never re-seated afterwards", () => {
    // The pane is born in the planned neighbour's tab, so the same-tab move
    // that used to follow only bounced it through a throwaway tab and back.
    herdrArgv.length = 0;
    backend.spawn(fakeAdapter, { cwd: testDir, workspace: "ws-test", group: "t1", split: "down", targetPane: "w0:p1" });

    expect(herdrArgv[0]?.slice(0, 5)).toEqual(["pane", "split", "w0:p1", "--direction", "down"]);
    expect(lastCall("agent", "start")).toEqual(agentStart("pi-agent", "w0:p3"));
    expect(herdrArgv.some((args) => args[1] === "move")).toBe(false);
  });

  test("a pane split off the caller's own pane is moved into the fleet's tab", () => {
    // No planned target: herdr splits whatever pane orch is running in, which
    // is the human's tab, so the fresh pane has to be re-seated into the group.
    herdrArgv.length = 0;
    process.env.HERDR_PANE_ID = "w0:p2";
    try {
      backend.spawn(fakeAdapter, { cwd: testDir, group: "t1", split: "down" });
    } finally {
      delete process.env.HERDR_PANE_ID;
    }

    expect(herdrArgv[1]?.slice(0, 3)).toEqual(["pane", "split", "w0:p2"]);
    expect(herdrArgv.at(-1)).toEqual(["pane", "move", "w0:p3", "--tab", "t1", "--split", "down", "--no-focus"]);
  });

  test("a same-tab re-seat bounces through a throwaway tab so herdr executes it", () => {
    // herdr answers a same-tab move with `changed: false, reason: "same_tab"`
    // and touches nothing, which is what silently ignored every planned target.
    moveResults.push({ changed: false, reason: "same_tab" });
    expect(backend.moveToGroup("w0:p3", "t1", "right", "w0:p1")).toBe(true);
    expect(herdrArgv.slice(-3)).toEqual([
      ["pane", "move", "w0:p3", "--tab", "t1", "--split", "right", "--no-focus", "--target-pane", "w0:p1"],
      ["pane", "move", "w0:p3", "--new-tab", "--no-focus"],
      ["pane", "move", "w0:p3", "--tab", "t1", "--split", "right", "--no-focus", "--target-pane", "w0:p1"],
    ]);
  });

  test("a refused move surfaces herdr's reason instead of claiming success", () => {
    moveResults.push({ changed: false, reason: "tab_not_found" });
    expect(() => backend.moveToGroup("w0:p3", "t9", "right")).toThrow("tab_not_found");
  });

  test("groupLayout reads tab geometry straight off the pane listing", () => {
    expect(backend.groupLayout("t1")).toEqual({
      group: "t1",
      panes: [
        { handle: "w0:p1", rect: { width: 100, height: 50, x: 0, y: 0 } },
        { handle: "w0:p2", rect: { width: 100, height: 50, x: 100, y: 0 } },
      ],
    });
    expect(() => backend.groupLayout("t2")).toThrow("no panes on tab t2");
  });

  test("workspaceNames reads each workspace's OWN label, never a tab's", () => {
    // The tab labels are Alpha/Beta/Gamma; taking those printed `wF` where the
    // workspace's real label was one field away in `workspace list`.
    expect(backend.workspaceNames()).toEqual(
      new Map([
        ["ws-test", "t3reports"],
        ["ws-2", "dev"],
      ]),
    );
  });

  test("pane input submits through pane run", () => {
    herdrArgv.length = 0;
    backend.paneInput.submit("w0:p1", "ls");

    expect(herdrArgv).toEqual([["pane", "run", "w0:p1", "ls"]]);
  });

  test("waitAgentStatus uses agent wait --until, not the removed top-level wait", () => {
    herdrArgv.length = 0;
    expect(backend.waitAgentStatus("w0:p1", "idle", 1000)).toBe(true);

    expect(herdrArgv).toEqual([["agent", "wait", "w0:p1", "--until", "idle", "--timeout", "1000"]]);
  });
});
