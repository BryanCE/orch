import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { launchCredential, LAUNCH_ENV } from "../src/identity/launch.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

beforeEach(() => isolateOrchEnv());
afterEach(() => {
  restoreOrchEnv();
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

describe("launchCredential", () => {
  test("returns null when the launch environment is unset", () => {
    expect(launchCredential()).toBeNull();
  });

  test("returns a minted id", () => {
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;
    expect(launchCredential()).toBe(id);
  });

  test("malformed value exits 1 and logs launch.invalid-key", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-identity-launch-"));
    directories.push(directory);
    const script = `import { launchCredential } from './src/identity/launch.ts'; launchCredential();`;
    const result = spawnSync(process.execPath, ["-e", script], {
      cwd: process.cwd(),
      env: { ...process.env, [LAUNCH_ENV]: "malformed", ORCH_DIR: directory },
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(readFileSync(join(directory, "orch.log"), "utf8")).toContain("launch.invalid-key");
  });
});
