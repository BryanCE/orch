/** Environment variables that carry orch identity, scope, and launch context. */
export const ORCH_ENV_VARS = [
  "ORCH_DIR", "ORCH_AGENT_KEY", "ORCH_OWNER", "ORCH_SESSION_KEY", "ORCH_PROJECT",
  "ORCH_AGENT_NAME", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL", "ORCH_SPACE", "ORCH_HARNESS",
] as const;

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
