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

const entrypoint = process.env.ORCHD_ENTRYPOINT ?? import.meta.path;
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

  configWatch = startConfigWatch(directory, {
    onChange: (config) => {
      currentConfig = config;
      sinks = undefined;
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
    maxRetries: getConfig(directory).queue.max_retries,
    signal: workController.signal,
    continuous: true,
  }).finally(() => { workLoopRunning = false; });

  process.once("SIGTERM", () => void shutDown(directory));
  process.once("SIGINT", () => void shutDown(directory));
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exit(1);
  });
}
