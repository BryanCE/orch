import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities, entityWorkspace, type Entity } from "../src/entities.ts";
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

function writePresence(orchDir: string, key: string, agent: string, workspace: string, handle: string): void {
  const directory = presenceAgentDir(key, orchDir);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: 2, key, backend: "headless", workspace, handle, paneId: handle,
    pid: process.pid, agent, state: "idle",
  }));
}

describe("command workspace fields", () => {
  test("status and wall entities use persisted workspace instead of serialized-key text", () => {
    const { orchDir, key } = presenceFixture();
    process.env.ORCH_DIR = orchDir;

    const entity = buildEntities().find((candidate) => candidate.key === key);
    expect(entityWorkspace(entity!)).toBe("reported-workspace");

    const current = buildEntities().find((candidate) => candidate.key === key)!;
    expect(current).toMatchObject({ key, paneId: "999999", agent: "pi", workspace: "reported-workspace" });
    expect(entityWorkspace(current)).toBe("reported-workspace");
    expect(entityWorkspace(current)).not.toBe("key-workspace");
  }, 30_000);

  test("status reports a mixed pi and Claude fleet with the same identity fields", () => {
    const { orchDir } = presenceFixture();
    const claudeKey = "headless~other-key~1000000";
    writePresence(orchDir, claudeKey, "claude", "reported-claude", "1000000");
    process.env.ORCH_DIR = orchDir;

    const entities: Entity[] = buildEntities();
    const expected: Partial<Entity>[] = [
      expect.objectContaining({ key: "headless~key-workspace~999999", agent: "pi", workspace: "reported-workspace" }) as Partial<Entity>,
      expect.objectContaining({ key: claudeKey, agent: "claude", workspace: "reported-claude" }) as Partial<Entity>,
    ];
    expect(entities).toEqual(expect.arrayContaining(expected) as unknown as Entity[]);
  }, 30_000);
});
