import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { holderName } from "../src/commands/lock.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

// The holder falls back to the store when no launch credential is present, so
// the store must be one this test owns: an empty ORCH_DIR, never the machine's.
beforeEach(() => {
  isolateOrchEnv();
  const directory = mkdtempSync(join(tmpdir(), "orch-lock-holder-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
});
afterEach(() => {
  restoreOrchEnv();
  while (directories.length > 0) removeTempDir(directories.pop() ?? "");
});

describe("command lock holder", () => {
  test("uses the registered agent id", () => {
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;
    expect(holderName()).toBe(id);
  });

  test("uses the process user fallback when unregistered", () => {
    expect(holderName()).toBe(`user:${process.pid}`);
  });
});
