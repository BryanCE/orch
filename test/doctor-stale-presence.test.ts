import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDoctor, type CheckResult } from "../src/doctor/runner.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-stale-"));
  directories.push(directory);
  return directory;
}

function writeDeadAgent(orchDir: string, key: string, status: Record<string, unknown>): void {
  const dir = path.join(orchDir, "agents", key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(status));
}

function staleResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "stale-presence");
  if (!result) throw new Error("missing stale-presence result");
  return result;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("doctor stale presence safety", () => {
  const DEAD_PID = 2147483646; // no process will hold this pid

  test("describes a dead agent by name and project, not a bare key", async () => {
    const directory = tempDir();
    writeDeadAgent(directory, "wD-p1A", {
      pid: DEAD_PID,
      label: "docs-2",
      agent: "pi",
      cwd: "/home/bryan/Documents/orch",
      updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    const result = staleResult(await runDoctor(directory));
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("docs-2");
    expect(result.detail).toContain("project orch");
    expect(result.detail).toContain("wD-p1A");
  });

  test("the removal fix is marked destructive so UIs never pre-select it", async () => {
    const directory = tempDir();
    writeDeadAgent(directory, "wD-p1A", { pid: DEAD_PID, label: "docs-2", agent: "pi", cwd: "/x/orch" });
    const result = staleResult(await runDoctor(directory));
    expect(result.fix?.destructive).toBe(true);
    expect(result.fix?.description).toContain("docs-2");
  });

  test("no dead agents leaves nothing to remove", async () => {
    const directory = tempDir();
    writeDeadAgent(directory, "wD-p1B", { pid: process.pid, label: "alive", agent: "pi", cwd: "/x/orch" });
    const result = staleResult(await runDoctor(directory));
    expect(result.status).toBe("ok");
    expect(result.fix).toBeUndefined();
  });
});
