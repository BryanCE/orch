import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { writeSettingsFixture } from "../test/helpers/settings.ts";
import * as registry from "../src/settings/registry.ts";
import { SETTINGS_REGISTRY } from "../src/settings/registry.ts";
import { cmdSettings } from "../src/commands/settings.ts";
import { createServices } from "../src/services.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { AGENT_SETTINGS_GRANT } from "../src/policy/agent-settings.ts";
import { isRecord } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { testServices } from "../test/helpers/services.ts";
import { captureStdout } from "../test/helpers/stdout.ts";
import { isolateOrchEnv, restoreOrchEnv } from "../test/helpers/env.ts";

import type { OrchDir } from "../src/types/core.ts";
const directories: OrchDir[] = [];

function tempDir(): OrchDir {
  const directory = tempOrchDir("orch-settings-cmd-");
  directories.push(directory);
  return directory;
}

beforeEach(() => { isolateOrchEnv(); });

afterEach(() => {
  restoreOrchEnv();
  while (directories.length) removeTempDir(directories.pop()!);
});

/** Every var that would make the runner an agent or override a setting; cleared unless the test sets it. */
const OVERRIDE_VARS = ["ORCH_ADAPTER", "ORCH_BACKEND", "ORCH_MODEL", "ORCH_WORKTREE", LAUNCH_ENV];

/** Run one `orch settings` in-process with the CLI's environment: this dir, the
 *  runner's env minus every override, plus what the test sets on purpose. A fresh
 *  Services per run reads the file the way a fresh CLI process does. */
async function runSettingsCli(orchDir: OrchDir, extraEnv: Record<string, string>, args: readonly string[]): Promise<string> {
  const saved = Object.fromEntries(OVERRIDE_VARS.map((name) => [name, process.env[name]]));
  for (const name of OVERRIDE_VARS) delete process.env[name];
  process.env.ORCH_DIR = orchDir;
  Object.assign(process.env, extraEnv);
  try {
    return await captureStdout(() => cmdSettings(createServices({ orchDir }), [...args]));
  } finally {
    for (const name of OVERRIDE_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}

function runSettings(orchDir: OrchDir, extraEnv: Record<string, string>, ...args: string[]): Promise<string> {
  return runSettingsCli(orchDir, extraEnv, args);
}

/** The refusal the command raised. The CLI boundary prints this message and exits 1. */
async function runSettingsExpectingFailure(orchDir: OrchDir, extraEnv: Record<string, string>, ...args: string[]): Promise<{ message: string }> {
  try {
    await runSettingsCli(orchDir, extraEnv, args);
  } catch (error: unknown) {
    if (error instanceof CommandRefusal) return { message: error.message };
    throw error;
  }
  throw new Error("orch settings succeeded, expected a refusal");
}

interface SettingReport { readonly value: unknown; readonly source: string; readonly agentWritable: boolean }

/** `orch settings --json` read back through a guard rather than a cast: the CLI's
 *  stdout is external data, and a cast here would hide a shape change instead of
 *  reporting it (Rule 13). */
function settingsReport(output: string): Record<string, SettingReport> {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error("settings --json did not return an object");
  const report: Record<string, SettingReport> = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || !("value" in entry) || !("source" in entry) || !("agentWritable" in entry)) {
      throw new Error(`settings --json entry ${key} has no value/source/agentWritable`);
    }
    const { source, agentWritable } = entry;
    if (typeof source !== "string") throw new Error(`settings --json entry ${key} has a non-string source`);
    if (typeof agentWritable !== "boolean") throw new Error(`settings --json entry ${key} has a non-boolean agentWritable`);
    report[key] = { value: entry.value, source, agentWritable };
  }
  return report;
}

