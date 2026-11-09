import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/shared/agent-id.ts";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { selfIdentityOf } from "../src/identity/self.ts";
import { callerCredential } from "../src/identity/credential.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
beforeEach(() => isolateOrchEnv());
afterEach(() => restoreOrchEnv());

describe("selfIdentityOf", () => {
  test("returns the launch id without touching the store", () => {
    const id = mintAgentId();
    process.env[LAUNCH_ENV] = id;

    const orchDir: OrchDir = tempOrchDir("orch-identity-self-");
    expect(selfIdentityOf(orchDir, callerCredential())).toEqual({ id });
    removeTempDir(orchDir);
  });
});
