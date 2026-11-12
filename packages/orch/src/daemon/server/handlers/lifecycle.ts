import type { CallerCredential, OrchDir } from "../../../types/core.ts";
import { selfIdentityOf, spaceOfAgent } from "../../../identity/self.ts";
import { callerKindOf } from "../../../policy/caller.ts";
import { holdsLease } from "../../../store/lease-rows.ts";
import { randomUUID } from "node:crypto";
import { hostedHere } from "../../../local-process.ts";
import { placeHere } from "../../../process-place.ts";
import { admitModel } from "../../../policy/model.ts";
import { resolveAdapter } from "../../../adapters/registry.ts";
import { headlessBackend, heldBackend, startHeldAgent } from "../../../backends/registry.ts";
import { insertOutboxMessage } from "../../../store/outbox-rows.ts";
import type { AgentAdapter } from "../../../types/adapter.ts";
import type { BackendSpawnOpts } from "../../../types/backend.ts";
import { deliverControl } from "../../../control/dispatch.ts";
import { publishFromOrchd } from "../events.ts";
import { heldAgentHost } from "../status-events.ts";
import { agentView } from "../../../store/agent-view.ts";
import { agentById, endAgent, hostsRunningLiveAgents, reclaimAgent, setHarness } from "../../../store/agent-rows.ts";
import { linkedHosts } from "../../../store/host-rows.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { retryingAsync } from "../../../retry.ts";
import { setHandle, setTuning } from "../../../store/interval-rows.ts";
import { registerHostedAgent } from "../../../store/spawn-registration.ts";
import { presenceEntry } from "../../../presence/store.ts";
import { isAgentState } from "../../../agent-state.ts";
import { pendingQuestions, recordQuestion, type QuestionRow } from "../../../store/question-rows.ts";
import { governWrite } from "./write.ts";
import { assertHostAdmits } from "../spawn/admission.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import type { LifecycleVerb } from "../../../types/adapter.ts";
import type { DaemonState } from "../state.ts";
import { errorMessage } from "../../../util.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { NotifyEvent } from "../../../types/notify.ts";
import type { HostId } from "../../../types/host.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
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

/** `peer` is the host whose orchd asked for this spawn over its link: the agent runs here and
 *  carries that host and its spawner as its origin. Absent: asked for on this host. */
export async function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">, peer?: HostId): Promise<ResultOf<"spawn-headless">> {
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
  if (params.host !== undefined) {
    if (peer !== undefined) throw new Error(`cannot spawn ${key}: a host's orchd asks only for a spawn here, never on a third host`);
    return spawnOnHost(state, params.host, { ...params, model });
  }
  const prompt = params.prompt;
  // A headless agent here runs its prompt and exits; with none it would die before any dispatch.
  if (peer === undefined && prompt === null) throw new Error(`cannot spawn ${key}: a headless agent needs its prompt at launch`);
  const opts: BackendSpawnOpts = {
    key,
    name: params.name,
    worktree: params.worktree,
    env: params.env,
    orchDir: directory,
    cwd: params.cwd,
    ...(prompt === null ? {} : { prompt }),
    model,
    thinking,
    // The quicklist the harness's own picker gets. It is NOT a second gate: the launch model
    // was ruled on above, and a model outside this list stays launchable.
    preferredModels: params.preferredModels,
    tools: params.tools,
    workers: params.workers,
  };
  if (peer !== undefined) {
    assertHostAdmits(directory, state.services.settings.current(), 1);
    return spawnHeldForPeer(state, adapter, { ...opts, key, firstPrompt: prompt, spawner: null, origin: { askedBy: peer, spawner: params.spawner } });
  }
  const handle = headlessBackend.spawn(adapter, { ...opts, spawner: params.spawner });
  const running = headlessBackend.process.running(handle);
  return { key, backend: headlessBackend.id, handle: JSON.stringify(handle), process: hostedHere(running.pid, running.startToken) };
}

/**
 * Another host asked for this agent, so it runs here as an interactive session in a PTY this
 * orchd holds: its work, rows and logs stay on this host, and any host can attach to its
 * screen. A peer's spawner is an agent on its own host, never one here, so it is the origin.
 *
 * The first prompt, when the spawn has one, goes where every launch prompt goes: into the
 * outbox, which pushes it to the agent's bridge once the bridge attaches.
 */
async function spawnHeldForPeer(state: DaemonState, adapter: AgentAdapter, opts: BackendSpawnOpts & { readonly key: string; readonly firstPrompt: string | null }): Promise<ResultOf<"spawn-headless">> {
  const launched = await startHeldAgent(state.held, adapter, opts);
  // A spawn with no work idles until its first dispatch.
  if (opts.firstPrompt !== null) {
    insertOutboxMessage(state.directory, { id: randomUUID(), target: opts.key, payload: { action: "dispatch", text: opts.firstPrompt } });
    state.wake.wake();
  }
  return { key: opts.key, backend: heldBackend.id, ...launched };
}

