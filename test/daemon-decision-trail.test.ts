import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLease } from "../src/store/lease-rows.ts";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { processStartToken } from "../src/process-identity.ts";
import { governWrite, deliverWrite } from "../src/daemon/orchd.ts";
import { isLogRecord } from "../src/log.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { LogRecord } from "../src/types/core.ts";
import { sql } from "drizzle-orm";

const dirs: string[] = [];
const previousLogLevel = process.env.ORCH_LOG_LEVEL;
const previousOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  if (previousLogLevel === undefined) delete process.env.ORCH_LOG_LEVEL;
  else process.env.ORCH_LOG_LEVEL = previousLogLevel;
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-decision-trail-"));
  dirs.push(directory);
  process.env.ORCH_LOG_LEVEL = "debug";
  process.env.ORCH_DIR = directory;
  ensureHarness(directory, "pi", "Pi");
  ensureHost(directory, "host", "Host", "linux", 1);
  return directory;
}

function agent(directory: string, id: string): void {
  insertAgent(directory, { id, spawnedBy: null, harnessId: "pi", cwd: "/repo", name: id, createdAt: 1 });
}

function records(directory: string): LogRecord[] {
  const lines = readFileSync(join(directory, "orchd.log"), "utf8").trim().split("\n");
  return lines.map((line) => {
    const parsed: unknown = JSON.parse(line);
    expect(isLogRecord(parsed)).toBe(true);
    if (!isLogRecord(parsed)) throw new Error("invalid log record");
    return parsed;
  });
}

describe("daemon decision trail", () => {
  test("records a lease refused against a live holder", () => {
    const directory = fixture();
    agent(directory, "target");
    agent(directory, "live-holder");
    acquireLease(directory, "target", "live-holder", 2);
    const token = processStartToken(process.pid);
    orm(directory).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${"live-holder"},${2},${"host"},${process.pid},${token})`);

    expect(() => governWrite(directory, "target", { actor: "caller", target: "target", text: "hello" })).toThrow(/leased by/);

    const [record] = records(directory);
    if (record === undefined) throw new Error("missing lease refusal record");
    expect(Number.isFinite(record.at)).toBe(true);
    expect(record).toEqual({
      at: record.at,
      level: "debug",
      event: "lease.refused",
      agentId: "target",
      // `steal` is on the record because a refusal must say whether the caller
      // even asked to take the holding: a refusal to a caller who never asked and
      // a refusal to one who did are different decisions to read back later.
      fields: { target: "target", holderId: "live-holder", holderAlive: true, steal: false },
    });
  });

  test("records a lease granted over a dead holder", () => {
    const directory = fixture();
    agent(directory, "target");
    agent(directory, "dead-holder");
    acquireLease(directory, "target", "dead-holder", 2);

    expect(() => governWrite(directory, "target", { actor: "caller", target: "target", text: "hello" })).not.toThrow();

    const [record] = records(directory);
    if (record === undefined) throw new Error("missing lease grant record");
    expect(Number.isFinite(record.at)).toBe(true);
    expect(record).toEqual({
      at: record.at,
      level: "debug",
      event: "lease.granted",
      agentId: "target",
      fields: { target: "target", holderId: "dead-holder", holderAlive: false },
    });
  });

  test("records a no-pane boundary answer with its reason", async () => {
    const directory = fixture();
    // A bare minted id: an agent with no pane is not a different KIND of
    // identity, it is the same identity with one environment axis absent (A1).
    const target = mintAgentId();
    seedStatus(directory, target, { agent: "claude", pid: process.pid });

    // Await the promise itself rather than `.resolves`: the linter does not see
    // matcher chains as Thenable, and awaiting the call is the same assertion.
    // A boundary answer is terminal: it is a reply to a human, and no bridge
    // will ever append a marker for it, so it settles on the write (L7).
    expect(await deliverWrite(target, { action: "steer", text: "hello" }, "dispatch-1")).toBe("acked");

    const [record] = records(directory);
    if (record === undefined) throw new Error("missing boundary answer record");
    expect(Number.isFinite(record.at)).toBe(true);
    expect(record).toEqual({
      at: record.at,
      level: "debug",
      event: "boundary.answer",
      correlationId: "dispatch-1",
      agentId: target,
      fields: { target, reason: "no-pane" },
    });
  });
});
