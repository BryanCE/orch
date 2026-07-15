import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deliverToSink, loadSinks, workspaceColor, type NotifyEvent } from "../src/notify";

const tempDirs: string[] = [];

function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-notify-sinks-"));
  tempDirs.push(directory);
  return directory;
}

function nodeCommand(script: string): string[] {
  return [process.execPath, "-e", script];
}

afterEach(() => {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("notify sinks", () => {
  test("delivers command sink payload as JSON", async () => {
    const directory = tempDir();
    const output = join(directory, "payload.json");
    const event: NotifyEvent = {
      key: "w6:p21",
      agent: "w-2",
      tab: null,
      model: null,
      oldState: "working",
      newState: "done",
      task: "x",
      ts: "2026-01-01T00:00:00.000Z",
    };

    const sink = {
      type: "command" as const,
      on: ["done"],
      command: nodeCommand(`const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`),
    };
    expect(await deliverToSink(sink, event)).toBe(true);

    const payload = JSON.parse(readFileSync(output, "utf8")) as Record<string, unknown>;
    expect(payload).toMatchObject({
      workspace: "w6",
      workspaceColor: workspaceColor("w6"),
      agent: "w-2",
      newState: "done",
      task: "x",
    });
    expect(payload.title).toContain("DONE");
  });

  test("loadSinks parses command and webhook declarations", () => {
    const directory = tempDir();
    writeFileSync(join(directory, "config.toml"), `[[notify]]
type = "command"
on = ["done"]
command = [${JSON.stringify(process.execPath)}, "-e", ""]

[[notify]]
type = "webhook"
on = ["error"]
url = "https://example.test/notify"
`);

    expect(loadSinks(directory)).toEqual([
      { type: "command", on: ["done"], command: nodeCommand("") },
      { type: "webhook", on: ["error"], url: "https://example.test/notify" },
    ]);
  });
});
