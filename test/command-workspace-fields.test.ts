import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entityWorkspace } from "../src/entities.ts";
import { presenceAgentDir } from "../src/store.ts";

const directories: string[] = [];
const originalOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (directories.length) rmSync(directories.pop()!, { recursive: true, force: true });
});

function presenceFixture(): { orchDir: string; key: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-command-workspace-"));
  directories.push(orchDir);
  const key = "headless~key-workspace~999999";
  const directory = presenceAgentDir(key, orchDir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: 2,
    key,
    backend: "headless",
    workspace: "reported-workspace",
    handle: "999999",
    paneId: "999999",
    pid: process.pid,
    agent: "pi",
    state: "idle",
  }));
  return { orchDir, key };
}

describe("command workspace fields", () => {
  test("status and wall entities use persisted workspace instead of serialized-key text", async () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const entity = buildEntities().find((candidate) => candidate.key === key);
    expect(entityWorkspace(entity!)).toBe("reported-workspace");

    const child = Bun.spawn([process.execPath, "bin/orch.ts", "status", "--offline", "--local", "--all", "--json"], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, ORCH_DIR: orchDir },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    const rows = JSON.parse(await new Response(child.stdout).text()) as Array<{ key: string; workspace: string }>;
    expect(rows.find((row) => row.key === key)?.workspace).toBe("reported-workspace");
  }, 30_000);
});
