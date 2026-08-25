import "../store/suppress-sqlite-warning.ts";
import {
  acquireDaemonLock,
  computeCodeHash,
  reexecSelf,
  releaseDaemonLock,
} from "./lifecycle.ts";
import { rpcCall, startRpcServer, type RpcHandlers, type RpcServer } from "./rpc.ts";
import { loadConfig, watchConfig, type ConfigWatch, type OrchConfig } from "../config.ts";
import { loadSinks, type Sink } from "../notify/router.ts";
import { runWorkLoop } from "./work-loop.ts";
import { emitAndNotify, startPresenceWatch, type PresenceWatch } from "./events.ts";
import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { errorMessage, errorTrace } from "../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { insertOutboxMessage, markOutboxDelivered, selectPendingOutbox, checkOwnerWrite, getOwner } from "../store/sqlite.ts";
import { checkWall, operatorControls } from "../policy/workspace.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { drainOutbox, type OutboxDeps } from "./outbox.ts";
import { normalizeControlTarget } from "../backends/identity.ts";
import { deliverControl, KEYSTROKE_KIND, resolveTargetAdapter, resolveTargetRoute } from "../control/dispatch.ts";
import { resolveAdapter, warmAdapterCatalogues } from "../adapters/registry.ts";
import { isLifecycleVerb, type LifecycleVerb } from "../adapters/adapter.ts";
import { detachedBackend } from "../backends/registry.ts";
import type { WorkerPolicy } from "../policy/workers.ts";
import { fleetStatusRows, type StatusRow } from "../commands/status.ts";

const entrypoint = process.env.ORCHD_ENTRYPOINT ?? fileURLToPath(import.meta.url);
const bootCodeHash = computeCodeHash(entrypoint);
const startedAt = new Date();
let server: RpcServer | undefined;
const workController = new AbortController();
let workLoop: Promise<void> | undefined;
let workLoopRunning = false;
let presenceWatch: PresenceWatch | undefined;
let configWatch: ConfigWatch | undefined;
let currentConfig: OrchConfig | undefined;
let sinks: Sink[] | undefined;
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
    (params, emit) => { lastActivityAt = Date.now(); return handler(params, emit); },
  ]));
}

function getConfig(directory: string): OrchConfig {
  return currentConfig ??= loadConfig(directory);
}

function getSinks(directory: string): Sink[] {
  return sinks ??= loadSinks(directory);
}

/** The fleet as the daemon sees it, in orch's one status-row shape. Serving a reduced
 *  second shape here is what left the method unusable and every client reading files. */
