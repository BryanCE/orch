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
import { loadPresence, orchDir } from "../presence/store.ts";
import { errorMessage, errorTrace, isRecord } from "../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../store/connection.ts";
import { currentLease } from "../store/lease-rows.ts";
import { insertOutboxMessage, markOutboxDelivered, outboxMessageOpen, outboxMessageUnsent } from "../store/outbox-rows.ts";
import { insertControlOutcome } from "../store/control-outcome-rows.ts";
import { settleControlOutcome } from "../control/outcome.ts";
import { agentIdOf } from "../commands/lifecycle/close.ts";
import type { ControlOutcomeReport } from "../types/agent.ts";
import { checkWall, operatorControls } from "../policy/space.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { drainOutbox } from "./outbox.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { normalizeControlTarget } from "../control/normalize-target.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../control/dispatch.ts";
import { resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { isLifecycleVerb } from "../adapters/adapter.ts";
import { detachedBackend } from "../backends/registry.ts";
import { fleetStatusRows } from "../commands/status.ts";
import { agentView } from "../store/agent-view.ts";
import { createLogger } from "../log.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import { decisionLogger } from "./decision-log.ts";
import type { LifecycleVerb } from "../types/adapter.ts";
import type { WorkerPolicy } from "../types/policy.ts";
import type { LeaseStatusPayload, OutboxDelivery, OutboxDeps, PresenceMetadata, PresenceWatch, RpcHandlers, RpcServer } from "../types/daemon.ts";
import type { SettingsWatch, NotifyEntry, OrchSettings } from "../types/settings.ts";
import type { StatusRow } from "../types/command.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { LogContext, LogLevel, Logger } from "../types/core.ts";
import { agentById } from "../store/agent-rows.ts";
import { recordedProcessIsLive } from "../store/interval-rows.ts";


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
let presenceWatch: PresenceWatch | undefined;
let settingsWatch: SettingsWatch | undefined;
let currentSettings: OrchSettings | undefined;
let sinks: NotifyEntry[] | undefined;
let lastActivityAt = Date.now();

/** The daemon owes its own exit: with nothing to serve, staying resident only
 *  accumulates orphaned processes. Live agents, event subscribers, or recent RPC
 *  traffic each count as being in use. */
export function idleShutdownDue(input: { idleMinutes: number; liveAgents: number; subscribers: number; msSinceActivity: number }): boolean {
  if (input.idleMinutes <= 0) return false;
  if (input.liveAgents > 0 || input.subscribers > 0) return false;
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
function fleetStatus(directory: string): { rows: StatusRow[] } {
  const rows = fleetStatusRows(getSettings(directory).spaces);
  return {
    rows: rows.map((row) => ({ ...row, ...deriveLeasePayload(directory, row.key) })),
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

function isWritePayload(value: unknown): value is { action?: unknown; text?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Send one outbox write into its target's text channel. New work and a mid-run steer
 *  differ only in the action kind; both go through the one control dispatcher. A target
 *  with no recorded adapter is a bare pane orch never spawned, so keystrokes are all it has. */
export async function deliverWrite(target: string, payload: unknown, id: string): Promise<OutboxDelivery> {
  const canonicalTarget = normalizeControlTarget(target);
  const log = decisionLogger(orchDir()).forCorrelation(id);
  const value = isWritePayload(payload) ? payload : {};
  const text = requiredString(value.text, "text");
  const kind = value.action === "dispatch" ? "run" : "steer";
  if (!resolveTargetAdapter(canonicalTarget)) {
    const route = resolveTargetRoute(canonicalTarget);
    if (!route?.backend.paneInput) return "failed";
    // Keystrokes into a pane: nothing will ever append a marker for this, so the
    // write itself is the whole delivery.
    route.backend.paneInput.submit(String(route.handle), text);
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
      // A boundary answer is a successful human-facing outcome, not a failed
      // delivery. Ack it so the outbox does not retry or escalate it as error.
      return "acked";
    }
    // An inbox write is a handoff, not a read: the row stays pending until the
    // bridge appends its marker to ack.jsonl.
    return outcome.ack === "expected" ? "queued" : "acked";
  } catch (error) {
    log.error("dispatch.failed", { target: canonicalTarget, error: errorMessage(error) });
    return "failed";
  }
}

function outboxDeps(): OutboxDeps {
  return {
    deliver: (target, payload, id) => deliverWrite(target, payload, id),
    now: () => Date.now(),
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

async function acceptWrite(directory: string, action: "dispatch" | "steer", params: unknown): Promise<{ accepted: true; id: string }> {
  const { target, text } = validateWriteParams(params);
  const id = randomUUID();
  const log = decisionLogger(directory).forCorrelation(id);
  try {
    withTransaction(directory, () => {
      governWrite(directory, target, params, { correlationId: id });
      insertOutboxMessage(directory, { id, target, payload: { action, text } });
    });
    log.info("dispatch.accepted", { target, action });
    log.info("dispatch.queued", { target, action });
    await drainOutbox(directory, outboxDeps());
    // Only a write no channel would take is a failure. A queued one is open on
    // purpose: the agent has not read its inbox yet (L7).
    if (outboxMessageUnsent(directory, id)) {
      log.error("dispatch.failed", { target, error: "no channel accepted the write" });
      throw new Error(`write ${id} reached no channel for target ${target}`);
    }
    // Terminal state, and only when the row actually settled. An awaiting row is a
    // handoff the agent has not read yet, and calling that "delivered" put a second,
    // contradictory terminal record in the trail ahead of the bridge's own ack.
    if (!outboxMessageOpen(directory, id)) log.info("dispatch.delivered", { target, action });
    return { accepted: true, id };
  } catch (error: unknown) {
    log.error("dispatch.failed", { target, error: errorMessage(error) });
    throw error;
  }
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
 * Launch one detached agent from INSIDE the daemon.
 *
 * A detached agent has no TTY: it runs the prompt it was launched with and exits.
 * The prompt is therefore required, not optional — a detached agent with nothing
 * to do registers, finds no work, and dies before anything can be sent to it.
 * orchd owns the launch because it already owns delivery and outlives the CLI.
 */
function spawnDetached(directory: string, params: unknown): { key: string; pid: number } {
  const value = rpcParams(params);
  const key = requiredString(value.key, "key");
  const adapterId = requiredString(value.adapter, "adapter");
  const adapter = resolveAdapter(adapterId);
  if (!adapter) throw new Error(`cannot spawn ${key}: unknown adapter ${adapterId}`);
  // Required AND ruled on: a launch with no model runs on whatever the harness
  // defaults to, and a shorthand one gets fuzzy-matched onto whatever registry
  // entry shares a prefix. Both end with the fleet on a model nobody asked for.
  const model = requiredString(value.model, "model");
  assertModelAllowed(directory, adapter, model);
  const handle = detachedBackend.spawn(adapter, {
    key,
    env: optionalEnvRecord(value.env, "env"),
    orchDir: directory,
    cwd: optionalString(value.cwd),
    prompt: requiredString(value.prompt, "prompt"),
    model,
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

async function answer(directory: string, params: unknown): Promise<{ ok: true }> {
  const value = rpcParams(params);
  const target = requiredString(value.target, "target");
  const text = requiredString(value.text, "text");
  governWrite(directory, target, params);
  await deliverControl(target, { kind: "answer", text });
  return { ok: true };
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
      status: () => fleetStatus(directory),
      dispatch: (params) => acceptWrite(directory, "dispatch", params),
      steer: (params) => acceptWrite(directory, "steer", params),
      "spawn-detached": (params) => spawnDetached(directory, params),
      "set-model": (params) => setModel(directory, params),
      lifecycle: (params) => applyLifecycle(directory, params),
      "agent-closed": (params) => publishClosedAgent(directory, params),
      answer: (params) => answer(directory, params),
      ack: (params) => {
        const value = rpcParams(params);
        const id = requiredString(value.id, "id");
        markOutboxDelivered(directory, id);
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
    onEvent: (event) => { lastActivityAt = Date.now(); emitAndNotify((value) => server?.emit(value), getSinks(directory), event, directory); },
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

  const idleCheck = setInterval(() => {
    const idleMinutes = getSettings(directory).daemon.idle_shutdown_minutes;
    const liveAgents = liveAgentCount();
    if (liveAgents > 0) lastActivityAt = Date.now();
    const msSinceActivity = Date.now() - lastActivityAt;
    if (!idleShutdownDue({ idleMinutes, liveAgents, subscribers: server?.subscriberCount() ?? 0, msSinceActivity })) return;
    clearInterval(idleCheck);
    void shutDown(directory, `idle ${idleMinutes}m: no live agents, no subscribers`);
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
