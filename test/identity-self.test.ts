import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { selfIdentity } from "../src/identity/self.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
beforeEach(() => isolateOrchEnv());
afterEach(() => restoreOrchEnv());

describe("selfIdentity", () => {
  test("returns the launch id without touching the store", () => {
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;

    expect(selfIdentity()).toEqual({ id });
  });
});
