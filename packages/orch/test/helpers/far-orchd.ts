import { PassThrough } from "node:stream";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import { connectDaemon } from "../../src/daemon/client/rpc.ts";
import { peerHandlers } from "../../src/daemon/server/handlers/peer.ts";
import { serveHostLink } from "../../src/hosts/serve.ts";
import { hostIdentity } from "../../src/host.ts";
import { daemonStatusFixture, stubRpcHandlers } from "./rpc-handlers.ts";
import { recordingLogger } from "./logger.ts";
import { removeTempDir, tempOrchDir } from "./tempdir.ts";
import type { LinkSpawner } from "../../src/hosts/link.ts";
import type { HostGreeting, HostId } from "../../src/types/host.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { RpcServer } from "../../src/types/daemon.ts";
import type { NotifyEvent } from "../../src/types/notify.ts";

/** Another host's orchd, run in-process: a real RPC server that greets as `greeting.host`,
 *  answers the peer methods as that host, and status for a ping. */
export interface FarOrchd {
  readonly orchDir: OrchDir;
  readonly greeting: HostGreeting;
  /** Publish an event on this orchd, as a report from one of its agents would. */
  emit(event: NotifyEvent): void;
  /** A link spawner that runs `orch host serve` against this orchd, as `origin`'s peer. */
  spawner(origin?: HostId): LinkSpawner;
  close(): Promise<void>;
}

export async function startFarOrchd(greeting: HostGreeting): Promise<FarOrchd> {
  const orchDir = tempOrchDir("orch-far-orchd-");
  const handlers = stubRpcHandlers({
    "daemon-status": () => daemonStatusFixture(),
    "subscribe-events": () => ({ subscribed: true }),
    ...peerHandlers(() => greeting.host),
  });
  const server: RpcServer = await startRpcServer(orchDir, handlers, { logger: recordingLogger().logger, greeting: () => greeting });
  return {
    orchDir,
    greeting,
    emit: (event) => { server.emit(event); },
    spawner: (origin = hostIdentity().id) => () => {
      const stdin = new PassThrough();
      const stdout = new PassThrough();
      const exited = serveHostLink(stdin, stdout, {
        orchDir,
        origin,
        logger: recordingLogger().logger,
        connectTimeoutMs: 1_000,
        dial: () => connectDaemon(orchDir, 1_000),
      }).then(() => 0);
      return { stdin, stdout, stderr: new PassThrough(), exited, kill: () => { stdin.end(); } };
    },
    close: async () => {
      await server.close();
      removeTempDir(orchDir);
    },
  };
}
