import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { fakeAdapter as makeFakeAdapter } from "./helpers/adapter.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { NO_PANE_FOREGROUND } from "../src/backends/pane-ready.ts";
import { projectRoot } from "../src/util.ts";

/** One synthetic tmux pane row served by the fake `list-panes -a` query. */
interface FakePane {
  paneId: string;
  session: string;
  windowId: string;
  windowIndex: string;
  windowName: string;
  paneTitle: string;
  paneActive: boolean;
  windowActive: boolean;
  sessionAttached: boolean;
  agentKey: string;
  agent: string;
  agentName: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

function orchPane(overrides: Partial<FakePane> & { paneId: string; agentKey: string }): FakePane {
  return {
    session: "main",
    windowId: "@1",
    windowIndex: "0",
    windowName: "agents",
    paneTitle: "bash",
    paneActive: true,
    windowActive: true,
    sessionAttached: true,
    agent: "pi",
    agentName: "",
    width: 200,
    height: 50,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function rectRow(pane: FakePane): string {
  return [pane.paneId, pane.width, pane.height, pane.x, pane.y].join("\t");
}

function paneRow(pane: FakePane): string {
  return [
    pane.paneId,
    pane.session,
    pane.windowId,
    pane.windowIndex,
    pane.windowName,
    pane.paneTitle,
    pane.paneActive ? "1" : "0",
    pane.windowActive ? "1" : "0",
    pane.sessionAttached ? "1" : "0",
    pane.agentKey,
    pane.agent,
    pane.agentName,
  ].join("\t");
}

// Fake tmux "server" state, replaced fresh before every test.
let panes: FakePane[] = [];
let nextPaneSeq = 0;
let captureResult: string | null = "";
const execCalls: { file: string; args: string[] }[] = [];

function findPane(target: string | undefined): FakePane | undefined {
  return panes.find((pane) => pane.paneId === target || pane.windowId === target);
}

/** Interpret one tmux argv against the fake pane world above. */
function fakeTmux(args: string[]): string {
  const [cmd] = args;
  if (cmd === "list-panes") {
    const format = args[args.indexOf("-F") + 1] ?? "";
    const window = args.includes("-t") ? args[args.indexOf("-t") + 1] : undefined;
    const rows = window ? panes.filter((pane) => pane.windowId === window) : panes;
    return rows.map((pane) => (format.includes("#{pane_width}") ? rectRow(pane) : paneRow(pane))).join("\n");
  }
  if (cmd === "display-message") {
    const target = args[args.indexOf("-t") + 1];
    const field = args.at(-1) ?? "";
    const pane = findPane(target);
    if (!pane) return "";
    if (field === "#{session_name}") return pane.session;
    if (field === "#{@orch_agent_key}") return pane.agentKey;
    return "";
  }
  if (cmd === "new-window" || cmd === "split-window") {
    const paneId = `%${++nextPaneSeq}`;
    const windowId = `@w${nextPaneSeq}`;
    const format = args[args.indexOf("-F") + 1] ?? "";
    if (format === "#{window_id}\t#{window_index}\t#{pane_id}") return `${windowId}\t${nextPaneSeq}\t${paneId}`;
    return paneId;
  }
  if (cmd === "capture-pane") {
    if (captureResult === null) throw new Error("tmux capture-pane failed");
    return captureResult;
  }
  // set-option, select-layout, kill-pane, send-keys, select-window, select-pane all report success.
  return "";
}

// mock.module is process-global and this suite runs before most files alphabetically,
// so the fake must keep the full real module surface and only intercept tmux/sleep —
// a throwing default would break every later test file that shells out (git, ssh, bun).
const realChildProcess = { ...(await import("node:child_process")) };
void mock.module("node:child_process", () => ({
  ...realChildProcess,
  execFileSync: (file: string, args: string[] = [], options?: unknown): unknown => {
    execCalls.push({ file, args: [...args] });
    if (file === "sleep") return "";
    if (file === "tmux") return fakeTmux(args);
    return realChildProcess.execFileSync(file, args, options as never);
  },
}));

const { TmuxBackend } = await import("../src/backends/tmux/index.ts");
const { paneForeground } = await import("../src/commands/lifecycle.ts");

const originalOrchDir = process.env.ORCH_DIR;
const originalTmuxEnv = process.env.TMUX;
const testOrchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-tmux-"));

const fakeAdapter = makeFakeAdapter();

function writeStatus(key: string, status: Record<string, unknown>): void {
  seedStatus(testOrchDir, key, status);
}

function callArgs(file: string, cmd: string): string[] | undefined {
  return execCalls.find((call) => call.file === file && call.args[0] === cmd)?.args;
}

beforeEach(() => {
  process.env.ORCH_DIR = testOrchDir;
  process.env.TMUX = "/tmp/fake-tmux,0,0";
  panes = [];
  nextPaneSeq = 0;
  captureResult = "";
  execCalls.length = 0;
});

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalTmuxEnv === undefined) delete process.env.TMUX;
  else process.env.TMUX = originalTmuxEnv;
});

