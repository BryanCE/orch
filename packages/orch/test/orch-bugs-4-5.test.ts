import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { piAdapter, bridgeExtensionArgv } from "../src/adapters/pi.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { WorkerPolicy } from "../src/types/policy.ts";

const inherited: WorkerPolicy = {
  inheritExtensions: true,
  excludeExtensions: {},
  builtinTools: true,
  allowTools: [],
  compactAtTokens: {},
};

const model = "openrouter/openai/gpt-5.6-luna:high";

describe("orch bugs 4 and 5 launch contracts", () => {
  test("interactive launch routes use one argv composition", () => {
    const opts = { model, workers: inherited };
    expect(piAdapter.interactiveCmd(opts)).toBe(piAdapter.restrictedInteractiveCmd(opts));
    expect(piAdapter.interactiveCmd(opts)).toContain("--no-extensions");
  });

  test("headless launch routes use one argv composition", () => {
    const opts = { model, workers: inherited };
    expect(piAdapter.headlessCmd("work", opts)).toEqual(piAdapter.restrictedHeadlessCmd("work", opts));
  });

  test("inherited extension policy emits every discovered extension", () => {
    const argv = bridgeExtensionArgv("pi", "/tmp/pi-extensions", "pi-bridge", inherited);
    // The bundle path is built for the host that will run the harness, so the
    // separator is the host's. Asserting a literal only describes one OS.
    expect(argv.slice(0, 3)).toEqual(["--no-extensions", "-e", join("/tmp/pi-extensions", "pi-bridge.js")]);
  });

  // One shared list handed a Claude plugin name to pi, and a pi extension name to Claude.
  test("drops only the extensions excluded for this harness", () => {
    const directory = tempOrchDir("orch-pi-extensions-");
    try {
      for (const name of ["hud.ts", "lsp.ts"]) writeFileSync(join(directory, name), "");
      const argv = bridgeExtensionArgv("pi", directory, "pi-bridge", { ...inherited, excludeExtensions: { pi: ["hud"], claude: ["lsp"] } });
      expect(argv).toContain(join(directory, "lsp.ts"));
      expect(argv).not.toContain(join(directory, "hud.ts"));
    } finally {
      removeTempDir(directory);
    }
  });
});
