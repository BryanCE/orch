import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, test } from "bun:test";
import { writeSettingsFixture } from "./helpers/settings.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-settings-cmd-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

function runSettings(orchDir: string, extraEnv: Record<string, string>, ...args: string[]): string {
  const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: orchDir, ...extraEnv };
  // An empty ORCH_* var still counts as env-provided; only deletion restores lower precedence.
  for (const name of ["ORCH_ADAPTER", "ORCH_BACKEND", "ORCH_MODEL", "ORCH_SPAWN_CAP", "ORCH_WORKTREE"]) {
    if (!(name in extraEnv)) delete env[name];
  }
  return execFileSync("bun", [path.join(import.meta.dir, "../bin/orch.ts"), "settings", ...args], {
    env,
    encoding: "utf8",
  });
}

function runSettingsExpectingFailure(orchDir: string, ...args: string[]): { status: number; stderr: string } {
  try {
    execFileSync("bun", [path.join(import.meta.dir, "../bin/orch.ts"), "settings", ...args], {
      env: { ...process.env, ORCH_DIR: orchDir },
      encoding: "utf8",
    });
  } catch (error) {
    const failure = error as { status?: number; stderr?: string };
    return { status: failure.status ?? -1, stderr: failure.stderr ?? "" };
  }
  throw new Error("orch settings exited 0, expected a failure");
}

describe("orch settings", () => {
  test("--json reports value + source per setting, settings.json winning over defaults", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      installed: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown; source: string }>;
    expect(report.adapter).toEqual({ value: "pi", source: "settings.json" });
    expect(report.backend).toEqual({ value: "headless", source: "settings.json" });
    expect(report.model!.source).toBe("default");
    expect(report["fleet.spawn_cap"]).toEqual({ value: 8, source: "default" });
    expect(report.installed!.value).toEqual({ adapters: ["pi", "claude"], backends: ["headless"] });
  }, 30_000);

  test("--json reports env as the winning source over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      installed: { adapters: ["pi"], backends: [] },
      defaults: { adapter: "pi" },
    });

    const report = JSON.parse(runSettings(directory, { ORCH_ADAPTER: "claude" }, "--json")) as Record<string, { value: unknown; source: string }>;
    expect(report.adapter).toEqual({ value: "claude", source: "env" });
  }, 30_000);

  test("--harness switches defaults.adapter between installed ids and rejects a non-installed id", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      installed: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    expect(runSettings(directory, {}, "--harness=claude")).toContain("default adapter = claude");
    const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown }>;
    expect(report.adapter!.value).toBe("claude");

    const rejected = runSettingsExpectingFailure(directory, "--harness=codex");
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("codex");
    expect(rejected.stderr).toContain("installed");
  }, 60_000);

  test("a load error surfaces loudly with no partial table", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\n");

    const failed = runSettingsExpectingFailure(directory, "--json");
    expect(failed.status).not.toBe(0);
    expect(failed.stderr).toContain("config.toml");
    expect(failed.stderr).toContain("orch setup");
  }, 30_000);
});
