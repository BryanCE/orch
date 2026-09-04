import { afterEach, describe, expect, test } from "bun:test";
import { allAdapters } from "../src/adapters/registry.ts";
import { cmdSetup } from "../src/commands/setup.ts";
import { readAssignFlag, readValueFlag } from "../src/setup/flags.ts";
import { resolveActiveDefault, resolveProviderSet, resolveRuntime } from "../src/setup/composition.ts";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { AgentAdapter } from "../src/types/adapter.ts";
import { isRecord } from "../src/util.ts";

const originalOrchDir = process.env.ORCH_DIR;
const originalHome = process.env.HOME;
const originalPath = process.env.PATH;
const tempDirs: string[] = [];

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
    // cmdSetup wires the bins for real, into $HOME/.local/bin or over whatever they already
    // resolve to on PATH. Both must be a sandbox or this rewrites the developer's own shims.
    const home = mkdtempSync(join(tmpdir(), "orch-setup-home-"));
    tempDirs.push(home);
    const binDir = join(home, ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    process.env.HOME = home;
    process.env.PATH = binDir;
    const adapter = allAdapters().find((candidate) => candidate.id === "pi");
    if (adapter === undefined) throw new Error("pi adapter is not registered");
    const original = { modelWarm: adapter.modelWarm, models: adapter.models, shim: adapter.shim };
    const replacements = {
      modelWarm: { warmModels: (): Promise<void> => Promise.resolve() },
      models: { listModels: (): readonly { spec: string }[] => [] },
      shim: {
        installShim: (): void => undefined,
        diagnoseShim: (): { id: string; label: string; status: "skip"; detail: string } => ({
          id: "pi-extensions", label: "pi extensions", status: "skip", detail: "pi integration shim disabled",
        }),
      },
    } satisfies Pick<AgentAdapter, "modelWarm" | "models" | "shim">;
    Object.defineProperties(adapter, {
      modelWarm: { value: replacements.modelWarm, configurable: true, enumerable: true, writable: true },
      models: { value: replacements.models, configurable: true, enumerable: true, writable: true },
      shim: { value: replacements.shim, configurable: true, enumerable: true, writable: true },
    });
    try {
      await cmdSetup(["--yes", "--no-install", "--no-skills", "--no-smoke", "--agent=pi", "--backend=headless", "--runtime=node"]);
    } finally {
      Object.defineProperties(adapter, {
        modelWarm: { value: original.modelWarm, configurable: true, enumerable: true, writable: true },
        models: { value: original.models, configurable: true, enumerable: true, writable: true },
        shim: { value: original.shim, configurable: true, enumerable: true, writable: true },
      });
    }
    const settings = parseSetupSettings(JSON.parse(readFileSync(join(orchDir, "settings.json"), "utf8")));

    expect(settings).toMatchObject({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", defaults: { adapter: "pi", backend: "headless" } });
    expect(readdirSync(binDir).sort()).toEqual(["orch", "orch-ding", "pif"]);
    // Where a symlink is refused this wires the bins by copy, which is real IO.
  }, 30_000);

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
