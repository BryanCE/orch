import { computeFleetCapacity, formatCapacityLine } from "../../policy/capacity.ts";
import { registerCallerSession, whoAmI, refuseNonOperatorOverride } from "../self.ts";
import { ensureDaemonOrWarn } from "../../daemon/client/reach.ts";
import { filterRowKeys, formatNoRowsMessage, callerScope } from "./options.ts";
import type { CallerScope, StatusOptions } from "./options.ts";
import { readStatusResult } from "./fetch.ts";
import { formatStatusTable } from "./table.ts";
import { currentOrchId, offlineCallerScope, offlineCapacityFleet } from "./offline.ts";
import { readFleet } from "../fleet.ts";
import { indexPresenceById } from "../../entities/lookup.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { Services } from "../../types/services.ts";

function capacityOutput(orchId: string | null, settings: OrchSettings, views: ReadonlyMap<string, AgentView>, presence: ReadonlyMap<string, PresenceEntry>): { capacity: ReturnType<typeof computeFleetCapacity>; line: string } {
  const capacity = computeFleetCapacity(views, presence, settings);
  return { capacity, line: formatCapacityLine(capacity, orchId ?? undefined) };
}

/** The fleet the capacity line counts: from orchd, or from the store when the command runs offline. */
async function capacityFleet(services: Services, offline: boolean): Promise<{ views: ReadonlyMap<string, AgentView>; presence: ReadonlyMap<string, PresenceEntry> }> {
  if (offline) return offlineCapacityFleet(services.orchDir);
  const fleet = await readFleet(services, true);
  return { views: new Map(fleet.views.filter((view) => view.endedAt === null).map((view) => [view.id, view])), presence: indexPresenceById(fleet.presence) };
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
    const fleet = await capacityFleet(services, options.offline);
    const output = capacityOutput(orchId, settings, fleet.views, fleet.presence);
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
  let capacityLine: string | null = null;
  if (settings !== null) {
    const fleet = await capacityFleet(services, options.offline);
    capacityLine = capacityOutput(orchId, settings, fleet.views, fleet.presence).line;
  }
  if (!result.rows.length) {
    process.stdout.write(formatNoRowsMessage(result));
    if (capacityLine !== null) process.stdout.write(capacityLine + "\n");
    return;
  }
  process.stdout.write(formatStatusTable(result.rows, { spaceWide: options.spaceWide, host: result.host, human: options.human, columns: options.filter.columns }) + "\n");
  if (capacityLine !== null) process.stdout.write(capacityLine + "\n");
}
