import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { OrcaBackend } from "../src/backends/orca/index.ts";
import { orcaBinary } from "../src/backends/orca/cli.ts";
import { AgentGoneError } from "../src/control/agent-gone.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import type { OrcaExecutor, OrcaTerminal } from "../src/types/plexer.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const terminalRows = [
  {
    handle: "term-1",
    ptyId: "pty-1",
    worktreeId: "repo::/x",
    worktreePath: "/x",
    branch: "main",
    tabId: "tab-1",
    leafId: "leaf-1",
    title: "shell",
    connected: true,
    writable: true,
    lastOutputAt: 123,
  },
  {
    handle: "term-2",
    ptyId: "pty-2",
    worktreeId: "repo::/x",
    worktreePath: "/x",
    branch: "main",
    tabId: "tab-1",
    leafId: "leaf-2",
    title: "shell",
    connected: true,
    writable: true,
    lastOutputAt: 124,
  },
  {
    handle: "term-3",
    ptyId: "pty-3",
    worktreeId: "repo::/x",
    worktreePath: "/x",
    branch: "main",
    tabId: "tab-2",
    leafId: "leaf-1",
    title: "other",
    connected: true,
    writable: true,
    lastOutputAt: 125,
  },
] satisfies readonly OrcaTerminal[];

const orchDir: OrchDir = tempOrchDir("orch-backend-orca-");
const originalOrcaPaneKey = process.env.ORCA_PANE_KEY;
isolateOrchEnv();

afterEach(() => {
  if (originalOrcaPaneKey === undefined) delete process.env.ORCA_PANE_KEY;
  else process.env.ORCA_PANE_KEY = originalOrcaPaneKey;
});

afterAll(() => {
  restoreOrchEnv();
  removeTempDir(orchDir);
});

function ok(result: unknown): string {
  return JSON.stringify({ id: "r", ok: true, result });
}

function gone(): string {
  return JSON.stringify({ id: "r", ok: false, error: { code: "terminal_gone", message: "gone" } });
}

interface OrcaCall {
  readonly command: string;
  readonly args: string[];
}

interface Fixture {
  readonly backend: OrcaBackend;
  readonly calls: OrcaCall[];
}

function listAnswer(): string {
  return ok({ terminals: terminalRows });
}

function fixture(script: Readonly<Record<string, string | Error>>): Fixture {
  const calls: OrcaCall[] = [];
  const executor: OrcaExecutor = (command, args) => {
    calls.push({ command, args: [...args] });
    const keyArgs = args.at(-1) === "--json" ? args.slice(0, -1) : args;
    const key = keyArgs.join(" ");
    const response = script[key];
    if (response instanceof Error) throw response;
    if (response !== undefined) return response;
    if (keyArgs[0] === "terminal" && keyArgs[1] === "send") return ok(null);
    throw new Error(`no Orca script answer for ${key}`);
  };
  return { backend: new OrcaBackend({ executor, orchDir }), calls };
}

