import { afterEach, describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endpointPaths } from "../src/daemon/rpc/wire.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { isRecord } from "../src/util.ts";
import { currentHostOs } from "../src/store/agent-rows.ts";

/**
 * Peer credentials rejected — node exposes neither `SO_PEERCRED` nor process
 * ancestry portably.
 *
 * The consequence is the point: the token is the ONLY proof (B2), so the daemon
 * must not quietly grow a second check against the socket peer or the caller's
 * parent. Such a check would pass on Linux and be absent on Windows, which is
 * the worst possible shape for an authorization rule — it works until it does
 * not, on the platform nobody tested.
 */

const dirs: string[] = [];
const servers: RpcServer[] = [];
const children: ChildProcess[] = [];

afterEach(async () => {
  while (children.length) children.pop()!.kill();
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

async function start(): Promise<{ orchDir: string; token: string }> {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-peercred-"));
  dirs.push(orchDir);
  servers.push(await startRpcServer(orchDir, {}));
  return { orchDir, token: readFileSync(endpointPaths(orchDir).token, "utf8").trim() };
}

function ask(path: string, request: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ path });
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      data += chunk;
      const newline = data.indexOf("\n");
      if (newline < 0) return;
      socket.destroy();
      const value: unknown = JSON.parse(data.slice(0, newline));
      if (!isRecord(value)) {
        reject(new Error("RPC response was not an object"));
        return;
      }
      resolve(value);
    });
    socket.once("error", reject);
    socket.once("connect", () => socket.write(`${JSON.stringify(request)}\n`));
  });
}

/** A live process that is NOT the socket peer and NOT the daemon's child. */
async function unrelatedProcess(): Promise<number> {
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: "ignore" });
  children.push(child);
  await new Promise((resolve) => child.once("spawn", resolve));
  if (child.pid === undefined) throw new Error("child had no pid");
  return child.pid;
}

function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (entry.name.endsWith(".ts")) found.push(path);
  }
  return found;
}

describe("the daemon asks for a token and nothing else", () => {
  test("no peer-credential or ancestry syscall appears in the daemon at all", () => {
    for (const file of sourceFiles(join(import.meta.dir, "../src/daemon"))) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      // Portable node exposes none of these. Reaching for one is how an
      // authorization rule becomes platform-shaped.
      expect(code).not.toMatch(/SO_PEERCRED|getsockopt|getpeereid|process\.ppid/);
    }
  });

  test("a caller the daemon has no relationship to is accepted on the token alone", async () => {
    const { orchDir, token } = await start();
    const stranger = await unrelatedProcess();

    // The claimed session is a live process that is neither the connecting
    // socket's peer nor anything the daemon spawned. Same-uid IS the boundary
    // (B2), so this must succeed — a refusal here would mean an ancestry check
    // had crept in.
    const reply = await ask(endpointPaths(orchDir).socket, {
      id: 1, method: "register-session",
      params: { token, pid: stranger, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() },
    });
    expect(reply.error).toBeUndefined();
    expect(reply.result).toBeDefined();
  });

  test("that same stranger without the token is refused, so the token is what decided", async () => {
    const { orchDir } = await start();
    const stranger = await unrelatedProcess();

    const reply = await ask(endpointPaths(orchDir).socket, {
      id: 1, method: "register-session",
      params: { pid: stranger, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() },
    });
    expect(reply).toMatchObject({ error: { code: "IDENTITY_REQUIRED" } });
  });
});
