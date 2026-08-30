import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { isLogRecord } from "../src/log.ts";
import { ACK_FILE } from "../src/presence/schema.ts";
import { presenceAgentDir } from "../src/presence/writer.ts";
import { provenDaemonPid } from "../src/daemon/lifecycle.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { LogRecord } from "../src/types/core.ts";

const directories: string[] = [];
const discoveries = new Map<string, string>();

function fixture(): { orchDir: string; target: string } {
  const discovery = mkdtempSync(join(tmpdir(), "orch-correlation-discovery-"));
  const orchDir = mkdtempSync(join(tmpdir(), "orch-correlation-dir-"));
  directories.push(discovery, orchDir);
  discoveries.set(orchDir, discovery);
  writeSettingsFixture(orchDir, { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi" } });
  // A1: the target IS the minted id. Nothing about where the agent runs is
  // spelled into it, and its harness is a fact of the agent row.
  const target = "corr01agnt";
  // A real presence dir with a live pid: the inbox channel refuses delivery to an
  // agent whose bridge is not running, so a dead fixture never reaches the outbox.
  seedStatus(orchDir, target, { agent: "pi", paneId: target, pid: process.pid, state: "idle", name: "corr" });
  ensureHarness(orchDir, "pi", "pi", Date.now());
  insertAgent(orchDir, { id: target, name: "corr", spawnedBy: null, harnessId: "pi", cwd: orchDir, createdAt: Date.now() });
  return { orchDir, target };
}

/** Run the real CLI against a real orchd: correlation that only holds in-process
 *  is not correlation, because the CLI and the daemon are different processes. */
function runOrch(orchDir: string, ...args: string[]): string {
  // Strip the developer's own plexer out of the fixture: a live herdr socket puts
  // real panes in the entity pool and makes the fixture's own space unreachable.
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (name.startsWith("HERDR_")) delete env[name];
  const ran = Bun.spawnSync([process.execPath, join(import.meta.dir, "../bin/orch.ts"), ...args], {
    env: {
      ...env,
      ORCH_DIR: orchDir,
      ORCH_LOG_LEVEL: "debug",
      ORCHD_ENTRYPOINT: join(import.meta.dir, "../src/daemon/orchd.ts"),
      ORCH_DAEMON_DISCOVERY_DIR: discoveries.get(orchDir),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
  return ran.stdout.toString();
}

function readRecords(orchDir: string): LogRecord[] {
  const out: LogRecord[] = [];
  for (const name of ["orch.log", "orchd.log"]) {
    const file = join(orchDir, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const parsed: unknown = JSON.parse(line);
      if (isLogRecord(parsed)) out.push(parsed);
    }
  }
  return out;
}

function hasDispatchId(value: unknown): value is { id: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const id: unknown = Reflect.get(value, "id");
  return typeof id === "string" && id.length > 0;
}

function dispatchIdFrom(stdout: string): string {
  const parsed: unknown = JSON.parse(stdout.trim().split("\n").filter(Boolean).at(-1) ?? "");
  if (!hasDispatchId(parsed)) throw new Error(`no dispatch id in output: ${stdout}`);
  return parsed.id;
}

async function stopDaemon(orchDir: string): Promise<void> {
  const pid = provenDaemonPid(orchDir);
  if (pid === undefined || pid === process.pid) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

afterEach(async () => {
  while (directories.length) {
    const directory = directories.pop()!;
    await stopDaemon(directory);
    removeTempDir(directory);
    discoveries.delete(directory);
  }
});

describe("dispatch correlation", () => {
  test("one dispatch id produces the whole life of that dispatch", () => {
    const { orchDir, target } = fixture();

    const first = dispatchIdFrom(runOrch(orchDir, "dispatch", target, "do the thing", "--cross-space", "--json"));

    // Stand in for the harness bridge: the agent appends its marker to ack.jsonl
    // once it has actually read the inbox line. Nothing else settles an inbox row.
    appendFileSync(join(presenceAgentDir(target, orchDir), ACK_FILE), `${JSON.stringify({ id: first, key: target })}\n`);
    // The daemon consumes acks on its next drain, which a second write triggers.
    runOrch(orchDir, "dispatch", target, "and again", "--cross-space", "--json");

    const life = readRecords(orchDir).filter((record) => record.correlationId === first);
    const events = life.map((record) => record.event);
    expect(events).toContain("dispatch.cli-accepted");
    expect(events).toContain("lease.granted");
    expect(events).toContain("dispatch.accepted");
    expect(events).toContain("dispatch.queued");
    expect(events).toContain("dispatch.delivering");
    expect(events).toContain("dispatch.awaiting-ack");
    expect(events).toContain("dispatch.acked");
    // The grep test itself: every record naming this dispatch names its target too,
    // so one id is enough to reconstruct the path without a second lookup.
    expect(life.every((record) => record.fields?.target === target)).toBe(true);
  }, 60_000);
});
