import type { OrchDir } from "../types/core.ts";
import "../store/suppress-sqlite-warning.ts";
import {
  acquireDaemonLock,
  computeCodeHash,
  reexecSelf,
  releaseDaemonLock,
  acquireDaemonRegistration,
  daemonStartRefusal,
  releaseDaemonRegistration,
} from "./lifecycle.ts";
import { rpcCall } from "./rpc/client.ts";
import { startRpcServer } from "./rpc/server.ts";
import { absentSettingsMessage, logLevelFor } from "../settings/read.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { createServices } from "../services.ts";
import { watchSettings } from "../settings/watch.ts";
import { runWorkLoop } from "./work-loop.ts";
import { emitAndNotify, startPresenceWatch } from "./events.ts";
import { loadPresence } from "../presence/store.ts";
import { errorMessage, errorTrace } from "../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../store/connection.ts";
import { currentLease } from "../store/lease-rows.ts";
import { insertOutboxMessage, markOutboxDelivered, outboxMessageState, selectOpenOutboxForTarget, selectOutboxMessage } from "../store/outbox-rows.ts";
import { insertControlOutcome } from "../store/control-outcome-rows.ts";
import { settleControlOutcome } from "../control/outcome.ts";
import { acknowledgeDelivery, confirmDelivery } from "../control/ack.ts";
import type { ControlOutcomeReport } from "../types/agent.ts";
import { checkWall, operatorControls } from "../policy/space.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { modelSpec } from "../policy/thinking.ts";
import { resolveTuning } from "../policy/tuning.ts";
import { deliverOutboxMessage, drainOutbox, redeliverOpenRows } from "./outbox.ts";
import { acceptMail } from "./mail.ts";
import { isAgentId } from "../backends/identity.ts";
import { LAUNCH_ENV, readLaunchCredential } from "../identity/launch.ts";
import { normalizeControlTarget } from "../control/normalize-target.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../control/dispatch.ts";
import { isAgentGone } from "../control/agent-gone.ts";
import { bridgeAttached } from "../control/bridge-links.ts";
import { isBridgeMessage } from "../control/bridge-message.ts";
import { resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { headlessBackend } from "../backends/registry.ts";
import { fleetStatusRows } from "../commands/status.ts";
import { agentView, liveAgentViews } from "../store/agent-view.ts";
import { createLogger } from "../log.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import { decisionLogger } from "./decision-log.ts";
import type { AdapterId } from "../types/adapter.ts";
import type { DaemonStatusRow, LeaseStatusPayload, OutboxDelivery, OutboxDeps, PendingQuestionView, PresenceMetadata, PresenceWatch, RpcHandler, RpcHandlers, RpcServer } from "../types/daemon.ts";
import type { Governance, ParamsOf } from "./rpc/protocol.ts";
import type { SettingsWatch, OrchSettings } from "../types/settings.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { LogContext, LogLevel, Logger } from "../types/core.ts";
import { agentById } from "../store/agent-rows.ts";
import { pendingQuestion, pendingQuestions, recordQuestion, settleQuestion } from "../store/question-rows.ts";
import { agentProcessLive, recordedProcessIsLive } from "../store/interval-rows.ts";
import { createPanePainter } from "./pane-painter.ts";
import { activePaneHud } from "../backends/hud.ts";
import { peerView } from "./peer-view.ts";
import type { PaneLabels } from "../types/plexer.ts";
import type { ControlAction, ControlBoundaryOutcome } from "../types/control.ts";
import type { Services } from "../types/services.ts";


/** The one spelling of "is this lease's holder still running". A start token
 *  proves the pid is the SAME process instance, not a recycled number. */
/** Whether the orchestrator holding a lease is still alive. Rule 11: a dead
 *  holder is not a collision, so its lease must never gate a driving verb. */
function leaseHolderIsAlive(directory: OrchDir, holderId: string): boolean {
  return recordedProcessIsLive(directory, holderId);
}

/** Derive lease facts from the normalized agent/lease rows, never from presence or ownership files. */
export function deriveLeasePayload(directory: OrchDir, key: string): LeaseStatusPayload {
  // An agent key IS its minted id (A1); a key that is not one names no agent and
  // stays unknown rather than being guessed at.
  const agentId = key;
  if (!agentById(directory, agentId)) return { lease: null, leaseKnown: false };
  const lease = currentLease(directory, agentId);
  if (!lease) return { lease: null, leaseKnown: true };
  const holderName = agentById(directory, lease.orchId)?.name;
  return {
    lease: {
      holderId: lease.orchId,
      holderName: holderName === undefined || holderName === "" ? lease.orchId : holderName,
      holderAlive: recordedProcessIsLive(directory, lease.orchId),
    },
    leaseKnown: true,
  };
}

const entrypoint = process.env.ORCHD_ENTRYPOINT ?? fileURLToPath(import.meta.url);
const bootCodeHash = computeCodeHash(entrypoint);
const startedAt = new Date();
export interface DaemonState {
  readonly services: Services;
  readonly directory: OrchDir;
  readonly workController: AbortController;
  server: RpcServer | undefined;
  workLoop: Promise<void> | undefined;
  workLoopRunning: boolean;
  outboxDrain: ReturnType<typeof setInterval> | undefined;
  presenceWatch: PresenceWatch | undefined;
  settingsWatch: SettingsWatch | undefined;
  lastActivityAt: number;
  logger: Logger | undefined;
  fatalLogged: boolean;
}

/** The daemon owes its own exit: with nothing to serve, staying resident only
 *  accumulates orphaned processes. Live agents, event subscribers, or recent RPC
 *  traffic each count as being in use. */
export function idleShutdownDue(input: { idleMinutes: number; liveAgents: number; connections: number; msSinceActivity: number }): boolean {
  if (input.idleMinutes <= 0) return false;
  if (input.liveAgents > 0 || input.connections > 0) return false;
  return input.msSinceActivity >= input.idleMinutes * 60_000;
}

function liveAgentCount(directory: OrchDir): number {
  return [...loadPresence(directory).values()].filter((entry) => entry.alive).length;
}

/** Every served call proves the daemon is in use; the idle clock restarts. */
function touchHandler<M extends Exclude<keyof RpcHandlers, "register-session" | "claim-identity">>(state: DaemonState, handler: RpcHandler<M>): RpcHandler<M> {
  return (params, emit, context) => { state.lastActivityAt = Date.now(); return handler(params, emit, context); };
}

function touchOnCall(state: DaemonState, handlers: RpcHandlers): RpcHandlers {
  return {
    "daemon-status": touchHandler(state, handlers["daemon-status"]),
    "subscribe-events": touchHandler(state, handlers["subscribe-events"]),
    "environment-labels": touchHandler(state, handlers["environment-labels"]),
    "peer-view": touchHandler(state, handlers["peer-view"]),
    notify: touchHandler(state, handlers.notify),
    status: touchHandler(state, handlers.status),
    attach: touchHandler(state, handlers.attach),
    dispatch: touchHandler(state, handlers.dispatch),
    steer: touchHandler(state, handlers.steer),
    message: touchHandler(state, handlers.message),
    answer: touchHandler(state, handlers.answer),
    "set-model": touchHandler(state, handlers["set-model"]),
    lifecycle: touchHandler(state, handlers.lifecycle),
    "spawn-headless": touchHandler(state, handlers["spawn-headless"]),
    "agent-closed": touchHandler(state, handlers["agent-closed"]),
    question: touchHandler(state, handlers.question),
    questions: touchHandler(state, handlers.questions),
    ack: touchHandler(state, handlers.ack),
    "control-outcome": touchHandler(state, handlers["control-outcome"]),
    reload: touchHandler(state, handlers.reload),
  };
}

/** The fleet as the daemon sees it, in orch's one status-row shape. Serving a reduced
 *  second shape here is what left the method unusable and every client reading files. */
function fleetStatus(state: DaemonState): { rows: DaemonStatusRow[] } {
  const directory = state.directory;
  const current = state.services.settings.current();
  const rows = fleetStatusRows(current, current.spaces, { directory });
  return {
    rows: rows.map((row) => ({ ...row, ...deriveLeasePayload(directory, row.key), bridgeAttached: bridgeAttached(directory, row.key) })),
  };
}

async function socketAnswers(directory: OrchDir): Promise<boolean> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return true;
  } catch {
    return false;
  }
}

