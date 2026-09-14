import { computeFleetCapacity, formatCapacityLine } from "../../policy/capacity.ts";
import { ensureCallerRegistered } from "../../identity/self.ts";
import { ensureDaemonOrWarn, rpcRegisterSession } from "../../daemon/client/reach.ts";
import { forbidNonOperatorOverride, presenceById } from "../target.ts";
import { loadPresence, spawnedRecords } from "../../presence/store.ts";
import { callerScope, filterRowKeys, formatNoRowsMessage } from "./options.ts";
import type { StatusOptions } from "./options.ts";
import { readStatusResult } from "./fetch.ts";
import { formatStatusTable } from "./table.ts";
import { currentOrchId } from "./rows.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { OrchDir } from "../../types/core.ts";
import type { Services } from "../../types/services.ts";

function capacityOutput(orchDir: OrchDir, settings: OrchSettings): { capacity: ReturnType<typeof computeFleetCapacity>; line: string } {
  const capacity = computeFleetCapacity(spawnedRecords(orchDir), presenceById(loadPresence(orchDir)), settings);
  return { capacity, line: formatCapacityLine(capacity, currentOrchId(orchDir) ?? undefined) };
}

export async function cmdStatus(services: Services, options: StatusOptions): Promise<void> {
  if (!options.offline) {
    await ensureDaemonOrWarn(services.orchDir, services.logger);
    await ensureCallerRegistered(services.orchDir, (directory) => rpcRegisterSession(directory, services.logger));
  }
  const caller = callerScope(services.orchDir);
  if (options.spaceWide) forbidNonOperatorOverride(services.orchDir, "--space-wide");
  if (options.allPanes) forbidNonOperatorOverride(services.orchDir, "--all-panes");
  if (options.capacity) {
    const settings = services.settings.currentOrNull();
    if (settings === null) throw new Error("capacity unavailable: settings.json does not exist");
    const output = capacityOutput(services.orchDir, settings);
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
  const capacityLine = settings === null ? null : capacityOutput(services.orchDir, settings).line;
  if (!result.rows.length) {
    process.stdout.write(formatNoRowsMessage(result));
    if (capacityLine !== null) process.stdout.write(capacityLine + "\n");
    return;
  }
  process.stdout.write(formatStatusTable(result.rows, { spaceWide: options.spaceWide, host: result.host, human: options.human, columns: options.filter.columns }) + "\n");
  if (capacityLine !== null) process.stdout.write(capacityLine + "\n");
}
