import { PassThrough } from "node:stream";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import { connectDaemon } from "../../src/daemon/client/rpc.ts";
import { peerHandlers } from "../../src/daemon/server/handlers/peer.ts";
import { peerDrive } from "../../src/daemon/server/handlers/drive.ts";
import { peerStatus } from "../../src/daemon/server/handlers/status.ts";
import { rpcHandlers } from "../../src/daemon/server/handlers/table.ts";
import { idleDaemonState } from "./daemon-state.ts";
import { testDaemonServices } from "./services.ts";
import { heldScreenHandlers } from "../../src/daemon/server/handlers/screen.ts";
import { SETTINGS_DEFAULTS } from "../../src/settings/schema.ts";
import { bindHeldPtys } from "../../src/backends/held/index.ts";
import { serveHostLink } from "../../src/daemon/client/serve.ts";
import { hostIdentity } from "../../src/hosts/identity.ts";
import { daemonStatusFixture, stubRpcHandlers } from "./rpc-handlers.ts";
import { recordingLogger } from "./logger.ts";
import { removeTempDir, tempOrchDir } from "./tempdir.ts";
import type { LinkSpawner } from "../../src/hosts/link.ts";
import type { HostGreeting, HostId } from "../../src/types/host.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { RpcServer } from "../../src/types/daemon.ts";
import type { DaemonState } from "../../src/daemon/server/state.ts";
import type { PtyProvider } from "../../src/types/pty.ts";
import type { PipesProvider } from "../../src/types/pipes.ts";
import type { ModelCatalogue } from "../../src/types/adapter.ts";
import type { ScreenHolder } from "../../src/types/screen.ts";
import type { NotifyEvent } from "../../src/types/notify.ts";

/** Another host's orchd, run in-process: a real RPC server that greets as `greeting.host`,
 *  answers the peer methods as that host, and status for a ping. */
export interface FarOrchd {
  readonly orchDir: OrchDir;
  readonly greeting: HostGreeting;
  /** Its daemon state: the PTYs it holds, its settings, its store. */
  readonly state: DaemonState;
  /** Publish an event on this orchd, as a report from one of its agents would. */
  emit(event: NotifyEvent): void;
  /** A link spawner that runs `orch host serve` against this orchd, as `origin`'s peer. */
  spawner(origin?: HostId): LinkSpawner;
  close(): Promise<void>;
}

export interface FarOrchdOptions {
  /** The terminal holder its agents' screens are attached from: its own held PTYs when absent. */
  readonly screens?: ScreenHolder;
  /** Where its held PTYs come from: fakes when absent. */
  readonly pty?: PtyProvider;
  /** Where its held pipes come from: fakes when absent. */
  readonly pipes?: PipesProvider;
  /** Timeouts beside the short write ack every far orchd here has. */
  readonly timeouts?: Readonly<Record<string, number>>;
  /** The model listing its harnesses answer: the real catalogue, which runs each harness, when absent. */
  readonly models?: ModelCatalogue;
}

export async function startFarOrchd(greeting: HostGreeting, options: FarOrchdOptions = {}): Promise<FarOrchd> {
  const orchDir = tempOrchDir("orch-far-orchd-");
  // Drives its agents with the real handlers. A write's ack waits this long: no far agent here has a harness to ack one.
  const state = idleDaemonState(testDaemonServices({ orchDir, settings: { timeouts: { dispatch_ack_ms: 50, ...options.timeouts } }, models: options.models }), orchDir, options.pty, options.pipes);
  // Its held backend types into and relaunches its own PTYs, as orchd's boot binds them.
  bindHeldPtys(state.held);
  const screens = options.screens ?? state.held;
  // What its agents' bridges report over its socket, answered by orchd's own handlers.
  const own = rpcHandlers(state);
  const handlers = stubRpcHandlers({
    "daemon-status": () => daemonStatusFixture(),
    "subscribe-events": () => ({ subscribed: true }),
    ack: own.ack,
    "control-outcome": own["control-outcome"],
    "report-status": own["report-status"],
    ...peerHandlers(() => greeting.host, { orchDir, logger: recordingLogger().logger, held: () => state.held }),
    "peer-drive": (params, _emit, context) => peerDrive(state, params, context),
    "peer-status": (_params, _emit, context) => peerStatus(state, context),
    ...heldScreenHandlers(orchDir, () => screens, () => SETTINGS_DEFAULTS.attach.queue_bytes),
  });
  const server: RpcServer = await startRpcServer(orchDir, handlers, { logger: recordingLogger().logger, greeting: () => greeting });
  // What its agents report is published on its own server, as orchd's boot wires it.
  state.server = server;
  return {
    orchDir,
    greeting,
    state,
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
