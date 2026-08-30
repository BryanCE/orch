import * as path from "node:path";
import {
  clearDaemonRuntime,
  daemonEntrypoint,
  daemonStartRefusal,
  liveDaemonRegistration,
  daemonize,
  provenDaemonPid,
  runForeground,
  terminateDaemon,
  unprovenLockRefusal,
} from "../daemon/lifecycle.ts";
import { daemonRuntimeFiles } from "../daemon/runtime-files.ts";
import { DaemonAbsentError, DaemonUnreachableError, rpcCall } from "../daemon/rpc.ts";
import {
  awaitDaemonProbe,
  BIND_GRACE_MS,
  daemonLockPid,
  ensureDaemon,
  liveDaemonPid,
  probeDaemon,
  starvedDaemonRefusal,
  terminateWedgedDaemon,
  translateDaemonError,
  unreachableRefusal,
} from "../daemon/reach.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord, pidAlive } from "../util.ts";
import { retryingAsync } from "../retry.ts";
import { actorSpace, callerIsSpawnedAgent, callerOwnerToken, die, forbidAgentOverride } from "./target.ts";
import type { DaemonStatus, WriteGovernance } from "../types/command.ts";

export function validDaemonStatus(value: unknown): value is DaemonStatus {
  return isRecord(value)
    && typeof value.pid === "number"
    && typeof value.startedAt === "string"
    && typeof value.uptimeSec === "number"
    && typeof value.codeHash === "string"
    && typeof value.socket === "string"
    && (value.tcpEndpoint === undefined || typeof value.tcpEndpoint === "string");
}

async function fetchDaemonStatus(timeoutMs = 5000): Promise<DaemonStatus> {
  const result = await rpcCall(orchDir(), "daemon-status", undefined, timeoutMs);
  if (!validDaemonStatus(result)) throw new Error("orchd returned an invalid status");
  return result;
}

async function waitForDaemon(previousStartedAt?: string): Promise<DaemonStatus> {
  const deadline = Date.now() + 5000;
  return retryingAsync(
    "wait for orchd",
    async () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("wait deadline reached");
      const status = await fetchDaemonStatus(Math.min(300, remaining));
      if (previousStartedAt && status.startedAt === previousStartedAt) throw new Error("orchd is still restarting");
      return status;
    },
    {
      attempts: 100,
      delayMs: 50,
      backoff: 1,
      retryable: (error) => error instanceof Error && error.message !== "wait deadline reached",
    },
  ).catch(() => { throw new Error("timed out waiting for orchd"); });
}

/** Extract governance flags and strip them from the positional args. */
export function parseGovernance(args: string[]): { gov: WriteGovernance; rest: string[] } {
  const gov: WriteGovernance = {};
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--steal") gov.steal = true;
    else if (arg === "--cross-space") gov.crossSpace = true;
    else rest.push(arg);
  }
  // Refused at parse time so the message names the flag, before any wall or
  // resolution failure can obscure it. callDaemon re-checks for programmatic gov.
  if (gov.steal) forbidAgentOverride("--steal");
  if (gov.crossSpace) forbidAgentOverride("--cross-space");
  return { gov, rest };
}

/** One write to orchd, stamped with the caller's actor and governance. Throws the
 *  refusal text a human should read; the caller owns what an unreachable daemon costs.
 *  Use {@link writeRpc} when that cost is the whole command. */
export async function callDaemon(method: string, params: Record<string, unknown>, gov: WriteGovernance = {}, timeoutMs?: number): Promise<unknown> {
  const directory = orchDir();
  if (gov.steal) forbidAgentOverride("--steal");
  if (gov.crossSpace) forbidAgentOverride("--cross-space");
  // The write actor is the same token spawn stamps as owner (ORCH_OWNER, else
  // the id orch issued); anything else and an orchestrator cannot steer its own fleet.
  const actor = callerOwnerToken() ?? null;
  const enriched: Record<string, unknown> = { ...params };
  if (actor !== null) {
    enriched.actor = actor;
    enriched.actorSpace = actorSpace(actor);
    enriched.actorIsOperator = !callerIsSpawnedAgent();
  }
  if (gov.steal) enriched.steal = true;
  if (gov.crossSpace) enriched.crossSpace = true;
  try {
    await ensureDaemon(directory);
    return await rpcCall(directory, method, enriched, timeoutMs);
  } catch (error: unknown) {
    throw translateDaemonError(directory, error);
  }
}

