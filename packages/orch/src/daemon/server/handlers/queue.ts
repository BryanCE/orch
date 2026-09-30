// The pack queue, written by orchd. Every agent here arrives as a minted id:
// the CLI resolved the typed target through `resolve-target` first.
import { cancelTask, closePackIntake, editTask, history, listTasks, openPackIntake, packIntakes, reapTask, takeOnTask } from "../../../queue.ts";
import { agentById } from "../../../store/agent-rows.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** The pack an agent id belongs to: its root agent's id. */
function packOf(directory: OrchDir, agentId: string): string {
  const agent = agentById(directory, agentId);
  if (agent === null) throw new Error(`Unknown agent: ${agentId}`);
  return agent.rootAgentId;
}

export function listQueued(directory: OrchDir, params: ParamsOf<"queue-list">): ResultOf<"queue-list"> {
  return { tasks: params.history ? history(directory) : listTasks(directory) };
}

export function cancelQueued(directory: OrchDir, params: ParamsOf<"queue-cancel">): ResultOf<"queue-cancel"> {
  const task = cancelTask(directory, params.target, params.by, { human: true });
  if (task.error) throw new Error(task.error);
  return { task };
}

export function editQueued(directory: OrchDir, params: ParamsOf<"queue-edit">): ResultOf<"queue-edit"> {
  const task = editTask(directory, params.target, params.by, { text: params.text });
  if (task.error) throw new Error(task.error);
  return { task };
}

export function takeOnQueued(directory: OrchDir, params: ParamsOf<"queue-take-on">): ResultOf<"queue-take-on"> {
  return { task: takeOnTask(directory, params.target, params.taker) };
}

export function reapQueued(directory: OrchDir, params: ParamsOf<"queue-reap">): ResultOf<"queue-reap"> {
  reapTask(directory, params.target, params.by);
  return { ok: true };
}

/** The pack whose consent is recorded: the caller's own, or that of an agent it names. */
export function intakeQueued(directory: OrchDir, params: ParamsOf<"queue-intake">): ResultOf<"queue-intake"> {
  const pack = packOf(directory, params.agent ?? params.by);
  if (params.space === undefined) return { intakes: packIntakes(directory, pack) };
  const intakes = params.close
    ? closePackIntake(directory, pack, params.space, params.by)
    : openPackIntake(directory, pack, params.space, params.by);
  return { intakes };
}
