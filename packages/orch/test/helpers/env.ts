import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ORCH_ENV_VARS } from "../../src/policy/spawner.ts";
import { removeTempDir } from "./tempdir.ts";

export { ORCH_ENV_VARS };

let saved: Record<string, string | undefined> = {};
let isolatedDir: string | undefined;

/** Isolate tests from any orch identity inherited by the test runner. */
export function isolateOrchEnv(): void {
  saved = Object.fromEntries(ORCH_ENV_VARS.map((name) => [name, process.env[name]]));
  for (const name of ORCH_ENV_VARS) delete process.env[name];
  isolatedDir = mkdtempSync(join(tmpdir(), "orch-isolated-env-"));
  process.env.ORCH_DIR = isolatedDir;
}

/** Restore exactly the orch environment that was present before isolation. */
export function restoreOrchEnv(): void {
  for (const name of ORCH_ENV_VARS) {
    const value = saved[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  if (isolatedDir !== undefined) {
    removeTempDir(isolatedDir);
    isolatedDir = undefined;
  }
}
