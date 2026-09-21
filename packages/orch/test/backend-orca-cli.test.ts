import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { hostOs } from "../src/host.ts";
import {
  OrcaCommandError,
  orcaBinary,
  createOrcaCli,
} from "../src/backends/orca/cli.ts";
import type { OrcaExecutor } from "../src/types/plexer.ts";

const terminal = {
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
};

function fakeCli(
  result: unknown,
  calls: { command: string; args: string[] }[] = [],
): { cli: ReturnType<typeof createOrcaCli>; calls: { command: string; args: string[] }[] } {
  const executor: OrcaExecutor = (command, args) => {
    calls.push({ command, args: [...args] });
    return JSON.stringify({ id: "request-1", ok: true, result });
  };
  return { cli: createOrcaCli(executor), calls };
}

describe("Orca CLI", () => {
  test("terminals lists rows with JSON", () => {
    const { cli, calls } = fakeCli({ terminals: [terminal] });

    expect(cli.terminals()).toEqual([terminal]);
    expect(calls[0]).toEqual({ command: orcaBinary(), args: ["terminal", "list", "--json"] });
  });

  test("terminals passes a worktree selector", () => {
    const { cli, calls } = fakeCli({ terminals: [terminal] });

    cli.terminals("path:/x");
    expect(calls[0]?.args).toEqual(["terminal", "list", "--worktree", "path:/x", "--json"]);
  });

  test("ack surfaces gone handle error codes", () => {
    const executor: OrcaExecutor = () => JSON.stringify({
      id: "request-1",
      ok: false,
      error: { code: "terminal_handle_stale", message: "terminal is gone" },
    });
    const cli = createOrcaCli(executor);

    expect(() => cli.ack(["terminal", "send"])).toThrow(OrcaCommandError);
    try {
      cli.ack(["terminal", "send"]);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(OrcaCommandError);
      expect(error instanceof OrcaCommandError ? error.code : "unexpected").toBe("terminal_handle_stale");
    }
  });

  test("json rejects a wrong result shape with a null code", () => {
    const { cli } = fakeCli({ answer: true });

    expect(() => cli.json(["status"], z.object({ required: z.string() }))).toThrow(OrcaCommandError);
    try {
      cli.json(["status"], z.object({ required: z.string() }));
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(OrcaCommandError);
      expect(error instanceof OrcaCommandError ? error.code : "unexpected").toBeNull();
    }
  });

  test("serverStatus reads the app version", () => {
    const { cli } = fakeCli({ appVersion: "1.4.200" });

    expect(cli.serverStatus()).toEqual({ running: true, version: "1.4.200" });
  });

  test("serverStatus reports a down server when the status command cannot connect", () => {
    const executor: OrcaExecutor = () => { throw new Error("connect failed"); };
    const cli = createOrcaCli(executor);

    expect(cli.serverStatus()).toEqual({ running: false, version: null });
  });

  test("uses the Orca IDE binary on Linux", () => {
    expect(orcaBinary()).toBe(hostOs() === "linux" ? "orca-ide" : "orca");
  });
});
