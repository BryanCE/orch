import {
  acquireDaemonLock,
  computeCodeHash,
  reexecSelf,
  releaseDaemonLock,
} from "./lifecycle.ts";
import { rpcCall, startRpcServer, type RpcServer } from "./rpc.ts";
import { loadConfig, type OrchConfig } from "../config.ts";
import { loadSinks, type Sink } from "../notify.ts";
import { runWorkLoop } from "../work.ts";
import { startConfigWatch, type ConfigWatch } from "./configwatch.ts";
import { emitAndNotify, startPresenceWatch, type PresenceWatch } from "./events.ts";
import { orchDir } from "../store.ts";
import { errorMessage } from "../util.ts";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { insertOutboxMessage, markOutboxDelivered, checkOwnerWrite } from "../store/sqlite.ts";
import { checkWall } from "../policy/workspace.ts";
import { drainOutbox, type OutboxDeps } from "./outbox.ts";
import { deliverControl, resolveTargetAdapter, resolveTargetRoute } from "../control/dispatch.ts";

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

function getConfig(directory: string): OrchConfig {
  return currentConfig ??= loadConfig(directory);
}

function getSinks(directory: string): Sink[] {
  return sinks ??= loadSinks(directory);
}

async function socketAnswers(directory: string): Promise<boolean> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return true;
  } catch {
    return false;
  }
}

interface WriteParams {
  id?: unknown;
  target?: unknown;
  text?: unknown;
  model?: unknown;
  actor?: unknown;
  steal?: unknown;
  crossWorkspace?: unknown;
}

function writeParams(params: unknown): WriteParams {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new Error("RPC params must be an object");
  }
  return params;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

function isWritePayload(value: unknown): value is { action?: unknown; text?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function deliverBackend(target: string, payload: unknown): Promise<boolean> {
  const value = isWritePayload(payload) ? payload : {};
  const text = requiredString(value.text, "text");
  if (value.action === "dispatch") {
    const route = resolveTargetRoute(target);
    return route !== undefined && route.backend.deliver(route.handle, { kind: "run", text });
  }
  // Steer: agents route through the control dispatcher (adapter-gated); a
  // target with no recorded adapter is a bare pane and gets a plain message.
  if (resolveTargetAdapter(target)) {
    try {
      await deliverControl(target, { kind: "steer", text });
      return true;
    } catch (error) {
      process.stderr.write(`steer ${target} failed: ${errorMessage(error)}\n`);
      return false;
    }
  }
  const route = resolveTargetRoute(target);
  return route !== undefined && route.backend.deliver(route.handle, { kind: "message", text });
}

function outboxDeps(): OutboxDeps {
  return {
    deliver: (target, payload) => deliverBackend(target, payload),
    now: () => Date.now(),
  };
}

export function validateWriteParams(params: unknown): { target: string; text: string } {
  const value = writeParams(params);
  return {
    target: requiredString(value.target, "target"),
    text: requiredString(value.text, "text"),
  };
}

/** Enforce the workspace wall, then ownership, before a write is accepted.
 *  An unscoped actor is wall-eligible and unattributable, so ownership is skipped
 *  for it. Throws to reject the write. */
export function governWrite(directory: string, target: string, params: unknown): void {
  const value = writeParams(params);
  const actor = typeof value.actor === "string" && value.actor.length > 0 ? value.actor : null;
  const steal = value.steal === true;
  const crossWorkspace = value.crossWorkspace === true;
  const wall = checkWall(actor, target, { crossWorkspace });
  if (!wall.allowed) throw new Error(wall.reason ?? "workspace wall denied the write");
  if (actor === null) return;
  const owned = checkOwnerWrite(directory, target, actor, { steal });
  if (!owned.ok) throw new Error(owned.reason ?? "ownership denied the write");
}

async function acceptWrite(directory: string, action: "dispatch" | "steer", params: unknown): Promise<{ accepted: true; id: string }> {
  const { target, text } = validateWriteParams(params);
  governWrite(directory, target, params);
  const id = randomUUID();
  insertOutboxMessage(directory, { id, target, payload: { action, text } });
  await drainOutbox(directory, outboxDeps());
  return { accepted: true, id };
}

async function setModel(directory: string, params: unknown): Promise<{ ok: true }> {
  const value = writeParams(params);
  const target = requiredString(value.target, "target");
  const model = requiredString(value.model, "model");
  governWrite(directory, target, params);
  await deliverControl(target, { kind: "model", model });
  return { ok: true };
}

async function shutDown(directory: string): Promise<void> {
  presenceWatch?.stop();
  configWatch?.stop();
  workController.abort();
  await workLoop;
  await server?.stop();
  releaseDaemonLock(directory);
  process.exit(0);
}

async function main(): Promise<void> {
  const directory = orchDir();
  const answers = await socketAnswers(directory);
  if (!acquireDaemonLock(directory, () => answers)) {
    process.stdout.write("already running\n");
    return;
  }

  try {
    server = await startRpcServer(directory, {
      "daemon-status": () => ({
        pid: process.pid,
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        codeHash: bootCodeHash,
        socket: server?.transport ?? "unknown",
        subsystems: {
          workLoop: workLoopRunning ? "running" : "stopped",
          presenceWatch: presenceWatch ? "running" : "stopped",
          configWatch: configWatch ? "running" : "stopped",
        },
      }),
      "subscribe-events": () => ({ subscribed: true }),
      dispatch: (params) => acceptWrite(directory, "dispatch", params),
      steer: (params) => acceptWrite(directory, "steer", params),
      "set-model": (params) => setModel(directory, params),
      ack: (params) => {
        const value = writeParams(params);
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
    }, { holdsDaemonLock: true });
  } catch (error) {
    releaseDaemonLock(directory);
    throw error;
  }

  let configLoaded = false;
  configWatch = startConfigWatch(directory, {
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
    onEvent: (event) => emitAndNotify((value) => server?.emit(value), getSinks(directory), event),
  });
  workLoopRunning = true;
  workLoop = runWorkLoop({
    orchDir: directory,
    pollIntervalMs: 500,
    getConfig: () => getConfig(directory),
    signal: workController.signal,
    continuous: true,
    onEvent: (event) => emitAndNotify((value) => server?.emit(value), getSinks(directory), event),
  }).finally(() => { workLoopRunning = false; });

  process.once("SIGTERM", () => void shutDown(directory));
  process.once("SIGINT", () => void shutDown(directory));
}

function invokedAsMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return realpathSync(arg) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (invokedAsMain()) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  });
}