/** Build the event carrying mail for a live session with no bridge route. */
function sessionMessageEvent(directory: OrchDir, key: string, id: string, text: string): NotifyEvent {
  const view = agentView(directory, key);
  return {
    key,
    space: view?.environment.space ?? undefined,
    agent: view?.name ?? null,
    name: view?.name ?? null,
    tab: null,
    model: null,
    oldState: "message",
    newState: "message",
    dispatchId: id,
    ts: new Date().toISOString(),
    mail: { id, text },
  };
}

/** Send one outbox write into its target's text channel. New work and a mid-run steer
 *  differ only in the action kind; both go through the one control dispatcher. */
export async function deliverWrite(state: DaemonState, target: string, payload: unknown, id: string): Promise<OutboxDelivery> {
  const directory = state.directory;
  const canonicalTarget = normalizeControlTarget(directory, target);
  const log = decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id);
  if (!isBridgeMessage(payload) || payload.action === "answer" || payload.action === "model") {
    log.warn("dispatch.malformed", { target: canonicalTarget });
    return "gone";
  }
  const text = payload.text;
  const kind = payload.action === "dispatch" ? "run" : "steer";
  const route = resolveTargetRoute(directory, canonicalTarget);
  // Nobody spawned a raw session, so nothing composes a bridge for it: its event stream is its channel.
  const rawSession = agentView(directory, canonicalTarget)?.spawnedBy === null;
  if (rawSession && !bridgeAttached(directory, canonicalTarget) && !route?.backend.agentInput) {
    if (agentProcessLive(directory, canonicalTarget)) {
      const event = sessionMessageEvent(directory, canonicalTarget, id, text);
      emitAndNotify((published) => state.server?.emit(published), state.services.settings.current().notify, event, directory, state.services.settings);
      log.info("dispatch.delivered", { target: canonicalTarget, action: payload.action, reason: "session-stream" });
      return "acked";
    }
    log.warn("dispatch.gone", { target: canonicalTarget, reason: "no delivery route" });
    return "gone";
  }
  if (!resolveTargetAdapter(directory, canonicalTarget)) {
    if (!route?.backend.agentInput) {
      log.warn("dispatch.gone", { target: canonicalTarget, reason: "no delivery route" });
      return "gone";
    }
    route.backend.agentInput.submit(String(route.handle), text);
    return "acked";
  }
  try {
    const outcome = await deliverControl(directory, state.services.settings.current(), canonicalTarget, { kind, text, id });
    if (outcome.outcome === "answer") {
      const agentId = canonicalTarget;
      decisionLogger(directory, state.services.settings.currentOrNull(), { correlationId: id, agentId }).debug("boundary.answer", {
        target: canonicalTarget,
        reason: outcome.reason,
      });
      log.warn("dispatch.refused", { target: canonicalTarget, reason: outcome.reason, text: outcome.text });
      return "acked";
    }
    return outcome.ack === "expected" ? "queued" : "acked";
  } catch (error) {
    if (isAgentGone(error)) {
      log.warn("dispatch.gone", { target: canonicalTarget, reason: errorMessage(error) });
      return "gone";
    }
    log.error("dispatch.failed", { target: canonicalTarget, error: errorMessage(error) });
    return "failed";
  }
}

