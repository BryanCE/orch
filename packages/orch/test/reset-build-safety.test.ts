import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

describe("build reset safety", () => {
  test("--build dry-run never names a path inside ORCH_DIR", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-reset-"));
    writeFileSync(join(root, "settings.json"), "custom");
    const result = spawnSync("bun", ["scripts/reset.ts", "--build", "--dry-run"], {
      cwd: process.cwd(),
      env: { ...process.env, ORCH_DIR: root, HOME: root },
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(root);
  });
});
