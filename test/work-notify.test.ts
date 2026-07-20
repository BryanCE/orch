import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatusInDir } from "./helpers/presence.ts";

const tempDirs: string[] = [];

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

async function waitForFile(file: string): Promise<Record<string, unknown>> {
  // A command sink cold-starts a fresh node runtime to write the file; under a
  // loaded full-suite run on Windows that spawn can take several seconds.
  const deadline = Date.now() + 8_000;
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
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
}, 20_000);

describe("orch work notifications", () => {
  test("delivers a presence transition through a configured command sink", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orch-work-notify-"));
    tempDirs.push(orchDir);
    const output = join(orchDir, "notification.json");
    const key = "headless~workspace~test-agent";
    const command = nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`);
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    const { presenceAgentDir } = await import("../src/store.ts");
    const agentsDir = presenceAgentDir(key, orchDir);
    seedStatusInDir(agentsDir, { state: "idle", label: "Test agent", pid: process.pid });
    writeSettingsFixture(orchDir, {
      notify: [{ id: "command", on: ["working"], command }],
    });

    try {
      const { runWorkLoop } = await import("../src/work.ts");
      const { loadSinks } = await import("../src/notify/router.ts");
      expect(loadSinks(orchDir)).toEqual([{ type: "command", on: ["working"], command }]);
      const controller = new AbortController();
      const loop = runWorkLoop({ orchDir, pollIntervalMs: 20, continuous: true, signal: controller.signal });
      try {
        // runWorkLoop seeds the initial idle state before its first delay.
        seedStatusInDir(agentsDir, { state: "working", label: "Test agent", pid: process.pid });
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
      removeTempDir(agentsDir);
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 20_000);
});
