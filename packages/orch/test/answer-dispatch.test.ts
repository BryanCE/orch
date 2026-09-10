import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { deliverControl } from "../src/control/dispatch.ts";
import { answer, steer } from "../src/daemon/orchd.ts";
import { appendAck, drainInbox } from "../src/presence/inbox.ts";
import { consumeOutboxAcks } from "../src/daemon/outbox.ts";
import { isRecord } from "../src/util.ts";
import { acknowledgeDelivery } from "../src/control/ack.ts";
import { orm } from "../src/store/connection.ts";
import { ensureHarness, ensureHost, insertAgent } from "../src/store/agent-rows.ts";
import { setSpace } from "../src/store/interval-rows.ts";
import { acquireLease, currentLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { rpcCall } from "../src/daemon/rpc/client.ts";
import { refusalOf } from "./helpers/refusal.ts";
import type { RpcHandlers, RpcServer } from "../src/types/daemon.ts";
import { sql } from "drizzle-orm";

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];
const servers: RpcServer[] = [];

function tempDir(prefix = "orch-answer-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  writeSettingsFixture(dir, { timeouts: { dispatch_ack_ms: 100 } });
  return dir;
}

/** A1: an agent key IS its minted id. There is no environment inside it, so a
 *  fixture that wants an agent in a space puts it in one - it cannot spell it. */
function agent(dir: string, id: string): void {
  ensureHarness(dir, "pi", "pi", 1);
  insertAgent(dir, { id, name: id, spawnedBy: null, harnessId: "pi", cwd: dir, createdAt: 1 });
}

function placeIn(dir: string, id: string, space: string): void {
  orm(dir).run(sql`INSERT OR IGNORE INTO spaces (id, name, created_at) VALUES (${space}, ${space}, ${1})`);
  setSpace(dir, id, 1, space);
}

/** An orch whose recorded process instance is this test process: provably alive. */
function liveOrch(dir: string, id: string): void {
  ensureHost(dir, "host", "host", "linux", 1);
  agent(dir, id);
  const token = processStartToken(process.pid);
  if (!token) throw new Error("test process has no start token");
  orm(dir).run(sql`INSERT INTO agent_processes(agent_id,since,host_id,pid,start_token) VALUES (${id},${1},${"host"},${process.pid},${token})`);
}

function answerFile(directory: string, agentKey: string): string {
  return path.join(directory, "agents", agentKey, "answer.json");
}

/** The exact wiring orchd registers for the `answer` method: wall + ownership, then dispatch. */
function answerHandlers(directory: string): RpcHandlers {
  return {
    answer: (params) => answer(directory, params),
  };
}

async function startAnswerServer(directory: string): Promise<RpcServer> {
  const server = await startRpcServer(directory, answerHandlers(directory));
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("answer via the control dispatcher", () => {
  test("writes pi's answer.json through the adapter's answer port", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = "pianswera1";
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });

    await deliverControl(agentKey, { kind: "answer", text: "yes, ship it", id: "answer-1" });

    const line = JSON.parse(fs.readFileSync(answerFile(directory, agentKey), "utf8")) as { text: string };
    expect(line.text).toBe("yes, ship it");
  });

  // An adapter that takes no answers is an ABSENCE, and an absence is an answer
  // to a human, never a failure path. So this is outcome
  // "answer" with exit code zero — but it still has to NAME the target and the
  // harness, or the human learns nothing from it.
  test("answers, rather than failing, when the adapter composes no question role", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = "claudenoas";
    seedStatus(directory, agentKey, { agent: "claude", pid: process.pid });

    const result = await deliverControl(agentKey, { kind: "answer", text: "no", id: "answer-2" });
    // Narrow on the discriminant before reading the answer's text: `invoke` carries
    // none, and the union is what stops that being readable by accident.
    if (result.outcome !== "answer") throw new Error(`expected a boundary answer, got ${result.outcome}`);
    expect(result.reason).toBe("no-environment-role");
    expect(result.text).toMatch(new RegExp(`cannot answer .*${agentKey}.*adapter claude takes no answers`));
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
  });

  test("refuses answer for a target with no recorded adapter identity", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = "identityls";
    // A presence record with no `agent` field and no spawn-registry adapter is malformed, never pi.
    seedStatus(directory, agentKey, { pid: process.pid });

    expect(await refusalOf(deliverControl(agentKey, { kind: "answer", text: "yes", id: "answer-3" })))
      .toMatch(new RegExp(`${agentKey} has no recorded adapter`));
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
  });
});

