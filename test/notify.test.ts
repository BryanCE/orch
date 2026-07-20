import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deliverToSink, loadSinks, notify } from "../src/notify/router.ts";
import { notificationText, type NotifyEvent } from "../src/notify/format.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
// Registers the herdr sink provider, as the real CLI does, so herdr entries parse deterministically.
import "../src/backends/herdr/index.ts";

const tempDirs: string[] = [];

function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-notify-"));
  tempDirs.push(directory);
  return directory;
}

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

async function waitForFile(file: string): Promise<void> {
  // A command sink spawns a fresh runtime to write the file; under a loaded
  // full-suite run that cold start can take seconds, so wait generously.
  for (let attempt = 0; attempt < 400; attempt++) {
    if (existsSync(file) && readFileSync(file, "utf8").length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${file}`);
}

function captureStderr<T>(callback: () => T): { value: T; stderr: string } {
  const original = process.stderr.write.bind(process.stderr);
  let stderr = "";
  process.stderr.write = (chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
    return true;
  };
  try {
    return { value: callback(), stderr };
  } finally {
    process.stderr.write = original;
  }
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("notify", () => {
  test("parses valid sinks and applies default on states", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      notify: [
        { id: "desktop" },
        { id: "webhook", on: ["done", "error"], url: "https://example.test/hook" },
        { id: "command", command: nodeCommand("") },
        { id: "herdr", on: ["done"] },
      ],
    });

    const result = captureStderr(() => loadSinks(directory));

    expect(result.value).toEqual([
      { type: "desktop", on: ["blocked", "error"] },
      { type: "webhook", on: ["done", "error"], url: "https://example.test/hook", timeoutMs: 3000 },
      { type: "command", on: ["blocked", "error"], command: nodeCommand(""), timeoutMs: 3000 },
      { type: "herdr", on: ["done"], timeoutMs: 3000 },
    ]);
    expect(result.stderr).toBe("");
  });

  test("delivers only to sinks whose on filter matches the event", async () => {
    const directory = tempDir();
    const matchingFile = join(directory, "matching");
    const nonMatchingFile = join(directory, "non-matching");
    const matching = {
      type: "command" as const,
      on: ["done"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(matchingFile)}, "matched");`),
    };
    const nonMatching = {
      type: "command" as const,
      on: ["error"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(nonMatchingFile)}, "wrong");`),
    };

    notify([matching, nonMatching], {
      key: "agent-1",
      agent: "worker",
      tab: "workers",
      model: "terra:medium",
      oldState: "working",
      newState: "done",
      ts: "2026-01-01T00:00:00.000Z",
    });
    await waitForFile(matchingFile);

    expect(readFileSync(matchingFile, "utf8")).toBe("matched");
    expect(existsSync(nonMatchingFile)).toBe(false);
  }, 20_000);

  test("command sink writes the event payload as JSON on stdin", async () => {
    const directory = tempDir();
    const output = join(directory, "payload.json");
    const event: NotifyEvent = {
      host: "gpu1",
      key: "task-1",
      agent: "worker",
      tab: "workers",
      model: "terra:medium",
      oldState: "working",
      newState: "error",
      task: "run tests",
      cost: 1.25,
      ts: "2026-01-01T00:00:00.000Z",
      lastError: "boom",
    };
    const sink = {
      type: "command" as const,
      on: ["error"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`),
    };

    expect(await deliverToSink(sink, event)).toBe(true);
    await waitForFile(output);

    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual({
      title: "ERROR [task-1] worker: boom",
      body: "ERROR [task-1] worker: boom\nWorkspace: task-1 (#db2777)\nTab: workers\nModel: terra:medium\nTask: run tests\nCost: $1.25",
      workspace: "task-1",
      workspaceColor: "#db2777",
      host: "gpu1",
      key: "task-1",
      agent: "worker",
      tab: "workers",
      model: "terra:medium",
      oldState: "working",
      newState: "error",
      task: "run tests",
      cost: 1.25,
      ts: "2026-01-01T00:00:00.000Z",
      lastError: "boom",
    });
  }, 20_000);

  test("titles lead with exactly one terminal state and agent", () => {
    expect(notificationText({
      key: "w6:p21",
      agent: "w-2",
      tab: null,
      model: null,
      oldState: "working",
      newState: "done",
      task: "ship it",
      ts: "2026-01-01T00:00:00.000Z",
    }).title).toBe("DONE [w6] w-2: ship it");
    expect(notificationText({
      key: "w6:p21",
      agent: "w-2",
      tab: null,
      model: null,
      oldState: "working",
      newState: "blocked",
      task: "Q: need approval",
      ts: "2026-01-01T00:00:00.000Z",
    }).title).toBe("BLOCKED [w6] w-2: need approval");
    expect(notificationText({
      key: "w6:p21",
      agent: "w-2",
      tab: null,
      model: null,
      oldState: "working",
      newState: "error",
      lastError: "boom",
      ts: "2026-01-01T00:00:00.000Z",
    }).title).toBe("ERROR [w6] w-2: boom");
  });

  test("webhook failure is non-fatal and reports a warning", async () => {
    let stderr = "";
    const original = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: string | Uint8Array) => {
      stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      return true;
    };
    try {
      notify(
        [{ type: "webhook", on: ["error"], url: "http://127.0.0.1:1/unreachable" }],
        {
          key: "agent-1",
          agent: null,
          tab: null,
          model: null,
          oldState: "working",
          newState: "error",
          ts: "2026-01-01T00:00:00.000Z",
        },
      );
      for (let attempt = 0; attempt < 40 && !stderr.includes("webhook sink failed"); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    } finally {
      process.stderr.write = original;
    }

    expect(stderr).toContain("notify: webhook sink failed");
  });
});