describe("orch settings", () => {

  // The registry is the single source of truth for a
  // setting, and a setting the CLI cannot show is a setting nobody can find. A
  // hand-written switch beside the registry loop dropped 23 of the 42 declared
  // keys from both the table and --json — every retention.*, every workers.*,
  // logging.level, fleet.max_agents_per_pack, locked_commands — which is exactly the
  // invisibility this file exists to prevent.
  test("every registered setting is reachable through --json", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
    const shown = new Set(Object.keys(settingsReport(await runSettings(dir, {}, "--json"))));
    const missing = SETTINGS_REGISTRY.map((spec) => spec.key).filter((key) => !shown.has(key));
    expect(missing).toEqual([]);
  });

  test("every registered setting is printed in the table", async () => {
    const dir = tempDir();
    writeSettingsFixture(dir, { defaults: { adapter: "pi", backend: "headless" } });
    const output = await runSettings(dir, {});
    const missing = SETTINGS_REGISTRY.map((spec) => spec.key).filter((key) => !output.includes(key));
    expect(missing).toEqual([]);
  });
  test("--json reports value + source per setting, settings.json winning over defaults", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    const report = settingsReport(await runSettings(directory, {}, "--json"));
    expect(report["defaults.adapter"]).toEqual({ value: "pi", source: "settings.json", agentWritable: false });
    expect(report["defaults.backend"]).toEqual({ value: "headless", source: "settings.json", agentWritable: false });
    expect(report["model (pi)"]!.source).toBe("default");
    expect(report["model (claude)"]!.source).toBe("default");
    expect(report["fleet.max_depth"]).toEqual({ value: 1, source: "default", agentWritable: false });
    expect(report.enabled!.value).toEqual({ adapters: ["pi", "claude"], backends: ["headless"] });
  });

  test("--json reports env as the winning source over settings.json", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi"], backends: [] },
      defaults: { adapter: "pi" },
    });

    const report = settingsReport(await runSettings(directory, { ORCH_ADAPTER: "claude" }, "--json"));
    expect(report["defaults.adapter"]).toEqual({ value: "claude", source: "env", agentWritable: false });
  });

  test("--harness switches defaults.adapter between enabled ids and rejects a non-enabled id", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
    });

    expect(await runSettings(directory, {}, "--harness=claude")).toContain("default adapter = claude");
    const report = settingsReport(await runSettings(directory, {}, "--json"));
    expect(report["defaults.adapter"]!.value).toBe("claude");
    const settingsSource = fs.readFileSync(path.join(import.meta.dir, "../src/commands/settings.ts"), "utf8");
    expect(settingsSource.replaceAll("writeRegisteredSetting", "")).not.toContain("writeSettings");

    const rejected = await runSettingsExpectingFailure(directory, {}, "--harness=codex");
    expect(rejected.message).toContain("codex");
    expect(rejected.message).toContain("enabled");
  });

  test("reports each harness's picker quicklist and launch gate as separate rows", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, {
      enabled: { adapters: ["pi", "claude"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless" },
      models: { preferred: { pi: ["openrouter/a", "openrouter/b"] }, allowed: { pi: ["openrouter/*"] } },
    });

    const printed = await runSettings(directory, {});
    // The quicklist is never labelled "allowed": one is convenience, the other is permission.
    expect(printed).toMatch(/picker \(pi\)\s+2: openrouter\/a, openrouter\/b/);
    expect(printed).toMatch(/allowed \(pi\)\s+1: openrouter\/\*/);
    // A harness with neither list says what empty means for each.
    expect(printed).toMatch(/picker \(claude\)\s+\(none\)/);
    expect(printed).toMatch(/allowed \(claude\)\s+\(all offered\)/);
  });

  test("a load error surfaces loudly with no partial table", async () => {
    const directory = tempDir();
    fs.writeFileSync(path.join(directory, "config.toml"), "[defaults]\n");

    const failed = await runSettingsExpectingFailure(directory, {}, "--json");
    expect(failed.message).toContain("config.toml");
    expect(failed.message).toContain("orch setup");
  });

  test("sets a boolean through its registry entry", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(await runSettings(directory, {}, "defaults.worktree", "true")).toContain("defaults.worktree = true");
  });

  test("sets an integer through its registry entry", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(await runSettings(directory, {}, "fleet.max_depth", "5")).toContain("fleet.max_depth = 5");
  });

  test("single-setting set delegates to the registry writer", async () => {
    const directory = tempDir();
    const settings = { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } };
    writeSettingsFixture(directory, settings);
    process.env.ORCH_DIR = directory;
    const writer = spyOn(registry, "writeRegisteredSetting");
    try {
      const services = testServices({ orchDir: directory, settings });
      await captureStdout(() => cmdSettings(services, ["fleet.max_depth", "6"]));
      expect(writer).toHaveBeenCalledTimes(1);
      expect(writer).toHaveBeenCalledWith(services.settings, "fleet.max_depth", 6);
    } finally {
      writer.mockRestore();
    }
  });

  test("sets a choice through its registry entry", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(await runSettings(directory, {}, "tiling.first_split", "columns")).toContain("tiling.first_split = columns");
  });

  test("sets a multi value through its registry entry", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi", "claude"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(await runSettings(directory, {}, "enabled.adapters", "pi,claude")).toContain("enabled.adapters = [\"pi\",\"claude\"]");
  });

  test("sets a list value through its registry entry", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    expect(await runSettings(directory, {}, "skills.link", "[\"/tmp/a\",\"/tmp/b\"]")).toContain("skills.link = [\"/tmp/a\",\"/tmp/b\"]");
  });

  test("refuses an invalid boolean and names the allowed values", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "defaults.worktree", "maybe");
    expect(failed.message).toContain("defaults.worktree");
    expect(failed.message).toContain("true or false");
  });

  test("refuses an invalid integer and names the allowed range", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "fleet.max_depth", "zero");
    expect(failed.message).toContain("fleet.max_depth");
    expect(failed.message).toContain("integer");
  });

  test("refuses an invalid choice and names the allowed choices", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "tiling.first_split", "diagonal");
    expect(failed.message).toContain("tiling.first_split");
    expect(failed.message).toContain("rows");
  });

  test("refuses an invalid multi value and names the allowed choices", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "enabled.adapters", "bogus");
    expect(failed.message).toContain("enabled.adapters");
    expect(failed.message).toContain("pi");
  });

  test("refuses an invalid list and names JSON as the allowed format", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "skills.link", "not-json");
    expect(failed.message).toContain("skills.link");
    expect(failed.message).toContain("JSON array");
  });

  test("refuses an unknown key and suggests nearest valid keys", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "fleet.max_dept", "5");
    expect(failed.message).toContain("fleet.max_dept");
    expect(failed.message).toContain("fleet.max_depth");
  });

  test("refuses read-only runtime and names the editing subcommand", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    const failed = await runSettingsExpectingFailure(directory, {}, "runtime", "node");
    expect(failed.message).toContain("runtime");
    expect(failed.message).toContain("orch setup");
  });
});

