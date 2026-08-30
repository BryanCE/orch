import { ORCH_ENV_VARS } from "../../src/policy/spawner.ts";

export { ORCH_ENV_VARS };

let saved: Record<string, string | undefined> = {};

/** Isolate tests from any orch identity inherited by the test runner. */
export function isolateOrchEnv(): void {
  saved = Object.fromEntries(ORCH_ENV_VARS.map((name) => [name, process.env[name]]));
  for (const name of ORCH_ENV_VARS) delete process.env[name];
}

/** Restore exactly the orch environment that was present before isolation. */
export function restoreOrchEnv(): void {
  for (const name of ORCH_ENV_VARS) {
    const value = saved[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
