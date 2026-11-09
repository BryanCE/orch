import type { DaemonState } from "../../src/daemon/server/state.ts";
import { createWakeSignal } from "../../src/daemon/server/wake.ts";
import { PtyHold } from "../../src/daemon/server/held.ts";
import type { PtyProvider } from "../../src/types/pty.ts";
import { FakePtyProvider } from "./fake-pty.ts";
import { HostLinks } from "../../src/hosts/link.ts";
import { applyHostEvent } from "../../src/daemon/server/host-events.ts";
import { rpcHandlers } from "../../src/daemon/server/handlers/table.ts";
import { startRpcServer } from "../../src/daemon/server/rpc.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { RpcServer } from "../../src/types/daemon.ts";
import type { Services } from "../../src/types/services.ts";
import { testServices, type TestServicesOptions } from "./services.ts";

/** The real handler table on this dir's socket, in-process, so a command under
 *  test reaches orchd the way it does in use. No loop, no timers; close it after. */
async function serveDaemon(services: Services): Promise<RpcServer> {
  const state = idleDaemonState(services, services.orchDir);
  const server = await startRpcServer(services.orchDir, rpcHandlers(state), { logger: services.logger });
  state.server = server;
  return server;
}

/** Services whose writes reach {@link serveDaemon} on this dir. The server lands
 *  in `servers` for the test's afterEach to close. */
export async function servedServices(options: TestServicesOptions, servers: RpcServer[]): Promise<Services> {
  const services = testServices(options);
  servers.push(await serveDaemon(services));
  return services;
}

/** A daemon that has booted nothing: no server, no loop, no timers. Its held PTYs come
 *  from `pty`, a fake unless the test hands in its own. */
export function idleDaemonState(services: Services, directory: OrchDir, pty: PtyProvider = new FakePtyProvider()): DaemonState {
  const state: DaemonState = {
    services,
    directory,
    workController: new AbortController(),
    wake: createWakeSignal(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    loopWatchdog: undefined,
    settingsWatch: undefined,
    hosts: new HostLinks({
      orchDir: directory,
      settings: () => services.settings.current(),
      logger: services.logger,
      events: (host, event) => { applyHostEvent(state, host, event); },
    }),
    held: new PtyHold(pty, () => services.settings.current().pty),
    fatalLogged: false,
  };
  return state;
}
