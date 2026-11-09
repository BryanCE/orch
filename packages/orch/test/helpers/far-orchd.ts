import { PassThrough } from "node:stream";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import { connectDaemon } from "../../src/daemon/client/rpc.ts";
import { peerHandlers } from "../../src/daemon/server/handlers/peer.ts";
import { peerDrive } from "../../src/daemon/server/handlers/drive.ts";
import { idleDaemonState } from "./daemon-state.ts";
import { testServices } from "./services.ts";
import { heldScreenHandlers } from "../../src/daemon/server/handlers/screen.ts";
import { SETTINGS_DEFAULTS } from "../../src/settings/schema.ts";
import { FakeScreenHolder } from "./screen-holder.ts";
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

/** `screens` is the terminal holder its agents' screens are attached from. */
export async function startFarOrchd(greeting: HostGreeting, screens: FakeScreenHolder = new FakeScreenHolder()): Promise<FarOrchd> {
  const orchDir = tempOrchDir("orch-far-orchd-");
  // Drives its agents with the real handlers. A write's ack waits this long: no far agent here has a harness to ack one.
  const state = idleDaemonState(testServices({ orchDir, settings: { timeouts: { dispatch_ack_ms: 50 } } }), orchDir);
  const handlers = stubRpcHandlers({
    "daemon-status": () => daemonStatusFixture(),
    "subscribe-events": () => ({ subscribed: true }),
    ...peerHandlers(() => greeting.host, orchDir, recordingLogger().logger),
    "peer-drive": (params, _emit, context) => peerDrive(state, params, context),
    ...heldScreenHandlers(orchDir, () => screens, () => SETTINGS_DEFAULTS.attach.queue_bytes),
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
