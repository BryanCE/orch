import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { endpointPaths } from "../src/daemon/client/wire.ts";
import { sessionClaim } from "../src/daemon/client/registration.ts";
import { OPERATOR_HARNESS_ID } from "../src/identity/operator.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

/**
 * A session row is filed under ONE process, and it must be the session's own.
 * pi marks every child process with PI_CODING_AGENT but names the session only to
 * its bash tool, so a marked process with no session id or pid is not the
 * session. Filing it under its parent handed a pi identity to a plain bash shell.
 */

const dirs: OrchDir[] = [];

beforeEach(() => { isolateOrchEnv(); });
afterEach(() => {
  restoreOrchEnv();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function claimDir(): OrchDir {
  const directory = tempOrchDir("orch-session-claim-");
  dirs.push(directory);
  const token = endpointPaths(directory).token;
  mkdirSync(dirname(token), { recursive: true });
  writeFileSync(token, "test-token", { mode: 0o600 });
  return directory;
}

describe("a session claim names the session's own process", () => {
  test("a plain shell registers as the human under its own process", () => {
    const claim = sessionClaim(claimDir());
    expect(claim.harness).toBe(OPERATOR_HARNESS_ID);
    expect(claim.pid).toBe(process.ppid);
  });

  test("a harness marker with no session id and no pid is refused", () => {
    process.env.PI_CODING_AGENT = "true";
    expect(() => sessionClaim(claimDir())).toThrow("pi session exported no session id and no session pid");
  });

  test("a bridge inside the harness registers the harness process itself", () => {
    process.env.PI_CODING_AGENT = "true";
    const claim = sessionClaim(claimDir(), undefined, { harness: "pi", sessionToken: undefined, pid: process.pid });
    expect(claim.harness).toBe("pi");
    expect(claim.pid).toBe(process.pid);
  });
});
