import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentHostOs, ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { daemonRuntimeFiles } from "../src/daemon/runtime-files.ts";
import { rpcCall, startRpcServer } from "../src/daemon/rpc.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { orm } from "../src/store/connection.ts";
import { sql } from "drizzle-orm";
import { removeTempDir } from "./helpers/tempdir.ts";
import { row } from "./helpers/rows.ts";

const dirs: string[] = [];
const servers: RpcServer[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-rpc-identity-"));
  dirs.push(dir);
  return dir;
}

function params(token: string, sessionToken: string): Record<string, unknown> {
  return { token, sessionToken, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() };
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
    servers.push(await startRpcServer(dir, {}));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const result = await rpcCall(dir, "claim-identity", { ...params(token, "session-a"), id: "agent-minted" });
    expect(result).toEqual({ id: "agent-minted" });
    const stored = row(orm(dir), sql`SELECT claimed_at, session_token FROM agents WHERE id = 'agent-minted'`);
    if (typeof stored !== "object" || stored === null || !("claimed_at" in stored) || !("session_token" in stored)) throw new Error("claim row missing");
    expect(typeof stored.claimed_at).toBe("number");
    expect(stored.session_token).toBe("session-a");
  });

  test("claim-identity refuses an unknown id by naming it", async () => {
    const dir = tempDir();
    servers.push(await startRpcServer(dir, {}));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    let failure: unknown;
    try {
      await rpcCall(dir, "claim-identity", { ...params(token, "session-a"), id: "missing-agent" });
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect(failure instanceof Error ? failure.message : "").toContain("missing-agent");
  });

  test("register-session mints one id per session token", async () => {
    const dir = tempDir();
    servers.push(await startRpcServer(dir, {}));
    const token = readFileSync(daemonRuntimeFiles(dir).token, "utf8").trim();
    const first = await rpcCall(dir, "register-session", params(token, "session-a"));
    const second = await rpcCall(dir, "register-session", params(token, "session-a"));
    expect(first).toMatchObject({ kind: "session" });
    expect(second).toMatchObject({ kind: "session" });
    if (typeof first !== "object" || first === null || !("id" in first) || typeof first.id !== "string") throw new Error("missing first id");
    if (typeof second !== "object" || second === null || !("id" in second) || typeof second.id !== "string") throw new Error("missing second id");
    expect(second.id).toBe(first.id);
  });

  test("the removed method is unknown", async () => {
    const dir = tempDir();
    servers.push(await startRpcServer(dir, {}));
    let failure: unknown;
    try {
      await rpcCall(dir, "hello", {});
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: "METHOD_NOT_FOUND" });
  });
});
