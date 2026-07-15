import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rpcCall, startRpcServer, type RpcServer } from "../src/daemon/rpc";

function tempOrchDir(): string {
  return mkdtempSync(join(tmpdir(), "orch-rpc-transport-"));
}

function handlers() {
  return { echo: (params: unknown) => params };
}

describe("orchd RPC transports", () => {
  test("round-trips over the default unix transport", async () => {
    const dir = tempOrchDir();
    let server: RpcServer | undefined;
    try {
      server = await startRpcServer(dir, handlers());
      expect(server.transport).toBe("unix");
      expect(await rpcCall(dir, "echo", { transport: "unix" })).toEqual({ transport: "unix" });
    } finally {
      if (server) await server.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("round-trips over the TCP fallback transport", async () => {
    const dir = tempOrchDir();
    const socketPath = join(dir, "orchd.sock");
    let server: RpcServer | undefined;
    try {
      writeFileSync(socketPath, "occupied");
      server = await startRpcServer(dir, handlers());
      expect(server.transport).toBe("tcp");
      expect(await rpcCall(dir, "echo", { transport: "tcp" })).toEqual({ transport: "tcp" });
    } finally {
      if (server) await server.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
