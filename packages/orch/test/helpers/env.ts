import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ORCH_ENV_VARS } from "../../src/policy/spawner.ts";
import { HARNESS_SESSION_ENV } from "../../src/adapters/session-env.ts";
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

/**
 * Clear every harness session marker except the named harness's, and return the
 * restore.
 *
 * `callerSession` answers for the FIRST adapter whose marker is set, so a marker
 * inherited from the terminal running the suite (CLAUDECODE=1 under Claude Code)
 * decides the answer instead of the session the test set up.
 */
export function isolateHarnessSession(harnessId: keyof typeof HARNESS_SESSION_ENV): () => void {
  const foreign: string[] = [];
  for (const [id, vars] of Object.entries(HARNESS_SESSION_ENV)) {
    if (id === harnessId) continue;
    for (const name of Object.values(vars)) foreign.push(name);
  }
  const saved = foreign.map((name): [string, string | undefined] => [name, process.env[name]]);
  for (const name of foreign) delete process.env[name];
  return (): void => {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
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
