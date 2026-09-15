import type { DaemonState } from "../../src/daemon/server/state.ts";
import { createWakeSignal } from "../../src/daemon/server/wake.ts";
import type { OrchDir } from "../../src/types/core.ts";
import type { Services } from "../../src/types/services.ts";

/** A daemon that has booted nothing: no server, no loop, no timers. */
export function idleDaemonState(services: Services, directory: OrchDir): DaemonState {
  return {
    services,
    directory,
    workController: new AbortController(),
    wake: createWakeSignal(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    settingsWatch: undefined,
    lastActivityAt: 0,
    logger: undefined,
    fatalLogged: false,
  };
}
