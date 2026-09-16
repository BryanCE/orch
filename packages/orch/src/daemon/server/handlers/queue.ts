// The pack queue, written by orchd. A name is for the human and carries no
// uniqueness, so resolving one is a lookup that finds one agent or asks which id.
import { asc, eq } from "drizzle-orm";
import { agents } from "../../../db/schema.ts";
import { cancelTask, closePackIntake, editTask, history, listTasks, openPackIntake, packIntakes, reapTask, takeOnTask } from "../../../queue.ts";
import { agentById } from "../../../store/agent-rows.ts";
import { orm } from "../../../store/connection.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** An agent id, or the one agent a name means. */
export function resolveAgentTarget(directory: OrchDir, params: ParamsOf<"resolve-agent">): ResultOf<"resolve-agent"> {
  const target = params.target;
  const byId = agentById(directory, target);
  if (byId !== null) return { id: byId.id, rootAgentId: byId.rootAgentId };
  const rows = orm(directory).select({ id: agents.id, rootAgentId: agents.rootAgentId }).from(agents)
    .where(eq(agents.name, target)).orderBy(asc(agents.id)).all();
  if (rows.length === 0) throw new Error(`Unknown agent: ${target}`);
  if (rows.length > 1) throw new Error(`Ambiguous agent: ${target}; use its id`);
  return rows[0]!;
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
  const taker = resolveAgentTarget(directory, { target: params.taker }).id;
  return { task: takeOnTask(directory, params.target, taker) };
}

export function reapQueued(directory: OrchDir, params: ParamsOf<"queue-reap">): ResultOf<"queue-reap"> {
  reapTask(directory, params.target, params.by);
  return { ok: true };
}

/** The pack whose consent is recorded: the caller's own, or that of an agent it names. */
export function intakeQueued(directory: OrchDir, params: ParamsOf<"queue-intake">): ResultOf<"queue-intake"> {
  const pack = resolveAgentTarget(directory, { target: params.agent ?? params.by }).rootAgentId;
  if (params.space === undefined) return { intakes: packIntakes(directory, pack) };
  const intakes = params.close
    ? closePackIntake(directory, pack, params.space, params.by)
    : openPackIntake(directory, pack, params.space, params.by);
  return { intakes };
}
