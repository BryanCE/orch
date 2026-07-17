import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";

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
    ...overrides,
  };
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
  if (cmd === "list-panes") return panes.map(paneRow).join("\n");
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

const originalOrchDir = process.env.ORCH_DIR;
const originalTmuxEnv = process.env.TMUX;
const testOrchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-tmux-"));

const fakeAdapter: AgentAdapter = {
  id: "pi",
  caps: { steer: "none", ask: false, setModel: false, sessionTail: false, lifecycle: [] },
  interactiveCmd: () => "fake-agent",
  headlessCmd: () => ["true"],
  detectState: () => "unknown",
  steer: () => undefined,
  answer: () => undefined,
  extractResult: () => undefined,
};

function writeStatus(key: string, status: Record<string, unknown>): void {
  const dir = path.join(testOrchDir, "agents", key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(status));
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
  fs.rmSync(testOrchDir, { recursive: true, force: true });
});

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

  test("list() and inventory() surface only orch-spawned panes", () => {
    panes = [
      orchPane({ paneId: "%1", agentKey: "tmux~main~%251", agentName: "worker-a" }),
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
        agentKey: "tmux~side~%253",
        agent: "claude",
      }),
    ];

    const backend = new TmuxBackend();
    expect(backend.list()).toEqual(["%1", "%3"]);
    expect(backend.inventory()).toEqual([
      { handle: "%1", workspace: "main", group: "@1", groupLabel: "agents", name: "worker-a", agent: "pi", focused: true, status: null, sessionPath: null },
      { handle: "%3", workspace: "side", group: "@2", groupLabel: "side-window", name: "claude-pane", agent: "claude", focused: false, status: null, sessionPath: null },
    ]);
  });

  test("inventory status is read from the pane's presence status.json", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "tmux~main~%251" })];
    writeStatus("tmux~main~%251", { state: "working" });

    const backend = new TmuxBackend();
    expect(backend.inventory()[0]?.status).toBe("working");
  });

  test("inventory status is null when no presence status.json exists", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "tmux~main~%299-no-status" })];
    const backend = new TmuxBackend();
    expect(backend.inventory()[0]?.status).toBeNull();
  });

  test("waitAgentStatus polls presence status.json until it matches or times out", () => {
    panes = [orchPane({ paneId: "%1", agentKey: "tmux~main~%251" })];
    writeStatus("tmux~main~%251", { state: "working" });
    const backend = new TmuxBackend();

    expect(backend.waitAgentStatus("%1", "done", 50)).toBe(false);

    writeStatus("tmux~main~%251", { state: "done" });
    expect(backend.waitAgentStatus("%1", "done", 2000)).toBe(true);
  });

  test("waitAgentStatus fails immediately when the pane has no presence key", () => {
    panes = [];
    const backend = new TmuxBackend();
    expect(backend.waitAgentStatus("%9", "done", 50)).toBe(false);
  });

  test("read returns captured text and throws when capture-pane fails", () => {
    const backend = new TmuxBackend();
    captureResult = "line one\nline two";
    expect(backend.read("%1", 100)).toBe("line one\nline two");

    captureResult = null;
    expect(() => backend.read("%1", 100)).toThrow();
  });

  test("renamePane and renameAgent write two distinct pane options", () => {
    const backend = new TmuxBackend();
    expect(backend.renamePane("%1", "border-label")).toBe(true);
    expect(backend.renameAgent("%1", "agent-label")).toBe(true);

    expect(callArgs("tmux", "select-pane")).toEqual(["select-pane", "-t", "%1", "-T", "border-label"]);
    expect(callArgs("tmux", "set-option")).toEqual(["set-option", "-p", "-t", "%1", "@orch_agent_name", "agent-label"]);
  });

  test("spawn places the agent into an existing group via split-window when opts.group is set", () => {
    const backend = new TmuxBackend();
    const handle = backend.spawn(fakeAdapter, { key: "tmux~main~agent-1", cwd: "/work", group: "@1", split: "right" });

    expect(handle).toBe("%1");
    const split = callArgs("tmux", "split-window");
    expect(split).toEqual(["split-window", "-t", "@1", "-h", "-P", "-F", "#{pane_id}", "-c", "/work", "-e", "ORCH_AGENT_KEY=tmux~main~agent-1", "-e", `ORCH_DIR=${testOrchDir}`, "--", "bash", "-lc", "fake-agent"]);
    expect(execCalls.some((call) => call.args.join(" ") === "set-option -p -t %1 @orch_agent_key tmux~main~agent-1")).toBe(true);
    expect(execCalls.some((call) => call.args.join(" ") === "set-option -p -t %1 @orch_agent pi")).toBe(true);
    expect(execCalls.some((call) => call.args.join(" ") === "select-layout -t %1 tiled")).toBe(true);
  });

  test("spawn opens a new window via new-window when no group is given", () => {
    const backend = new TmuxBackend();
    const handle = backend.spawn(fakeAdapter, { key: "tmux~main~agent-2", cwd: "/work" });

    expect(handle).toBe("%1");
    expect(callArgs("tmux", "new-window")?.[0]).toBe("new-window");
    expect(execCalls.some((call) => call.args[0] === "split-window")).toBe(false);
  });

  test("groups() and workspaces() are scoped to windows/sessions containing an orch pane", () => {
    panes = [
      orchPane({ paneId: "%1", agentKey: "tmux~main~%251" }),
      orchPane({ paneId: "%2", agentKey: "tmux~main~%252", agent: "claude" }),
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
        agentKey: "tmux~side~%253",
      }),
    ];

    const backend = new TmuxBackend();
    expect(backend.groups()).toEqual([
      { id: "@1", label: "agents", workspace: "main", focused: true, number: 0, paneCount: 2, status: null },
      { id: "@2", label: "side-window", workspace: "side", focused: false, number: 3, paneCount: 1, status: null },
    ]);
    expect(backend.workspaces()).toEqual([
      { id: "main", label: "main", focused: true, number: null, tabCount: 1, paneCount: 2, status: null },
      { id: "side", label: "side", focused: false, number: null, tabCount: 1, paneCount: 1, status: null },
    ]);
  });

  test("createGroup opens a window and reports its root pane, throwing on failure", () => {
    const backend = new TmuxBackend();
    const { group, rootHandle } = backend.createGroup({ workspace: "main", cwd: "/work", label: "extra" });

    expect(rootHandle).toBe("%1");
    expect(group).toEqual({ id: "@w1", label: "extra", workspace: "main", focused: false, number: 1, paneCount: 1, status: null });
    expect(callArgs("tmux", "new-window")).toEqual(["new-window", "-P", "-F", "#{window_id}\t#{window_index}\t#{pane_id}", "-t", "main", "-c", "/work", "-n", "extra"]);
  });
});
