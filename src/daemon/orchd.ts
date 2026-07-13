import { join } from "node:path";
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

const orchDir = process.env.ORCH_DIR ?? join(process.env.HOME ?? process.cwd(), ".orch");
const entrypoint = process.env.ORCHD_ENTRYPOINT ?? import.meta.path;
const bootCodeHash = computeCodeHash(entrypoint);
const startedAt = new Date();
let server: RpcServer | undefined;
const workController = new AbortController();
let workLoop: Promise<void> | undefined;
let workLoopRunning = false;
let presenceWatch: PresenceWatch | undefined;
let configWatch: ConfigWatch | undefined;
let currentConfig: OrchConfig = loadConfig(orchDir);
let sinks: Sink[] = loadSinks(orchDir);

async function socketAnswers(directory: string): Promise<boolean> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return true;
  } catch {
    return false;
  }
}

async function shutDown(): Promise<void> {
  presenceWatch?.stop();
  configWatch?.stop();
  workController.abort();
  await workLoop;
  await server?.stop();
  releaseDaemonLock(orchDir);
  process.exit(0);
}

async function main(): Promise<void> {
  const answers = await socketAnswers(orchDir);
  if (!acquireDaemonLock(orchDir, () => answers)) {
    process.stdout.write("already running\n");
    return;
  }

  try {
    server = await startRpcServer(orchDir, {
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
          void server?.stop().then(() => reexecSelf(orchDir));
        }, 10);
        return { ok: true };
      },
    }, { holdsDaemonLock: true });
  } catch (error) {
    releaseDaemonLock(orchDir);
    throw error;
  }

  configWatch = startConfigWatch(orchDir, {
    onChange: (config) => {
      currentConfig = config;
      sinks = loadSinks(orchDir);
    },
    onWarn: (message) => process.stderr.write(`orchd config: ${message}\n`),
  });
  presenceWatch = startPresenceWatch({
    orchDir,
    onEvent: (event) => emitAndNotify((value) => server?.emit(value), sinks, event),
  });
  workLoopRunning = true;
  workLoop = runWorkLoop({
    orchDir,
    pollIntervalMs: 500,
    maxRetries: currentConfig.queue.max_retries,
    signal: workController.signal,
    continuous: true,
  }).finally(() => { workLoopRunning = false; });

  process.once("SIGTERM", () => void shutDown());
  process.once("SIGINT", () => void shutDown());
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