function outboxDeps(state: DaemonState): OutboxDeps {
  return {
    deliver: (target, payload, id) => deliverWrite(state, target, payload, id),
    now: () => Date.now(),
    maxAttempts: state.services.settings.current().daemon.outbox_max_attempts,
  };
}

/** Enforce the space wall, then lease authority, before a write is accepted.
 *
 * A1: ownership IS the lease. There is no second `ownership` id space beside
 * `agent_leases` for this gate to consult, so the whole rule is stated once, on
 * the one lease. An open lease is mutual exclusion for every driving verb, but
 * ONLY while its holder is alive: Rule 11 - a dead holder is not a collision, it
 * is a stale row, and gating on one strands a whole fleet with nothing able to
 * drive it. Exclusion is never authorization: `abort`/`close`/`reap` do not come
 * through here at all. */
export function governWrite(state: DaemonState, target: string, params: Governance, context: LogContext = {}): void {
  const directory = state.directory;
  const settings = state.services.settings;
  const actor = params.actor && params.actor.length > 0 ? params.actor : null;
  const steal = params.steal === true;
  const actorSpace = params.actorSpace ?? null;
  const actorIsOperator = params.actorIsOperator === true;
  const configuredSettings = settings.currentOrNull();
  const configuredCrossSpace = configuredSettings === null
    ? SETTINGS_DEFAULTS.fleet.cross_space
    : configuredSettings.fleet.cross_space;
  const crossSpace = params.crossSpace === true || configuredCrossSpace;
  const wall = checkWall(directory, actor, target, { crossSpace });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the write");
  const targetId = target;
  const lease = currentLease(directory, targetId);
  const actorId = actor;
  const holderId = lease?.orchId;
  const holderAlive = lease === null ? false : leaseHolderIsAlive(directory, lease.orchId);
  const foreignLease = lease !== null && holderId !== actorId;
  // Every grant is part of the decision trail, not just the interesting ones: a
  // dispatch whose lease step left no record cannot be told apart from one that
  // never reached the lease step at all.
  const logLeaseGrant = (): void => {
    decisionLogger(directory, settings.currentOrNull(), { ...context, agentId: targetId }).debug("lease.granted", {
      target,
      holderId: lease === null ? null : (holderId ?? lease.orchId),
      holderAlive,
    });
  };
  if (foreignLease && lease !== null && holderAlive) {
    // The space's human operator keeps control of every fleet keyed into their
    // space, whichever orch holds it; a spawned agent's actor token is its own
    // id, never `operator`, so this lane grants an agent nothing.
    if (!operatorControls(directory, actor, target, actorSpace, actorIsOperator)) {
      decisionLogger(directory, settings.currentOrNull(), { ...context, agentId: targetId }).debug("lease.refused", {
        target,
        holderId: holderId ?? lease.orchId,
        holderAlive: true,
        steal,
      });
      // C4: taking an agent from a LIVE orch is deliberate and has its own verb.
      // A driving verb must never transfer a holding as a side effect, so the
      // refusal names the verb that does it instead of doing it here.
      throw new Error(steal
        ? `agent is leased by ${lease.orchId}; take it deliberately with 'orch adopt ${target} --steal', then drive it`
        : `agent is leased by ${lease.orchId}; only its lease holder may drive it`);
    }
  }
  logLeaseGrant();
}

