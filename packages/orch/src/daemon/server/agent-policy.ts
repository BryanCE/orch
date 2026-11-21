// The policy an agent that already exists relaunches under. A spawn plans each agent's policy
// from the request. A restart has only the store, so what a relaunch must keep is read back here.
import { readOnlyPolicy } from "../../policy/workers.ts";
import { CommandRefusal } from "../../refusal.ts";
import { readOnlyOf } from "../../store/read-only-rows.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import type { OrchDir, WorkerHeaderContext } from "../../types/core.ts";
import type { WorkerPolicy } from "../../types/policy.ts";
import type { OrchSettings } from "../../types/settings.ts";

/** The policy `agentId` relaunches under on `adapter`: a read-only agent's, or undefined for
 *  any other agent, which relaunches as its harness's own launch. A harness that cannot refuse
 *  a tool call is refused, since the agent would come back with every tool. */
export function relaunchPolicy(directory: OrchDir, settings: OrchSettings, adapter: AgentAdapter, agentId: string): WorkerPolicy | undefined {
  const readOnly = readOnlyOf(directory, agentId);
  if (readOnly === null) return undefined;
  const role = adapter.readOnly;
  if (role === null) throw new CommandRefusal(`this agent is read-only, and ${adapter.id} cannot hold it to that: orch has no way to refuse its tool calls`);
  return readOnlyPolicy(settings, readOnly, role.tools);
}

/** What a worker header says about `agentId` that only the store knows. */
export function storedHeaderContext(directory: OrchDir, agentId: string): Pick<WorkerHeaderContext, "readOnly"> {
  const readOnly = readOnlyOf(directory, agentId);
  return readOnly === null ? {} : { readOnly };
}
