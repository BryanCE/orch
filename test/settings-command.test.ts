import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { writeSettingsFixture } from "./helpers/settings.ts";
import * as registry from "../src/settings/registry.ts";
import { SETTINGS_REGISTRY } from "../src/settings/registry.ts";
import { cmdSettings } from "../src/commands/settings.ts";
import { isRecord } from "../src/util.ts";
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
  for (const name of ["ORCH_ADAPTER", "ORCH_BACKEND", "ORCH_MODEL", "ORCH_WORKTREE"]) {
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

function runSettingsExpectingFailure(orchDir: string, ...args: string[]): { status: number; stdout: string } {
  const ran = runSettingsCli({ ...process.env, ORCH_DIR: orchDir }, args);
  if (ran.success) throw new Error("orch settings exited 0, expected a failure");
  return { status: ran.exitCode, stdout: ran.stdout.toString() };
}

interface SettingReport { readonly value: unknown; readonly source: string }

/** `orch settings --json` read back through a guard rather than a cast: the CLI's
 *  stdout is external data, and a cast here would hide a shape change instead of
 *  reporting it (Rule 13). */
function settingsReport(output: string): Record<string, SettingReport> {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error("settings --json did not return an object");
  const report: Record<string, SettingReport> = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || !("value" in entry) || !("source" in entry)) {
      throw new Error(`settings --json entry ${key} has no value/source`);
    }
    const source = entry.source;
    if (typeof source !== "string") throw new Error(`settings --json entry ${key} has a non-string source`);
    report[key] = { value: entry.value, source };
  }
  return report;
}

describe("orch settings", () => {

  // TASKS/14-settings-tui.md: the registry is the single source of truth for a
  // setting, and a setting the CLI cannot show is a setting nobody can find. A
  // hand-written switch beside the registry loop dropped 23 of the 42 declared
  // keys from both the table and --json — every retention.*, every workers.*,
  // logging.level, fleet.max_agents_per_pack, locked_commands — which is exactly the
  // invisibility this file exists to prevent.
  test("every registered setting is reachable through --json", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
    const shown = new Set(Object.keys(settingsReport(runSettings(dir, {}, "--json"))));
    const missing = SETTINGS_REGISTRY.map((spec) => spec.key).filter((key) => !shown.has(key));
    expect(missing).toEqual([]);
  });

  test("every registered setting is printed in the table", () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
    const output = runSettings(dir, {});
    const missing = SETTINGS_REGISTRY.map((spec) => spec.key).filter((key) => !output.includes(key));
    expect(missing).toEqual([]);
  });
  test("--json reports value + source per setting, settings.json winning over defaults", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    const report = settingsReport(runSettings(directory, {}, "--json"));
    expect(report["defaults.adapter"]).toEqual({ value: "pi", source: "settings.json" });
    expect(report["defaults.backend"]).toEqual({ value: "headless", source: "settings.json" });
    expect(report["model (pi)"]!.source).toBe("default");
    expect(report["model (claude)"]!.source).toBe("default");
    expect(report["fleet.max_depth"]).toEqual({ value: 1, source: "default" });
    expect(report.enabled!.value).toEqual({ adapters: ["pi", "claude"], backends: ["headless"] });
  }, 30_000);

  test("--json reports env as the winning source over settings.json", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi"], backends: [] },
      defaults: { adapter: "pi" },
    });

    const report = settingsReport(runSettings(directory, { ORCH_ADAPTER: "claude" }, "--json"));
    expect(report["defaults.adapter"]).toEqual({ value: "claude", source: "env" });
  }, 30_000);

  test("--harness switches defaults.adapter between enabled ids and rejects a non-enabled id", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    expect(runSettings(directory, {}, "--harness=claude")).toContain("default adapter = claude");
    const report = settingsReport(runSettings(directory, {}, "--json"));
    expect(report["defaults.adapter"]!.value).toBe("claude");
    const settingsSource = fs.readFileSync(path.join(import.meta.dir, "../src/commands/settings.ts"), "utf8");
    expect(settingsSource.replaceAll("writeRegisteredSetting", "")).not.toContain("writeSettings");

    const rejected = runSettingsExpectingFailure(directory, "--harness=codex");
    expect(rejected.status).not.toBe(0);
    expect(rejected.stdout).toContain("codex");
    expect(rejected.stdout).toContain("enabled");
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
    expect(failed.stdout).toContain("config.toml");
    expect(failed.stdout).toContain("orch setup");
  }, 30_000);

  test("sets a boolean through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "defaults.worktree", "true")).toContain("defaults.worktree = true");
  }, 30_000);

  test("sets an integer through its registry entry", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(runSettings(directory, {}, "fleet.max_depth", "5")).toContain("fleet.max_depth = 5");
  }, 30_000);

  test("single-setting set delegates to the registry writer", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const previousOrchDir = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    const writer = spyOn(registry, "writeRegisteredSetting");
    try {
      await cmdSettings(["fleet.max_depth", "6"]);
      expect(writer).toHaveBeenCalledTimes(1);
      expect(writer).toHaveBeenCalledWith(directory, "fleet.max_depth", 6);
    } finally {
      writer.mockRestore();
      if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previousOrchDir;
    }
  });

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
    expect(failed.stdout).toContain("defaults.worktree");
    expect(failed.stdout).toContain("true or false");
  }, 30_000);

  test("refuses an invalid integer and names the allowed range", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "fleet.max_depth", "zero");
    expect(failed.stdout).toContain("fleet.max_depth");
    expect(failed.stdout).toContain("integer");
  }, 30_000);

  test("refuses an invalid choice and names the allowed choices", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "tiling.first_split", "diagonal");
    expect(failed.stdout).toContain("tiling.first_split");
    expect(failed.stdout).toContain("rows");
  }, 30_000);

  test("refuses an invalid multi value and names the allowed choices", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "enabled.adapters", "bogus");
    expect(failed.stdout).toContain("enabled.adapters");
    expect(failed.stdout).toContain("pi");
  }, 30_000);

  test("refuses an invalid list and names JSON as the allowed format", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "skills.roots", "not-json");
    expect(failed.stdout).toContain("skills.roots");
    expect(failed.stdout).toContain("JSON array");
  }, 30_000);

  test("refuses an unknown key and suggests nearest valid keys", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "fleet.max_dept", "5");
    expect(failed.stdout).toContain("fleet.max_dept");
    expect(failed.stdout).toContain("fleet.max_depth");
  }, 30_000);

  test("refuses read-only runtime and names the editing subcommand", () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = runSettingsExpectingFailure(directory, "runtime", "node");
    expect(failed.stdout).toContain("runtime");
    expect(failed.stdout).toContain("orch setup");
  }, 30_000);
});
