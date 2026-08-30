import { afterEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { callerKind } from "../src/policy/caller.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";

afterEach(() => restoreOrchEnv());

describe("caller kind", () => {
  test("no launch credential is human", () => {
    isolateOrchEnv();
    expect(callerKind()).toBe("human");
  });

  test("a launch credential is agent", () => {
    isolateOrchEnv();
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;
    expect(callerKind()).toBe("agent");
  });
});