function fleetStatus(directory: string): { rows: StatusRow[] } {
  return { rows: fleetStatusRows(getConfig(directory).workspaces) };
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
async function deliverWrite(target: string, payload: unknown, id: string): Promise<boolean> {
  const canonicalTarget = normalizeControlTarget(target);
  const value = isWritePayload(payload) ? payload : {};
  const text = requiredString(value.text, "text");
  const kind = value.action === "dispatch" ? "run" : "steer";
  if (!resolveTargetAdapter(canonicalTarget)) {
    const route = resolveTargetRoute(canonicalTarget);
    return route?.backend.deliver(route.handle, { kind: KEYSTROKE_KIND[kind], text }) ?? false;
  }
  try {
    await deliverControl(canonicalTarget, { kind, text, id });
    return true;
  } catch (error) {
    process.stderr.write(`${kind} ${canonicalTarget} failed: ${errorMessage(error)}\n`);
    return false;
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

/** Enforce the workspace wall, then ownership, before a write is accepted.
 *  An unscoped actor cannot own anything, so an owned target refuses it outright;
 *  only unowned targets accept anonymous writes. Throws to reject the write. */
export function governWrite(directory: string, target: string, params: unknown): void {
  const value = rpcParams(params);
  const actor = typeof value.actor === "string" && value.actor.length > 0 ? value.actor : null;
  const steal = value.steal === true;
  const crossWorkspace = value.crossWorkspace === true;
  const wall = checkWall(actor, target, { crossWorkspace, orchDir: directory });
  if (!wall.allowed) throw new Error(wall.reason ?? "workspace wall denied the write");
  if (actor === null) {
    const owner = getOwner(directory, target);
    if (owner !== undefined) throw new Error(`agent is owned by ${owner}; anonymous writes are refused - set ORCH_OWNER to identify this caller`);
    return;
  }
  // The workspace's human operator keeps control of every fleet keyed into it;
  // spawned agents carry their own key, never the operator id, so this grants
  // an agent nothing beyond what it spawned.
  if (operatorControls(actor, target)) return;
  const owned = checkOwnerWrite(directory, target, actor, { steal });
  if (!owned.ok) throw new Error(owned.reason ?? "ownership denied the write");
}

async function acceptWrite(directory: string, action: "dispatch" | "steer", params: unknown): Promise<{ accepted: true; id: string }> {
  const { target, text } = validateWriteParams(params);
  governWrite(directory, target, params);
  const id = randomUUID();
  insertOutboxMessage(directory, { id, target, payload: { action, text } });
  await drainOutbox(directory, outboxDeps());
  const stillPending = selectPendingOutbox(directory, Number.MAX_SAFE_INTEGER).some((message) => message.id === id);
  if (stillPending) throw new Error(`write ${id} was not applied or acknowledged for target ${target}`);
  return { accepted: true, id };
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

/** One orchd lifecycle line into orchd.log. Every start, stop and death gets one:
 *  a daemon that vanishes without a line here is undiagnosable. */
function logLifecycle(message: string): void {
  process.stdout.write(`${new Date().toISOString()} orchd ${message}\n`);
}

function logFatalAndExit(kind: string, error: unknown): void {
  logLifecycle(`${kind}: ${errorTrace(error)}`);
  process.exit(1);
}

async function shutDown(directory: string, reason: string): Promise<void> {
  logLifecycle(`shutting down on ${reason}`);
  presenceWatch?.stop();
  configWatch?.stop();
  workController.abort();
  await workLoop;
  await server?.stop();
  releaseDaemonLock(directory);
  logLifecycle(`stopped pid ${process.pid}`);
  process.exit(0);
}

async function main(): Promise<void> {
  const directory = orchDir();
  const answers = await socketAnswers(directory);
  if (!acquireDaemonLock(directory, () => answers)) {
    logLifecycle(`exiting: another orchd owns ${directory}`);
    return;
  }

  try {
    const tcpPort = loadConfig(directory).daemon.tcp_port;
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
          configWatch: configWatch ? "running" : "stopped",
        },
      }),
      "subscribe-events": () => ({ subscribed: true }),
      status: () => fleetStatus(directory),
      dispatch: (params) => acceptWrite(directory, "dispatch", params),
      steer: (params) => acceptWrite(directory, "steer", params),
      "spawn-detached": (params) => spawnDetached(directory, params),
      "set-model": (params) => setModel(directory, params),
      lifecycle: (params) => applyLifecycle(directory, params),
      answer: (params) => answer(directory, params),
      ack: (params) => {
        const value = rpcParams(params);
        const id = requiredString(value.id, "id");
        markOutboxDelivered(directory, id);
        return { ok: true };
      },
      reload: () => {
        setTimeout(() => {
          void server?.stop().then(() => reexecSelf(directory));
        }, 10);
        return { ok: true };
      },
    }), {
      holdsDaemonLock: true,
      tcpPort,
      onTcpError: (error, port) => process.stderr.write(`orchd TCP listener failed on 127.0.0.1:${port}: ${errorMessage(error)}\n`),
    });
  } catch (error) {
    releaseDaemonLock(directory);
    throw error;
  }

  // orchd gates every spawn on the catalogues; reading them at boot keeps that gate off the
  // harness binaries, and re-stamps whatever went stale while no daemon was running.
  warmAdapterCatalogues();

  let configLoaded = false;
  configWatch = watchConfig(directory, {
    onChange: (config) => {
      currentConfig = config;
      sinks = undefined;
      if (configLoaded) process.stderr.write("config reloaded\n");
      configLoaded = true;
    },
    onWarn: (message) => process.stderr.write(`orchd config: ${message}\n`),
  });
  presenceWatch = startPresenceWatch({
    orchDir: directory,
    metadataFor: (key) => {
      const record = spawnedRecords().get(key);
      return {
        name: record?.name ?? null,
        tab: null,
        pid: undefined,
        spawnedBy: record?.spawnedBy,
        spawnedByLabel: record?.spawnedByLabel,
      };
    },
    onEvent: (event) => { lastActivityAt = Date.now(); emitAndNotify((value) => server?.emit(value), getSinks(directory), event); },
  });
  workLoopRunning = true;
  workLoop = runWorkLoop({
    orchDir: directory,
    pollIntervalMs: 500,
    getConfig: () => getConfig(directory),
    signal: workController.signal,
    continuous: true,
    onEvent: (event) => { lastActivityAt = Date.now(); emitAndNotify((value) => server?.emit(value), getSinks(directory), event); },
  }).finally(() => { workLoopRunning = false; });

  const idleCheck = setInterval(() => {
    const idleMinutes = getConfig(directory).daemon.idle_shutdown_minutes;
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
  logLifecycle(`started pid ${process.pid} hash ${bootCodeHash} on ${server?.transport ?? "unknown"}${tcp ? ` and ${tcp}` : ""}`);
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
  process.on("exit", (code) => { if (code !== 0) logLifecycle(`exited with code ${code}`); });
  void main().catch((error: unknown) => logFatalAndExit("startup failed", error));
}