describe("OrcaBackend", () => {
  test("placementInventory.list returns terminal targets", () => {
    const { backend } = fixture({ "terminal list": listAnswer() });

    expect(backend.placementInventory.list()).toEqual([
      { handle: "term-1", workspace: "repo::/x", group: "tab-1", groupLabel: "shell", name: "shell", agent: null, focused: false, status: null, sessionPath: null },
      { handle: "term-2", workspace: "repo::/x", group: "tab-1", groupLabel: "shell", name: "shell", agent: null, focused: false, status: null, sessionPath: null },
      { handle: "term-3", workspace: "repo::/x", group: "tab-2", groupLabel: "other", name: "other", agent: null, focused: false, status: null, sessionPath: null },
    ]);
  });

  test("groupHome.list returns terminal groups", () => {
    const { backend } = fixture({ "terminal list": listAnswer() });

    expect(backend.groupHome.list()).toEqual([
      { id: "tab-1", label: "shell", workspace: "repo::/x", focused: false, number: null, placementCount: 2, status: null },
      { id: "tab-2", label: "other", workspace: "repo::/x", focused: false, number: null, placementCount: 1, status: null },
    ]);
  });

  test("placement.open creates a terminal in the cwd worktree", () => {
    const { backend, calls } = fixture({
      "terminal create --worktree path:/x": ok({ handle: "term-9", tabId: "tab-9" }),
    });

    expect(backend.placement.open({ cwd: "/x", env: {} })).toEqual({ handle: "term-9" });
    expect(calls).toEqual([{ command: orcaBinary(), args: ["terminal", "create", "--worktree", "path:/x", "--json"] }]);
  });

  test("placement.open selects a worktree by id", () => {
    const { backend, calls } = fixture({
      "terminal create --worktree id:repo::/x": ok({ handle: "term-9", tabId: "tab-9" }),
    });

    backend.placement.open({ cwd: "/x", workspace: "repo::/x" });
    expect(calls[0]?.args).toEqual(["terminal", "create", "--worktree", "id:repo::/x", "--json"]);
  });

  test("a caller pane is split rather than given a new tab", () => {
    const { backend, calls } = fixture({
      "terminal list": listAnswer(),
      "terminal split --terminal term-1 --direction horizontal": ok({ handle: "term-4" }),
      "terminal split --terminal term-1 --direction vertical": ok({ handle: "term-5" }),
    });

    expect(backend.placement.open({ cwd: "/x", group: "tab-1", split: "right" })).toEqual({ handle: "term-4" });
    expect(backend.placement.open({ cwd: "/x", group: "tab-1", split: "down" })).toEqual({ handle: "term-5" });
    expect(calls.map((call) => call.args)).toEqual([
      ["terminal", "list", "--json"],
      ["terminal", "split", "--terminal", "term-1", "--direction", "horizontal", "--json"],
      ["terminal", "split", "--terminal", "term-1", "--direction", "vertical", "--json"],
    ]);
  });

  test("placement.open with a target splits that handle", () => {
    const { backend, calls } = fixture({
      "terminal split --terminal term-2 --direction horizontal": ok({ handle: "term-9" }),
    });

    expect(backend.placement.open({ cwd: "/x", targetHandle: "term-2", split: "right" })).toEqual({ handle: "term-9" });
    expect(calls[0]?.args).toEqual(["terminal", "split", "--terminal", "term-2", "--direction", "horizontal", "--json"]);
  });

  test("screen.read returns the requested tail", () => {
    const { backend, calls } = fixture({
      "terminal read --terminal term-1 --screen": ok({ tail: ["a", "b", "c"] }),
    });

    expect(backend.screen.read("term-1", 2)).toBe("b\nc");
    expect(calls[0]?.args).toEqual(["terminal", "read", "--terminal", "term-1", "--screen", "--json"]);
  });

  test("agentInput.submit sends text and enter", () => {
    const { backend, calls } = fixture({});

    backend.agentInput.submit("term-1", "hi");
    expect(calls[0]?.args).toEqual(["terminal", "send", "--terminal", "term-1", "--text", "hi", "--enter", "--json"]);
  });

  test("agentInput.sendKeys sends interrupt for C-c", () => {
    const { backend, calls } = fixture({});

    backend.agentInput.sendKeys("term-1", ["C-c"]);
    expect(calls[0]?.args).toEqual(["terminal", "send", "--terminal", "term-1", "--interrupt", "--json"]);
  });

  test("agentInput.sendKeys sends the Escape byte", () => {
    const { backend, calls } = fixture({});

    backend.agentInput.sendKeys("term-1", ["Escape"]);
    expect(calls[0]?.args).toEqual(["terminal", "send", "--terminal", "term-1", "--text", "\x1b", "--json"]);
  });

  test("pane input reports gone handles", () => {
    const { backend, calls } = fixture({
      "terminal send --terminal term-1 --text hi --enter": gone(),
    });

    expect(() => backend.agentInput.submit("term-1", "hi")).toThrow(AgentGoneError);
    expect(calls).toHaveLength(1);
  });

  test("serverInfo.running reports the Orca version or null when down", () => {
    const running = fixture({ status: ok({ appVersion: "1.4.200" }) });
    expect(running.backend.serverInfo.running()).toEqual({ version: "1.4.200", compatible: null });

    const executor: OrcaExecutor = () => { throw new Error("connection refused"); };
    const down = new OrcaBackend({ executor, orchDir });
    expect(down.serverInfo.running()).toBeNull();
  });

  test("spawn types the launch environment and adapter command", () => {
    const key = mintAgentId();
    const { backend, calls } = fixture({
      "terminal create --worktree path:/x": ok({ handle: "term-9", tabId: "tab-9" }),
    });

    expect(backend.spawn(fakeAdapter(), { key, cwd: "/x", orchDir })).toBe("term-9");
    const send = calls[1]?.args ?? [];
    const launch = send[5] ?? "";
    expect(send.slice(0, 5)).toEqual(["terminal", "send", "--terminal", "term-9", "--text"]);
    expect(launch.startsWith("env ")).toBe(true);
    expect(launch).toContain(`${LAUNCH_ENV}='${key}'`);
    expect(launch.endsWith("fake-agent")).toBe(true);
    expect(send).toContain("--enter");
  });

  test("spawn intoHandle sends to the handed-over terminal", () => {
    const key = mintAgentId();
    const { backend, calls } = fixture({});

    expect(backend.spawn(fakeAdapter(), { key, cwd: "/x", intoHandle: "term-2", orchDir })).toBe("term-2");
    expect(calls).toHaveLength(1);
    const send = calls[0]?.args ?? [];
    const launch = send[5] ?? "";
    expect(send.slice(0, 5)).toEqual(["terminal", "send", "--terminal", "term-2", "--text"]);
    expect(launch.startsWith("env ")).toBe(true);
    expect(launch.endsWith("fake-agent")).toBe(true);
  });

  test("identity.current returns the minted id only inside Orca", () => {
    const { backend } = fixture({});
    const id = mintAgentId();

    process.env.ORCA_PANE_KEY = "term-1";
    expect(backend.identity.current(id)).toBe(id);
    delete process.env.ORCA_PANE_KEY;
    expect(backend.identity.current(id)).toBeNull();
  });

  test("isInsideSession mirrors ORCA_PANE_KEY", () => {
    const { backend } = fixture({});

    delete process.env.ORCA_PANE_KEY;
    expect(backend.isInsideSession()).toBe(false);
    process.env.ORCA_PANE_KEY = "term-1";
    expect(backend.isInsideSession()).toBe(true);
  });
});
