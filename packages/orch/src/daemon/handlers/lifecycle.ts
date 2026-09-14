import type { OrchDir } from "../../types/core.ts";
import { randomUUID } from "node:crypto";
import { admitModel } from "../../policy/model.ts";
import { resolveAdapter } from "../../adapters/registry.ts";
import { headlessBackend } from "../../backends/registry.ts";
import { deliverControl } from "../../control/dispatch.ts";
import { emitAndNotify } from "../events.ts";
import { agentView } from "../../store/agent-view.ts";
import { agentById } from "../../store/agent-rows.ts";
import { pendingQuestions, recordQuestion } from "../../store/question-rows.ts";
import { governWrite } from "./write.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf } from "../rpc/protocol.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { PendingQuestionView } from "../../types/daemon.ts";

/**
 * Launch one headless agent from INSIDE the daemon.
 *
 * A headless agent has no TTY: it runs the prompt it was launched with and exits.
 * The prompt is therefore required, not optional — a headless agent with nothing
 * to do registers, finds no work, and dies before anything can be sent to it.
 * orchd owns the launch because it already owns delivery and outlives the agent.
 */
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
export function publishClosedAgent(state: DaemonState, params: ParamsOf<"agent-closed">): { ok: true } {
  const directory = state.directory;
  const settings = state.services.settings;
  const key = params.key;
  const oldState = params.oldState;
  const view = agentView(directory, key);
  if (!view) throw new Error(`agent ${key} does not exist`);
  if (view.endedAt === null) throw new Error(`agent ${key} has not ended`);
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
  emitAndNotify((published) => state.server?.emit(published), settings.current().notify, event, directory, settings);
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

export function recordAgentQuestion(directory: OrchDir, params: ParamsOf<"question">): { ok: true } {
  const agentId = params.agentId;
  if (agentById(directory, agentId) === null) throw new Error(`question agent ${agentId} does not exist`);
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt });
  return { ok: true };
}

export function listPendingQuestions(directory: OrchDir): { questions: PendingQuestionView[] } {
  const questions = pendingQuestions(directory)
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
