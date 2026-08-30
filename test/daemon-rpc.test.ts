import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonLock, provenDaemonPid, terminateDaemon } from "../src/daemon/lifecycle";
import { daemonRuntimeFiles } from "../src/daemon/runtime-files";
import { mintAgentId, serializeIdentity } from "../src/backends/identity.ts";
import { DaemonAbsentError, DaemonUnreachableError, RpcError, isRegisterSessionResponse, rpcCall, subscribeEvents, ReplayBuffer, startRpcServer } from "../src/daemon/rpc";
import { rpcRegisterSession } from "../src/daemon/reach.ts";
import { endAgent, ensureHarness, insertAgent, isLiveAgentIdentity } from "../src/store/agent-rows.ts";
import { orm } from "../src/store/connection.ts";
import { selectPendingOutbox } from "../src/store/outbox-rows.ts";
import { appendEvent, deleteEventsBefore } from "../src/store/event-rows.ts";
import { acquireLease, releaseLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { sql } from "drizzle-orm";
import { isRecord } from "../src/util.ts";
import { currentHostOs } from "../src/store/agent-rows.ts";

import { row } from "./helpers/rows.ts";
const dirs: string[] = [];
const servers: RpcServer[] = [];

function tempOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-rpc-"));
  dirs.push(dir);
  return dir;
}

/** A handler that never responds — the shape a starved daemon presents to the CLI. */
function neverAnswers(): Promise<never> {
  return new Promise(() => undefined);
}

/** The rejection from a call that must fail, awaited so the assertion runs inside
 *  the test — an unawaited `expect(p).rejects` lets afterEach tear the server down
 *  while the call is still dialing, turning every verdict into daemon-absent. */
function rejectionOf(action: Promise<unknown>): Promise<unknown> {
  return action.then(() => undefined, (error: unknown) => error);
}

async function waitForLine(lines: string[], index: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (lines.length <= index && Date.now() < deadline) await Bun.sleep(5);
  if (lines.length <= index) throw new Error("timed out waiting for RPC line");
}

async function tcpHello(server: RpcServer, params?: unknown): Promise<Record<string, unknown>> {
  const endpoint = server.tcpEndpoint;
  if (!endpoint) throw new Error("TCP endpoint was not bound");
  const port = Number(endpoint.slice(endpoint.lastIndexOf(":") + 1));
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      data += chunk;
      const newline = data.indexOf("\n");
      if (newline < 0) return;
      socket.destroy();
      const parsed: unknown = JSON.parse(data.slice(0, newline));
      if (!isRecord(parsed)) {
        reject(new Error("TCP hello returned a non-object"));
        return;
      }
      resolve(parsed);
    });
    socket.once("error", reject);
    socket.once("connect", () => socket.write(`${JSON.stringify({ id: 1, method: "register-session", params })}\n`));
  });
}

