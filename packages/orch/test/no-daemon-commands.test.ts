import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

import { row } from "./helpers/rows.ts";
/**
 * No-daemon commands (`setup`, `doctor`, `help`, `version`, `status --offline`)
 * need no identity because they NEVER WRITE.
 *
 * The claim is load-bearing in both directions. If one of them writes, it needs
 * to know who is writing and the exemption is wrong. If one of them starts a
 * daemon to find that out, then `orch help` on a broken install hangs or fails
 * on the daemon rather than printing help — which is exactly when a user needs
 * it to work.
 */

const binPath = join(import.meta.dir, "../bin/orch.ts");
const dirs: string[] = [];

afterEach(() => {
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-no-daemon-"));
  dirs.push(directory);
  return directory;
}

function runCli(directory: string, args: string[]): { status: number | null; output: string } {
  const result = Bun.spawnSync([process.execPath, binPath, ...args], {
    env: { ...process.env, ORCH_DIR: directory },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  });
  return { status: result.exitCode, output: `${result.stdout.toString()}\n${result.stderr.toString()}` };
}

/** Every agent orch has a record of. An identity was needed iff one appeared. */
function agentCount(directory: string): number {
  if (!existsSync(join(directory, "orch.db"))) return 0;
  const found = row(orm(directory), sql`SELECT COUNT(*) AS n FROM agents`);
  return typeof found === "object" && found !== null && "n" in found && typeof found.n === "number" ? found.n : -1;
}

/** The daemon's runtime files. Their absence is how we know none was started. */
function daemonArtifacts(directory: string): string[] {
  const runtime = join(directory, "run");
  if (!existsSync(runtime)) return [];
  return readdirSync(runtime).filter((entry) => entry.startsWith("daemon"));
}

const NO_DAEMON_COMMANDS: readonly (readonly string[])[] = [
  ["help"],
  ["version"],
  ["status", "--offline"],
  ["doctor"],
];

describe("commands that need no daemon need no identity", () => {
  for (const args of NO_DAEMON_COMMANDS) {
    test(`orch ${args.join(" ")} registers no agent and starts no daemon`, () => {
      const directory = tempOrchDir();
      const before = agentCount(directory);
      closeAllStores();

      const result = runCli(directory, [...args]);

      // It produced its answer rather than dying. Scanning the text for the
      // word "daemon" is not the check: `help` documents `orch daemon`, and
      // `doctor` REPORTS on orchd, which is its job. What the row claims is
      // structural, and the two assertions below are exactly it.
      expect(result.output.trim().length).toBeGreaterThan(0);
      closeAllStores();
      // No identity was minted, because nothing was written that needed one.
      expect(agentCount(directory)).toBe(before);
      expect(daemonArtifacts(directory)).toEqual([]);
      // The sharp form of the row's claim: these commands never write, so the
      // store is not merely empty of agents — it was never created.
      expect(existsSync(join(directory, "orch.db"))).toBe(false);
      // Each case spawns a real CLI; Windows process startup alone can outrun
      // the 5s default, and a slow host is not the failure under test.
    }, 30_000);
  }

  test("help works before setup has ever run, which is when it is needed most", () => {
    const directory = tempOrchDir();
    const result = runCli(directory, ["help"]);
    expect(result.status).toBe(0);
    expect(result.output).toContain("orch");
  });
});
