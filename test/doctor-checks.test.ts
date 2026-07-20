import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runDoctor, type CheckResult } from "../src/doctor/runner.ts";
import { loadConfig } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-checks-"));
  directories.push(directory);
  return directory;
}

function notifyResult(results: CheckResult[]): CheckResult {
  const result = results.find((entry) => entry.id === "notify-sinks");
  if (!result) throw new Error("missing notify-sinks result");
  return result;
}

async function withPath<T>(value: string, action: () => Promise<T>): Promise<T> {
  const previous = process.env.PATH;
  process.env.PATH = value;
  try {
    return await action();
  } finally {
    if (previous === undefined) delete process.env.PATH;
    else process.env.PATH = previous;
  }
}

function writeConfig(directory: string, settings: Record<string, unknown>): void {
  writeSettingsFixture(directory, settings);
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor notification-sink checks", () => {
  test("reports no sinks as healthy", async () => {
    const directory = tempDir();
    const result = await withPath(path.join(directory, "empty-path"), async () => notifyResult(await runDoctor(directory)));

    expect(result).toMatchObject({
      id: "notify-sinks",
      label: "Notification sinks",
      status: "ok",
      detail: "no notify sinks configured",
    });
  });

  test("rejects a webhook with a malformed URL", () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "webhook", url: "not a url" }] });

    expect(() => loadConfig(directory)).toThrow(/notify/);
  });

  test("warns for a command binary missing from PATH", async () => {
    const directory = tempDir();
    writeConfig(directory, { notify: [{ id: "command", command: ["missing-notify-command"] }] });

    const result = await withPath<CheckResult>(path.join(directory, "empty-path"), async (): Promise<CheckResult> => notifyResult(await runDoctor(directory)));
    expect(result).toMatchObject({ status: "warn", detail: expect.stringContaining('command sink #1 binary "missing-notify-command" is not on PATH') as unknown as string });
  });

  test("accepts a command binary present on the injected PATH", async () => {
    const directory = tempDir();
    const binDir = path.join(directory, "bin");
    fs.mkdirSync(binDir);
    const bash = path.join(binDir, "bash");
    fs.writeFileSync(bash, "#!/bin/sh\n");
    fs.chmodSync(bash, 0o755);
    writeConfig(directory, { notify: [{ id: "command", command: ["bash"] }] });

    const result = await withPath(binDir, async () => notifyResult(await runDoctor(directory)));
    expect(result).toMatchObject({ status: "ok", detail: "1 configured sink look deliverable" });
  });
});
