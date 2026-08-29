import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-settings-cmd-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) removeTempDir(directories.pop()!);
});

function runSettings(orchDir: string, extraEnv: Record<string, string>, ...args: string[]): string {
  const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: orchDir, ...extraEnv };
  // An empty ORCH_* var still counts as env-provided; only deletion restores lower precedence.
  for (const name of ["ORCH_ADAPTER", "ORCH_BACKEND", "ORCH_MODEL", "ORCH_SPAWN_CAP", "ORCH_WORKTREE"]) {
    if (!(name in extraEnv)) delete env[name];
  }
  const ran = runSettingsCli(env, args);
  if (!ran.success) throw new Error(`orch settings ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
  return ran.stdout.toString();
}

function runSettingsCli(env: Record<string, string | undefined>, args: readonly string[]) {
  return Bun.spawnSync([process.execPath, path.join(import.meta.dir, "../bin/orch.ts"), "settings", ...args], {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
}

function runSettingsExpectingFailure(orchDir: string, ...args: string[]): { status: number; stderr: string } {
  const ran = runSettingsCli({ ...process.env, ORCH_DIR: orchDir }, args);
  if (ran.success) throw new Error("orch settings exited 0, expected a failure");
  return { status: ran.exitCode, stderr: ran.stderr.toString() };
}

describe("orch settings", () => {
  test("--json reports value + source per setting, settings.json winning over defaults", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown; source: string }>;
    expect(report.adapter).toEqual({ value: "pi", source: "settings.json" });
    expect(report.backend).toEqual({ value: "headless", source: "settings.json" });
    expect(report["model (pi)"]!.source).toBe("default");
    expect(report["model (claude)"]!.source).toBe("default");
    expect(report["fleet.spawn_cap"]).toEqual({ value: 8, source: "default" });
    expect(report.enabled!.value).toEqual({ adapters: ["pi", "claude"], backends: ["headless"] });
  }, 30_000);

  test("--json reports env as the winning source over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi"], backends: [] },
      defaults: { adapter: "pi" },
    });

    const report = JSON.parse(runSettings(directory, { ORCH_ADAPTER: "claude" }, "--json")) as Record<string, { value: unknown; source: string }>;
    expect(report.adapter).toEqual({ value: "claude", source: "env" });
  }, 30_000);

  test("--harness switches defaults.adapter between enabled ids and rejects a non-enabled id", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    expect(runSettings(directory, {}, "--harness=claude")).toContain("default adapter = claude");
    const report = JSON.parse(runSettings(directory, {}, "--json")) as Record<string, { value: unknown }>;
    expect(report.adapter!.value).toBe("claude");

    const rejected = runSettingsExpectingFailure(directory, "--harness=codex");
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toContain("codex");
    expect(rejected.stderr).toContain("enabled");
  }, 60_000);

  test("reports each harness's picker quicklist and launch gate as separate rows", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
      models: { preferred: { pi: ["openrouter/a", "openrouter/b"] }, allowed: { pi: ["openrouter/*"] } },
    });

    const printed = runSettings(directory, {});
    // The quicklist is never labelled "allowed": one is convenience, the other is permission.
    expect(printed).toMatch(/picker \(pi\)\s+2: openrouter\/a, openrouter\/b/);
    expect(printed).toMatch(/allowed \(pi\)\s+1: openrouter\/\*/);
    // A harness with neither list says what empty means for each.
    expect(printed).toMatch(/picker \(claude\)\s+\(none\)/);
    expect(printed).toMatch(/allowed \(claude\)\s+\(all offered\)/);
  }, 30_000);

  test("a load error surfaces loudly with no partial table", () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\n");

    const failed = runSettingsExpectingFailure(directory, "--json");
    expect(failed.status).not.toBe(0);
    expect(failed.stderr).toContain("config.toml");
    expect(failed.stderr).toContain("orch setup");
  }, 30_000);

  test("sets a boolean through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "defaults.worktree", "true")).toContain("defaults.worktree = true");
  }, 30_000);

  test("sets an integer through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "fleet.spawn_cap", "5")).toContain("fleet.spawn_cap = 5");
  }, 30_000);

  test("sets a choice through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "tiling.first_split", "columns")).toContain("tiling.first_split = columns");
  }, 30_000);

  test("sets a multi value through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi", "claude"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "enabled.adapters", "pi,claude")).toContain("enabled.adapters = [\"pi\",\"claude\"]");
  }, 30_000);

  test("sets a list value through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "skills.roots", "[\"/tmp/a\",\"/tmp/b\"]")).toContain("skills.roots = [\"/tmp/a\",\"/tmp/b\"]");
  }, 30_000);

  test("refuses an invalid boolean and names the allowed values", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "defaults.worktree", "maybe");
    expect(failed.stderr).toContain("defaults.worktree");
    expect(failed.stderr).toContain("true or false");
  }, 30_000);

  test("refuses an invalid integer and names the allowed range", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "fleet.spawn_cap", "zero");
    expect(failed.stderr).toContain("fleet.spawn_cap");
    expect(failed.stderr).toContain("integer");
  }, 30_000);

  test("refuses an invalid choice and names the allowed choices", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "tiling.first_split", "diagonal");
    expect(failed.stderr).toContain("tiling.first_split");
    expect(failed.stderr).toContain("rows");
  }, 30_000);

  test("refuses an invalid multi value and names the allowed choices", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "enabled.adapters", "bogus");
    expect(failed.stderr).toContain("enabled.adapters");
    expect(failed.stderr).toContain("pi");
  }, 30_000);

  test("refuses an invalid list and names JSON as the allowed format", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "skills.roots", "not-json");
    expect(failed.stderr).toContain("skills.roots");
    expect(failed.stderr).toContain("JSON array");
  }, 30_000);

  test("refuses an unknown key and suggests nearest valid keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "fleet.spawn_cpa", "5");
    expect(failed.stderr).toContain("fleet.spawn_cpa");
    expect(failed.stderr).toContain("fleet.spawn_cap");
  }, 30_000);

  test("refuses read-only runtime and names the editing subcommand", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "runtime", "node");
    expect(failed.stderr).toContain("runtime");
    expect(failed.stderr).toContain("orch setup");
  }, 30_000);
});
