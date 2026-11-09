import { afterEach, beforeEach, expect, test } from "bun:test";
import { createConnection, type Socket } from "node:net";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { HostLinks, type LinkSpawner } from "../src/hosts/link.ts";
import { serveHostLink } from "../src/hosts/serve.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { bridgeAttached } from "../src/control/bridge-links.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { testServices } from "./helpers/services.ts";
import { seedAgent } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testHost } from "./helpers/host.ts";

const dirs: OrchDir[] = [];
beforeEach(() => { isolateOrchEnv(); });
afterEach(() => {
  closeAllStores();
  restoreOrchEnv();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function farHost(farOrchDir: OrchDir): LinkSpawner {
  return () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const exited = serveHostLink(stdin, stdout, { orchDir: farOrchDir, greeting: { host: testHost("far-id", "far"), commit: null, version: "0.1.0" } }).then(() => 0);
    return { stdin, stdout, stderr: new PassThrough(), exited, kill: () => { stdin.end(); } };
  };
}

function connected(path: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path, () => { resolve(socket); });
    socket.once("error", reject);
  });
}

async function until<T>(read: () => T | null): Promise<T> {
  for (;;) {
    const value = read();
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("a bridge on the far host that attaches through the relay stays attached", async () => {
  const orchDir = tempOrchDir("orch-relay-bridge-");
  const farOrchDir = tempOrchDir("orch-relay-far-");
  dirs.push(orchDir, farOrchDir);
  seedAgent("relayag001", {}, orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 2_000 } } });
  const server = await startRpcServer(orchDir, stubRpcHandlers({}), { logger: recordingLogger().logger });
  const hosts = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn: farHost(farOrchDir) });
  try {
    const link = hosts.link("box");
    await link.connect();
    const relayDir = await until(() => link.relayOrchDir());
    const bridge = await connected(join(relayDir, "orchd.sock"));
    bridge.write(`${JSON.stringify({ id: 1, method: "attach", params: { key: "relayag001" } })}\n`);
    await until(() => bridgeAttached("relayag001") ? true : null);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(bridgeAttached("relayag001")).toBe(true);
    bridge.end();
  } finally {
    hosts.closeAll();
    await server.close();
  }
});
