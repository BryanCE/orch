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
import { loadSettings, loadSettingsOrNull, settingsLogLevel } from "../settings/read.ts";
import { SETTINGS_DEFAULTS } from "../settings/schema.ts";
import { watchSettings } from "../settings/watch.ts";
import { runWorkLoop } from "./work-loop.ts";
import { emitAndNotify, startPresenceWatch } from "./events.ts";
import { loadPresence } from "../presence/store.ts";
import { orchDir } from "../presence/writer.ts";
import { errorMessage, errorTrace, isRecord } from "../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../store/connection.ts";
import { currentLease } from "../store/lease-rows.ts";
import { insertOutboxMessage, markOutboxDelivered, outboxMessageState, selectOpenOutboxForTarget, selectOutboxMessage } from "../store/outbox-rows.ts";
import { insertControlOutcome } from "../store/control-outcome-rows.ts";
import { settleControlOutcome } from "../control/outcome.ts";
import { acknowledgeDelivery, confirmDelivery } from "../control/ack.ts";
import { agentIdOf } from "../commands/lifecycle/close.ts";
import type { ControlOutcomeReport } from "../types/agent.ts";
import { checkWall, operatorControls } from "../policy/space.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { isThinkingLevel } from "../policy/thinking.ts";
import { deliverOutboxMessage, drainOutbox, redeliverOpenRows } from "./outbox.ts";
import { acceptMail } from "./mail.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { normalizeControlTarget } from "../control/normalize-target.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../control/dispatch.ts";
import { isAgentGone } from "../control/agent-gone.ts";
import { bridgeAttached } from "../control/bridge-links.ts";
import { isAgentNotice, isBridgeMessage } from "../control/bridge-message.ts";
import { resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { isLifecycleVerb } from "../adapters/adapter.ts";
import { headlessBackend } from "../backends/registry.ts";
import { fleetStatusRows } from "../commands/status.ts";
import { agentView } from "../store/agent-view.ts";
import { createLogger } from "../log.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import { decisionLogger } from "./decision-log.ts";
import type { LifecycleVerb } from "../types/adapter.ts";
import type { ThinkingLevel, WorkerPolicy } from "../types/policy.ts";
import type { DaemonStatusRow, LeaseStatusPayload, OutboxDelivery, OutboxDeps, PendingQuestionView, PresenceMetadata, PresenceWatch, RpcHandlers, RpcServer } from "../types/daemon.ts";
import type { SettingsWatch, NotifyEntry, OrchSettings } from "../types/settings.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { LogContext, LogLevel, Logger } from "../types/core.ts";
import { agentById } from "../store/agent-rows.ts";
import { pendingQuestion, pendingQuestions, recordQuestion, settleQuestion } from "../store/question-rows.ts";
import { recordedProcessIsLive } from "../store/interval-rows.ts";
import { createPanePainter } from "./pane-painter.ts";
import { activePaneHud } from "../backends/hud.ts";
import { peerView } from "./peer-view.ts";
import type { PaneLabels } from "../types/plexer.ts";


/** The one spelling of "is this lease's holder still running". A start token
 *  proves the pid is the SAME process instance, not a recycled number. */
/** Whether the orchestrator holding a lease is still alive. Rule 11: a dead
 *  holder is not a collision, so its lease must never gate a driving verb. */
function leaseHolderIsAlive(directory: string, holderId: string): boolean {
  return recordedProcessIsLive(directory, holderId);
}

/** Derive lease facts from the normalized agent/lease rows, never from presence or ownership files. */
export function deriveLeasePayload(directory: string, key: string): LeaseStatusPayload {
  // An agent key IS its minted id (A1); a key that is not one names no agent and
  // stays unknown rather than being guessed at.
  const agentId = tryParseIdentity(key)?.id ?? key;
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
let server: RpcServer | undefined;
const workController = new AbortController();
let workLoop: Promise<void> | undefined;
let workLoopRunning = false;
let outboxDrain: ReturnType<typeof setInterval> | undefined;
let presenceWatch: PresenceWatch | undefined;
let settingsWatch: SettingsWatch | undefined;
let currentSettings: OrchSettings | undefined;
let sinks: NotifyEntry[] | undefined;
let lastActivityAt = Date.now();

/** The daemon owes its own exit: with nothing to serve, staying resident only
 *  accumulates orphaned processes. Live agents, event subscribers, or recent RPC
 *  traffic each count as being in use. */
export function idleShutdownDue(input: { idleMinutes: number; liveAgents: number; connections: number; msSinceActivity: number }): boolean {
  if (input.idleMinutes <= 0) return false;
  if (input.liveAgents > 0 || input.connections > 0) return false;
  return input.msSinceActivity >= input.idleMinutes * 60_000;
}

function liveAgentCount(): number {
  return [...loadPresence().values()].filter((entry) => entry.alive).length;
}

/** Every served call proves the daemon is in use; the idle clock restarts. */
function touchOnCall(handlers: RpcHandlers): RpcHandlers {
  return Object.fromEntries(Object.entries(handlers).map(([method, handler]): [string, RpcHandlers[string]] => [
    method,
    (params, emit, context) => { lastActivityAt = Date.now(); return handler(params, emit, context); },
  ]));
}

function getSettings(directory: string): OrchSettings {
  return currentSettings ??= loadSettings(directory);
}

function getSinks(directory: string): NotifyEntry[] {
  return sinks ??= loadSettings(directory).notify;
}

/** The fleet as the daemon sees it, in orch's one status-row shape. Serving a reduced
 *  second shape here is what left the method unusable and every client reading files. */
function fleetStatus(directory: string): { rows: DaemonStatusRow[] } {
  const rows = fleetStatusRows(getSettings(directory).spaces);
  return {
    rows: rows.map((row) => ({ ...row, ...deriveLeasePayload(directory, row.key), bridgeAttached: bridgeAttached(row.key) })),
  };
}

async function socketAnswers(directory: string): Promise<boolean> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return true;
  } catch {
    return false;
  }
}