async function acceptTextWrite<M extends "dispatch" | "steer">(state: DaemonState, action: M, params: ParamsOf<M>, id: string): Promise<"none" | "expected"> {
  const directory = state.directory;
  const { target, text } = params;
  const log = decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id);
  withTransaction(directory, () => {
    governWrite(state, target, params, { correlationId: id });
    insertOutboxMessage(directory, { id, target, payload: { action, text } });
  });
  log.info("dispatch.accepted", { target, action });
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  const deliveryState = outboxMessageState(directory, id);
  if (deliveryState === "undeliverable") throw new Error(`write ${id}: agent ${target} is gone`);
  if (deliveryState === "pending") {
    log.info("dispatch.queued", { target, action, reason: "bridge-detached" });
    return "none";
  }
  if (deliveryState === "awaiting") return "expected";
  if (deliveryState === "delivered") log.info("dispatch.delivered", { target, action });
  return "none";
}

async function deliverAcceptedText(state: DaemonState, id: string): Promise<"none" | "expected"> {
  const directory = state.directory;
  const row = selectOutboxMessage(directory, id);
  if (row === undefined) throw new Error(`write ${id} does not exist`);
  await deliverOutboxMessage(directory, id, outboxDeps(state));
  const deliveryState = outboxMessageState(directory, id);
  if (deliveryState === "undeliverable") throw new Error(`write ${id}: agent ${row.target} is gone`);
  if (deliveryState === "pending") {
    decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id).info("dispatch.queued", { target: row.target, action: row.payload.action, reason: "bridge-detached" });
    return "none";
  }
  if (deliveryState === "awaiting") return "expected";
  if (deliveryState === "delivered") decisionLogger(directory, state.services.settings.currentOrNull()).forCorrelation(id).info("dispatch.delivered", { target: row.target, action: row.payload.action });
  return "none";
}

async function confirmTextWrite<M extends "dispatch" | "steer">(state: DaemonState, action: M, params: ParamsOf<M>): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const id = randomUUID();
  const timeoutMs = state.services.settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(id, timeoutMs, () => acceptTextWrite(state, action, params, id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(state.directory, id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id, ack };
}

/**
 * Launch one headless agent from INSIDE the daemon.
 *
 * A headless agent has no TTY: it runs the prompt it was launched with and exits.
 * The prompt is therefore required, not optional — a headless agent with nothing
 * to do registers, finds no work, and dies before anything can be sent to it.
 * orchd owns the launch because it already owns delivery and outlives the CLI.
 */
function spawnHeadless(state: DaemonState, params: ParamsOf<"spawn-headless">): { key: string; pid: number } {
  const directory = state.directory;
  const key = params.key;
  const adapterId = params.adapter;
  const adapter = resolveAdapter(adapterId);
  if (!adapter) throw new Error(`cannot spawn ${key}: unknown adapter ${adapterId}`);
  // Required AND ruled on: a launch with no model runs on whatever the harness
  // defaults to, and a shorthand one gets fuzzy-matched onto whatever registry
  // entry shares a prefix. Both end with the fleet on a model nobody asked for.
  const model = params.model;
  const thinking = params.thinking;
  assertModelAllowed(state.services.settings.current(), adapter, model);
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
    tools: params.tools,
    workers: params.workers,
  });
  return { key, pid: handle.pid };
}