/** The daemon write whose failure ends the command. */
export async function writeRpc(method: string, params: Record<string, unknown>, gov: WriteGovernance = {}, timeoutMs?: number): Promise<unknown> {
  try {
    return await callDaemon(method, params, gov, timeoutMs);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function startDaemon(foreground: boolean, json = false): Promise<void> {
  const directory = orchDir();
  const global = liveDaemonRegistration();
  if (global && path.resolve(global.orchDir) !== path.resolve(directory)) {
    die(daemonStartRefusal(global));
  }
  const livePid = liveDaemonPid(directory);
  // A live lock pid might be a daemon still binding its socket; grace-poll it
  // before judging. No live lock = nothing to wait on.
  const probe = livePid !== undefined ? await awaitDaemonProbe(directory, Date.now() + BIND_GRACE_MS) : await probeDaemon(directory);
  if (probe === "answered") {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: false }) + "\n");
    else process.stdout.write(`already running (pid ${status.pid})\n`);
    return;
  }
  if (probe === "unreachable" && livePid !== undefined) die(starvedDaemonRefusal(directory, livePid));
  // Nothing is listening: a still-alive lock pid is wedged — terminate it so a fresh
  // instance can take the lock instead of being refused it forever. With no live pid,
  // a dial that timed out hit a departed daemon's endpoint files; reap them.
  if (livePid !== undefined) await terminateWedgedDaemon(directory, livePid, 3000);
  else if (probe === "unreachable") clearDaemonRuntime(directory);
  const entrypoint = daemonEntrypoint();
  if (foreground) {
    process.exitCode = await runForeground(entrypoint);
    return;
  }
  daemonize(entrypoint, [], directory);
  // Never announce a start the daemon did not make: it exits silently when it
  // cannot take the lock, and its reason is in the log.
  const status = await waitForDaemon().catch((): never =>
    die(`orchd did not answer after start; see ${daemonRuntimeFiles(directory).log}`));
  if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: true }) + "\n");
  else process.stdout.write(`started (pid ${status.pid})\n`);
}

async function stopDaemon(json = false): Promise<void> {
  const directory = orchDir();
  const lockPid = daemonLockPid(directory);
  if (!lockPid || !pidAlive(lockPid)) {
    if (json) process.stdout.write(JSON.stringify({ running: false, stopped: false }) + "\n");
    else process.stdout.write("not running\n");
    return;
  }
  const pid = provenDaemonPid(directory);
  if (pid === undefined) die(unprovenLockRefusal(directory, lockPid));
  await terminateDaemon(pid, 5000);
  if (pidAlive(pid)) throw new Error(`timed out stopping orchd (pid ${pid})`);
  if (json) process.stdout.write(JSON.stringify({ running: false, stopped: true, pid }) + "\n");
  else process.stdout.write(`stopped (pid ${pid})\n`);
}

/** Report a daemon that did not answer, in the shape the caller asked for. A `--json`
 *  caller gets JSON on this path too: a parse error is not a diagnosis. */
function reportDaemonDown(json: boolean, reason: string): void {
  process.stdout.write(json ? `${JSON.stringify({ running: false, reason })}\n` : `${reason}\n`);
  process.exitCode = 1;
}

async function statusDaemon(json: boolean): Promise<void> {
  try {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(`${JSON.stringify(status)}\n`);
    else process.stdout.write(`running (pid ${status.pid}, uptime ${status.uptimeSec}s, hash ${status.codeHash}, ${status.socket}${status.tcpEndpoint ? `, ${status.tcpEndpoint}` : ""})\n`);
  } catch (error) {
    // A starved daemon and a departed one both go silent; only its pid tells them apart.
    if (error instanceof DaemonUnreachableError) return reportDaemonDown(json, unreachableRefusal(orchDir()));
    if (!(error instanceof DaemonAbsentError)) throw error;
    reportDaemonDown(json, "not running");
  }
}

async function reloadDaemon(json = false): Promise<void> {
  const before = await fetchDaemonStatus();
  await rpcCall(orchDir(), "reload");
  const after = await waitForDaemon(before.startedAt);
  if (json) process.stdout.write(JSON.stringify({ reloaded: true, pid: after.pid, codeHash: after.codeHash }) + "\n");
  else process.stdout.write(`reloaded (pid ${after.pid}, hash ${after.codeHash})\n`);
}

const FOREGROUND_FLAGS = ["--fg", "--foreground"];

/** Refuse a flag orch does not define, so a typo never silently changes what runs —
 *  `--foreground` used to daemonize instead of attaching, with no complaint. */
function rejectUnknownFlags(action: string, args: string[], allowed: readonly string[]): void {
  const unknown = args.filter((arg) => !allowed.includes(arg));
  if (unknown.length > 0) die(`orch daemon ${action}: unknown ${unknown.length === 1 ? "flag" : "flags"} ${unknown.join(" ")}`);
}

export async function cmdDaemon(args: string[]): Promise<void> {
  const [action, ...flags] = args;
  const json = flags.includes("--json");
  if (action === "start") {
    rejectUnknownFlags(action, flags, [...FOREGROUND_FLAGS, "--json"]);
    return startDaemon(flags.some((flag) => FOREGROUND_FLAGS.includes(flag)), json);
  }
  if (action === "stop") {
    rejectUnknownFlags(action, flags, ["--json"]);
    return stopDaemon(json);
  }
  if (action === "status") {
    rejectUnknownFlags(action, flags, ["--json"]);
    return statusDaemon(json);
  }
  if (action === "reload") {
    rejectUnknownFlags(action, flags, ["--json"]);
    return reloadDaemon(json);
  }
  die("usage: orch daemon start [--fg|--foreground] | stop | status [--json] | reload [--json]");
}

export async function cmdWork(args: string[]) {
  const json = args.includes("--json");
  const once = args.includes("--once");
  if (args.some((arg) => arg !== "--once" && arg !== "--json")) die("usage: orch work [--once] [--json]");
  await ensureDaemon(orchDir());
  if (json) process.stdout.write(JSON.stringify({ once, accepted: true, daemon: "orchd" }) + "\n");
  else process.stdout.write("orchd is processing the queue.\n");
}

