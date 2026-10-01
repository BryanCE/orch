import { computeFleetCapacity, formatCapacityLine } from "../../policy/capacity.ts";
import { registerCallerSession, whoAmI, refuseNonOperatorOverride } from "../self.ts";
import { ensureDaemonOrWarn } from "../../daemon/client/reach.ts";
import { readRpc } from "../daemon.ts";
import { filterRowKeys, formatNoRowsMessage, callerScope, ownsLiveWorker } from "./options.ts";
import type { CallerScope, StatusOptions } from "./options.ts";
import { readStatusResult, resolveStatusAgent } from "./fetch.ts";
import { formatStatusTable } from "./table.ts";
import { currentOrchId, offlineCallerScope, offlineCapacityFleet } from "./offline.ts";
import type { FleetCapacity } from "../../policy/capacity.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { Services } from "../../types/services.ts";

/** The capacity computed from the store, for a status run with no daemon. */
function offlineCapacity(services: Services, settings: OrchSettings): FleetCapacity {
  const fleet = offlineCapacityFleet(services.orchDir);
  return computeFleetCapacity(fleet.views, fleet.presence, settings);
}

/** The capacity line: from orchd's held capacity, or computed from the store when offline. */
async function capacityLine(services: Services, orchId: string | null, settings: OrchSettings, offline: boolean): Promise<{ capacity: FleetCapacity; line: string }> {
  const capacity = offline ? offlineCapacity(services, settings) : await readRpc(services, "capacity", {});
  return { capacity, line: formatCapacityLine(capacity, orchId ?? undefined) };
}

async function resolveCaller(services: Services, offline: boolean): Promise<{ caller: CallerScope; orchId: string | null }> {
  if (!offline) {
    await ensureDaemonOrWarn(services.orchDir, services.logger);
    await registerCallerSession(services);
    const self = await whoAmI(services);
    return { caller: callerScope(self), orchId: self.id };
  }
  return { caller: offlineCallerScope(services.orchDir), orchId: currentOrchId(services.orchDir) };
}

async function writeCapacityStatus(services: Services, options: StatusOptions, orchId: string | null): Promise<void> {
  const settings = services.settings.currentOrNull();
  if (settings === null) throw new Error("capacity unavailable: settings.json does not exist");
  const output = await capacityLine(services, orchId, settings, options.offline);
  process.stdout.write(options.json ? JSON.stringify({ capacity: output.capacity }, null, 2) + "\n" : output.line + "\n");
}

async function writeStatusRows(services: Services, options: StatusOptions, caller: CallerScope, orchId: string | null): Promise<void> {
  const result = await readStatusResult(services, options, caller, await resolveStatusAgent(services, options));
  if (options.json) {
    const rows = result.rows.map((row) => filterRowKeys(row, options.hide.columns));
    process.stdout.write(JSON.stringify({ names: result.names, rows }, null, 2) + "\n");
    return;
  }
  const settings = services.settings.currentOrNull();
  const footer = settings === null ? null : (await capacityLine(services, orchId, settings, options.offline)).line;
  if (shouldShowNoRows(options, result.rows, caller.id)) {
    process.stdout.write(formatNoRowsMessage({ otherLive: result.otherLive }));
  } else {
    process.stdout.write(formatStatusTable(result, { all: options.all, host: result.host, callerId: caller.id, human: options.human, columns: options.hide.columns }) + "\n");
  }
  if (footer !== null) process.stdout.write(footer + "\n");
}

function shouldShowNoRows(options: StatusOptions, rows: Parameters<typeof ownsLiveWorker>[0], callerId: string | null): boolean {
  return (options.agent === undefined && !options.all && !ownsLiveWorker(rows, callerId)) || rows.length === 0;
}

export async function cmdStatus(services: Services, options: StatusOptions): Promise<void> {
  const { caller, orchId } = await resolveCaller(services, options.offline);
  if (options.all) refuseNonOperatorOverride(caller, "--all");
  if (options.capacity) return writeCapacityStatus(services, options, orchId);
  return writeStatusRows(services, options, caller, orchId);
}
