import * as path from "node:path";
import { daemonize, runForeground } from "../daemon/lifecycle.ts";
import { DaemonAbsentError, rpcCall } from "../daemon/rpc.ts";
import { orchDir, readJSON } from "../presence/store.ts";
import { errorMessage, isRecord, packageRoot, pidAlive } from "../util.ts";
import { selfActor } from "../entities.ts";
import { die } from "./target.ts";

interface LockFile {
  pid?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DaemonStatus {
  pid: number;
  startedAt: string;
  uptimeSec: number;
  codeHash: string;
  socket: string;
}

function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? path.join(packageRoot(), "dist", "daemon", "orchd.js");
}

export function daemonLockPid(directory = orchDir()): number | undefined {
  const lock = readJSON<LockFile>(path.join(directory, "orchd.lock"));
  return lock && typeof lock.pid === "number" && Number.isInteger(lock.pid) && lock.pid > 0 ? lock.pid : undefined;
}

export function validDaemonStatus(value: unknown): value is DaemonStatus {
  return isRecord(value)
    && typeof value.pid === "number"
    && typeof value.startedAt === "string"
    && typeof value.uptimeSec === "number"
    && typeof value.codeHash === "string"
    && typeof value.socket === "string";
}

async function fetchDaemonStatus(timeoutMs = 5000): Promise<DaemonStatus> {
  const result = await rpcCall(orchDir(), "daemon-status", undefined, timeoutMs);
  if (!validDaemonStatus(result)) throw new Error("orchd returned an invalid status");
  return result;
}

async function waitForDaemon(previousStartedAt?: string): Promise<DaemonStatus> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const status = await fetchDaemonStatus(300);
      if (!previousStartedAt || status.startedAt !== previousStartedAt) return status;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("timed out waiting for orchd");
}

export async function ensureDaemon(directory: string): Promise<void> {
  try {
    await rpcCall(directory, "daemon-status", undefined, 200);
    return;
  } catch {
    // A live daemon can be between lock acquisition and socket listen.
  }
  const existingPid = daemonLockPid(directory);
  if (!existingPid || !pidAlive(existingPid)) daemonize(daemonEntrypoint(), [], directory);
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      await rpcCall(directory, "daemon-status", undefined, 300);
      return;
    } catch {
      await delay(50);
    }
  }
  throw new DaemonAbsentError(directory);
}

export interface WriteGovernance {
  steal?: boolean;
  crossWorkspace?: boolean;
}

/** Extract governance flags and strip them from the positional args. */
export function parseGovernance(args: string[]): { gov: WriteGovernance; rest: string[] } {
  const gov: WriteGovernance = {};
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--steal") gov.steal = true;
    else if (arg === "--cross-workspace") gov.crossWorkspace = true;
    else rest.push(arg);
  }
  return { gov, rest };
}

export async function writeRpc(method: string, params: Record<string, unknown>, gov: WriteGovernance = {}): Promise<unknown> {
  const directory = orchDir();
  const actor = selfActor();
  const enriched: Record<string, unknown> = { ...params };
  if (actor !== null) enriched.actor = actor;
  if (gov.steal) enriched.steal = true;
  if (gov.crossWorkspace) enriched.crossWorkspace = true;
  try {
    await ensureDaemon(directory);
    return await rpcCall(directory, method, enriched);
  } catch (error: unknown) {
    if (error instanceof DaemonAbsentError) die(`orch daemon unavailable; run 'orch daemon start': ${errorMessage(error)}`);
    throw error;
  }
}

async function startDaemon(foreground: boolean, json = false): Promise<void> {
  const existingPid = daemonLockPid();
  if (existingPid && pidAlive(existingPid)) {
    if (json) process.stdout.write(JSON.stringify({ running: true, pid: existingPid, started: false }) + "\n");
    else process.stdout.write(`already running (pid ${existingPid})\n`);
    return;
  }
  const entrypoint = daemonEntrypoint();
  if (foreground) {
    runForeground(entrypoint);
    return;
  }
  daemonize(entrypoint, [], orchDir());
  const status = await waitForDaemon();
  if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: true }) + "\n");
  else process.stdout.write(`started (pid ${status.pid})\n`);
}

async function stopDaemon(json = false): Promise<void> {
  const pid = daemonLockPid();
  if (!pid || !pidAlive(pid)) {
    if (json) process.stdout.write(JSON.stringify({ running: false, stopped: false }) + "\n");
    else process.stdout.write("not running\n");
    return;
  }
  process.kill(pid, "SIGTERM");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(pid)) await new Promise((resolve) => setTimeout(resolve, 50));
  if (pidAlive(pid)) throw new Error(`timed out stopping orchd (pid ${pid})`);
  if (json) process.stdout.write(JSON.stringify({ running: false, stopped: true, pid }) + "\n");
  else process.stdout.write(`stopped (pid ${pid})\n`);
}

async function statusDaemon(json: boolean): Promise<void> {
  try {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(`${JSON.stringify(status)}\n`);
    else process.stdout.write(`running (pid ${status.pid}, uptime ${status.uptimeSec}s, hash ${status.codeHash}, ${status.socket})\n`);
  } catch (error) {
    if (!(error instanceof DaemonAbsentError)) throw error;
    process.stdout.write("not running\n");
    process.exitCode = 1;
  }
}

async function reloadDaemon(json = false): Promise<void> {
  const before = await fetchDaemonStatus();
  await rpcCall(orchDir(), "reload");
  const after = await waitForDaemon(before.startedAt);
  if (json) process.stdout.write(JSON.stringify({ reloaded: true, pid: after.pid, codeHash: after.codeHash }) + "\n");
  else process.stdout.write(`reloaded (pid ${after.pid}, hash ${after.codeHash})\n`);
}

export async function cmdDaemon(args: string[]): Promise<void> {
  const action = args[0];
  const json = args.includes("--json");
  if (action === "start") return startDaemon(args.includes("--fg"), json);
  if (action === "stop") return stopDaemon(json);
  if (action === "status") return statusDaemon(json);
  if (action === "reload") return reloadDaemon(json);
  die("usage: orch daemon start [--fg] | stop | status [--json] | reload [--json]");
}

export async function cmdWork(args: string[]) {
  const json = args.includes("--json");
  const once = args.includes("--once");
  if (args.some((arg) => arg !== "--once" && arg !== "--json")) die("usage: orch work [--once] [--json]");
  await ensureDaemon(orchDir());
  if (json) process.stdout.write(JSON.stringify({ once, accepted: true, daemon: "orchd" }) + "\n");
  else process.stdout.write("orchd is processing the queue.\n");
}