/** Start an agent on a linked host: that host's orchd spawns it, runs it and records it. This
 *  orchd keeps the reference: the agent row, the host it runs on, and its spawner's lease, so
 *  the spawner holds it exactly as it holds an agent started here. Its process is that host's. */
async function spawnOnHost(state: DaemonState, hostName: string, params: ParamsOf<"spawn-headless">): Promise<ResultOf<"spawn-headless">> {
  if (params.worktree !== undefined) throw new Error(`a worktree on ${hostName} is not made yet; spawn there without --worktree`);
  if (params.cwd === undefined) throw new Error(`a spawn on ${hostName} must name the directory there to run in`);
  const link = state.hosts.link(hostName);
  const greeting = await link.requireUp();
  // Governed here already; the far orchd runs it for this host, as this host's peer.
  const { key, name, spawner, adapter, model, thinking, prompt, cwd, env, preferredModels, tools, workers } = params;
  const launched = await link.call("spawn-headless", { key, name, spawner, adapter, model, thinking, prompt, cwd, env, preferredModels, tools, workers });
  registerHostedAgent(state.directory, { key, harnessId: adapter, cwd: params.cwd, name, model, thinking, spawner, host: greeting.host });
  return launched;
}

// Throws when the agent refuses or never confirms; the RPC error carries that
// reason to the caller, so `orch model` can never print "accepted" for a model
// the agent did not take.
export async function setModel(state: DaemonState, params: ParamsOf<"set-model">): Promise<{ ok: true; applied: string }> {
  const { target, model } = params;
  governWrite(state, target, params);
  return atAgentHost(state, target, {
    here: (agent) => applyModel(state, agent, model),
    there: async (link) => {
      const { ok, applied } = await driveOnHost(state, link, { action: "model", key: target, model, actor: params.actor ?? null });
      return { ok, applied };
    },
  });
}

/** Switch the model of an agent this orchd runs, ruled on already. */
export async function applyModel(state: DaemonState, agent: HereAgent, model: string): Promise<{ ok: true; applied: string }> {
  const outcome = await deliverControl(state.directory, state.services.settings.current(), state.services.models, agent, { kind: "model", model, id: randomUUID() });
  // A boundary answer is the refusal itself: reporting the model applied would hide it.
  if (outcome.outcome === "answer") throw new Error(outcome.text);
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
  const key = params.key;
  const view = agentView(directory, key);
  // Closing ends its panes here too, even for an agent that had already stopped: a pane
  // following an agent on another host would otherwise wait on a screen that never comes.
  state.hosts.endScreen(key, `${view?.name ?? key} was closed`);
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
    host: view.environment.host,
    space: view.environment.space ?? undefined,
    agent: view.name,
    name: view.name,
    tab: null,
    model: null,
    oldState,
    newState: "closed",
    ts: new Date().toISOString(),
  };
  publishFromOrchd(state, event);
  return { ok: true };
}

/** `clear-session`: give an agent a clean session where it runs, and answer once it is back and
 *  idle. Ruled on here; an agent on a linked host is cleared by that host's orchd, which waits
 *  on its own agent. */
export async function clearSession(state: DaemonState, params: ParamsOf<"clear-session">): Promise<ResultOf<"clear-session">> {
  const { target } = params;
  governWrite(state, target, params);
  return atAgentHost(state, target, {
    here: (agent) => clearHere(state, agent),
    there: async (link) => {
      const { ok } = await driveOnHost(state, link, { action: "clear", key: target, actor: params.actor ?? null });
      return { ok };
    },
  });
}

/** The next step for an agent whose turn will not end on its own. */
function abortHint(name: string): string {
  return `Run orch abort ${name} to stop its turn, then try again, or orch close ${name} and spawn a fresh agent.`;
}

/** Clear the session of an agent this orchd runs, ruled on already: the harness that comes back
 *  claims the row afresh, so the old claim goes first. Answers once the agent reports idle from
 *  a status newer than the clear; a stale idle is the old session answering for the new one. */
