import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { rpcCall } from "../src/daemon/client/rpc.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { removeTempDir, tempOrchDir as freshOrchDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";

function tempOrchDir(): OrchDir {
  return freshOrchDir("orch-rpc-transport-");
}

function handlers() {
  return stubRpcHandlers({ ack: () => ({ ok: true }) });
}

describe("orchd RPC transports", () => {
  test("round-trips over the default unix transport", async () => {
    const dir = tempOrchDir();
    let server: RpcServer | undefined;
    try {
      server = await startRpcServer(dir, handlers());
      expect(server.transport).toBe("unix");
      expect(await rpcCall(dir, "ack", { id: "unix" })).toEqual({ ok: true });
    } finally {
      if (server) await server.close();
      removeTempDir(dir);
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
      expect(await rpcCall(dir, "ack", { id: "tcp" })).toEqual({ ok: true });
    } finally {
      if (server) await server.close();
      removeTempDir(dir);
    }
  });
});
