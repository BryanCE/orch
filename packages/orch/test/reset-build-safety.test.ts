import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir } from "./helpers/tempdir.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop() ?? "");
});

describe("build reset safety", () => {
  test("--build dry-run never names a path inside ORCH_DIR", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-reset-"));
    dirs.push(root);
    writeFileSync(join(root, "settings.json"), "custom");
    const result = spawnSync("bun", ["scripts/reset.ts", "--build", "--dry-run"], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, ORCH_DIR: root, HOME: root },
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(root);
  }, 30_000);
});