afterAll(() => {
  mock.restore();
  removeTempDir(testOrchDir);
});

describe("TmuxBackend", () => {
  test("does not expose legacy top-level group methods", () => {
    const backend = new TmuxBackend();
    for (const method of ["createGroup", "groups", "renameGroup", "closeGroup", "focusGroup", "movePane", "moveToGroup", "groupLayoutFor"]) expect(method in backend).toBe(false);
  });

  test("composes a complete group role bundle", () => {
    const backend = new TmuxBackend();
    expect(typeof backend.groupHome.list).toBe("function");
    expect(typeof backend.groupHome.create).toBe("function");
    expect(typeof backend.groupHome.rename).toBe("function");
    expect(typeof backend.groupHome.close).toBe("function");
    expect(typeof backend.groupHome.focus).toBe("function");
    expect(typeof backend.groupHome.move).toBe("function");
    expect(typeof backend.groupLayout.read).toBe("function");
  });

  test("exposes tmux pane roles", () => {
    const backend = new TmuxBackend();
    expect(backend.paneHost).not.toBeNull();
    expect(backend.paneInventory).not.toBeNull();
    expect(backend.paneInput).not.toBeNull();
    expect(backend.paneForeground).toBeNull();
    expect(backend.paneScreen).not.toBeNull();
    expect(backend.logPruning).toBeNull();
    expect(backend.identity).not.toBeNull();
  });

  test("does not declare pane foreground capability", () => {
    const backend = new TmuxBackend();
    expect(Object.hasOwn(backend.paneInput, "foreground")).toBe(false);
    expect(paneForeground(backend, "%1")).toEqual(NO_PANE_FOREGROUND);
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

  test("rejects an empty handle without invoking tmux", () => {
    new TmuxBackend().paneHost.close("");
    expect(execCalls.some((call) => call.file === "tmux" && call.args[0] === "kill-pane")).toBe(false);
  });

  test("the pane inventory surfaces only orch-spawned panes", () => {
    panes = [
      orchPane({ paneId: "%1", agentKey: "tmuxpane01", agentName: "worker-a" }),
      { ...orchPane({ paneId: "%2", agentKey: "" }), agent: "", paneTitle: "shell" },
      orchPane({
        paneId: "%3",
        session: "side",
        windowId: "@2",
        windowIndex: "1",
        windowName: "side-window",
        paneTitle: "claude-pane",
        paneActive: false,
        windowActive: false,
        sessionAttached: false,
        agentKey: "tmuxpane03",
        agent: "claude",
      }),
    ];

    const backend = new TmuxBackend();
    expect(backend.paneInventory.list()).toEqual([
      { handle: "%1", workspace: "main", group: "@1", groupLabel: "agents", name: "worker-a", agent: "pi", focused: true, status: null, sessionPath: null },
      { handle: "%3", workspace: "side", group: "@2", groupLabel: "side-window", name: "claude-pane", agent: "claude", focused: false, status: null, sessionPath: null },
    ]);
  });

  test("status-facing inventory displays the tmux session workspace", () => {
    panes = [orchPane({ paneId: "%1", session: "main", agentKey: "tmuxpane01", agent: "claude" })];
    const target = new TmuxBackend().paneInventory.list()[0];
    expect(target?.workspace).toBe("main");
    expect(target?.agent).toBe("claude");
  });

  test("inventory status is read from the pane's presence status.json", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "tmuxpane01" })];
    writeStatus("tmuxpane01", { state: "working" });

    const backend = new TmuxBackend();
    expect(backend.paneInventory.list()[0]?.status).toBe("working");
  });

  test("inventory status is null when no presence status.json exists", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "nostatus99" })];
    const backend = new TmuxBackend();
    expect(backend.paneInventory.list()[0]?.status).toBeNull();
  });

  test("waitAgentStatus polls presence status.json until it matches or times out", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "tmuxpane01" })];
    writeStatus("tmuxpane01", { state: "working" });
    const backend = new TmuxBackend();

    expect(() => backend.agentStatus.wait("%1", "done", 50)).toThrow(/timed out/);

    writeStatus("tmuxpane01", { state: "done" });
    expect(() => backend.agentStatus.wait("%1", "done", 2000)).not.toThrow();
  });

  test("waiting fails immediately when the pane has no presence key", () => {
    panes = [];
    const backend = new TmuxBackend();
    expect(() => backend.agentStatus.wait("%9", "done", 50)).toThrow(/timed out/);
  });

  test("the pane screen returns captured text and throws when capture-pane fails", () => {
    const backend = new TmuxBackend();
    captureResult = "line one\nline two";
    expect(backend.paneScreen.read("%1", 100)).toBe("line one\nline two");

    captureResult = null;
    expect(() => backend.paneScreen.read("%1", 100)).toThrow();
  });

  test("renamePane and renameAgent write two distinct pane options", () => {
    const backend = new TmuxBackend();
    backend.paneNaming.renamePane("%1", "border-label");
    backend.agentNaming.renameAgent("%1", "agent-label");

    expect(callArgs("tmux", "select-pane")).toEqual(["select-pane", "-t", "%1", "-T", "border-label"]);
    expect(callArgs("tmux", "set-option")).toEqual(["set-option", "-p", "-t", "%1", "@orch_agent_name", "agent-label"]);
  });

  test("paneHost.open splits the requested target with cwd and environment", () => {
    const backend = new TmuxBackend();
    const created = backend.paneHost.open({ cwd: "/work", group: "@1", split: "right", targetPane: "%7", env: { ORCH_AGENT_KEY: "k1", FOO: "bar" } });
    expect(created.handle).toBe("%1");
    expect(callArgs("tmux", "split-window")).toEqual([
      "split-window", "-t", "%7", "-h", "-P", "-F", "#{pane_id}", "-c", "/work",
      "-e", "ORCH_AGENT_KEY=k1", "-e", "FOO=bar", "--", "bash",
    ]);
    backend.paneHost.close(created.handle);
    expect(execCalls.some((call) => call.args.join(" ") === "kill-pane -t %1")).toBe(true);
  });

  test("spawn places the agent into an existing group via split-window when opts.group is set", () => {
    const backend = new TmuxBackend();
    const handle = backend.spawn(fakeAdapter, { key: "tmuxagent1", cwd: "/work", group: "@1", split: "right" });

    expect(handle).toBe("%1");
    const split = callArgs("tmux", "split-window");
    expect(split).toEqual(["split-window", "-t", "@1", "-h", "-P", "-F", "#{pane_id}", "-c", "/work", "-e", "ORCH_AGENT_KEY=tmuxagent1", "-e", `ORCH_DIR=${testOrchDir}`, "-e", `ORCH_PROJECT=${projectRoot()}`, "--", "bash", "-lc", "fake-agent"]);
    expect(execCalls.some((call) => call.args.join(" ") === "set-option -p -t %1 @orch_agent_key tmuxagent1")).toBe(true);
    expect(execCalls.some((call) => call.args.join(" ") === "set-option -p -t %1 @orch_agent pi")).toBe(true);
    // The tiling planner owns geometry; a blanket select-layout would overwrite it.
    expect(execCalls.some((call) => call.args[0] === "select-layout")).toBe(false);
  });

  test("spawn splits the planned target pane, not whatever pane the window has active", () => {
    const backend = new TmuxBackend();
    backend.spawn(fakeAdapter, { key: "tmuxagent1", cwd: "/work", group: "@1", split: "down", targetPane: "%7" });

    expect(callArgs("tmux", "split-window")?.slice(0, 4)).toEqual(["split-window", "-t", "%7", "-v"]);
  });

  test("groupLayout reports every pane in a window with its cell geometry", () => {
    panes = [
      orchPane({ paneId: "%1", agentKey: "k1", width: 100, height: 50, x: 0, y: 0 }),
      orchPane({ paneId: "%2", agentKey: "", width: 99, height: 50, x: 101, y: 0 }),
      orchPane({ paneId: "%3", agentKey: "k3", windowId: "@2" }),
    ];
    const backend = new TmuxBackend();

    // Non-orch panes count: geometry the planner ignores is geometry it plans over.
    expect(backend.groupLayout.read("@1")).toEqual({
      group: "@1",
      panes: [
        { handle: "%1", rect: { width: 100, height: 50, x: 0, y: 0 } },
        { handle: "%2", rect: { width: 99, height: 50, x: 101, y: 0 } },
      ],
    });
  });

  test("spawn opens a new window via new-window when no group is given", () => {
    const backend = new TmuxBackend();
    const handle = backend.spawn(fakeAdapter, { key: "tmuxagent2", cwd: "/work" });

    expect(handle).toBe("%1");
    expect(callArgs("tmux", "new-window")?.[0]).toBe("new-window");
    expect(execCalls.some((call) => call.args[0] === "split-window")).toBe(false);
  });

  test("groups() and workspaces() are scoped to windows/sessions containing an orch pane", () => {
    panes = [
      orchPane({ paneId: "%1", agentKey: "tmuxpane01" }),
      orchPane({ paneId: "%2", agentKey: "tmuxpane02", agent: "claude" }),
      { ...orchPane({ paneId: "%9", agentKey: "" }), windowId: "@9", session: "main" },
      orchPane({
        paneId: "%3",
        session: "side",
        windowId: "@2",
        windowIndex: "3",
        windowName: "side-window",
        paneActive: false,
        windowActive: false,
        sessionAttached: false,
        agentKey: "tmuxpane03",
      }),
    ];

    const backend = new TmuxBackend();
    expect(backend.groupHome.list()).toEqual([
      { id: "@1", label: "agents", workspace: "main", focused: true, number: 0, paneCount: 2, status: null },
      { id: "@2", label: "side-window", workspace: "side", focused: false, number: 3, paneCount: 1, status: null },
    ]);
  });

  test("createGroup opens a window and reports its root pane, throwing on failure", () => {
    const backend = new TmuxBackend();
    const { group, rootHandle } = backend.groupHome.create({ workspace: "main", cwd: "/work", label: "extra" });

    expect(rootHandle).toBe("%1");
    expect(group).toEqual({ id: "@w1", label: "extra", workspace: "main", focused: false, number: 1, paneCount: 1, status: null });
    expect(callArgs("tmux", "new-window")).toEqual(["new-window", "-P", "-F", "#{window_id}\t#{window_index}\t#{pane_id}", "-t", "main", "-c", "/work", "-n", "extra"]);
  });
});