export async function clearHere(state: DaemonState, agent: HereAgent): Promise<ResultOf<"clear-session">> {
  const directory = state.directory;
  const key = agent.id;
  const name = agentView(directory, key)?.name ?? key;
  const before = selectAgentStatus(directory, key);
  // A session mid-turn queues the clear behind its turn, so the wait below would only time out.
  if (before?.state === "working") throw new Error(`${name} is mid-turn (working), so its session cannot be cleared. ${abortHint(name)}`);
  const sentAt = Date.now();
  reclaimAgent(directory, key);
  await applyVerb(state, agent, "reset");
  const { reset_ready_ms: readyMs, reset_poll_ms: pollMs } = state.services.settings.current().timeouts;
  const idleAfterClear = (): boolean => {
    const status = selectAgentStatus(directory, key);
    return status !== undefined
      && (before === undefined || status.updatedAt > before.updatedAt)
      && status.updatedAt >= sentAt - pollMs
      && status.state === "idle";
  };
  const ready = await retryingAsync("await idle after clear", idleAfterClear, { attempts: Math.ceil(readyMs / pollMs), delayMs: pollMs, backoff: 1 }, { retryOnResult: (idle) => !idle });
  if (!ready) {
    const last = selectAgentStatus(directory, key)?.state ?? "unknown";
    throw new Error(`Reset ${name} failed: it did not become ready within ${Math.round(readyMs / 1000)}s; its last state is ${last}. ${abortHint(name)}`);
  }
  return { ok: true };
}

/** Apply a lifecycle verb to an agent this orchd runs, ruled on already. */
export async function applyVerb(state: DaemonState, agent: HereAgent, verb: LifecycleVerb): Promise<{ ok: true; verb: LifecycleVerb }> {
  const outcome = await deliverControl(state.directory, state.services.settings.current(), state.services.models, agent, { kind: "lifecycle", verb });
  // A boundary answer is the refusal itself: waiting on a verb never sent only times out.
  if (outcome.outcome === "answer") throw new Error(`cannot ${verb} ${agent.id}: ${outcome.text}`);
  return { ok: true, verb };
}


export function reclaim(directory: OrchDir, params: ParamsOf<"reclaim">): { ok: true } {
  reclaimAgent(directory, params.target);
  const { relaunch } = params;
  if (relaunch) {
    const now = Date.now();
    setHarness(directory, params.target, relaunch.harnessId, now);
    setTuning(directory, params.target, now, { model: relaunch.model, thinking: relaunch.thinking });
  }
  return { ok: true };
}

/** The pane moved; the agent did not become a different agent. The handle is an
 *  interval on its own axis, so the old one closes and a new one opens. */
export function moveHandle(directory: OrchDir, params: ParamsOf<"set-handle">): { ok: true } {
  if (agentView(directory, params.target) === null) throw new Error(`agent ${params.target} does not exist`);
  // A handle names a pane on this machine: only an agent here has one.
  setHandle(directory, placeHere(directory, params.target), Date.now(), params.handle);
  return { ok: true };
}

export function recordAgentQuestion(directory: OrchDir, params: ParamsOf<"question">): { ok: true } {
  const agentId = params.agentId;
  if (agentById(directory, agentId) === null) throw new Error(`question agent ${agentId} does not exist`);
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt, options: [], supersede: true });
  return { ok: true };
}

/** An operator sees every question; anyone else sees only the agents it holds. */
function questionVisibleTo(directory: OrchDir, credential: CallerCredential): (row: { agentId: string }) => boolean {
  if (callerKindOf(directory, credential) === "operator") return () => true;
  const caller = selfIdentityOf(directory, credential)?.id;
  if (caller === undefined) return () => false;
  return (row) => holdsLease(directory, row.agentId, caller);
}

/** One pending question as every reader sees it, from the store of the host its agent runs on. */
export function questionView(directory: OrchDir, row: QuestionRow): PendingQuestionView {
  const agent = agentById(directory, row.agentId);
  return {
    questionId: row.id,
    agentId: row.agentId,
    key: row.agentId,
    name: agent?.name ?? null,
    host: heldAgentHost(directory, row.agentId),
    space: spaceOfAgent(directory, row.agentId),
    question: row.question,
    askedAt: row.askedAt,
  };
}

/** The questions the agents on each linked host are asking, asked of that host's orchd: a
 *  question stays in the store of the host its agent runs on. A host that does not answer
 *  costs its questions only; the miss is logged. */
async function linkedQuestions(state: DaemonState): Promise<PendingQuestionView[]> {
  const names = linkedHosts(state.directory);
  const hosts = [...hostsRunningLiveAgents(state.directory, hostIdentity().id)].flatMap((id) => {
    const host = names.get(id);
    return host === undefined ? [] : [host];
  });
  const answers = await Promise.all(hosts.map(async (host) => {
    try {
      return (await state.hosts.link(host.name).call("peer-questions", {})).questions;
    } catch (error: unknown) {
      state.services.logger.warn("questions.host-unanswered", { host: host.name, error: errorMessage(error) });
      return [];
    }
  }));
  return answers.flat();
}

export async function listPendingQuestions(state: DaemonState, params: ParamsOf<"questions">): Promise<{ questions: PendingQuestionView[] }> {
  const directory = state.directory;
  const visible = questionVisibleTo(directory, params.caller);
  const here = pendingQuestions(directory).filter(visible).map((row) => questionView(directory, row));
  const there = (await linkedQuestions(state)).filter(visible);
  return { questions: [...here, ...there].sort((left, right) => right.askedAt - left.askedAt) };
}
