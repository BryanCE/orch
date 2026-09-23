import type { CallerCredential, OrchDir } from "../../../types/core.ts";
import { selfIdentityOf } from "../../../identity/self.ts";
import { callerKindOf } from "../../../policy/caller.ts";
import { holdsLease } from "../../../store/lease-rows.ts";
import { randomUUID } from "node:crypto";
import { admitModel } from "../../../policy/model.ts";
import { resolveAdapter } from "../../../adapters/registry.ts";
import { headlessBackend } from "../../../backends/registry.ts";
import { deliverControl } from "../../../control/dispatch.ts";
import { emitAndNotify } from "../events.ts";
import { agentView } from "../../../store/agent-view.ts";
import { agentById, endAgent, reclaimAgent } from "../../../store/agent-rows.ts";
import { setHandle } from "../../../store/interval-rows.ts";
import { registerSpawnedAgent } from "../../../store/spawn-registration.ts";
import { presenceEntry } from "../../../presence/store.ts";
import { isAgentState } from "../../../agent-state.ts";
import { pendingQuestions, recordQuestion } from "../../../store/question-rows.ts";
import { governWrite } from "./write.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { PendingQuestionView } from "../../../types/daemon.ts";
import { addTask } from "../../../queue.ts";
import type { TaskRec } from "../../../types/queue.ts";

/**
 * Launch one headless agent from INSIDE the daemon.
 *
 * A headless agent has no TTY: it runs the prompt it was launched with and exits.
 * The prompt is therefore required, not optional — a headless agent with nothing
 * to do registers, finds no work, and dies before anything can be sent to it.
 * orchd owns the launch because it already owns delivery and outlives the CLI.
 */
export function enqueue(state: DaemonState, params: ParamsOf<"enqueue">): { task: TaskRec } {
  const task = addTask(state.directory, params.text, params.opts, params.enqueuedBy, params.scope);
  state.wake.wake();
  return { task };
}

export function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">): { key: string; pid: number } {
  const directory = state.directory;
  const key = params.key;
  const adapterId = params.adapter;
  const adapter = resolveAdapter(adapterId);
  if (!adapter) throw new Error(`cannot spawn ${key}: unknown adapter ${adapterId}`);
  // Required AND ruled on: a launch with no model runs on whatever the harness
  // defaults to, and a shorthand one gets fuzzy-matched onto whatever registry
  // entry shares a prefix. Both end with the fleet on a model nobody asked for.
  const model = admitModel(state.services.settings.current(), adapter, state.services.models, params.model);
  const thinking = params.thinking;
  const handle = headlessBackend.spawn(adapter, {
    key,
    env: params.env,
    orchDir: directory,
    cwd: params.cwd,
    prompt: params.prompt,
    model,
    thinking,
    // The quicklist the harness's own picker gets. It is NOT a second gate: the launch model
    // was ruled on above, and a model outside this list stays launchable.
    preferredModels: params.preferredModels,
    reportTimeoutMs: state.services.settings.current().daemon.report_timeout_ms,
    tools: params.tools,
    workers: params.workers,
  });
  return { key, pid: handle.pid };
}

// Throws when the agent refuses or never confirms; the RPC error carries that
// reason to the caller, so `orch model` can never print "accepted" for a model
// the agent did not take.
export async function setModel(state: DaemonState, params: ParamsOf<"set-model">): Promise<{ ok: true; applied: string }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const model = params.model;
  governWrite(state, target, params);
  await deliverControl(directory, settings.current(), state.services.models, target, { kind: "model", model, id: randomUUID() });
  return { ok: true, applied: model };
}

/** Apply a lifecycle verb from inside the daemon. A console-less agent is relaunched
 *  to satisfy the verb, and a relaunch must happen here: the spawner holds the new
 *  process's stdin, and only orchd outlives the agent it starts. */