describe("orch settings from an agent", () => {
  const fixture = { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } };
  const asAgent = (): Record<string, string> => ({ [LAUNCH_ENV]: mintAgentId() });

  test("the human sets any writable key", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect(await runSettings(directory, {}, "fleet.max_depth", "5")).toContain("fleet.max_depth = 5");
  });

  test("an agent sets a granted key", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect(await runSettings(directory, asAgent(), "workers.verify_commands", "[\"bun check\"]")).toContain("workers.verify_commands = [\"bun check\"]");
  });

  test("an agent is refused an ungranted key and told what it may set", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    const failed = await runSettingsExpectingFailure(directory, asAgent(), "fleet.max_depth", "5");
    expect(failed.message).toContain("fleet.max_depth is operator-only for an agent");
    expect(failed.message).toContain("workers.verify_commands");
    expect(failed.message).toContain("orch settings grant fleet.max_depth");
  });

  test("an agent never widens its own grant", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, { ...fixture, agents: { writable_settings: ["fleet.max_depth", AGENT_SETTINGS_GRANT] } });
    const failed = await runSettingsExpectingFailure(directory, asAgent(), AGENT_SETTINGS_GRANT, "[\"fleet.max_depth\"]");
    expect(failed.message).toContain(`${AGENT_SETTINGS_GRANT} is operator-only for an agent`);
  });

  test("the human grants a key and the agent then sets it", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect(await runSettings(directory, {}, "grant", "fleet.max_depth")).toBe("agents may write: workers.verify_commands, locked_commands, fleet.max_depth\n");
    expect(await runSettings(directory, asAgent(), "fleet.max_depth", "3")).toContain("fleet.max_depth = 3");
  });

  test("the human revokes a key and the agent is refused it", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect(await runSettings(directory, {}, "revoke", "locked_commands")).toBe("agents may write: workers.verify_commands\n");
    expect(await runSettings(directory, {}, "revoke", "workers.verify_commands")).toBe("agents may write: (none)\n");
    const failed = await runSettingsExpectingFailure(directory, asAgent(), "locked_commands", "[\"git push\"]");
    expect(failed.message).toContain("An agent may set: (none)");
  });

  test("grant is idempotent and refuses an unknown, read-only, or self key", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect(await runSettings(directory, {}, "grant", "locked_commands")).toBe("agents may write: workers.verify_commands, locked_commands\n");
    expect((await runSettingsExpectingFailure(directory, {}, "grant", "fleet.max_dept")).message).toContain("fleet.max_depth");
    expect((await runSettingsExpectingFailure(directory, {}, "grant", "runtime")).message).toContain("read-only");
    expect((await runSettingsExpectingFailure(directory, {}, "grant", AGENT_SETTINGS_GRANT)).message).toContain("never grants itself");
  });

  test("an agent never grants or revokes", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    expect((await runSettingsExpectingFailure(directory, asAgent(), "grant", "fleet.max_depth")).message).toContain("operator-only for an agent");
    expect((await runSettingsExpectingFailure(directory, asAgent(), "revoke", "locked_commands")).message).toContain("operator-only for an agent");
  });

  test("the table and --json say which rows an agent may write", async () => {
    const directory = tempDir();
    writeSettingsFixture(directory, fixture);
    const table = await runSettings(directory, {});
    const row = (key: string): string => table.split("\n").find((line) => line.trim().startsWith(`${key} `)) ?? "";
    expect(row("workers.verify_commands")).toMatch(/ agent$/);
    expect(row("fleet.max_depth")).not.toMatch(/agent$/);
    const report = settingsReport(await runSettings(directory, {}, "--json"));
    expect(report["workers.verify_commands"]?.agentWritable).toBe(true);
    expect(report["fleet.max_depth"]?.agentWritable).toBe(false);
  });
});
