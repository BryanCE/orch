import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { diagnoseClaudeShim } from "../src/adapters/claude.ts";
import { CLAUDE_HOOK_EVENTS, claudeHookCommand, claudeHookShimPath, claudeSettingsPath } from "../src/adapters/claude-hooks.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { createLogger } from "../src/log.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import type { OrchDir } from "../src/types/core.ts";

const directories: string[] = [];
// diagnoseShim checks only orch's private settings file; tests never touch HOME.
const orchHome: OrchDir = tempOrchDir("orch-doctor-claude-hooks-orchdir-");
const originalOrchDir = process.env.ORCH_DIR;
process.env.ORCH_DIR = orchHome;
writeSettingsFixture(orchHome, { runtime: "node" });

// ORCH_DIR outlives this file's tests, so a per-test removal only gets the directory
// recreated by whoever reads it next.
afterAll(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  removeTempDir(orchHome);
});

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-claude-hooks-"));
  directories.push(directory);
  return directory;
}

function settingsPath(): string {
  const file = claudeSettingsPath(orchHome);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

function writeSettings(file: string, settings: unknown): void {
  fs.writeFileSync(file, JSON.stringify(settings));
}

/** orch's compaction value, at the default `workers.compact_at_tokens`. */
const COMPACT_ENV = { CLAUDE_CODE_AUTO_COMPACT_WINDOW: "130000" };

function hooksFor(
  shim: string,
  command: (shim: string, event: string) => string = (s, e) => claudeHookCommand(s, e, "node", orchHome),
): Record<string, unknown> {
  return Object.fromEntries(CLAUDE_HOOK_EVENTS.map((event) => [
    event,
    [{ hooks: [{ type: "command", command: command(shim, event) }] }],
  ]));
}

const sourcePackageRoot = path.join(import.meta.dir, "..");
const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-claude-package-"));
const currentShim = claudeHookShimPath(packageRoot);
fs.mkdirSync(path.dirname(currentShim), { recursive: true });
fs.writeFileSync(path.join(packageRoot, "package.json"), JSON.stringify({ name: "orch-test" }));
fs.writeFileSync(currentShim, "// test shim\n");
const logger = createLogger({ file: path.join(orchHome, "doctor.log"), level: "trace" , proc: "cli"});

function currentSettings() {
  return fileSettingsManager(orchHome).current();
}

afterAll(() => removeTempDir(packageRoot));

afterEach(() => {
  fs.rmSync(claudeSettingsPath(orchHome), { force: true });
  while (directories.length) removeTempDir(directories.pop()!);
});

describe("doctor Claude hooks shim check", () => {
  test("accepts orch hooks pointing at the current shim", () => {
    const file = settingsPath();
    writeSettings(file, { env: COMPACT_ENV, hooks: hooksFor(currentShim) });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "ok" });
    expect(result.detail).toContain("all orch Claude hooks are current");
  });

  test("reports a missing or changed compaction point as stale", () => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(currentShim) });
    expect(diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger)).toMatchObject({ status: "warn" });
    writeSettings(file, { env: { CLAUDE_CODE_AUTO_COMPACT_WINDOW: "200000" }, hooks: hooksFor(currentShim) });
    expect(diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger)).toMatchObject({ status: "warn" });
  });

  test.each(["node", "deno", "bun"] as const)("accepts the %s hook form when %s is the declared runtime", (runtime) => {
    writeSettingsFixture(orchHome, { runtime });
    const file = settingsPath();
    writeSettings(file, { env: COMPACT_ENV, hooks: hooksFor(currentShim, (s, e) => claudeHookCommand(s, e, runtime, orchHome)) });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "ok" });
    writeSettingsFixture(orchHome, { runtime: "node" });
  });

  // The declaration has to be ENFORCED, not merely recorded: accepting a hook enabled under
  // any recognized runtime is what let the declared value drift from reality unnoticed.
  test.each(["deno", "bun"] as const)("reports a %s hook as stale when node is declared", (runtime) => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(currentShim, (s, e) => claudeHookCommand(s, e, runtime, orchHome)) });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch Claude hooks");
  });

  test("warns when orch hooks are missing with setup fix hint", () => {
    const file = settingsPath();
    writeSettings(file, { hooks: {} });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch Claude hooks");
    expect(result.fix?.description).toContain("rewrite orch's Claude settings");
  });

  test("warns on the legacy ungated bun command form", () => {
    const file = settingsPath();
    const legacySource = path.join(sourcePackageRoot, "scripts", "claude-hooks.ts");
    writeSettings(file, { hooks: hooksFor(legacySource, (shim, event) => `bun ${shim} ${event}`) });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch Claude hooks");
  });

  test("warns when hooks point at a stale shim", () => {
    const file = settingsPath();
    writeSettings(file, { hooks: hooksFor(path.join(tempDir(), "old", "claude-hooks.ts")) });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.detail).toContain("missing or stale orch Claude hooks");
  });

  test("warns when orch's settings file is missing and offers a rewrite", () => {
    fs.rmSync(settingsPath(), { force: true });

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "warn" });
    expect(result.fix?.description).toContain("rewrite orch's Claude settings");
    result.fix?.apply();
    expect(JSON.parse(fs.readFileSync(settingsPath(), "utf8"))).toEqual({ env: COMPACT_ENV, hooks: hooksFor(currentShim) });
  });

  test("fails on malformed settings and offers no rewrite that would lose the user's keys", () => {
    const file = settingsPath();
    fs.writeFileSync(file, "{not valid json");

    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);

    expect(result).toMatchObject({ id: "claude-hooks", status: "fail" });
    expect(result.detail).toContain("malformed");
    expect(result.fix).toBeUndefined();
  });

  test("the user's own keys never make the hooks stale, and a rewrite keeps them", () => {
    const file = settingsPath();
    const permissions = { deny: ["Bash(ssh:*)"] };
    const env = { MY_VAR: "kept", ...COMPACT_ENV };
    writeSettings(file, { permissions, env, hooks: hooksFor(currentShim) });
    expect(diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger)).toMatchObject({ status: "ok" });

    writeSettings(file, { permissions, env: { MY_VAR: "kept" }, hooks: {} });
    const result = diagnoseClaudeShim(packageRoot, orchHome, currentSettings(), logger);
    expect(result).toMatchObject({ status: "warn" });
    result.fix?.apply();
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ permissions, env, hooks: hooksFor(currentShim) });
  });
});