/** Close is the SECOND ending verb. The process is gone; an `agent_endings` row
 *  is written, row and history stay, and only `reap` deletes. An agent that had
 *  already ended, or whose row the reaper already deleted, is left as it is and
 *  nothing is published twice: closing what is gone is a no-op, never an error. */
export function closeAgent(state: DaemonState, params: ParamsOf<"agent-closed">): { ok: true } {
  const directory = state.directory;
  const settings = state.services.settings;
  const key = params.key;
  const view = agentView(directory, key);
  if (view?.endedAt !== null) return { ok: true };
  // The status row is the boundary: a state it does not carry, or one orch
  // does not know, means the agent had already left.
  const reported = presenceEntry(directory, key)?.status?.state;
  const oldState = isAgentState(reported) ? reported : "exited";
  const closedBy = params.actor !== undefined && agentView(directory, params.actor) !== null ? params.actor : null;
  endAgent(directory, key, Date.now(), closedBy);
  const event: NotifyEvent = {
    type: "closed",
    key,
    space: view.environment.space ?? undefined,
    agent: view.name,
    name: view.name,
    tab: null,
    model: null,
    oldState,
    newState: "closed",
    ts: new Date().toISOString(),
  };
  emitAndNotify((published) => state.server?.emit(published), settings.current().notify, event, directory, settings, Date.now(), state.services.logger);
  return { ok: true };
}

export async function applyLifecycle(state: DaemonState, params: ParamsOf<"lifecycle">): Promise<{ ok: true; verb: ParamsOf<"lifecycle">["verb"] }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const verb = params.verb;
  governWrite(state, target, params);
  await deliverControl(directory, settings.current(), state.services.models, target, { kind: "lifecycle", verb });
  return { ok: true, verb };
}

/** ONE writer for one record: a placed spawn launched the process from the CLI
 *  and states every axis here; orchd writes the row. */
export function registerAgent(directory: OrchDir, params: ParamsOf<"register-agent">): { ok: true } {
  registerSpawnedAgent(directory, params);
  return { ok: true };
}

export function reclaim(directory: OrchDir, params: ParamsOf<"reclaim">): { ok: true } {
  reclaimAgent(directory, params.target);
  return { ok: true };
}

/** The pane moved; the agent did not become a different agent. The handle is an
 *  interval on its own axis, so the old one closes and a new one opens. */
export function moveHandle(directory: OrchDir, params: ParamsOf<"set-handle">): { ok: true } {
  if (agentView(directory, params.target) === null) throw new Error(`agent ${params.target} does not exist`);
  setHandle(directory, params.target, Date.now(), params.handle);
  return { ok: true };
}

export function recordAgentQuestion(directory: OrchDir, params: ParamsOf<"question">): { ok: true } {
  const agentId = params.agentId;
  if (agentById(directory, agentId) === null) throw new Error(`question agent ${agentId} does not exist`);
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt });
  return { ok: true };
}

/** An operator sees every question; anyone else sees only the agents it holds. */
function questionVisibleTo(directory: OrchDir, credential: CallerCredential): (row: { agentId: string }) => boolean {
  if (callerKindOf(directory, credential) === "operator") return () => true;
  const caller = selfIdentityOf(directory, credential)?.id;
  if (caller === undefined) return () => false;
  return (row) => holdsLease(directory, row.agentId, caller);
}

export function listPendingQuestions(directory: OrchDir, params: ParamsOf<"questions">): { questions: PendingQuestionView[] } {
  const questions = pendingQuestions(directory)
    .filter(questionVisibleTo(directory, params.caller))
    .sort((left, right) => right.askedAt - left.askedAt)
    .map((row): PendingQuestionView => {
      const agent = agentById(directory, row.agentId);
      return {
        questionId: row.id,
        agentId: row.agentId,
        key: row.agentId,
        name: agent?.name ?? null,
        question: row.question,
        askedAt: row.askedAt,
      };
    });
  return { questions };
}