async function start(dir: string): Promise<RpcServer> {
  const server = await startRpcServer(dir, {
    echo: (params) => params,
    hang: neverAnswers,
    "subscribe-events": (_params, emit) => {
      setTimeout(() => emit({ kind: "pushed", value: 1 }), 5);
      return { subscribed: true };
    },
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

describe("daemon RPC", () => {
  test("rejects a hello response with a malformed optional field", () => {
    expect(isRegisterSessionResponse({
      id: "session-id",
      label: "session",
      kind: "session",
      unleased: [],
      registrationWarning: 42,
    })).toBe(false);
  });

  test("hello translates an absent daemon instead of reading a missing token", async () => {
    const dir = tempOrchDir();
    const previousEntrypoint = process.env.ORCHD_ENTRYPOINT;
    const failingEntrypoint = join(dir, "daemon-fails.js");
    writeFileSync(failingEntrypoint, "process.exit(0);\n");
    process.env.ORCHD_ENTRYPOINT = failingEntrypoint;
    expect(existsSync(daemonRuntimeFiles(dir).token)).toBe(false);
    try {
      const failure = await rejectionOf(rpcRegisterSession(dir));
      if (!(failure instanceof Error)) throw new Error("hello did not reject with an Error");
      expect(failure.message).toContain("orch daemon unavailable");
      expect(failure.message).not.toContain("ENOENT");
    } finally {
      if (previousEntrypoint === undefined) delete process.env.ORCHD_ENTRYPOINT;
      else process.env.ORCHD_ENTRYPOINT = previousEntrypoint;
    }
  }, 15_000);

  test("an unreachable agent yields a boundary answer, and the outbox is not left pending", async () => {
    const dir = tempOrchDir();
    const discovery = tempOrchDir();
    const previousDir = process.env.ORCH_DIR;
    const previousDiscovery = process.env.ORCH_DAEMON_DISCOVERY_DIR;
    const previousEntrypoint = process.env.ORCHD_ENTRYPOINT;
    process.env.ORCH_DIR = dir;
    process.env.ORCH_DAEMON_DISCOVERY_DIR = discovery;
    process.env.ORCHD_ENTRYPOINT = join(import.meta.dir, "../src/daemon/orchd.ts");
    writeSettingsFixture(dir, { defaults: { adapter: "claude" } });
    // A1: the target IS the minted id. The plexer that cannot reach it and the
    // space it is not in are environment, composed from their own tables.
    const target = serializeIdentity({ id: mintAgentId() });
    seedStatus(dir, target, { agent: "claude", pid: process.pid, state: "working" });
    try {
      await rpcRegisterSession(dir);
      // TASKS/02-scope.md E14: an environment that offers no way to reach this agent
      // is an ABSENCE, and an absence is an answer to a human, never a failure path.
      // Claude composes no inbox steering and headless has no pane, so the dispatch
      // is ANSWERED — and the outbox acks it rather than leaving a phantom pending
      // row the daemon would retry forever.
      await rpcCall(dir, "dispatch", { target, text: "cannot be reached" });
      expect(selectPendingOutbox(dir, Number.MAX_SAFE_INTEGER)).toHaveLength(0);
    } finally {
      const pid = provenDaemonPid(dir);
      if (pid !== undefined && pid !== process.pid) await terminateDaemon(pid, 5_000);
      if (previousDir === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previousDir;
      if (previousDiscovery === undefined) delete process.env.ORCH_DAEMON_DISCOVERY_DIR;
      else process.env.ORCH_DAEMON_DISCOVERY_DIR = previousDiscovery;
      if (previousEntrypoint === undefined) delete process.env.ORCHD_ENTRYPOINT;
      else process.env.ORCHD_ENTRYPOINT = previousEntrypoint;
    }
  }, 30_000);

  test("round-trips a call over the real unix socket", async () => {
    const dir = tempOrchDir();
    await start(dir);
    expect(await rpcCall(dir, "echo", { ok: true })).toEqual({ ok: true });
  });

  test("issues one session identity to sequential invocations from one session", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const first = await rpcRegisterSession(dir);
    const second = await rpcRegisterSession(dir);
    expect(second).toEqual(first);
    // An issued id is opaque; a plexer coordinate would carry `~` separators.
    expect(first.id).not.toContain("~");
  });

  test("hello returns live agents whose newest lease is closed or absent", async () => {
    const dir = tempOrchDir();
    ensureHarness(dir, "pi", "pi", 1);
    insertAgent(dir, { id: "closed", name: "closed-worker", harnessId: "pi", cwd: dir, createdAt: 1 });
    insertAgent(dir, { id: "free", name: "free-worker", harnessId: "pi", cwd: dir, createdAt: 1 });
    insertAgent(dir, { id: "holder", name: "holder", harnessId: "pi", cwd: dir, createdAt: 1 });
    insertAgent(dir, { id: "leased", name: "leased-worker", harnessId: "pi", cwd: dir, createdAt: 1 });
    insertAgent(dir, { id: "ended", name: "ended-worker", harnessId: "pi", cwd: dir, createdAt: 1 });
    acquireLease(dir, "closed", "holder", 2);
    releaseLease(dir, "closed", "holder", 3);
    acquireLease(dir, "leased", "holder", 2);
    endAgent(dir, "ended", 4, null);
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const reply = await tcpHello(server, { token, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() });
    expect(reply.result).toMatchObject({
      unleased: [
        { id: "closed", name: "closed-worker" },
        { id: "free", name: "free-worker" },
        { id: "holder", name: "holder" },
      ],
    });
    const repeat = await tcpHello(server, { token, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() });
    expect(repeat.result).toMatchObject({ unleased: [] });
  });

  test("hello returns an empty unleased list when none exist", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const reply = await tcpHello(server, { token, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() });
    expect(reply.result).toMatchObject({ unleased: [] });
  });

  test("a TCP hello with the daemon token gets an identity", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const reply = await tcpHello(server, { token, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs(), label: "web client" });
    expect(reply.id).toBe(1);
    if (!isLiveAgentIdentity(dir, reply.result)) throw new Error(`TCP hello returned a non-identity: ${JSON.stringify(reply)}`);
    expect(reply.result.label).toBe("web client");
    const agent = row(orm(dir), sql`SELECT id, spawned_by, root_agent_id, harness_id, cwd, name FROM agents WHERE id = ${reply.result.id}`);
    expect(agent).toMatchObject({ id: reply.result.id, spawned_by: null, root_agent_id: reply.result.id, harness_id: "pi", cwd: process.cwd(), name: `pi-${reply.result.id.slice(0, 8)}` });
    expect(row(orm(dir), sql`SELECT pid, start_token, until FROM agent_processes WHERE agent_id = ${reply.result.id}`)).toMatchObject({ pid: process.pid, start_token: processStartToken(process.pid), until: null });
  });

  test("refuses a hello that reports no session pid", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    expect(await tcpHello(server, { token })).toMatchObject({ id: 1, error: { code: "IDENTITY_UNAVAILABLE" } });
  });

  test("refuses a hello without its environment", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    expect(await tcpHello(server, { token, pid: process.pid })).toMatchObject({ id: 1, error: { code: "IDENTITY_UNAVAILABLE" } });
  });

  test("same session pid keeps its id and a different session pid gets another", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const claim = (pid: number, label: string) => ({ token, pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs(), label });
    const first = await tcpHello(server, claim(process.pid, "first"));
    const same = await tcpHello(server, claim(process.pid, "renamed"));
    const other = await tcpHello(server, claim(process.ppid, "other"));
    if (!isLiveAgentIdentity(dir, first.result) || !isLiveAgentIdentity(dir, same.result) || !isLiveAgentIdentity(dir, other.result)) throw new Error("hello returned a non-identity");
    expect(same.result.id).toBe(first.result.id);
    expect(other.result.id).not.toBe(first.result.id);
  });

  test("refuses a TCP hello without a token", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    expect(await tcpHello(server)).toMatchObject({ id: 1, error: { code: "IDENTITY_REQUIRED" } });
  });

  test("refuses a TCP hello with a wrong token", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    expect(await tcpHello(server, { token: "wrong-token" })).toMatchObject({ id: 1, error: { code: "IDENTITY_REQUIRED" } });
  });

  test("writes the daemon token with owner-only permissions", async () => {
    const dir = tempOrchDir();
    const server = await startRpcServer(dir, {}, { tcpPort: 0 });
    servers.push(server);
    const tokenFile = daemonRuntimeFiles(dir).token;
    expect(readFileSync(tokenFile, "utf8").trim()).toMatch(/^[0-9a-f]{64}$/);
    // Windows carries no POSIX mode bits: the token inherits the ACL of the
    // per-user directory it lives in, which is the same-uid proof the mode gives here.
    if (process.platform !== "win32") expect(statSync(tokenFile).mode & 0o777).toBe(0o600);
  });

  test("returns an error for an unknown method", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const failure = await rejectionOf(rpcCall(dir, "missing"));
    expect(failure).toBeInstanceOf(RpcError);
    if (!(failure instanceof Error)) throw new Error("unknown method did not reject with Error");
    expect(failure.message).toContain("Unknown method");
  });

  test("reports malformed lines and keeps the connection alive", async () => {
    const dir = tempOrchDir();
    const server = await start(dir);
    const socket = await new Promise<import("node:net").Socket>((resolve, reject) => {
      const connection = createConnection(server.socketPath);
      connection.once("connect", () => resolve(connection));
      connection.once("error", reject);
    });
    socket.setEncoding("utf8");
    const lines: string[] = [];
    socket.on("data", (chunk: string) => lines.push(...chunk.trim().split("\n")));
    socket.write("not json\n");
    await waitForLine(lines, 0);
    const malformed: unknown = JSON.parse(lines[0]!);
    expect(malformed).toMatchObject({ error: { code: "INVALID_REQUEST" } });
    socket.write('{"id":7,"method":"echo","params":"still alive"}\n');
    await waitForLine(lines, 1);
    expect(JSON.parse(lines[1]!)).toMatchObject({ id: 7, result: "still alive" });
    socket.destroy();
  });

  test("delivers pushed subscription events", async () => {
    const dir = tempOrchDir();
    const server = await start(dir);
    const received: unknown[] = [];
    const subscription = subscribeEvents(dir, { since: 0 }, (value) => received.push(value));
    await Bun.sleep(25);
    server.emit({ kind: "pushed", value: 1 });
    const deadline = Date.now() + 2_000;
    while (received.length === 0 && Date.now() < deadline) await Bun.sleep(5);
    expect(received).toContainEqual({ kind: "pushed", value: 1 });
    subscription.close();
  });

  test("replays durable events after a daemon restart without a gap", async () => {
    const dir = tempOrchDir();
    const first = await start(dir);
    const received: unknown[] = [];
    const gaps: number[] = [];
    const subscription = subscribeEvents(dir, { since: 0 }, (event) => received.push(event), (oldest) => gaps.push(oldest));
    const deadline = Date.now() + 2_000;
    while (first.subscriberCount() === 0 && Date.now() < deadline) await Bun.sleep(5);
    first.emit({ value: 1 });
    while (received.length < 1 && Date.now() < deadline) await Bun.sleep(5);
    expect(received).toEqual([{ value: 1 }]);
    await first.close();
    servers.splice(servers.indexOf(first), 1);
    const second = await start(dir);
    const secondDeadline = Date.now() + 3_000;
    while (second.subscriberCount() === 0 && Date.now() < secondDeadline) await Bun.sleep(5);
    second.emit({ value: 2 });
    while (received.length < 2 && Date.now() < secondDeadline) await Bun.sleep(5);
    expect(received).toEqual([{ value: 1 }, { value: 2 }]);
    expect(gaps).toEqual([]);
    subscription.close();
  });

  test("reports the oldest sequence when replay starts before the pruned window", () => {
    const dir = tempOrchDir();
    appendEvent(dir, Date.parse("2024-01-01T00:00:00.000Z"), { value: 1 });
    appendEvent(dir, Date.parse("2024-01-02T00:00:00.000Z"), { value: 2 });
    appendEvent(dir, Date.parse("2024-01-03T00:00:00.000Z"), { value: 3 });
    deleteEventsBefore(dir, Date.parse("2024-01-03T00:00:00.000Z"));
    const replay = new ReplayBuffer(dir).since(0);
    expect(replay.gap).toBe(true);
    expect(replay.oldestSeq).toBe(3);
    expect(replay.events).toEqual([{ seq: 3, event: { value: 3 } }]);
  });

  test("removes a stale unix socket when the daemon owns the lock", async () => {
    const dir = tempOrchDir();
    writeFileSync(join(dir, "orchd.sock"), "stale endpoint");
    expect(acquireDaemonLock(dir)).toBe(true);
    const server = await start(dir);
    expect(server.transport).toBe("unix");
    expect(await rpcCall(dir, "echo", "after-reclaim")).toBe("after-reclaim");
  });

  test("has a catchable absent-daemon error", async () => {
    const dir = tempOrchDir();
    expect(await rejectionOf(rpcCall(dir, "echo"))).toBeInstanceOf(DaemonAbsentError);
  });

  // A live daemon too slow to answer must never look absent: callers SIGTERM on
  // absent, and a loaded machine would make them kill the daemon they came to use.
  test("calls a slow daemon unreachable, not absent", async () => {
    const dir = tempOrchDir();
    await start(dir);
    const failure = await rejectionOf(rpcCall(dir, "hang", undefined, 100));
    expect(failure).toBeInstanceOf(DaemonUnreachableError);
    expect(failure).not.toBeInstanceOf(DaemonAbsentError);
  });

  test("calls a refused endpoint absent so a wedged daemon is still reclaimable", async () => {
    const dir = tempOrchDir();
    writeFileSync(join(dir, "orchd.sock"), "");
    expect(await rejectionOf(rpcCall(dir, "echo"))).toBeInstanceOf(DaemonAbsentError);
  });
});