// Throws when the agent refuses or never confirms; the RPC error carries that
// reason to the caller, so `orch model` can never print "accepted" for a model
// the agent did not take.
async function setModel(state: DaemonState, params: ParamsOf<"set-model">): Promise<{ ok: true; applied: string }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const model = params.model;
  governWrite(state, target, params);
  await deliverControl(directory, settings.current(), target, { kind: "model", model, id: randomUUID() });
  return { ok: true, applied: model };
}

/** Apply a lifecycle verb from inside the daemon. A console-less agent is relaunched
 *  to satisfy the verb, and a relaunch must happen here: the spawner holds the new
 *  process's stdin, and only orchd outlives the agent it starts. */
function publishClosedAgent(state: DaemonState, params: ParamsOf<"agent-closed">): { ok: true } {
  const directory = state.directory;
  const settings = state.services.settings;
  const key = params.key;
  const oldState = params.oldState;
  const view = agentView(directory, key);
  if (!view) throw new Error(`agent ${key} does not exist`);
  if (view.endedAt === null) throw new Error(`agent ${key} has not ended`);
  const event: NotifyEvent = {
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

async function applyLifecycle(state: DaemonState, params: ParamsOf<"lifecycle">): Promise<{ ok: true; verb: ParamsOf<"lifecycle">["verb"] }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const verb = params.verb;
  governWrite(state, target, params);
  await deliverControl(directory, settings.current(), target, { kind: "lifecycle", verb });
  return { ok: true, verb };
}

export async function steer(state: DaemonState, params: ParamsOf<"steer">) {
  return confirmTextWrite(state, "steer", params);
}

export async function dispatch(state: DaemonState, params: ParamsOf<"dispatch">) {
  return confirmTextWrite(state, "dispatch", params);
}

function recordAgentQuestion(directory: OrchDir, params: ParamsOf<"question">): { ok: true } {
  const agentId = params.agentId;
  if (agentById(directory, agentId) === null) throw new Error(`question agent ${agentId} does not exist`);
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt });
  return { ok: true };
}

