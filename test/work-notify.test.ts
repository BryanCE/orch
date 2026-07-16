import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSettingsFixture } from "./helpers/settings.ts";

const tempDirs: string[] = [];

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

async function waitForFile(file: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 2_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(10);
  }
  throw new Error(`Timed out waiting for ${file}: ${String(lastError)}`);
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
    const command = nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`);
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    const { presenceAgentDir } = await import("../src/store.ts");
    const agentsDir = presenceAgentDir(key, orchDir);
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, "status.json"), JSON.stringify({ state: "idle", label: "Test agent", pid: process.pid }));
    writeSettingsFixture(orchDir, {
      notify: [{ id: "command", on: ["working"], command }],
    });

    try {
      const { runWorkLoop } = await import("../src/work.ts");
      const { loadSinks } = await import("../src/notify.ts");
      expect(loadSinks(orchDir)).toEqual([{ type: "command", on: ["working"], command }]);
      const controller = new AbortController();
      const loop = runWorkLoop({ orchDir, pollIntervalMs: 20, continuous: true, signal: controller.signal });
      try {
        // runWorkLoop seeds the initial idle state before its first delay.
        writeFileSync(join(agentsDir, "status.json"), JSON.stringify({ state: "working", label: "Test agent", pid: process.pid }));
        const payload: Record<string, unknown> = await waitForFile(output);
        expect(payload).toMatchObject({
          title: expect.stringContaining("WORKING [workspace] Test agent") as unknown as string,
          workspace: "workspace",
          newState: "working",
        });
      } finally {
        controller.abort();
        await loop;
      }
    } finally {
      rmSync(agentsDir, { recursive: true, force: true });
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 10_000);
});
