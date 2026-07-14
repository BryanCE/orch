import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deliverToSink, loadSinks, notificationText, notify, type NotifyEvent } from "../src/notify";

const tempDirs: string[] = [];

function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-notify-"));
  tempDirs.push(directory);
  return directory;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function waitForFile(file: string): Promise<void> {
  for (let attempt = 0; attempt < 40 && !existsSync(file); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function captureStderr<T>(callback: () => T): { value: T; stderr: string } {
  const original = process.stderr.write;
  let stderr = "";
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
    return true;
  }) as typeof process.stderr.write;
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
  test("parses valid sinks and warns about unknown types and missing fields", () => {
    const directory = tempDir();
    writeFileSync(
      join(directory, "config.toml"),
      `[[notify]]
type = "desktop"

[[notify]]
type = "webhook"
on = ["done", "error"]
url = "https://example.test/hook"

[[notify]]
type = "command"
command = "cat"

[[notify]]
type = "email"
on = ["done"]

[[notify]]
type = "webhook"

[[notify]]
type = "command"
on = ["done"]

[[notify]]
type = "desktop"
on = [1]

[[notify]]
type = "herdr"
on = ["done"]
`,
    );

    const result = captureStderr(() => loadSinks(directory));

    expect(result.value).toEqual([
      { type: "desktop", on: ["blocked", "error"] },
      { type: "webhook", on: ["done", "error"], url: "https://example.test/hook" },
      { type: "command", on: ["blocked", "error"], command: ["sh", "-c", "cat"] },
      { type: "herdr", on: ["done"] },
    ]);
    expect(result.stderr).toContain("unknown sink type");
    expect(result.stderr).toContain("webhook sink requires url");
    expect(result.stderr).toContain("command sink requires command");
    expect(result.stderr).toContain("on must be an array of strings");
  });

  test("delivers only to sinks whose on filter matches the event", async () => {
    const directory = tempDir();
    const matchingFile = join(directory, "matching");
    const nonMatchingFile = join(directory, "non-matching");
    const matching = {
      type: "command" as const,
      on: ["done"],
      command: ["sh", "-c", `printf matched > ${shellQuote(matchingFile)}`],
    };
    const nonMatching = {
      type: "command" as const,
      on: ["error"],
      command: ["sh", "-c", `printf wrong > ${shellQuote(nonMatchingFile)}`],
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
  });

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
    const sink = { type: "command" as const, on: ["error"], command: ["sh", "-c", `cat > ${shellQuote(output)}`] };

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
  });

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
    const original = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      return true;
    }) as typeof process.stderr.write;
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
