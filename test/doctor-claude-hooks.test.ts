import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { checkClaudeHooks, claudeHookCommand, claudeHookShimPath } from "../src/doctor.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-claude-hooks-"));
  directories.push(directory);
  return directory;
}

function settingsPath(): string {
  return path.join(tempDir(), "settings.json");
}

function writeSettings(file: string, settings: unknown): void {
  fs.writeFileSync(file, JSON.stringify(settings));
}

function hooksFor(
  shim: string,
  command: (shim: string, event: string) => string = (s, e) => claudeHookCommand(s, e, "node"),
): Record<string, unknown> {
  return Object.fromEntries(["SessionStart", "Stop", "Notification"].map((event) => [
    event,
    [{ hooks: [{ type: "command", command: command(shim, event) }] }],
  ]));
}

const currentShim = claudeHookShimPath(process.cwd());

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("doctor Claude hooks shim check", () => {
  test("accepts orch hooks pointing at the current shim", async () => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(currentShim) });

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "ok" });
    expect(result.detail).toContain("all orch Claude hooks are current");
  });

  test.each(["node", "deno", "bun"] as const)("accepts the %s runtime command form", async (runtime) => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(currentShim, (s, e) => claudeHookCommand(s, e, runtime)) });

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "ok" });
  });

  test("warns when orch hooks are missing with setup fix hint", async () => {
    const file = settingsPath();
    writeSettings(file, { hooks: {} });

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch hooks");
    expect(result.detail).toContain("run orch setup");
  });

  test("warns on the legacy ungated bun command form", async () => {
    const file = settingsPath();
    const legacySource = path.join(process.cwd(), "scripts", "claude-hooks.ts");
    writeSettings(file, { hooks: hooksFor(legacySource, (shim, event) => `bun ${shim} ${event}`) });

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch hooks");
  });

  test("warns when hooks point at a stale shim", async () => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(path.join(tempDir(), "old", "claude-hooks.ts")) });

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch hooks");
  });

  test("treats an absent settings file as not configured", async () => {
    const file = settingsPath();

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "ok" });
    expect(result.detail).toContain("not set up");
  });

  test("handles malformed settings gracefully", async () => {
    const file = settingsPath();
    fs.writeFileSync(file, "{not valid json");

    const result = await checkClaudeHooks(file);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("malformed");
    expect(result.detail).toContain("run orch setup");
  });
});
