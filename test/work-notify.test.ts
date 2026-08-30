import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { loadConfig } from "../src/config.ts";
import { seedStatusInDir } from "./helpers/presence.ts";

const tempDirs: string[] = [];

function nodeCommand(script: string): [string, string, string] {
  return [process.execPath, "-e", script];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    const orchDir = mkdtempSync(join(tmpdir(), "orch-work-notify-"));
    tempDirs.push(orchDir);
    const output = join(orchDir, "notification.json");
    const key = "testagent1";
    const command = nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`);
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = orchDir;
    const { presenceAgentDir } = await import("../src/presence/store.ts");
    const agentsDir = presenceAgentDir(key, orchDir);
    seedStatusInDir(agentsDir, { state: "idle", label: "Test agent", pid: process.pid });
    writeSettingsFixture(orchDir, {
      notify: [{ id: "command", on: ["working"], command }],
    });

    try {
      // The presence watch is orch's ONE presence-transition source; the work loop
      // publishes task events only, which is why this exercises the watch.
      const { emitAndNotify, startPresenceWatch } = await import("../src/daemon/events.ts");
      const entries = loadConfig(orchDir).notify;
      expect(entries).toEqual([{ id: "command", on: ["working"], command }]);
      const watch = startPresenceWatch({
        orchDir,
        pollIntervalMs: 20,
        onEvent: (event) => emitAndNotify(() => { /* no rpc server in this test */ }, entries, event),
      });
      try {
        // startPresenceWatch seeds the initial idle state during its first scan.
        seedStatusInDir(agentsDir, { state: "working", label: "Test agent", pid: process.pid });
        const payload: Record<string, unknown> = await waitForFile(output);
        expect(payload).toMatchObject({ space: "space", newState: "working" });
        expect(payload.title).toEqual(expect.stringContaining("WORKING [space] Test agent"));
      } finally {
        watch.stop();
      }
    } finally {
      removeTempDir(agentsDir);
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  }, 20_000);
});
