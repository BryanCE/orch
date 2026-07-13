import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";

const originalPath = process.env.PATH;
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-backend-herdr-"));
const binDir = path.join(testDir, "bin");
const logFile = path.join(testDir, "herdr.log");
fs.mkdirSync(binDir);
process.env.PATH = `${binDir}:${originalPath ?? ""}`;
process.env.HERDR_TEST_LOG = logFile;

fs.writeFileSync(path.join(binDir, "herdr"), `#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$HERDR_TEST_LOG"
case "\${1:-}" in
  pane)
    case "\${2:-}" in
      list) printf '%s\n' '{"panes":[{"pane_id":"w0:p1","workspace_id":"ws-test"},{"pane_id":"w0:p2","workspace_id":"ws-test"}]}' ;;
      run|close) printf '%s\n' '{}' ;;
      *) exit 1 ;;
    esac
    ;;
  tab)
    [ "\${2:-}" = create ] && printf '%s\n' '{"tab":{"label":"work"},"root_pane":{"pane_id":"w0:p3"}}' || exit 1
    ;;
  *) exit 1 ;;
esac
`);
fs.chmodSync(path.join(binDir, "herdr"), 0o755);

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

function commands(): string[] {
  return fs.readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
}

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  delete process.env.HERDR_TEST_LOG;
});

describe("HerdrBackend", () => {
  test("creates a pane and runs the adapter command", () => {
    expect(backend.id).toBe("herdr");
    expect(backend.panes).toBe(true);
    expect(backend.focusable).toBe(true);
    expect(backend.caps).toEqual({ panes: true, focusable: true });

    const handle = backend.spawn(fakeAdapter, { cwd: testDir });

    expect(handle).toBe("w0:p3");
    expect(commands()).toEqual([
      "pane list",
      "tab create --workspace ws-test --cwd " + testDir + " --label work --no-focus",
      "pane run w0:p3 fake-agent",
    ]);
  });

  test("maps close and list to herdr helpers", () => {
    expect(backend.list()).toEqual(["w0:p1", "w0:p2"]);
    expect(backend.close("")).toBe(false);
    expect(backend.close("w0:p2")).toBe(true);
    expect(commands().at(-1)).toBe("pane close w0:p2");
  });
});
