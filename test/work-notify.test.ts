import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDirs: string[] = [];

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function waitForFile(file: string): Promise<void> {
  for (let attempt = 0; attempt < 100 && !existsSync(file); attempt++) await Bun.sleep(10);
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("orch work notifications", () => {
  test("delivers a presence transition through a configured command sink", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orch-work-notify-"));
    tempDirs.push(orchDir);
    const output = join(orchDir, "notification.json");
    const key = "workspace:test-agent";
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    const { presenceDir } = await import("../src/store.ts");
    const agentsDir = presenceDir();
    mkdirSync(join(agentsDir, key), { recursive: true });
    writeFileSync(join(agentsDir, key, "status.json"), JSON.stringify({ state: "idle", label: "Test agent", pid: process.pid }));
    writeFileSync(
      join(orchDir, "config.toml"),
      `[[notify]]\ntype = "command"\non = ["working"]\ncommand = ["sh", "-c", "cat > ${shellQuote(output)}"]\n`,
    );

    try {
      const { runWorkLoop } = await import("../src/work.ts");
      const { loadSinks } = await import("../src/notify.ts");
      expect(loadSinks(orchDir)).toEqual([{ type: "command", on: ["working"], command: ["sh", "-c", `cat > ${shellQuote(output)}`] }]);
      const controller = new AbortController();
      const loop = runWorkLoop({ orchDir, pollIntervalMs: 20, continuous: true, signal: controller.signal });
      setTimeout(() => {
        writeFileSync(join(agentsDir, key, "status.json"), JSON.stringify({ state: "working", label: "Test agent", pid: process.pid }));
      }, 40);
      setTimeout(() => controller.abort(), 180);
      await loop;
      await waitForFile(output);

      const payload = JSON.parse(readFileSync(output, "utf8"));
      expect(payload).toMatchObject({
        title: expect.stringContaining("WORKING [workspace] Test agent"),
        workspace: "workspace",
        newState: "working",
      });
    } finally {
      rmSync(join(agentsDir, key), { recursive: true, force: true });
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 10_000);
});
