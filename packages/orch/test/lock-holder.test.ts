import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { holderName } from "../src/commands/lock.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
// The holder falls back to the store when no launch credential is present; isolateOrchEnv
// points it at an empty ORCH_DIR, never the machine's.
beforeEach(() => isolateOrchEnv());
afterEach(() => restoreOrchEnv());

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
