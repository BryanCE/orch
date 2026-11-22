import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { tempOrchDir, removeTempDir } from "./helpers/tempdir.ts";
import { writeSettingsFixture, writeProjectSettingsFixture, writeProjectSettingsText } from "./helpers/settings.ts";
import { fileSettingsManager, projectSettingsManager, projectViewSettingsManager, installManagerOf } from "../src/settings/manager.ts";
import { writeRegisteredSetting, clearRegisteredSetting } from "../src/settings/registry.ts";
import { projectSettings } from "../src/settings/project.ts";
import { PROJECT_SETTINGS_FILE_SCHEMA } from "../src/settings/schema.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs) removeTempDir(dir);
  dirs.length = 0;
});
function install(settings: Record<string, unknown>) {
  const orchDir: OrchDir = tempOrchDir("orch-project-install-");
  dirs.push(orchDir);
  writeSettingsFixture(orchDir, settings);
  return fileSettingsManager(orchDir);
}
function project(): string {
  const dir = tempOrchDir("orch-project-dir-");
  dirs.push(dir);
  return dir;
}

describe("projectSettings", () => {
  test("an absent file gives the install's settings", () => {
    const manager = install({});
    const dir = project();
    const result = projectSettings(dir, manager);
    expect(result.state).toEqual({ kind: "none" });
    expect(result.values).toBeNull();
    expect(result.file).toBe(path.join(dir, ".orch", "settings.json"));
    expect(result.settings).toEqual(manager.current());
  });
  test("a project key overrides the install's and leaves its siblings", () => {
    const manager = install({ workers: { verify_commands: ["go vet"], inherit_mcp: true } });
    const dir = project();
    writeProjectSettingsFixture(dir, { workers: { verify_commands: ["bunx oxlint"] } });
    const result = projectSettings(dir, manager);
    expect(result.settings.workers.verify_commands).toEqual(["bunx oxlint"]);
    expect(result.settings.workers.inherit_mcp).toBe(true);
    expect(result.state.kind).toBe("ok");
  });
  test("a list replaces the whole list", () => {
    const manager = install({ locked_commands: { commands: ["go test", "go vet"] } });
    const dir = project();
    writeProjectSettingsFixture(dir, { locked_commands: { commands: ["bun test"] } });
    expect(projectSettings(dir, manager).settings.locked_commands.commands).toEqual(["bun test"]);
  });
  test("an explicit empty list empties the locks", () => {
    const manager = install({ locked_commands: { commands: ["go test", "go vet"] } });
    const dir = project();
    writeProjectSettingsFixture(dir, { locked_commands: { commands: [] } });
    expect(projectSettings(dir, manager).settings.locked_commands.commands).toEqual([]);
  });
  test("bad JSON is invalid and leaves the install's settings", () => {
    const manager = install({});
    const dir = project();
    const file = writeProjectSettingsText(dir, "{ nope");
    const result = projectSettings(dir, manager);
    expect(result.state.kind).toBe("invalid");
    if (result.state.kind === "invalid") {
      expect(result.state.message).toContain(file);
      expect(result.state.message).toContain("expected valid JSON");
    }
    expect(result.settings).toEqual(manager.current());
  });
  test("an install-only key is refused by name", () => {
    const manager = install({});
    const cases: [string, string][] = [
      ['{"runtime":"node"}', "runtime"],
      ['{"daemon":{"tcp_port":9}}', "daemon"],
      ['{"fleet":{"max_agents_total":3}}', "fleet.max_agents_total"],
    ];
    for (const [text, key] of cases) {
      const dir = project();
      writeProjectSettingsText(dir, text);
      const result = projectSettings(dir, manager);
      expect(result.state.kind).toBe("invalid");
      if (result.state.kind === "invalid") {
        expect(result.state.message).toContain(key);
        expect(result.state.message).toContain("install-only");
      }
    }
  });
  test("a project's models.allowed and workers.allow_tools take effect", () => {
    const manager = install({});
    const dir = project();
    writeProjectSettingsFixture(dir, { models: { allowed: { pi: ["openai-codex/gpt-6-luna"] } }, workers: { allow_tools: ["read"] } });
    const result = projectSettings(dir, manager);
    expect(result.settings.models.allowed.pi).toEqual(["openai-codex/gpt-6-luna"]);
    expect(result.settings.workers.allow_tools).toEqual(["read"]);
  });
  test("two directories read their own files", () => {
    const manager = install({});
    const a = project();
    const b = project();
    writeProjectSettingsFixture(a, { workers: { verify_commands: ["a"] } });
    writeProjectSettingsFixture(b, { workers: { verify_commands: ["b"] } });
    expect(projectSettings(a, manager).settings.workers.verify_commands).toEqual(["a"]);
    expect(projectSettings(b, manager).settings.workers.verify_commands).toEqual(["b"]);
  });
  test("a subdirectory does not read its parent's file", () => {
    const manager = install({});
    const dir = project();
    writeProjectSettingsFixture(dir, { workers: { verify_commands: ["a"] } });
    const sub = path.join(dir, "packages", "web");
    mkdirSync(sub, { recursive: true });
    expect(projectSettings(sub, manager).state).toEqual({ kind: "none" });
  });
  test("the install's own directory has no project file", () => {
    const home = project();
    const orchDir = orchDirAt(path.join(home, ".orch"));
    writeSettingsFixture(orchDir, {});
    const result = projectSettings(home, fileSettingsManager(orchDir));
    expect(result.file).toBeNull();
    expect(result.state).toEqual({ kind: "none" });
  });
  test("the project schema's sections are the ones the merge handles", () => {
    expect(Object.keys(PROJECT_SETTINGS_FILE_SCHEMA.shape).sort()).toEqual([
      "agents", "council", "defaults", "denied_commands", "fleet", "gated_commands", "locked_commands", "models", "schemaVersion", "workers", "worktrees",
    ]);
  });
});