describe("steer acknowledgements", () => {
  test("waits for the fallback reader ack", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = "steerack01";
    seedStatus(directory, key, { agent: "pi", pid: process.pid });
    let settled = false;
    const result = steer(directory, { target: key, text: "hello" }).then((value) => { settled = true; return value; });
    const dir = path.join(directory, "agents", key);
    const poll = setInterval(() => {
      for (const line of drainInbox(dir)) {
        if (!line.trim()) continue;
        const message: unknown = JSON.parse(line);
        if (!isRecord(message) || typeof message.id !== "string") continue;
        expect(settled).toBe(false);
        appendAck(dir, message.id, key);
        consumeOutboxAcks(directory);
      }
    }, 5);
    try {
      expect(await result).toMatchObject({ accepted: true, ack: "acknowledged" });
    } finally { clearInterval(poll); }
  });

  test("fails rather than reporting a queued steer as delivered", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    seedStatus(directory, "steerslow1", { agent: "pi", pid: process.pid });
    expect(await refusalOf(steer(directory, { target: "steerslow1", text: "hello" }))).toContain("not acknowledged");
  });
});

describe("answer over the daemon control socket", () => {
  test("fails when the answer is written but never consumed", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    seedStatus(directory, "silentans1", { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);
    expect(await refusalOf(rpcCall(directory, "answer", { target: "silentans1", text: "yes" }))).toContain("not acknowledged");
    expect(fs.existsSync(answerFile(directory, "silentans1"))).toBe(true);
  });

  test("does not report success when the answer role is unavailable", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    seedStatus(directory, "noanswer01", { agent: "claude", pid: process.pid });
    await startAnswerServer(directory);
    expect(await refusalOf(rpcCall(directory, "answer", { target: "noanswer01", text: "yes" }))).toContain("takes no answers");
  });
  test("delivers a pi answer end-to-end through the real socket", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = "socketansw";
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);

    const response = rpcCall(directory, "answer", { target: agentKey, text: "delivered" });
    const poll = setInterval(() => {
      try {
        const record: unknown = JSON.parse(fs.readFileSync(answerFile(directory, agentKey), "utf8"));
        if (typeof record === "object" && record !== null && "id" in record && typeof record.id === "string") acknowledgeDelivery(record.id);
      } catch {}
    }, 5);
    try {
      const settled: unknown = await response;
      expect(settled).toMatchObject({ ok: true, ack: "acknowledged" });
      expect(isRecord(settled) && typeof settled.id === "string").toBe(true);
    } finally {
      clearInterval(poll);
    }

    const line = JSON.parse(fs.readFileSync(answerFile(directory, agentKey), "utf8")) as { text: string };
    expect(line.text).toBe("delivered");
  });

  test("refuses a cross-space answer at the daemon wall", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const foreign = "foreignaa1";
    const actor = "bossaaaaa1";
    agent(directory, foreign);
    agent(directory, actor);
    placeIn(directory, foreign, "wB");
    placeIn(directory, actor, "wA");
    seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);

    expect(await refusalOf(rpcCall(directory, "answer", { target: foreign, text: "yes", actor })))
      .toMatch(/space wall/);
    expect(fs.existsSync(answerFile(directory, foreign))).toBe(false);
  });

  // A1: ownership is the lease. The daemon refuses a foreign answer by naming the
  // orch that HOLDS the agent - there is no second ownership record to consult.
  test("refuses an answer from outside the lease, naming the holder", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = "ownedaaaa1";
    agent(directory, agentKey);
    liveOrch(directory, "ownerorch1");
    agent(directory, "intruderr1");
    acquireLease(directory, agentKey, "ownerorch1", 2);
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);

    expect(await refusalOf(rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: "intruderr1" })))
      .toMatch(/leased by ownerorch1/);
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
    expect(currentLease(directory, agentKey)?.orchId).toBe("ownerorch1");
  });
});
