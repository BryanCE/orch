import type { DaemonState } from "../../src/daemon/server/state.ts";
import { createWakeSignal } from "../../src/daemon/server/wake.ts";
import { PtyHold } from "../../src/daemon/server/held.ts";
import type { PtyProvider } from "../../src/types/pty.ts";
import type { PipesProvider } from "../../src/types/pipes.ts";
import { FakePtyProvider } from "./fake-pty.ts";
import { fakePipes } from "./fake-pipes.ts";
import { HostLinks } from "../../src/hosts/link.ts";
import { applyHostEvent, reconcileHostAgents } from "../../src/daemon/server/host-events.ts";
import { rpcHandlers } from "../../src/daemon/server/handlers/table.ts";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import { Receipts } from "../../src/daemon/server/receipts.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { RpcServer } from "../../src/types/daemon.ts";
import type { DaemonServices, Services } from "../../src/types/services.ts";
import { createModelCatalogue } from "../../src/adapters/model-catalogue.ts";
import { testServices, type TestServicesOptions } from "./services.ts";
import { createServices } from "../../src/services.ts";

/** The real handler table on this dir's socket, in-process, so a command under
 *  test reaches orchd the way it does in use. No loop, no timers; close it after. */
export async function serveDaemon(services: Services | DaemonServices): Promise<RpcServer> {
  const state = idleDaemonState(services, services.orchDir);
  const server = await startRpcServer(services.orchDir, rpcHandlers(state), { logger: services.logger });
  state.server = server;
  return server;
}

/** Services whose writes reach {@link serveDaemon} on this dir. The server lands
 *  in `servers` for the test's afterEach to close. */
export async function servedServices(options: TestServicesOptions, servers: RpcServer[]): Promise<Services> {
  const services = testServices(options);
  // orchd answers from the model listing a test hands in; the CLI holds none.
  servers.push(await serveDaemon(options.models === undefined ? services : { ...services, models: options.models }));
  return services;
}

/** The real handler table on this dir's socket, reading settings.json from disk as orchd does,
 *  for a command under test that writes the file and expects orchd to act on it. */
export async function serveFileDaemon(orchDir: OrchDir, servers: RpcServer[]): Promise<void> {
  servers.push(await serveDaemon(createServices({ orchDir })));
}

/** A daemon that has booted nothing: no server, no loop, no timers. Its held PTYs come
 *  from `pty`, a fake unless the test hands in its own. */
export function idleDaemonState(services: Services | DaemonServices, directory: OrchDir, pty: PtyProvider = new FakePtyProvider(), pipes: PipesProvider = fakePipes().provider): DaemonState {
  // A client's services gain the catalogue orchd builds at its root; a test's own listing stays.
  const daemon: DaemonServices = "models" in services ? services : { ...services, models: createModelCatalogue(services.orchDir, services.logger) };
  const state: DaemonState = {
    services: daemon,
    directory,
    workController: new AbortController(),
    wake: createWakeSignal(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    loopWatchdog: undefined,
    settingsWatch: undefined,
    receipts: new Receipts(() => services.settings.current().links.receipt_ttl_ms),
    hosts: new HostLinks({
      orchDir: directory,
      settings: () => services.settings.current(),
      logger: services.logger,
      changed: () => undefined,
      events: (host, event) => { applyHostEvent(state, host, event); },
      agents: (host, rows, askedAt) => { reconcileHostAgents(state, host, rows, askedAt); },
    }),
    held: new PtyHold(pty, () => services.settings.current().pty),
    pipes,
    fatalLogged: false,
  };
  return state;
}
