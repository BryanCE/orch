import { computeFleetCapacity, formatCapacityLine } from "../../policy/capacity.ts";
import { registerCallerSession, whoAmI, refuseNonOperatorOverride } from "../self.ts";
import { ensureDaemonOrWarn } from "../../daemon/client/reach.ts";
import { readRpc } from "../daemon.ts";
import { filterRowKeys, formatNoRowsMessage, callerScope } from "./options.ts";
import type { CallerScope, StatusOptions } from "./options.ts";
import { readStatusResult } from "./fetch.ts";
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

export async function cmdStatus(services: Services, options: StatusOptions): Promise<void> {
  let caller: CallerScope;
  let orchId: string | null;
  if (!options.offline) {
    await ensureDaemonOrWarn(services.orchDir, services.logger);
    await registerCallerSession(services);
    const self = await whoAmI(services);
    caller = callerScope(self);
    orchId = self.id;
  } else {
    caller = offlineCallerScope(services.orchDir);
    orchId = currentOrchId(services.orchDir);
  }
  if (options.spaceWide) refuseNonOperatorOverride(caller, "--space-wide");
  if (options.allPanes) refuseNonOperatorOverride(caller, "--all-panes");
  if (options.capacity) {
    const settings = services.settings.currentOrNull();
    if (settings === null) throw new Error("capacity unavailable: settings.json does not exist");
    const output = await capacityLine(services, orchId, settings, options.offline);
    if (options.json) {
      process.stdout.write(JSON.stringify({ capacity: output.capacity }, null, 2) + "\n");
    } else {
      process.stdout.write(output.line + "\n");
    }
    return;
  }
  const result = await readStatusResult(services, options, caller);
  const settings = options.json ? null : services.settings.currentOrNull();
  if (options.json) {
    process.stdout.write(JSON.stringify(result.rows.map((row) => filterRowKeys(row, options.filter.columns)), null, 2) + "\n");
    return;
  }
  let footer: string | null = null;
  if (settings !== null) {
    footer = (await capacityLine(services, orchId, settings, options.offline)).line;
  }
  if (!result.rows.length) {
    process.stdout.write(formatNoRowsMessage(result));
    if (footer !== null) process.stdout.write(footer + "\n");
    return;
  }
  process.stdout.write(formatStatusTable(result.rows, { spaceWide: options.spaceWide, host: result.host, human: options.human, columns: options.filter.columns }) + "\n");
  if (footer !== null) process.stdout.write(footer + "\n");
}