/** One RPC's params, checked only for being a JSON object — every field reads back
 *  as `unknown` and each handler narrows the ones it needs. */
function rpcParams(params: unknown): Record<string, unknown> {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new Error("RPC params must be an object");
  }
  return params as Record<string, unknown>;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

/** A notification a bridge raised, rebuilt field by field. It arrives as JSON
 *  from another process, so every member is narrowed here rather than trusted:
 *  the event is constructed, never asserted. */
function bridgeNotifyEvent(params: Record<string, unknown>): NotifyEvent {
  const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;
  const event: NotifyEvent = {
    key: requiredString(params.key, "key"),
    agent: nullableString(params.agent),
    tab: nullableString(params.tab),
    model: nullableString(params.model),
    oldState: requiredString(params.oldState, "oldState"),
    newState: requiredString(params.newState, "newState"),
    ts: requiredString(params.ts, "ts"),
  };
  const space = optionalString(params.space);
  if (space !== undefined) event.space = space;
  const task = optionalString(params.task);
  if (task !== undefined) event.task = task;
  const reason = optionalString(params.reason);
  if (reason !== undefined) event.reason = reason;
  if (typeof params.cost === "number") event.cost = params.cost;
  return event;
}

/** Send one outbox write into its target's text channel. New work and a mid-run steer
 *  differ only in the action kind; both go through the one control dispatcher. */
