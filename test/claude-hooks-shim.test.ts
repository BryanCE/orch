import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { claudeHookShimPath } from "../src/adapters/claude-hooks.ts";
import { ORCH_RUNTIMES, type OrchRuntime } from "../src/runtime.ts";
import { binaryOnPath } from "../src/util.ts";

const shim = claudeHookShimPath(process.cwd());
const shimBuilt = fs.existsSync(shim);
// The shim is bundled standalone and must execute under any DECLARED runtime, so it is exercised
// against every runtime present here. This is a portability check on the shim, not runtime
// selection — nothing in orch picks its runtime by scanning PATH.
const runtimes = ORCH_RUNTIMES.filter(binaryOnPath);

const directories: string[] = [];

function tempOrchDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-claude-hooks-shim-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

interface ShimRun {
  status: number;
  stderr: string;
}

/** Run the built shim under one runtime, exactly as the installed settings.json hook does. */
function runShim(runtime: OrchRuntime, event: string, env: Record<string, string | undefined>): ShimRun {
  const [bin, ...args] = runtime === "deno" ? ["deno", "run", "--allow-all", shim, event] : [runtime, shim, event];
  try {
    execFileSync(bin, args, {
      input: "{}",
      timeout: 25_000,
      env: { ...process.env, ORCH_AGENT_KEY: undefined, ...env },
    });
    return { status: 0, stderr: "" };
  } catch (error: unknown) {
    const failure = error as { status?: number; stderr?: Buffer | string };
    return { status: failure.status ?? -1, stderr: String(failure.stderr ?? "") };
  }
}

// Exercises dist/scripts/claude-hooks.js (build: bun run build:hooks) under
// every runtime present on this machine — users may run node, deno, or bun.
describe.skipIf(!shimBuilt)("claude-hooks shim", () => {
  describe.each(runtimes)("under %s", (runtime) => {
    test("exits 0 silently in a non-orch session (no ORCH_AGENT_KEY)", () => {
      const result = runShim(runtime, "Stop", { ORCH_DIR: tempOrchDir() });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    }, 30_000);

    test("exits 1 loudly on a present-but-malformed key", () => {
      const result = runShim(runtime, "Stop", { ORCH_AGENT_KEY: "garbage", ORCH_DIR: tempOrchDir() });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("identity");
    }, 30_000);

    test("writes status.json for a valid key", () => {
      const orchDir = tempOrchDir();
      const result = runShim(runtime, "SessionStart", { ORCH_AGENT_KEY: "herdr~wTest~p1", ORCH_DIR: orchDir });

      expect(result.status).toBe(0);
      const statusFile = path.join(orchDir, "agents", "herdr~wTest~p1", "status.json");
      const status = JSON.parse(fs.readFileSync(statusFile, "utf8")) as Record<string, unknown>;
      expect(status.key).toBe("herdr~wTest~p1");
      expect(status.state).toBe("working");
    }, 30_000);
  });
});

test.skipIf(shimBuilt)("claude-hooks shim tests need the dist bundle", () => {
  // Placeholder so a missing build is visible in test output; fix: bun run build:hooks
  expect(shimBuilt).toBe(false);
});
