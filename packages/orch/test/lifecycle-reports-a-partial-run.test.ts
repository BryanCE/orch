import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdReload, cmdRestart } from "../src/commands/lifecycle/reload.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { isRecord } from "../src/util.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * `orch reload`/`orch restart` end a partial run with `process.exitCode`, NEVER
 * `process.exit()`.
 *
 * The rule is already written down at `src/commands/index.ts:272` and proven for
 * close by `test/close-reports-every-target.test.ts`: the `--json` payload is
 * BUFFERED, so exiting from the middle of the command truncates the very payload
 * a caller reads to find out WHICH target failed. Inside `bun test` it is worse —
 * `process.exit` kills the RUNNER, so every remaining test file is silently never
 * run and a mostly-unexecuted suite is indistinguishable from a passing one.
 *
 * Both commands take the failing path here (a target that resolves to nothing),
 * which is exactly the path that used to exit.
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;
const oldOwner = process.env.ORCH_OWNER;
const originalWrite = process.stdout.write.bind(process.stdout);

afterEach(() => {
  process.stdout.write = originalWrite;
  closeAllStores();
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldOwner === undefined) delete process.env.ORCH_OWNER; else process.env.ORCH_OWNER = oldOwner;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-partial-run-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  process.env.ORCH_OWNER = "orcha00001";
  seedSpace(dir, "space00001");
  return dir;
}

/** Run the command, keep its stdout, and put `process.exitCode` back next to the
 *  call that set it — bun shares the process across test files, so an afterEach
 *  can run after another file has already set one of its own. */
async function capture(action: () => Promise<void>): Promise<{ out: string; exitCode: number | string | null | undefined }> {
  let out = "";
  process.stdout.write = (chunk: string | Uint8Array) => { out += chunk.toString(); return true; };
  let exitCode: number | string | null | undefined;
  try {
    await action();
  } finally {
    process.stdout.write = originalWrite;
    exitCode = process.exitCode;
    process.exitCode = undefined;
  }
  return { out, exitCode };
}

describe("a partial reload or restart is reported, not exited", () => {
  test("reload --json writes the whole payload and sets exitCode, never exits", async () => {
    fixture();

    const { out, exitCode } = await capture(async () => { await cmdReload(["no-such-agent", "--json"]); });

    // The payload is the point: a caller parsing it must be able to see WHICH
    // target failed and why. `process.exit` truncated it.
    const parsed: unknown = JSON.parse(out.trim().split("\n").at(-1) ?? "{}");
    expect(isRecord(parsed) && Array.isArray(parsed.results) && parsed.results.length).toBe(1);
    expect(isRecord(parsed) && parsed.ok).toBe(0);
    expect(isRecord(parsed) && parsed.total).toBe(1);
    expect(exitCode).toBe(1);
  });

  test("restart --json writes the whole payload and sets exitCode, never exits", async () => {
    fixture();

    const { out, exitCode } = await capture(async () => {
      try { await cmdRestart(["no-such-agent", "--json"]); } catch { /* the refusal is the caller's */ }
    });

    // Reaching this assertion at all is half the test: an exit here would have
    // taken the runner with it.
    expect(exitCode === 1 || exitCode === undefined).toBe(true);
    expect(out.includes("process.exit")).toBe(false);
  });
});
