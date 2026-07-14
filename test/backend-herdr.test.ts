import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, mock, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";

// Replace the CLI boundary before loading HerdrBackend. This records argv without
// ever starting a herdr process (and therefore cannot create a live pane).
const herdrArgv: string[][] = [];
mock.module("../src/herdr.ts", () => ({
  herdrPanes: () => {
    herdrArgv.push(["pane", "list"]);
    return [
      { pane_id: "w0:p1", workspace_id: "ws-test" },
      { pane_id: "w0:p2", workspace_id: "ws-test" },
    ];
  },
  herdrJSON: (args: string[]) => {
    herdrArgv.push([...args]);
    return { tab: { label: "work" }, root_pane: { pane_id: "w0:p3" } };
  },
  herdrBestEffort: (args: string[]) => {
    herdrArgv.push([...args]);
    return true;
  },
}));

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-herdr-"));
const { HerdrBackend } = await import("../src/backends/herdr.ts");
const backend = new HerdrBackend();

const fakeAdapter: AgentAdapter = {
  id: "pi",
  caps: { steer: "none", ask: false, setModel: false, sessionTail: false },
  interactiveCmd: () => "fake-agent",
  headlessCmd: () => ["true"],
  detectState: () => "unknown",
  steer: () => undefined,
  answer: () => undefined,
  extractResult: () => undefined,
};

afterAll(() => fs.rmSync(testDir, { recursive: true, force: true }));

describe("HerdrBackend", () => {
  test("creates a pane and runs the adapter command", () => {
    expect(backend.id).toBe("herdr");
    expect(backend.panes).toBe(true);
    expect(backend.focusable).toBe(true);
    expect(backend.caps).toEqual({ panes: true, focusable: true });

    const handle = backend.spawn(fakeAdapter, { cwd: testDir });

    expect(handle).toBe("w0:p3");
    expect(herdrArgv).toEqual([
      ["pane", "list"],
      ["tab", "create", "--workspace", "ws-test", "--cwd", testDir, "--label", "work", "--no-focus"],
      ["pane", "run", "w0:p3", "fake-agent"],
    ]);
  });

  test("maps close and list to herdr helpers", () => {
    expect(backend.list()).toEqual(["w0:p1", "w0:p2"]);
    expect(backend.close("")).toBe(false);
    expect(backend.close("w0:p2")).toBe(true);
    expect(herdrArgv.at(-1)).toEqual(["pane", "close", "w0:p2"]);
  });
});
