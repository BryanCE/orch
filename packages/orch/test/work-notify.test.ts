import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { join } from "node:path";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { isRecord } from "../src/util.ts";
import { acceptStatusReport } from "../src/daemon/status-report.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { testServices } from "./helpers/services.ts";
import type { OrchDir } from "../src/types/core.ts";
const tempDirs: OrchDir[] = [];

function nodeCommand(script: string): [string, string, string] {
  return [process.execPath, "-e", script];
}

function parseRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("notification payload is not an object");
  return value;
}

async function waitForFile(file: string): Promise<Record<string, unknown>> {
  // A command sink cold-starts a fresh node runtime to write the file; under a
  // loaded full-suite run on Windows that spawn can take several seconds.
  const deadline = Date.now() + 8_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return parseRecord(readFileSync(file, "utf8"));
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

describe("orch presence notifications", () => {
  test("delivers a presence transition through a configured command sink", async () => {
    const orchDir = tempOrchDir("orch-work-notify-");
    tempDirs.push(orchDir);
    const output = join(orchDir, "notification.json");
    const key = "testagent1";
    const command = nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`);
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    seedAgent(key, { name: "Test agent" }, orchDir);
    seedLiveProcess(orchDir, key);
    writeSettingsFixture(orchDir, {
      notify: [{ id: "command", on: ["working"], command }],
    });

    try {
      const { emitAndNotify } = await import("../src/daemon/events.ts");
      const entries = fileSettingsManager(orchDir).current().notify;
      expect(entries).toEqual([{ id: "command", on: ["working"], command }]);
      const settings = testServices({ orchDir, settings: { notify: [{ id: "command", on: ["working"], command }] } }).settings;
      const publish = (event: Parameters<typeof emitAndNotify>[2]): void => {
        emitAndNotify(() => { /* no rpc server in this test */ }, entries, event, orchDir, settings);
      };
      acceptStatusReport(orchDir, key, { state: "idle" }, publish);
      acceptStatusReport(orchDir, key, { state: "working" }, publish);
      const payload: Record<string, unknown> = await waitForFile(output);
      expect(payload).toMatchObject({ space: "space", newState: "working" });
      expect(payload.title).toEqual(expect.stringContaining("WORKING [space] Test agent"));
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 20_000);
});
