import { describe, expect, mock, test } from "bun:test";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "orch-missing-bundle-"));
const missingBundle = join(tempRoot, "dist", "extensions", "pi-bridge.js");

void mock.module("../src/extensions/bundles.ts", () => ({
  EXTENSION_NAMES: ["pi-bridge", "omp-bridge"],
  RETIRED_EXTENSION_NAMES: [],
  extensionBundlePath: () => missingBundle,
}));

const { diagnoseExtensionLink, installExtensionLink } = await import("../src/adapters/pi.ts");

describe("adapter bundle installation", () => {
  test("reports a missing shipped bundle as a structured diagnosis", () => {
    const diagnosis = diagnoseExtensionLink("pi", join(tempRoot, "pi", "extensions"), "pi-bridge");
    expect(diagnosis).toMatchObject({ status: "warn", detail: expect.stringContaining("run the user's build: bun run build:dev") });
  });

  test("diagnoses a missing shipped bundle without writing", () => {
    const extensionDir = join(tempRoot, "pi", "extensions");
    expect(() => installExtensionLink("pi", extensionDir, "pi-bridge")).toThrow(
      "fix: run the user's build: bun run build:dev",
    );
    expect(readdirSync(tempRoot, { recursive: true })).toEqual([]);
    expect(() => readdirSync(extensionDir)).toThrow();
  });
});
