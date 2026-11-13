import { settleControlOutcome } from "../../control/outcome.ts";
import { appendOutcome } from "../../presence/history.ts";
import { insertControlOutcome } from "../../store/control-outcome-rows.ts";
import type { ControlOutcomeReport } from "../../types/agent.ts";
import type { OrchDir } from "../../types/core.ts";

/** Record an agent's report of a control command and hand it to whoever waits on it: a bridge
 *  sends it over the `control-outcome` RPC, a link orchd holds reports it directly. */
export function recordControlOutcome(directory: OrchDir, report: ControlOutcomeReport): void {
  insertControlOutcome(directory, {
    id: report.id,
    agentId: report.key,
    command: report.command,
    requested: report.requested,
    settledAt: Date.now(),
    ...(report.error === undefined ? {} : { error: report.error }),
  });
  appendOutcome(report.key, directory, { ts: Date.now(), ...report });
  settleControlOutcome(report);
}