function listPendingQuestions(directory: OrchDir): { questions: PendingQuestionView[] } {
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

async function message(state: DaemonState, params: ParamsOf<"message">): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const from = params.from;
  const target = params.target;
  const text = params.text;
  const accepted = acceptMail(directory, settings.currentOrNull(), from, target, text);
  const timeoutMs = settings.current().timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(accepted.id, timeoutMs, () => deliverAcceptedText(state, accepted.id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${accepted.id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(directory, accepted.id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id: accepted.id, ack };
}

export async function answer(state: DaemonState, params: ParamsOf<"answer">): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const directory = state.directory;
  const settings = state.services.settings;
  const target = params.target;
  const text = params.text;
  const targetId = target;
  const current = pendingQuestion(directory, targetId);
  const requestedQuestionId = params.questionId;
  if (current === undefined || (requestedQuestionId !== undefined && current.id !== requestedQuestionId)) {
    throw new Error(requestedQuestionId === undefined
      ? `${target} is not asking a question`
      : `question ${requestedQuestionId} is not pending for ${target}`);
  }
  governWrite(state, target, params);
  const id = randomUUID();
  const ack = await confirmDelivery(id, settings.current().timeouts.dispatch_ack_ms, async () => {
    const outcome = await deliverControl(directory, settings.current(), target, { kind: "answer", text, id });
    if (outcome.outcome === "answer") throw new Error(outcome.text);
    if (!settleQuestion(directory, { id: current.id, answer: text, answeredAt: Date.now() })) {
      throw new Error(`question ${current.id} is no longer pending`);
    }
    return outcome.ack;
  });
  return { accepted: true, id, ack };
}

/** `level` is an explicit override (a flag); everything else resolves the same
 *  way every other logger does, through `logLevelFor`. */
function loggerFor(directory: OrchDir, level?: LogLevel): Logger {
  const envLevel = process.env.ORCH_LOG_LEVEL;
  if (envLevel === undefined && level !== undefined) {
    return createLogger({ file: daemonRuntimeFiles(directory).log, level });
  }
  return createLogger({ file: daemonRuntimeFiles(directory).log, level: logLevelFor(null) });
}

function logFatalAndExit(state: DaemonState, kind: string, error: unknown): void {
  state.fatalLogged = true;
  const message = errorMessage(error);
  state.logger?.error("daemon.crashed", { kind, message, trace: errorTrace(error) });
  process.exit(1);
}

export interface LiveAgentForRepin {
  readonly id: string;
  readonly harnessId: string;
}

export interface RepinAdapterCapabilities {
  readonly id: AdapterId;
  readonly modelControl: object | null;
  readonly bridge: { readonly takes: readonly string[] } | null;
}

export interface RepinLiveFleetOptions {
  readonly previousSettings: OrchSettings;
  readonly settings: OrchSettings;
  readonly listLiveAgents: () => readonly LiveAgentForRepin[];
  readonly resolveAdapter: (agent: LiveAgentForRepin) => RepinAdapterCapabilities | undefined;
  readonly deliver: (target: string, action: Extract<ControlAction, { kind: "model" }>) => Promise<ControlBoundaryOutcome>;
  readonly logger: Pick<Logger, "info" | "warn">;
}

function settingMapsDiffer(left: object, right: object): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = new Map(Object.entries(right));
  if (leftEntries.length !== rightEntries.size) return true;
  return leftEntries.some(([key, value]) => !rightEntries.has(key) || rightEntries.get(key) !== value);
}

export function tuningSettingsChanged(previous: OrchSettings, settings: OrchSettings): boolean {
  return previous.defaults.thinking !== settings.defaults.thinking
    || settingMapsDiffer(previous.defaults.thinking_by_harness, settings.defaults.thinking_by_harness)
    || settingMapsDiffer(previous.defaults.models, settings.defaults.models);
}

export async function repinLiveFleet(options: RepinLiveFleetOptions): Promise<void> {
  if (!tuningSettingsChanged(options.previousSettings, options.settings)) return;
  for (const agent of options.listLiveAgents()) {
    try {
      const adapter = options.resolveAdapter(agent);
      if (adapter === undefined) continue;
      if (adapter.modelControl === null && !adapter.bridge?.takes.includes("model")) continue;
      const tuning = resolveTuning({ harness: adapter.id, settings: options.settings });
      if (tuning === null) continue;
      const spec = modelSpec(tuning.model, tuning.thinking);
      const outcome = await options.deliver(agent.id, { kind: "model", model: spec, id: randomUUID() });
      options.logger.info("settings.repin.applied", {
        agentId: agent.id,
        model: spec,
        thinking: tuning.thinking,
        outcome: outcome.outcome,
      });
    } catch (error: unknown) {
      options.logger.warn("settings.repin.failed", { agentId: agent.id, error: errorMessage(error) });
    }
  }
}

async function shutDown(state: DaemonState, reason: string): Promise<void> {
  const directory = state.directory;
  state.logger?.info("daemon.stopping", { reason });
  if (state.outboxDrain) clearInterval(state.outboxDrain);
  state.presenceWatch?.stop();
  state.settingsWatch?.stop();
  state.workController.abort();
  await state.workLoop;
  await state.server?.close();
  releaseDaemonLock(directory);
  releaseDaemonRegistration();
  state.logger?.info("daemon.stopped", { pid: process.pid });
  process.exit(0);
}

export async function startDaemon(): Promise<DaemonState> {
  const services = createServices();
  const directory = services.orchDir;
  const state: DaemonState = {
    services,
    directory,
    workController: new AbortController(),
    server: undefined,
    workLoop: undefined,
    workLoopRunning: false,
    outboxDrain: undefined,
    presenceWatch: undefined,
    settingsWatch: undefined,
    lastActivityAt: Date.now(),
    logger: undefined,
    fatalLogged: false,
  };
  if (invokedAsMain()) {
    process.on("uncaughtException", (error: unknown) => logFatalAndExit(state, "uncaught exception", error));
    process.on("unhandledRejection", (reason: unknown) => logFatalAndExit(state, "unhandled rejection", reason));
    process.on("exit", (code) => { if (code !== 0 && !state.fatalLogged) state.logger?.error("daemon.exited", { code }); });
  }
  state.logger = loggerFor(directory);
  const launch = readLaunchCredential();
  if (launch.kind === "malformed") {
    state.logger.error("launch.invalid-key", { value: launch.value });
    throw new Error(`${LAUNCH_ENV} is set but is not an agent id: ${JSON.stringify(launch.value)}`);
  }
  const answers = await socketAnswers(directory);
  const registration = acquireDaemonRegistration(directory);
  if (!registration.acquired) {
    const live = registration.registration;
    // The refused daemon exits silently, so its log line is the only record of
    // why: name the live one the same way the CLI's refusal does.
    state.logger?.warn("daemon.refused", { reason: live ? daemonStartRefusal(live) : "machine registration", pid: live?.pid ?? null, socket: live?.socket ?? null });
    return state;
  }
  if (!acquireDaemonLock(directory, () => answers)) {
    releaseDaemonRegistration();
    state.logger?.warn("daemon.refused", { reason: "backing store lock" });
    return state;
  }

  try {
    const settings = services.settings.current();
    state.logger = loggerFor(directory, services.settings.current().logging?.level);
    const tcpPort = settings.daemon.tcp_port;
    const handlers: RpcHandlers = {
      "daemon-status": () => ({
        pid: process.pid,
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        codeHash: bootCodeHash,
        socket: state.server?.transport ?? "unknown",
        tcpEndpoint: state.server?.tcpEndpoint,
        subsystems: {
          workLoop: state.workLoopRunning ? "running" : "stopped",
          presenceWatch: state.presenceWatch ? "running" : "stopped",
          settingsWatch: state.settingsWatch ? "running" : "stopped",
        },
      }),
      "subscribe-events": () => ({ subscribed: true }),
      // A bundled harness links no plexer, so the two things it used to ask its
      // pane directly it now asks orchd, the only process that talks to one.
      "environment-labels": async (params) => {
        const id = params.id;
        let reported: PaneLabels | null = null;
        await activePaneHud(id, directory).readLabels((labels) => { reported = labels; });
        return reported;
      },
      "peer-view": (params) => {
        const keys = params.keys ?? [];
        return peerView(directory, params.ownKey, keys, params.allSpaces === true, params.projectRoot);
      },
      notify: (event) => {
        activePaneHud(event.key, directory).notify(event);
        return { ok: true };
      },
      status: () => fleetStatus(state),
      attach: (params) => {
        const key = params.key;
        return { attached: true, open: selectOpenOutboxForTarget(directory, key).length };
      },
      dispatch: (params) => dispatch(state, params),
      steer: (params) => steer(state, params),
      message: (params) => message(state, params),
      "spawn-headless": (params) => spawnHeadless(state, params),
      "set-model": (params) => setModel(state, params),
      lifecycle: (params) => applyLifecycle(state, params),
      "agent-closed": (params) => publishClosedAgent(state, params),
      question: (params) => recordAgentQuestion(directory, params),
      questions: () => listPendingQuestions(directory),
      answer: (params) => answer(state, params),
      ack: (params) => {
        const id = params.id;
        const row = selectOutboxMessage(directory, id);
        markOutboxDelivered(directory, id);
        if (row === undefined) decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).debug("dispatch.acked", { target: null });
        else decisionLogger(directory, services.settings.currentOrNull()).forCorrelation(id).info("dispatch.acked", { target: row.target });
        acknowledgeDelivery(id);
        return { ok: true };
      },
      "control-outcome": (params) => {
        const report: ControlOutcomeReport = {
          id: params.id,
          key: params.key,
          command: params.command,
          requested: params.requested ?? {},
          ...(params.applied === undefined ? {} : { applied: params.applied }),
          ...(params.error === undefined ? {} : { error: params.error }),
        };
        insertControlOutcome(directory, {
          id: report.id,
          agentId: report.key,
          command: report.command,
          requested: report.requested,
          settledAt: Date.now(),
          ...(params.error === undefined ? {} : { error: params.error }),
        });
        settleControlOutcome(report);
        return { ok: true };
      },
      reload: () => {
        setTimeout(() => {
          void state.server?.close().then(() => reexecSelf(directory));
        }, 10);
        return { ok: true };
      },
    };
    state.server = await startRpcServer(directory, touchOnCall(state, handlers), {
      holdsDaemonLock: true,
      tcpPort,
      onTcpError: (error, port) => state.logger?.error("daemon.tcp-listener-failed", { port, error: errorMessage(error) }),
      onBridgeAttached: (key) => {
        void redeliverOpenRows(directory, key, outboxDeps(state)).catch((error: unknown) => {
          state.logger?.error("outbox.redeliver-failed", { target: key, error: errorMessage(error) });
        });
      },
    });
  } catch (error) {
    releaseDaemonLock(directory);
    releaseDaemonRegistration();
    throw error;
  }

  // orchd gates every spawn on the catalogues; reading them at boot keeps that gate off the
  // harness binaries, and re-stamps whatever went stale while no daemon was running.
  warmAdapterCatalogues();

  let settingsLoaded = false;
  let previousSettings = services.settings.currentOrNull();
  state.settingsWatch = watchSettings(services.settings, {
    load: () => {
      const next = services.settings.reload();
      if (next === null) throw new Error(absentSettingsMessage(services.settings.file));
      return next;
    },
    onChange: (settings) => {
      if (settingsLoaded) state.logger?.info("config.reloaded");
      settingsLoaded = true;
      if (previousSettings !== null && state.logger !== undefined) {
        void repinLiveFleet({
          previousSettings,
          settings,
          listLiveAgents: () => liveAgentViews(directory),
          resolveAdapter: (agent) => resolveTargetAdapter(directory, agent.id),
          deliver: (target, action) => deliverControl(directory, settings, target, action),
          logger: state.logger,
        }).catch((error: unknown) => {
          state.logger?.warn("settings.repin.failed", { error: errorMessage(error) });
        });
      }
      previousSettings = settings;
    },
    onWarn: (message) => state.logger?.warn("config.warning", { message }),
  });
  const paintPane = createPanePainter(directory);
  state.presenceWatch = startPresenceWatch({
    orchDir: directory,
    metadataFor: (key) => {
      // A1: identity, provenance and environment are read back together through
      // the ONE composer. A spawner's label is READ from the spawner agent, never
      // copied onto the agent it spawned - a copy goes stale the moment the
      // spawner is renamed.
      const normalized = isAgentId(key) ? key : undefined;
      const view = normalized === undefined ? null : agentView(directory, normalized);
      const spawner = view?.spawnedBy == null ? null : agentView(directory, view.spawnedBy);
      const metadata: PresenceMetadata = { name: view?.name ?? null, tab: null };
      if (view?.spawnedBy != null) metadata.spawnedBy = view.spawnedBy;
      if (spawner) metadata.spawnedByLabel = spawner.name;
      return metadata;
    },
    onEvent: (event) => {
      state.lastActivityAt = Date.now();
      // The agent no longer paints its own pane: its bundle carries no plexer.
      const painted = isAgentId(event.key) ? event.key : undefined;
      if (painted !== undefined) paintPane(painted, { state: event.newState, cost: event.cost ?? 0, ...(event.task === undefined ? {} : { task: event.task }) });
      emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings);
    },
  });
  state.workLoopRunning = true;
  state.workLoop = runWorkLoop({
    orchDir: directory,
    pollIntervalMs: 500,
    settings: services.settings,
    signal: state.workController.signal,
    continuous: true,
    onEvent: (event) => { state.lastActivityAt = Date.now(); emitAndNotify((value) => state.server?.emit(value), services.settings.current().notify, event, directory, services.settings); },
  }).finally(() => { state.workLoopRunning = false; });

  // The outbox drains on orchd's OWN clock. Piggy-backing it on `acceptWrite`
  // meant a queued write was only ever retried when some other caller dispatched,
  // and that caller then waited out the whole backlog before its own write went.
  state.outboxDrain = setInterval(() => {
    void drainOutbox(directory, outboxDeps(state)).catch((error: unknown) => {
      state.logger?.error("outbox.drain-failed", { error: errorMessage(error) });
    });
  }, services.settings.current().daemon.outbox_drain_ms);
  state.outboxDrain.unref?.();

  const idleCheck = setInterval(() => {
    const idleMinutes = services.settings.current().daemon.idle_shutdown_minutes;
    const liveAgents = liveAgentCount(directory);
    if (liveAgents > 0) state.lastActivityAt = Date.now();
    const msSinceActivity = Date.now() - state.lastActivityAt;
    const connections = (state.server?.subscriberCount() ?? 0) + (state.server?.attachedBridgeCount() ?? 0);
    if (!idleShutdownDue({ idleMinutes, liveAgents, connections, msSinceActivity })) return;
    clearInterval(idleCheck);
    void shutDown(state, `idle ${idleMinutes}m: no live agents, no connections`);
  }, 30_000);

  process.once("SIGTERM", () => void shutDown(state, "SIGTERM"));
  process.once("SIGINT", () => void shutDown(state, "SIGINT"));
  const tcp = state.server?.tcpEndpoint;
  state.logger?.info("daemon.started", { pid: process.pid, hash: bootCodeHash, transport: state.server?.transport ?? "unknown", tcp: tcp ?? null });
  return state;
}

function invokedAsMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return realpathSync(arg) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (invokedAsMain()) void startDaemon();
