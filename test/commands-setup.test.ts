import { afterEach, describe, expect, test } from "bun:test";
import { allAdapters } from "../src/adapters/registry.ts";
import { cmdSetup, readAssignFlag, readValueFlag, resolveActiveDefault, resolveProviderSet, resolveRuntime } from "../src/commands/setup.ts";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_SCHEMA } from "../src/config.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  while (tempDirs.length) {
    const dir = tempDirs.pop()!;
    removeTempDir(dir);
  }
});

describe("commands/setup", () => {
  test("reads value and assignment flags", () => {
    expect(readValueFlag(["--agent", "pi"], "--agent")).toBe("pi");
    expect(readAssignFlag(["--agent=claude"], "--agent")).toBe("claude");
    expect(readValueFlag([], "--agent")).toBeUndefined();
  });
  test("resolves noninteractive provider sets and defaults", async () => {
    expect(await resolveProviderSet("adapter", "--agent", "pi,claude", ["pi", "claude"], false, () => Promise.resolve(null))).toEqual(["pi", "claude"]);
    expect(await resolveActiveDefault(["pi", "claude"], false, false, () => Promise.resolve(null))).toBe("pi");
  });
  test("runs non-interactive setup against the requested ORCH_DIR and records the selected composition", async () => {
    const orchDir = mkdtempSync(join(tmpdir(), "orch-setup-characterization-"));
    tempDirs.push(orchDir);
    process.env.ORCH_DIR = orchDir;
    const adapter = allAdapters().find((candidate) => candidate.id === "pi")!;
    const mutable = adapter as unknown as { warmModels?: () => Promise<void>; listModels?: () => readonly { spec: string }[]; installShim?: () => void; diagnoseShim?: () => never };
    const original = { warmModels: mutable.warmModels, listModels: mutable.listModels, installShim: mutable.installShim, diagnoseShim: mutable.diagnoseShim };
    mutable.warmModels = () => Promise.resolve();
    mutable.listModels = () => [];
    mutable.installShim = () => undefined;
    mutable.diagnoseShim = undefined;
    try {
      await cmdSetup(["--yes", "--no-install", "--no-skills", "--no-smoke", "--agent=pi", "--backend=headless", "--runtime=node"]);
    } finally {
      mutable.warmModels = original.warmModels;
      mutable.listModels = original.listModels;
      mutable.installShim = original.installShim;
      mutable.diagnoseShim = original.diagnoseShim;
    }
    const settings = JSON.parse(readFileSync(join(orchDir, "settings.json"), "utf8")) as { schemaVersion: number; defaults: { adapter?: string; backend?: string }; runtime: string };
    expect(settings).toMatchObject({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", defaults: { adapter: "pi", backend: "headless" } });
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
