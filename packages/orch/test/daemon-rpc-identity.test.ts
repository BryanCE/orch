import { recordingLogger } from "./helpers/logger.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { hostOs } from "../src/host.ts";
import { daemonRuntimeFiles } from "../src/daemon/client/runtime-files.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { orm } from "../src/store/connection.ts";
import { sql } from "drizzle-orm";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { row } from "./helpers/rows.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { SessionClaim } from "../src/daemon/client/protocol.ts";
import { parseRequest } from "../src/daemon/client/wire.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";

const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];

function tempDir(): OrchDir {
  const dir = tempOrchDir("orch-rpc-identity-");
  dirs.push(dir);
  return dir;
}

function params(token: string, sessionToken: string): SessionClaim {
  return { token, sessionToken, pid: process.pid, harness: "pi", cwd: process.cwd(), hostName: "test-host", hostOs: hostOs() };
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

describe("daemon identity RPCs", () => {
  test("claim-identity stamps a minted id", async () => {
    const dir = tempDir();
    ensureHarness(dir, "pi", "pi", 1);
    insertAgent(dir, { id: "agent-minted", name: "worker", harnessId: "pi", cwd: dir, createdAt: 1 });
    servers.push(await startRpcServer(dir, stubRpcHandlers(), { logger: recordingLogger().logger }));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const result = await rpcCall(dir, "claim-identity", { ...params(token, "session-a"), id: "agent-minted", sessionToken: "session-a" });
    expect(result).toEqual({ id: "agent-minted" });
    const stored = row(orm(dir), sql`SELECT claimed_at, session_token FROM agents WHERE id = 'agent-minted'`);
    if (typeof stored !== "object" || stored === null || !("claimed_at" in stored) || !("session_token" in stored)) throw new Error("claim row missing");
    expect(typeof stored.claimed_at).toBe("number");
    expect(stored.session_token).toBe("session-a");
  });

  test("claim-identity refuses an unknown id by naming it", async () => {
    const dir = tempDir();
    servers.push(await startRpcServer(dir, stubRpcHandlers(), { logger: recordingLogger().logger }));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    let failure: unknown;
    try {
      await rpcCall(dir, "claim-identity", { ...params(token, "session-a"), id: "missing-agent", sessionToken: "session-a" });
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect(failure instanceof Error ? failure.message : "").toContain("missing-agent");
  });

  test("register-session mints one id per session token", async () => {
    const dir = tempDir();
    servers.push(await startRpcServer(dir, stubRpcHandlers(), { logger: recordingLogger().logger }));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const first = await rpcCall(dir, "register-session", params(token, "session-a"));
    const second = await rpcCall(dir, "register-session", params(token, "session-a"));
    expect(first).toMatchObject({ kind: "session" });
    expect(second).toMatchObject({ kind: "session" });
    if (typeof first !== "object" || first === null || !("id" in first) || typeof first.id !== "string") throw new Error("missing first id");
    if (typeof second !== "object" || second === null || !("id" in second) || typeof second.id !== "string") throw new Error("missing second id");
    expect(second.id).toBe(first.id);
  });

  test("the removed method is unknown", () => {
    const failure = parseRequest('{"id":1,"method":"hello","params":{}}');
    expect(failure).toMatchObject({ kind: "error", error: { code: "METHOD_NOT_FOUND" } });
  });
});
