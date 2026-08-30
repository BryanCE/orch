import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { selfIdentity } from "../src/identity/self.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

beforeEach(() => isolateOrchEnv());
afterEach(() => {
  restoreOrchEnv();
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

describe("selfIdentity", () => {
  test("returns the launch id without touching the store", () => {
    const directory = mkdtempSync(join(tmpdir(), "orch-identity-self-"));
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;

    expect(selfIdentity()).toEqual({ id });
  });
});
