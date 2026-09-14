import type { OrchDir } from "../src/types/core.ts";
import { tempOrchDir } from "./helpers/tempdir.ts";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { removeTempDir } from "./helpers/tempdir.ts";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Services } from "../src/types/services.ts";
import { createServices } from "../src/services.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedOperator } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";

const bundleDir = mkdtempSync(join(tmpdir(), "orch-reload-bundles-"));
afterAll(() => { removeTempDir(bundleDir); });
const bundleNames = ["pi-bridge", "omp-bridge"] as const;
const bundlePaths = bundleNames.map((name) => join(bundleDir, `${name}.js`));
bundlePaths.forEach((file) => writeFileSync(file, `installed-${file}\n`));

// Keep the test isolated from the checkout's real installed bundles. The old
// reload path still invokes this mocked builder, which deliberately overwrites
// these fixture files and makes the RED assertion fail.
void mock.module("../src/bridge-bundles/build.ts", () => ({
  EXTENSION_NAMES: bundleNames,
  buildExtensionBundle: (_root: string, name: string) => {
    const file = join(bundleDir, `${name}.js`);
    writeFileSync(file, `rebuilt-${Date.now()}\n`);
    return file;
  },
  extensionBundlePath: (_root: string, name: string) => join(bundleDir, `${name}.js`),
}));

let cmdReload: (services: Services, args: string[]) => Promise<void>;
beforeAll(async () => {
  ({ cmdReload } = await import("../src/commands/lifecycle/reload.ts"));
});

const dirs: OrchDir[] = [];

// The runner is the operator: `--all` on a drive verb is operator-only, and an
// operator is a registered parent process, nothing else (Rule 19).
beforeEach(isolateOrchEnv);

// Point ORCH_DIR away first: a later reader of a stale ORCH_DIR recreates whatever it names.
afterEach(() => {
  restoreOrchEnv();
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

describe("reload", () => {
  test("does not write installed extension bundles", async () => {
    const before = bundlePaths.map((file) => ({ bytes: readFileSync(file), mtimeMs: statSync(file).mtimeMs }));
    const orchDir = tempOrchDir("orch-reload-");
    dirs.push(orchDir);
    process.env.ORCH_DIR = orchDir;
    writeSettingsFixture(orchDir, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless" } });
    seedOperator(orchDir);

    await cmdReload(createServices({ orchDir }), ["--all", "--json"]);

    bundlePaths.forEach((file, index) => {
      expect(readFileSync(file)).toEqual(before[index]!.bytes);
      expect(statSync(file).mtimeMs).toBe(before[index]!.mtimeMs);
    });
  });
});
