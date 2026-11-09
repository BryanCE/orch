// What doctor, setup and `orch notify test` ask orchd to do on this machine: run doctor's checks
// and fixes, probe and install prerequisites, install integrations, probe and test notifiers.
import { applyFixes, applyFixesUntilSettled, runDoctor } from "../doctor/runner.ts";
import { probeNotifiers } from "../notifier-probe.ts";
import { setupInstall, setupIntegrate, setupPrerequisites } from "../setup.ts";
import { deliver } from "../../../notify/router.ts";
import { notifySinkLabel } from "../../../notify/format.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { allBackends } from "../../../backends/registry.ts";
import type { CheckResult } from "../../../types/doctor.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";
import type { RpcHandler } from "../../../types/daemon.ts";

/** Doctor's checks, run by orchd on itself and this machine; with `fix`, its fixes too. */
export async function doctorRun(state: DaemonState, params: ParamsOf<"doctor">): Promise<ResultOf<"doctor">> {
  const { orchDir, logger, models } = state.services;
  const run = (): Promise<CheckResult[]> => runDoctor({ orchDir, logger, models, socket: state.server?.transport ?? null });
  const initial = await run();
  if (!params.fix) return { results: initial, changes: [] };
  if (params.only === undefined) {
    const { results, applied } = await applyFixesUntilSettled(initial, run);
    return { results, changes: applied };
  }
  const named = new Set(params.only);
  const { applied } = applyFixes(initial.filter((result) => named.has(result.id)));
  return { results: await run(), changes: applied };
}

/** Send one test event in `state` to every configured sink; each answers whether it delivered. */
export async function notifyTest(state: DaemonState, params: ParamsOf<"notify-test">): Promise<ResultOf<"notify-test">> {
  const { orchDir, logger } = state.services;
  const settings = state.services.settings.current();
  const event: NotifyEvent = {
    type: "transition",
    key: "test:notify",
    // A test event about no agent, sent from this machine.
    host: hostIdentity(),
    agent: "notify-test",
    tab: "notify",
    model: "test:medium",
    oldState: "working",
    newState: params.state,
    task: "orch notify test",
    ts: new Date().toISOString(),
  };
  const results = await Promise.all(settings.notify.map(async (sink) => ({ sink: notifySinkLabel(sink), ok: await deliver(orchDir, settings, sink, event, logger) })));
  return { results };
}

type MachineMethod = "doctor" | "setup-prerequisites" | "setup-install" | "setup-integrate" | "notifier-probe" | "plexers-available" | "notify-test";

export function machineHandlers(state: DaemonState): { readonly [M in MachineMethod]: RpcHandler<M> } {
  return {
    doctor: (params) => doctorRun(state, params),
    "setup-prerequisites": (params) => setupPrerequisites(params),
    "setup-install": (params) => setupInstall(state.services.logger, params),
    "setup-integrate": (params) => setupIntegrate(state.services, params),
    "notifier-probe": async () => ({ choices: await probeNotifiers(state.services.settings.currentOrNull()) }),
    "plexers-available": () => ({ plexers: allBackends().filter((backend) => backend.isAvailable()).map((backend) => backend.id) }),
    "notify-test": (params) => notifyTest(state, params),
  };
}
