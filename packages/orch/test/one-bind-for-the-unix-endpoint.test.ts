import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { rpcCall } from "../src/daemon/rpc/client.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";

/**
 * One `bindUnix(server, paths)`.
 *
 * `startRpcServer` wrote the unix endpoint's whole claim — listen, mark the path
 * bound, drop the stale port file — once for the first attempt and again inside
 * the EADDRINUSE recovery, then repeated the success tail (companion TCP, endpoint,
 * result) beside it. Two copies of one sequence means a fact added to the endpoint
 * lands in one of them: the recovered daemon and the fresh one stop agreeing about
 * where they are reachable.
 */
const RPC_SOURCE = readFileSync(join(import.meta.dir, "..", "src", "daemon", "rpc", "server.ts"), "utf8");

/** Everything from starting the server to the point it is handed back: the
 *  region that claims an endpoint. Teardown unlinks the same paths for the
 *  opposite reason and is not a second claim. */
const CLAIM_REGION = RPC_SOURCE.slice(
  RPC_SOURCE.indexOf("export async function startRpcServer"),
  RPC_SOURCE.indexOf("function makeRpcServer("),
);

function occurrences(needle: string): number {
  return CLAIM_REGION.split(needle).length - 1;
}

function tempOrchDir(): string {
  return mkdtempSync(join(tmpdir(), "orch-one-bind-"));
}

describe("one bind for the unix endpoint (2.4)", () => {
  // The claim, not the attempt: reclaiming a stale path legitimately listens
  // twice, but it must MARK the path and drop the stale port file exactly once,
  // through the same code the first bind runs.
  test("the unix endpoint is claimed in exactly one place", () => {
    expect({
      marks: occurrences("markSocketBound(paths.socket)"),
      dropsPortFile: occurrences("unlinkSync(paths.port)"),
    }).toEqual({ marks: 1, dropsPortFile: 1 });
  });

  // The recovery path exists so a daemon that owns the lock can take back its own
  // stale socket. It must end up at the SAME endpoint a first bind produces —
  // which is what one shared bind guarantees and two copies only happen to.
  test("reclaiming a stale socket yields the endpoint a first bind produces", async () => {
    const fresh = tempOrchDir();
    const stale = tempOrchDir();
    let first: RpcServer | undefined;
    let reclaimed: RpcServer | undefined;
    try {
      first = await startRpcServer(fresh, { echo: (params: unknown) => params });

      // A socket path left by a dead instance, and this process holds the lock.
      writeFileSync(join(stale, "orchd.sock"), "");
      writeFileSync(join(stale, "orchd.port"), "65000\n");
      reclaimed = await startRpcServer(stale, { echo: (params: unknown) => params }, { holdsDaemonLock: true });

      expect(reclaimed.transport).toBe(first.transport);
      expect(existsSync(join(stale, "orchd.port"))).toBe(existsSync(join(fresh, "orchd.port")));
      expect(await rpcCall(stale, "echo", { via: "reclaimed" })).toEqual({ via: "reclaimed" });
    } finally {
      if (first) await first.close();
      if (reclaimed) await reclaimed.close();
      removeTempDir(fresh);
      removeTempDir(stale);
    }
  });
});
