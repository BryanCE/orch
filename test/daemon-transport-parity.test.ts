import { afterEach, describe, expect, test } from "bun:test";
import { createConnection } from "node:net";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endpointPaths, startRpcServer } from "../src/daemon/rpc.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import { isRecord } from "../src/util.ts";
import { currentHostOs } from "../src/store/agent-rows.ts";

/**
 * TASKS/02-scope.md B3 — "ONE MECHANISM on both transports; TCP is a FALLBACK,
 * never a client class."
 *
 * A unix socket is preferred and loopback TCP is bound beside it, but which one
 * a caller reached orch through must decide nothing: not what it must present,
 * not what it may call, not what it gets back. The moment TCP callers are a
 * class, the credential (B2) has a second, weaker sibling.
 */

const dirs: string[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

async function start(): Promise<{ server: RpcServer; orchDir: string; token: string }> {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-transport-"));
  dirs.push(orchDir);
  // A companion loopback port, which orch binds on its own only where a client
  // cannot dial the unix socket (Windows). Requesting it here is what makes the
  // two transports comparable at all — it is not what makes TCP a client class.
  const server = await startRpcServer(orchDir, {}, { tcpPort: 0 });
  servers.push(server);
  return { server, orchDir, token: readFileSync(endpointPaths(orchDir).token, "utf8").trim() };
}

/** One request, one line, on whichever endpoint is named. */
function ask(target: { path: string } | { port: number }, request: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = "path" in target
      ? createConnection({ path: target.path })
      : createConnection({ host: "127.0.0.1", port: target.port });
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

function tcpPort(server: RpcServer): number {
  const endpoint = server.tcpEndpoint;
  if (!endpoint) throw new Error("TCP endpoint was not bound");
  return Number(endpoint.slice(endpoint.lastIndexOf(":") + 1));
}

function hello(token: unknown): unknown {
  return { id: 1, method: "hello", params: { token, pid: process.pid, harness: "pi", cwd: process.cwd(), hostOs: currentHostOs() } };
}

describe("both transports carry one mechanism", () => {
  test("a bound TCP port does not displace the unix socket or become its own service", async () => {
    const { server, orchDir } = await start();
    // The unix socket stays the transport orch reports and prefers; the port is
    // bound BESIDE it. A caller that cannot reach one reaches the other and is
    // the same caller either way.
    expect(server.transport).toBe("unix");
    expect(tcpPort(server)).toBeGreaterThan(0);
    expect(existsSync(endpointPaths(orchDir).socket)).toBe(true);
  });

  test("the credential is demanded identically on both", async () => {
    const { server, orchDir } = await start();
    const path = endpointPaths(orchDir).socket;

    const overUnix = await ask({ path }, hello("wrong-token"));
    const overTcp = await ask({ port: tcpPort(server) }, hello("wrong-token"));
    expect(overUnix).toMatchObject({ error: { code: "IDENTITY_REQUIRED" } });
    // Identical, not merely both-refused: a TCP path with its own error is a
    // TCP path with its own code, and codes drift into policy.
    expect(overTcp).toEqual(overUnix);
  });

  test("a missing credential is refused identically on both", async () => {
    const { server, orchDir } = await start();
    const path = endpointPaths(orchDir).socket;

    const overUnix = await ask({ path }, hello(undefined));
    const overTcp = await ask({ port: tcpPort(server) }, hello(undefined));
    expect(overUnix).toMatchObject({ error: { code: "IDENTITY_REQUIRED" } });
    expect(overTcp).toEqual(overUnix);
  });

  test("the same token registers the same session whichever transport carried it", async () => {
    const { server, orchDir, token } = await start();
    const path = endpointPaths(orchDir).socket;

    const overUnix = await ask({ path }, hello(token));
    const overTcp = await ask({ port: tcpPort(server) }, hello(token));

    // Identity is minted from the caller's session, never from how it dialled.
    // Two dials from one process are one agent, or the transport has become an
    // identity axis — which is exactly what Rule 11 forbids.
    const unixResult = overUnix.result;
    const tcpResult = overTcp.result;
    expect(unixResult).toBeDefined();
    expect(tcpResult).toEqual(unixResult);
  });
});