export async function deliverWrite(target: string, payload: unknown, id: string): Promise<OutboxDelivery> {
  const canonicalTarget = normalizeControlTarget(target);
  const log = decisionLogger(orchDir()).forCorrelation(id);
  if (!isBridgeMessage(payload) || payload.action === "answer" || payload.action === "model") {
    log.warn("dispatch.malformed", { target: canonicalTarget });
    return "gone";
  }
  const text = payload.text;
  const kind = payload.action === "dispatch" ? "run" : "steer";
  if (!resolveTargetAdapter(canonicalTarget)) {
    const route = resolveTargetRoute(canonicalTarget);
    if (!route?.backend.agentInput) {
      log.warn("dispatch.gone", { target: canonicalTarget, reason: "no delivery route" });
      return "gone";
    }
    route.backend.agentInput.submit(String(route.handle), text);
    return "acked";
  }
  try {
    const outcome = await deliverControl(canonicalTarget, { kind, text, id });
    if (outcome.outcome === "answer") {
      const agentId = tryParseIdentity(canonicalTarget)?.id ?? canonicalTarget;
      decisionLogger(orchDir(), { correlationId: id, agentId }).debug("boundary.answer", {
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

function outboxDeps(directory: string): OutboxDeps {
  return {
    deliver: (target, payload, id) => deliverWrite(target, payload, id),
    now: () => Date.now(),
    maxAttempts: getSettings(directory).daemon.outbox_max_attempts,
  };
}

export function validateWriteParams(params: unknown): { target: string; text: string } {
  const value = rpcParams(params);
  return {
    target: requiredString(value.target, "target"),
    text: requiredString(value.text, "text"),
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
export function governWrite(directory: string, target: string, params: unknown, context: LogContext = {}): void {
  const value = rpcParams(params);
  const actor = typeof value.actor === "string" && value.actor.length > 0 ? value.actor : null;
  const steal = value.steal === true;
  const actorSpace = typeof value.actorSpace === "string" ? value.actorSpace : null;
  const actorIsOperator = value.actorIsOperator === true;
  const configuredCrossSpace = loadSettingsOrNull(directory)?.fleet.cross_space ?? SETTINGS_DEFAULTS.fleet.cross_space;
  const crossSpace = value.crossSpace === true || configuredCrossSpace;
  const wall = checkWall(directory, actor, target, { crossSpace });
  if (!wall.allowed) throw new Error(wall.reason ?? "space wall denied the write");
  const targetId = tryParseIdentity(target)?.id ?? target;
  const lease = currentLease(directory, targetId);
  const actorId = actor === null ? null : (tryParseIdentity(actor)?.id ?? actor);
  const holderId = lease && (tryParseIdentity(lease.orchId)?.id ?? lease.orchId);
  const holderAlive = lease === null ? false : leaseHolderIsAlive(directory, lease.orchId);
  const foreignLease = lease !== null && holderId !== actorId;
  // Every grant is part of the decision trail, not just the interesting ones: a
  // dispatch whose lease step left no record cannot be told apart from one that
  // never reached the lease step at all.
  const logLeaseGrant = (): void => {
    decisionLogger(directory, { ...context, agentId: targetId }).debug("lease.granted", {
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
      decisionLogger(directory, { ...context, agentId: targetId }).debug("lease.refused", {
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

async function acceptTextWrite(directory: string, action: "dispatch" | "steer", params: unknown, id: string): Promise<"none" | "expected"> {
  const { target, text } = validateWriteParams(params);
  const log = decisionLogger(directory).forCorrelation(id);
  withTransaction(directory, () => {
    governWrite(directory, target, params, { correlationId: id });
    insertOutboxMessage(directory, { id, target, payload: { action, text } });
  });
  log.info("dispatch.accepted", { target, action });
  await deliverOutboxMessage(directory, id, outboxDeps(directory));
  const state = outboxMessageState(directory, id);
  if (state === "undeliverable") throw new Error(`write ${id}: agent ${target} is gone`);
  if (state === "pending") {
    log.info("dispatch.queued", { target, action, reason: "bridge-detached" });
    return "none";
  }
  if (state === "awaiting") return "expected";
  if (state === "delivered") log.info("dispatch.delivered", { target, action });
  return "none";
}

async function deliverAcceptedText(directory: string, id: string): Promise<"none" | "expected"> {
  const row = selectOutboxMessage(directory, id);
  if (row === undefined) throw new Error(`write ${id} does not exist`);
  await deliverOutboxMessage(directory, id, outboxDeps(directory));
  const state = outboxMessageState(directory, id);
  if (state === "undeliverable") throw new Error(`write ${id}: agent ${row.target} is gone`);
  if (state === "pending") {
    decisionLogger(directory).forCorrelation(id).info("dispatch.queued", { target: row.target, action: row.payload.action, reason: "bridge-detached" });
    return "none";
  }
  if (state === "awaiting") return "expected";
  if (state === "delivered") decisionLogger(directory).forCorrelation(id).info("dispatch.delivered", { target: row.target, action: row.payload.action });
  return "none";
}

async function confirmTextWrite(directory: string, action: "dispatch" | "steer", params: unknown): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const id = randomUUID();
  const timeoutMs = loadSettings(directory).timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(id, timeoutMs, () => acceptTextWrite(directory, action, params, id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(directory, id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id, ack };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Extra env as it arrives over RPC: absent, or a flat record of strings. The
 *  CLI passes the SPAWNER's identity through here — orchd launches the process,
 *  but its own env knows nothing about the session that asked for the spawn. */
export function optionalEnvRecord(value: unknown, name: string): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || Object.values(value).some((entry) => typeof entry !== "string")) {
    throw new Error(`${name} must be a record of string env values`);
  }
  return value as Record<string, string>;
}

/** A model quicklist as it arrives over RPC: absent, or an array of non-empty specs. A joined
 *  string is REJECTED rather than coerced — it would reach the harness as one model id no
 *  registry lists, and the picker it was meant to fill would come up empty. */
export function optionalModelSpecs(value: unknown, name: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((spec) => typeof spec !== "string" || spec.trim().length === 0)) {
    throw new Error(`${name} must be an array of non-empty model specs`);
  }
  return value as string[];
}

/**
 * Launch one headless agent from INSIDE the daemon.
 *
 * A headless agent has no TTY: it runs the prompt it was launched with and exits.
 * The prompt is therefore required, not optional — a headless agent with nothing
 * to do registers, finds no work, and dies before anything can be sent to it.
 * orchd owns the launch because it already owns delivery and outlives the CLI.
 */
function requiredThinking(value: unknown, name: string): ThinkingLevel {
  if (!isThinkingLevel(value)) throw new Error(`${name} must be a valid thinking level`);
  return value;
}

function spawnHeadless(directory: string, params: unknown): { key: string; pid: number } {
  const value = rpcParams(params);
  const key = requiredString(value.key, "key");
  const adapterId = requiredString(value.adapter, "adapter");
  const adapter = resolveAdapter(adapterId);
  if (!adapter) throw new Error(`cannot spawn ${key}: unknown adapter ${adapterId}`);
  // Required AND ruled on: a launch with no model runs on whatever the harness
  // defaults to, and a shorthand one gets fuzzy-matched onto whatever registry
  // entry shares a prefix. Both end with the fleet on a model nobody asked for.
  const model = requiredString(value.model, "model");
  const thinking = requiredThinking(value.thinking, "thinking");
  assertModelAllowed(directory, adapter, model);
  const handle = headlessBackend.spawn(adapter, {
    key,
    env: optionalEnvRecord(value.env, "env"),
    orchDir: directory,
    cwd: optionalString(value.cwd),
    prompt: requiredString(value.prompt, "prompt"),
    model,
    thinking,
    // The quicklist the harness's own picker gets. It is NOT a second gate: the launch model
    // was ruled on above, and a model outside this list stays launchable.
    preferredModels: optionalModelSpecs(value.preferredModels, "preferredModels"),
    tools: optionalString(value.tools),
    workers: value.workers as WorkerPolicy | undefined,
  });
  return { key, pid: handle.pid };
}

// Throws when the agent refuses or never confirms; the RPC error carries that
// reason to the caller, so `orch model` can never print "accepted" for a model
// the agent did not take.
async function setModel(directory: string, params: unknown): Promise<{ ok: true; applied: string }> {
  const value = rpcParams(params);
  const target = requiredString(value.target, "target");
  const model = requiredString(value.model, "model");
  governWrite(directory, target, params);
  await deliverControl(target, { kind: "model", model, id: randomUUID() });
  return { ok: true, applied: model };
}

/** Apply a lifecycle verb from inside the daemon. A console-less agent is relaunched
 *  to satisfy the verb, and a relaunch must happen here: the spawner holds the new
 *  process's stdin, and only orchd outlives the agent it starts. */
function publishClosedAgent(directory: string, params: unknown): { ok: true } {
  const value = rpcParams(params);
  const key = requiredString(value.key, "key");
  const oldState = requiredString(value.oldState, "oldState");
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
  emitAndNotify((published) => server?.emit(published), getSinks(directory), event, directory);
  return { ok: true };
}

async function applyLifecycle(directory: string, params: unknown): Promise<{ ok: true; verb: LifecycleVerb }> {
  const value = rpcParams(params);
  const target = requiredString(value.target, "target");
  const verb = requiredString(value.verb, "verb");
  if (!isLifecycleVerb(verb)) throw new Error(`unknown lifecycle verb ${JSON.stringify(verb)}`);
  governWrite(directory, target, params);
  await deliverControl(target, { kind: "lifecycle", verb });
  return { ok: true, verb };
}

export async function steer(directory: string, params: unknown) {
  return confirmTextWrite(directory, "steer", params);
}

export async function dispatch(directory: string, params: unknown) {
  return confirmTextWrite(directory, "dispatch", params);
}

function recordAgentQuestion(directory: string, params: unknown, context: { readonly identity?: { readonly id: string } }): { ok: true } {
  if (!isAgentNotice(params)) throw new Error("question params must be an agent question notice");
  const agentId = context.identity?.id;
  if (agentId === undefined || agentById(directory, agentId) === null) {
    throw new Error("question requires a registered agent identity");
  }
  recordQuestion(directory, { id: params.questionId, agentId, question: params.question, askedAt: params.askedAt });
  return { ok: true };
}

function listPendingQuestions(directory: string): { questions: PendingQuestionView[] } {
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

async function message(directory: string, params: unknown): Promise<{ accepted: true; id: string; ack: "acknowledged" | "unavailable" }> {
  const value = rpcParams(params);
  const from = requiredString(value.from, "from");
  const target = requiredString(value.target, "target");
  const text = requiredString(value.text, "text");
  const accepted = acceptMail(directory, from, target, text);
  const timeoutMs = loadSettings(directory).timeouts.dispatch_ack_ms;
  let ack: "acknowledged" | "unavailable";
  try {
    ack = await confirmDelivery(accepted.id, timeoutMs, () => deliverAcceptedText(directory, accepted.id));
  } catch (error: unknown) {
    if (!errorMessage(error).includes(`delivery ${accepted.id} was not acknowledged within`)) throw error;
    ack = outboxMessageState(directory, accepted.id) === "delivered" ? "acknowledged" : "unavailable";
  }
  return { accepted: true, id: accepted.id, ack };
}

export async function answer(directory: string, params: unknown) {
  const value = rpcParams(params);
  const target = requiredString(value.target, "target");
  const text = requiredString(value.text, "text");
  const targetId = tryParseIdentity(target)?.id ?? target;
  const current = pendingQuestion(directory, targetId);
  const requestedQuestionId = value.questionId === undefined ? undefined : requiredString(value.questionId, "questionId");
  if (current === undefined || (requestedQuestionId !== undefined && current.id !== requestedQuestionId)) {
    throw new Error(requestedQuestionId === undefined
      ? `${target} is not asking a question`
      : `question ${requestedQuestionId} is not pending for ${target}`);
  }
  governWrite(directory, target, params);
  const id = randomUUID();
  const ack = await confirmDelivery(id, loadSettings(directory).timeouts.dispatch_ack_ms, async () => {
    const outcome = await deliverControl(target, { kind: "answer", text, id });
    if (outcome.outcome === "answer") throw new Error(outcome.text);
    if (!settleQuestion(directory, { id: current.id, answer: text, answeredAt: Date.now() })) {
      throw new Error(`question ${current.id} is no longer pending`);
    }
    return outcome.ack;
  });
  return { ok: true, id, ack };
}

let daemonLogger: Logger | undefined;
let fatalLogged = false;

/** `level` is an explicit override (a flag); everything else resolves the same
 *  way every other logger does, through `settingsLogLevel`. */
function loggerFor(directory: string, level?: LogLevel): Logger {
  const envLevel = process.env.ORCH_LOG_LEVEL;
  if (envLevel === undefined && level !== undefined) {
    return createLogger({ file: daemonRuntimeFiles(directory).log, level });
  }
  return createLogger({ file: daemonRuntimeFiles(directory).log, level: settingsLogLevel(directory) });
}

function logFatalAndExit(kind: string, error: unknown): void {
  fatalLogged = true;
  const message = errorMessage(error);
  daemonLogger?.error("daemon.crashed", { kind, message, trace: errorTrace(error) });
  process.exit(1);
}

async function shutDown(directory: string, reason: string): Promise<void> {
  daemonLogger?.info("daemon.stopping", { reason });
  if (outboxDrain) clearInterval(outboxDrain);
  presenceWatch?.stop();
  settingsWatch?.stop();
  workController.abort();
  await workLoop;
  await server?.close();
  releaseDaemonLock(directory);
  releaseDaemonRegistration();
  daemonLogger?.info("daemon.stopped", { pid: process.pid });
  process.exit(0);
}

async function main(): Promise<void> {
  const directory = orchDir();
  daemonLogger = loggerFor(directory);
  const answers = await socketAnswers(directory);
  const registration = acquireDaemonRegistration(directory);
  if (!registration.acquired) {
    const live = registration.registration;
    // The refused daemon exits silently, so its log line is the only record of
    // why: name the live one the same way the CLI's refusal does.
    daemonLogger?.warn("daemon.refused", { reason: live ? daemonStartRefusal(live) : "machine registration", pid: live?.pid ?? null, socket: live?.socket ?? null });
    return;
  }
  if (!acquireDaemonLock(directory, () => answers)) {
    releaseDaemonRegistration();
    daemonLogger?.warn("daemon.refused", { reason: "backing store lock" });
    return;
  }

  try {
    const settings = loadSettings(directory);
    daemonLogger = loggerFor(directory, settings.logging?.level);
    const tcpPort = settings.daemon.tcp_port;
    server = await startRpcServer(directory, touchOnCall({
      "daemon-status": () => ({
        pid: process.pid,
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        codeHash: bootCodeHash,
        socket: server?.transport ?? "unknown",
        tcpEndpoint: server?.tcpEndpoint,
        subsystems: {
          workLoop: workLoopRunning ? "running" : "stopped",
          presenceWatch: presenceWatch ? "running" : "stopped",
          settingsWatch: settingsWatch ? "running" : "stopped",
        },
      }),
      "subscribe-events": () => ({ subscribed: true }),
      // A bundled harness links no plexer, so the two things it used to ask its
      // pane directly it now asks orchd, the only process that talks to one.
      "environment-labels": async (params) => {
        const id = requiredString(rpcParams(params).id, "id");
        let reported: PaneLabels | null = null;
        await activePaneHud(id).readLabels((labels) => { reported = labels; });
        return reported;
      },
      "peer-view": (params) => {
        const value = rpcParams(params);
        const keys = Array.isArray(value.keys) ? value.keys.filter((key): key is string => typeof key === "string") : [];
        return peerView(directory, requiredString(value.ownKey, "ownKey"), keys, value.allSpaces === true);
      },
      notify: (params) => {
        const event = bridgeNotifyEvent(rpcParams(params));
        activePaneHud(agentIdOf(event.key)).notify(event);
        return { ok: true };
      },
      status: () => fleetStatus(directory),
      attach: (params) => {
        const key = requiredString(rpcParams(params).key, "key");
        return { attached: true, open: selectOpenOutboxForTarget(directory, key).length };
      },
      dispatch: (params) => dispatch(directory, params),
      steer: (params) => steer(directory, params),
      message: (params) => message(directory, params),
      "spawn-headless": (params) => spawnHeadless(directory, params),
      "set-model": (params) => setModel(directory, params),
      lifecycle: (params) => applyLifecycle(directory, params),
      "agent-closed": (params) => publishClosedAgent(directory, params),
      question: (params, _emit, context) => recordAgentQuestion(directory, params, context),
      questions: () => listPendingQuestions(directory),
      answer: (params) => answer(directory, params),
      ack: (params) => {
        const value = rpcParams(params);
        const id = requiredString(value.id, "id");
        const row = selectOutboxMessage(directory, id);
        markOutboxDelivered(directory, id);
        if (row === undefined) decisionLogger(directory).forCorrelation(id).debug("dispatch.acked", { target: null });
        else decisionLogger(directory).forCorrelation(id).info("dispatch.acked", { target: row.target });
        acknowledgeDelivery(id);
        return { ok: true };
      },
      "control-outcome": (params) => {
        const value = rpcParams(params);
        const error = typeof value.error === "string" ? value.error : undefined;
        const report: ControlOutcomeReport = {
          id: requiredString(value.id, "id"),
          key: requiredString(value.key, "key"),
          command: requiredString(value.command, "command"),
          requested: isRecord(value.requested) ? value.requested : {},
          ...(error === undefined ? {} : { error }),
        };
        insertControlOutcome(directory, {
          id: report.id,
          agentId: agentIdOf(report.key),
          command: report.command,
          requested: report.requested,
          settledAt: Date.now(),
          ...(error === undefined ? {} : { error }),
        });
        settleControlOutcome(report);
        return { ok: true };
      },
      reload: () => {
        setTimeout(() => {
          void server?.close().then(() => reexecSelf(directory));
        }, 10);
        return { ok: true };
      },
    }), {
      holdsDaemonLock: true,
      tcpPort,
      onTcpError: (error, port) => daemonLogger?.error("daemon.tcp-listener-failed", { port, error: errorMessage(error) }),
      onBridgeAttached: (key) => {
        void redeliverOpenRows(directory, key, outboxDeps(directory)).catch((error: unknown) => {
          daemonLogger?.error("outbox.redeliver-failed", { target: key, error: errorMessage(error) });
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
  settingsWatch = watchSettings(directory, {
    onChange: (settings) => {
      currentSettings = settings;
      sinks = undefined;
      if (settingsLoaded) daemonLogger?.info("config.reloaded");
      settingsLoaded = true;
    },
    onWarn: (message) => daemonLogger?.warn("config.warning", { message }),
  });
  const paintPane = createPanePainter(directory);
  presenceWatch = startPresenceWatch({
    orchDir: directory,
    metadataFor: (key) => {
      // A1: identity, provenance and environment are read back together through
      // the ONE composer. A spawner's label is READ from the spawner agent, never
      // copied onto the agent it spawned - a copy goes stale the moment the
      // spawner is renamed.
      const normalized = tryParseIdentity(key)?.id;
      const view = normalized === undefined ? null : agentView(directory, normalized);
      const spawner = view?.spawnedBy == null ? null : agentView(directory, view.spawnedBy);
      const metadata: PresenceMetadata = { name: view?.name ?? null, tab: null };
      if (view?.spawnedBy != null) metadata.spawnedBy = view.spawnedBy;
      if (spawner) metadata.spawnedByLabel = spawner.name;
      return metadata;
    },
    onEvent: (event) => {
      lastActivityAt = Date.now();
      // The agent no longer paints its own pane: its bundle carries no plexer.
      const painted = tryParseIdentity(event.key)?.id;
      if (painted !== undefined) paintPane(painted, { state: event.newState, cost: event.cost ?? 0, ...(event.task === undefined ? {} : { task: event.task }) });
      emitAndNotify((value) => server?.emit(value), getSinks(directory), event, directory);
    },
  });
  workLoopRunning = true;
  workLoop = runWorkLoop({
    orchDir: directory,
    pollIntervalMs: 500,
    getSettings: () => getSettings(directory),
    signal: workController.signal,
    continuous: true,
    onEvent: (event) => { lastActivityAt = Date.now(); emitAndNotify((value) => server?.emit(value), getSinks(directory), event, directory); },
  }).finally(() => { workLoopRunning = false; });

  // The outbox drains on orchd's OWN clock. Piggy-backing it on `acceptWrite`
  // meant a queued write was only ever retried when some other caller dispatched,
  // and that caller then waited out the whole backlog before its own write went.
  outboxDrain = setInterval(() => {
    void drainOutbox(directory, outboxDeps(directory)).catch((error: unknown) => {
      daemonLogger?.error("outbox.drain-failed", { error: errorMessage(error) });
    });
  }, getSettings(directory).daemon.outbox_drain_ms);
  outboxDrain.unref?.();

  const idleCheck = setInterval(() => {
    const idleMinutes = getSettings(directory).daemon.idle_shutdown_minutes;
    const liveAgents = liveAgentCount();
    if (liveAgents > 0) lastActivityAt = Date.now();
    const msSinceActivity = Date.now() - lastActivityAt;
    const connections = (server?.subscriberCount() ?? 0) + (server?.attachedBridgeCount() ?? 0);
    if (!idleShutdownDue({ idleMinutes, liveAgents, connections, msSinceActivity })) return;
    clearInterval(idleCheck);
    void shutDown(directory, `idle ${idleMinutes}m: no live agents, no connections`);
  }, 30_000);

  process.once("SIGTERM", () => void shutDown(directory, "SIGTERM"));
  process.once("SIGINT", () => void shutDown(directory, "SIGINT"));
  const tcp = server?.tcpEndpoint;
  daemonLogger?.info("daemon.started", { pid: process.pid, hash: bootCodeHash, transport: server?.transport ?? "unknown", tcp: tcp ?? null });
}

function invokedAsMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return realpathSync(arg) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (invokedAsMain()) {
  // Without these, a throw anywhere past startup kills orchd with output node
  // routes nowhere a detached daemon's log can keep — the silent-death report.
  process.on("uncaughtException", (error: unknown) => logFatalAndExit("uncaught exception", error));
  process.on("unhandledRejection", (reason: unknown) => logFatalAndExit("unhandled rejection", reason));
  process.on("exit", (code) => { if (code !== 0 && !fatalLogged) daemonLogger?.error("daemon.exited", { code }); });
  void main().catch((error: unknown) => logFatalAndExit("startup failed", error));
}