describe("project writes", () => {
  test("the first write creates the file and its directory", () => {
    const manager = install({});
    const dir = project();
    writeRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands", ["bunx oxlint"]);
    expect(JSON.parse(readFileSync(path.join(dir, ".orch", "settings.json"), "utf8"))).toEqual({
      schemaVersion: 1, workers: { verify_commands: ["bunx oxlint"] },
    });
    expect(readFileSync(manager.file, "utf8")).not.toContain("bunx oxlint");
  });
  test("a project write leaves the install file alone and wins over it", () => {
    const manager = install({ workers: { verify_commands: ["go vet"] } });
    const dir = project();
    writeRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands", ["bunx oxlint"]);
    expect(projectSettingsManager(dir, manager).current().workers.verify_commands).toEqual(["bunx oxlint"]);
    expect(manager.current().workers.verify_commands).toEqual(["go vet"]);
  });
  test("an install-only key is refused on write, by name", () => {
    const manager = install({});
    const dir = project();
    expect(() => writeRegisteredSetting(projectSettingsManager(dir, manager), "daemon.tcp_port", 9)).toThrow("install-only");
    expect(existsSync(path.join(dir, ".orch", "settings.json"))).toBe(false);
  });
  test("a council lineup outside the merged models.allowed is refused", () => {
    const manager = install({ models: { allowed: { pi: ["openai-codex/gpt-6-luna"] } } });
    const dir = project();
    expect(() => writeRegisteredSetting(projectSettingsManager(dir, manager), "council.models", {
      pi: ["openai-codex/gpt-6.2-sol:medium"],
    })).toThrow("council.models.pi");
  });
  test("a clear removes the project's value so the install's applies", () => {
    const manager = install({ workers: { verify_commands: ["go vet"] } });
    const dir = project();
    writeRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands", ["bunx oxlint"]);
    clearRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands");
    expect(projectSettingsManager(dir, manager).current().workers.verify_commands).toEqual(["go vet"]);
  });
  test("a write to an invalid project file is refused", () => {
    const manager = install({});
    const dir = project();
    writeProjectSettingsText(dir, "{ nope");
    expect(() => writeRegisteredSetting(projectSettingsManager(dir, manager), "workers.verify_commands", ["bunx oxlint"])).toThrow("expected valid JSON");
  });
  test("the install's own directory has no project manager", () => {
    const home = project();
    const orchDir = orchDirAt(path.join(home, ".orch"));
    writeSettingsFixture(orchDir, {});
    expect(() => projectSettingsManager(home, fileSettingsManager(orchDir))).toThrow("no project file");
  });
  test("a view reads the merged settings and writes the install file", () => {
    const manager = install({ workers: { verify_commands: ["go vet"] } });
    const dir = project();
    writeProjectSettingsFixture(dir, { workers: { verify_commands: ["bunx oxlint"] } });
    const view = projectViewSettingsManager(dir, manager);
    expect(view.current().workers.verify_commands).toEqual(["bunx oxlint"]);
    expect(installManagerOf(view)).toBe(manager);
    writeRegisteredSetting(view, "fleet.max_agents_per_tab", 6);
    expect(manager.current().fleet.max_agents_per_tab).toBe(6);
  });
});
