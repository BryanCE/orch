import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { wireBinaries } from "../src/daemon/server/setup.ts";
import { parseSetupOptions } from "../src/setup/flags.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { recordComposition, resolveActiveDefault, resolveProviderSet, resolveRuntime, resolveSetupComposition, type SetupProbes } from "../src/setup/composition.ts";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { isRecord } from "../src/util.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const originalOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
const originalHome = process.env.HOME;
const originalPath = process.env.PATH;
const tempDirs: OrchDir[] = [];
const tempHomeDirs: string[] = [];

interface SetupSettings {
  schemaVersion: number;
  defaults: { adapter?: string; backend?: string };
  runtime: string;
}

function parseSetupSettings(value: unknown): SetupSettings {
  if (!isRecord(value) || typeof value.schemaVersion !== "number" || typeof value.runtime !== "string" || !isRecord(value.defaults)) {
    throw new Error("invalid setup settings fixture");
  }
  const adapter = value.defaults.adapter;
  const backend = value.defaults.backend;
  if ((adapter !== undefined && typeof adapter !== "string") || (backend !== undefined && typeof backend !== "string")) {
    throw new Error("invalid setup defaults fixture");
  }
  return { schemaVersion: value.schemaVersion, runtime: value.runtime, defaults: { adapter, backend } };
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  while (tempDirs.length) {
    const dir = tempDirs.pop()!;
    removeTempDir(dir);
  }
  while (tempHomeDirs.length) {
    removeTempDir(tempHomeDirs.pop()!);
  }
});

describe("commands/setup", () => {
  test("reads the setup flags in either spelling, with every --model kept in order", () => {
    const options = parseSetupOptions(parseCommand("setup", ["--harness", "pi", "--plexer=headless", "--model", "pi=a", "--model=claude=b", "-y", "--no-install", "--no-skills"]).flags);
    expect(options.adapterFlag).toBe("pi");
    expect(options.backendFlag).toBe("headless");
    expect(options.modelFlags).toEqual(["pi=a", "claude=b"]);
    expect(options.interactive).toBe(false);
    expect(options.install).toBe(false);
    expect(options.skills).toBe(false);
    const bare = parseSetupOptions(parseCommand("setup", []).flags);
    expect(bare.adapterFlag).toBeUndefined();
    expect(bare.install).toBeUndefined();
  });
  test("resolves noninteractive provider sets and defaults", async () => {
    expect(await resolveProviderSet("adapter", "--harness", "pi,claude", ["pi", "claude"], false, () => Promise.resolve(null))).toEqual(["pi", "claude"]);
    expect(await resolveActiveDefault(["pi", "claude"], false, false, () => Promise.resolve(null))).toBe("pi");
  });
  test("records the composition non-interactive setup resolves, asking orchd only through its probes", async () => {
    const orchDir = tempOrchDir("orch-setup-characterization-");
    tempDirs.push(orchDir);
    writeSettingsFixture(orchDir, {});
    const settings = fileSettingsManager(orchDir);
    const probes: SetupProbes = {
      offers: (harnesses) => Promise.resolve(harnesses.map((id) => ({ id, models: [], suggested: null, compaction: false, error: null }))),
      availablePlexers: () => Promise.resolve(new Set<string>()),
    };
    const options = parseSetupOptions(parseCommand("setup", ["--yes", "--no-install", "--no-skills", "--harness=pi", "--plexer=headless", "--runtime=node"]).flags);
    const composition = await resolveSetupComposition(settings.currentOrNull(), probes, options);
    if (composition === null) throw new Error("non-interactive setup resolved no composition");
    recordComposition(settings, composition.runtime, composition.adapters, composition.defaultAdapter, composition.backends, composition.defaultBackend, composition.models);

    const recorded = parseSetupSettings(JSON.parse(readFileSync(join(orchDir, "settings.json"), "utf8")));
    expect(recorded).toMatchObject({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", defaults: { adapter: "pi", backend: "headless" } });
  });

  test("orchd wires orch's bins into $HOME/.local/bin when none is on PATH", () => {
    // wireBinaries writes real files: $HOME and PATH must be a sandbox or this rewrites the
    // developer's own shims.
    const home = mkdtempSync(join(tmpdir(), "orch-setup-home-"));
    tempHomeDirs.push(home);
    const binDir = join(home, ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const root = mkdtempSync(join(tmpdir(), "orch-setup-package-"));
    tempHomeDirs.push(root);
    const packageBinDir = join(root, "dist", "bin");
    mkdirSync(packageBinDir, { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "orch-test" }));
    writeFileSync(join(packageBinDir, "orch.js"), "");
    writeFileSync(join(packageBinDir, "orch-ding.js"), "");
    process.env.HOME = home;
    process.env.PATH = binDir;
    const lines: string[] = [];
    wireBinaries(root, false, (line) => { lines.push(line); });
    expect(lines[0]).toBe("bins:");
    // Where a symlink is refused this wires the bins by copy, which is real IO.
    expect(readdirSync(binDir).sort()).toEqual(["orch", "orch-ding"]);
  });

  test("resolves the runtime from the flag or the no-preference value, never from PATH", async () => {
    expect(await resolveRuntime("deno", false)).toBe("deno");
    expect(await resolveRuntime("bun", false)).toBe("bun");
    // No flag and nothing to prompt on expresses no preference, which records node.
    expect(await resolveRuntime(undefined, false)).toBe("node");
    // Interactive defers entirely to the selection; bun is never chosen on the operator's behalf.
    expect(await resolveRuntime(undefined, true, () => Promise.resolve(null))).toBeNull();
    expect(await resolveRuntime(undefined, true, () => Promise.resolve("bun"))).toBe("bun");
  });

});
