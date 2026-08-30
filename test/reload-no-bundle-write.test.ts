import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bundleDir = mkdtempSync(join(tmpdir(), "orch-reload-bundles-"));
const bundleNames = ["pi-bridge", "omp-bridge"] as const;
const bundlePaths = bundleNames.map((name) => join(bundleDir, `${name}.js`));
bundlePaths.forEach((file) => writeFileSync(file, `installed-${file}\n`));

// Keep the test isolated from the checkout's real installed bundles. The old
// reload path still invokes this mocked builder, which deliberately overwrites
// these fixture files and makes the RED assertion fail.
void mock.module("../src/bridge-bundle.ts", () => ({
  EXTENSION_NAMES: bundleNames,
  buildExtensionBundle: (_root: string, name: string) => {
    const file = join(bundleDir, `${name}.js`);
    writeFileSync(file, `rebuilt-${Date.now()}\n`);
    return file;
  },
  extensionBundlePath: (_root: string, name: string) => join(bundleDir, `${name}.js`),
}));

let cmdReload: (args: string[]) => Promise<void>;
beforeAll(async () => {
  ({ cmdReload } = await import("../src/commands/lifecycle.ts"));
});

const originalOrchDir = process.env.ORCH_DIR;
const originalOwner = process.env.ORCH_OWNER;
beforeEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalOwner === undefined) delete process.env.ORCH_OWNER;
  else process.env.ORCH_OWNER = originalOwner;
});

describe("reload", () => {
  test("does not write installed extension bundles", async () => {
    const before = bundlePaths.map((file) => ({ bytes: readFileSync(file), mtimeMs: statSync(file).mtimeMs }));
    const tempOrchDir = mkdtempSync(join(tmpdir(), "orch-reload-"));
    process.env.ORCH_DIR = tempOrchDir;
    process.env.ORCH_OWNER = "test-owner";

    try {
      await cmdReload(["--all", "--json"]);
    } finally {
      rmSync(tempOrchDir, { recursive: true, force: true });
    }

    bundlePaths.forEach((file, index) => {
      expect(readFileSync(file)).toEqual(before[index]!.bytes);
      expect(statSync(file).mtimeMs).toBe(before[index]!.mtimeMs);
    });
  });
});
