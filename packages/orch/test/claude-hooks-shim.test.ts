import { execFileSync } from "node:child_process";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { claudeHookShimPath } from "../src/adapters/claude-hooks.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "../src/runtime.ts";
import { binaryOnPath, isRecord } from "../src/util.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { readJsonRecord } from "./helpers/json.ts";

const shim = claudeHookShimPath(path.join(import.meta.dir, ".."));
const shimBuilt = fs.existsSync(shim);
// The shim is bundled standalone and must execute under any DECLARED runtime, so it is exercised
// against every runtime present here. This is a portability check on the shim, not runtime
// selection — nothing in orch picks its runtime by scanning PATH.
const runtimes = ORCH_RUNTIMES.filter(binaryOnPath);

const directories: string[] = [];
const originalAgentKey = process.env[LAUNCH_ENV];

function tempOrchDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-claude-hooks-shim-"));
  directories.push(directory);
  return directory;
}

beforeEach(() => {
  // Every shim invocation states its own key (or its deliberate absence).
  delete process.env[LAUNCH_ENV];
});

afterEach(() => {
  if (originalAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalAgentKey;
  while (directories.length) removeTempDir(directories.pop()!);
});

interface ShimRun {
  status: number;
  stderr: string;
}

interface ExecFailure {
  status?: number;
  stderr?: Buffer | string;
}

function isExecFailure(value: unknown): value is ExecFailure {
  return isRecord(value)
    && (value.status === undefined || typeof value.status === "number")
    && (value.stderr === undefined || typeof value.stderr === "string" || Buffer.isBuffer(value.stderr));
}

/** Run the built shim under one runtime, exactly as the enabled settings.json hook does. */
function runShim(runtime: OrchRuntime, event: string, env: Record<string, string | undefined>): ShimRun {
  const [bin, ...args] = runtime === "deno" ? ["deno", "run", "--allow-all", shim, event] : [runtime, shim, event];
  try {
    execFileSync(bin, args, {
      input: "{}",
      timeout: 25_000,
      env: { ...process.env, [LAUNCH_ENV]: undefined, ...env },
    });
    return { status: 0, stderr: "" };
  } catch (error: unknown) {
    if (!isExecFailure(error)) return { status: -1, stderr: String(error) };
    return { status: error.status ?? -1, stderr: String(error.stderr ?? "") };
  }
}

// Exercises dist/scripts/claude-hooks.js (build: bun run build:hooks) under
// every runtime present on this machine — users may run node, deno, or bun.
describe.skipIf(!shimBuilt)("claude-hooks shim", () => {
  describe.each(runtimes)("under %s", (runtime) => {
    test("exits 0 silently in a non-orch session (no launch env)", () => {
      const result = runShim(runtime, "Stop", { ORCH_DIR: tempOrchDir() });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    }, 30_000);

    // "Loudly" means RECORDED, not stderr. TASKS/13-logging.md slice 4 (pinned by
    // test/no-stderr-writes.test.ts) allows a runtime source exactly two channels:
    // a structured log record for diagnosis, and stdout for what the human asked to
    // see. A wiring error is diagnosis, so it lands in orch.log — asserting it on
    // stderr demanded the one channel the architecture forbids, and the two tests
    // could never be green together.
    test("exits 1 loudly on a present-but-malformed key", () => {
      const directory = tempOrchDir();
      const result = runShim(runtime, "Stop", { [LAUNCH_ENV]: "garbage", ORCH_DIR: directory });

      expect(result.status).toBe(1);
      // Nothing on either output channel: a hook that a harness runs must not print
      // over the harness's own protocol.
      expect(result.stderr).toBe("");
      // The reason is in the log, named and structured, so `orch doctor` and a human
      // reading orch.log both find it.
      const log = fs.readFileSync(path.join(directory, "orch.log"), "utf8");
      expect(log).toContain("launch.invalid-key");
      expect(log).toContain("identity");
    }, 30_000);

    test("writes status.json for a valid key", () => {
      const orchDir = tempOrchDir();
      const key = mintAgentId();
      const result = runShim(runtime, "SessionStart", { [LAUNCH_ENV]: key, ORCH_DIR: orchDir });

      expect(result.status).toBe(0);
      const statusFile = path.join(orchDir, "agents", key, "status.json");
      const status = readJsonRecord(statusFile);
      expect(status.key).toBe(key);
      expect(status.state).toBe("working");
    }, 30_000);
  });
});

test.skipIf(shimBuilt)("claude-hooks shim tests need the dist bundle", () => {
  // Placeholder so a missing build is visible in test output; fix: bun run build:hooks
  expect(shimBuilt).toBe(false);
});
