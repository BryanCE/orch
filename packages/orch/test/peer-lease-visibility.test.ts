import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatPeerLines, peerSummaries } from "../src/agent/peers.ts";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { sql } from "drizzle-orm";

const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env[LAUNCH_ENV];
const originalSpawner = process.env.ORCH_SPAWNER;
const directories: string[] = [];

afterEach(() => {
  closeAllStores();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalAgentKey;
  if (originalSpawner === undefined) delete process.env.ORCH_SPAWNER;
  else process.env.ORCH_SPAWNER = originalSpawner;
  while (directories.length > 0) removeTempDir(directories.pop()!);
});

// A presence directory is named by the agent's minted id, and that id is the
// whole key: the row it addresses is found by the key itself, not by
// a segment split out of a `<plexer>~<grouping>~<id>` string.
const CALLER = "caller0001";
const HELD = "held000002";
const LOOSE = "loose00003";
const ORPHAN = "orphan0004";
const DEAD_ORCH = "deadorch01";

/** The caller holds HELD; LOOSE was never leased; ORPHAN's holder is a dead
 *  orch. Three lease facts, one fixture. */
function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-peer-lease-"));
  directories.push(directory);
  process.env.ORCH_DIR = directory;
  delete process.env[LAUNCH_ENV];
  delete process.env.ORCH_SPAWNER;

  ensureHarness(directory, "pi", "Pi", 1);
  const db = orm(directory);
  db.run(sql`INSERT INTO hosts(id,name,os,created_at) VALUES ('host','host','linux',1)`);
  for (const id of [CALLER, HELD, LOOSE, ORPHAN, DEAD_ORCH]) {
    insertAgent(directory, { id, harnessId: "pi", cwd: "/tmp", name: id, createdAt: 1 });
  }
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  db.run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${CALLER},${1},${"host"},${process.pid},${token})`);
  acquireLease(directory, HELD, CALLER, 2);
  acquireLease(directory, ORPHAN, DEAD_ORCH, 2);

  seedStatus(directory, HELD, { agent: "pi", label: "held-1", pid: process.pid, state: "working" });
  seedStatus(directory, LOOSE, { agent: "pi", label: "loose-1", pid: process.pid, state: "idle" });
  seedStatus(directory, ORPHAN, { agent: "pi", label: "orphan-1", pid: process.pid, state: "idle" });
  return directory;
}

function summaryFor(label: string) {
  return peerSummaries(CALLER).find((peer) => peer.name === label);
}

// F6 + G9: the compact listing is what agents actually read. Without the lease
// on it, an unleased agent reads as ordinary live work belonging to the caller.
describe("peer summaries carry ownership as a lease", () => {
  test("a peer the caller holds reports the caller as the live holder", () => {
    fixture();
    expect(summaryFor("held-1")?.drive).toEqual({ kind: "leased", owner: CALLER, mine: true });
  });

  test("a peer nobody ever took reports no orch driving it", () => {
    fixture();
    expect(summaryFor("loose-1")?.drive).toEqual({ kind: "unleased", owner: "no orch driving it", mine: false });
  });

  test("a dead holder is not a live one", () => {
    fixture();
    expect(summaryFor("orphan-1")?.drive).toEqual({ kind: "unleased", owner: "no orch driving it (holder gone)", mine: false });
  });
});

describe("the compact listing separates orphans from live work", () => {
  test("unleased peers sit in their own bucket, below the driven ones", () => {
    fixture();
    const lines = formatPeerLines(peerSummaries(CALLER)).split("\n");
    const heading = lines.findIndex((line) => line.startsWith("unleased"));
    expect(heading).toBeGreaterThan(0);

    const driven = lines.slice(0, heading).join("\n");
    const orphans = lines.slice(heading + 1).join("\n");
    expect(driven).toContain("held-1");
    expect(driven).not.toContain("loose-1");
    expect(driven).not.toContain("orphan-1");
    expect(orphans).toContain("loose-1");
    expect(orphans).toContain("orphan-1");
  });

  test("a held peer names its holder, and an unleased one never reads as yours", () => {
    fixture();
    const output = formatPeerLines(peerSummaries(CALLER));
    const line = (label: string) => output.split("\n").find((row) => row.startsWith(label)) ?? "";
    expect(line("held-1")).toContain("held by you");
    expect(line("loose-1")).toContain("no orch driving it");
    expect(line("loose-1")).not.toContain("held by");
    expect(line("orphan-1")).toContain("holder gone");
  });

  test("with nothing unleased the bucket does not appear at all", () => {
    fixture();
    const held = peerSummaries(CALLER).filter((peer) => peer.drive.kind === "leased");
    expect(held.length).toBe(1);
    expect(formatPeerLines(held)).not.toContain("unleased");
  });
});
