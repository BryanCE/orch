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
} from "../daemon/client/process.ts";
import { daemonRuntimeFiles } from "../daemon/client/runtime-files.ts";
import { DaemonAbsentError, DaemonUnreachableError } from "../daemon/client/wire.ts";
import { rpcCall } from "../daemon/client/rpc.ts";
import type { GovernedMethod, ParamsOf, ResultOf, Governance, RpcMethod } from "../daemon/client/protocol.ts";
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
} from "../daemon/client/reach.ts";
import { errorMessage, pidAlive } from "../util.ts";
import { retryingAsync } from "../retry.ts";
import { callerCredential } from "../identity/credential.ts";
import { parseCommand } from "./registry.ts";
import type { ParsedFlags } from "../cli/spec.ts";
import { die } from "./target.ts";
import type { DaemonStatus, WriteGovernance } from "../types/command.ts";
import type { OrchDir } from "../types/core.ts";
import type { DaemonClient, Services } from "../types/services.ts";

async function fetchDaemonStatus(orchDir: OrchDir, timeoutMs = 5000): Promise<DaemonStatus> {
  return rpcCall(orchDir, "daemon-status", undefined, timeoutMs);
}

async function waitForDaemon(orchDir: OrchDir, previousStartedAt?: string): Promise<DaemonStatus> {
  const deadline = Date.now() + 5000;
  return retryingAsync(
    "wait for orchd",
    async () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("wait deadline reached");
      const status = await fetchDaemonStatus(orchDir, Math.min(300, remaining));
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

/** The governance a command's parsed flags carry. */
export function governanceFlags(flags: ParsedFlags): WriteGovernance {
  const gov: WriteGovernance = {};
  if (flags.has("--steal")) gov.steal = true;
  if (flags.has("--cross-space")) gov.crossSpace = true;
  return gov;
}

/** One write to orchd, carrying the caller's credential; orchd stamps the actor from it. Throws the refusal text a human should read; the caller owns what an unreachable daemon costs. Use {@link writeRpc} when that cost is the whole command. */
export async function callDaemon<M extends GovernedMethod>(services: DaemonClient, method: M, params: ParamsOf<M>, gov: WriteGovernance = {}, timeoutMs?: number): Promise<ResultOf<M>> {
  const directory = services.orchDir;
  if (timeoutMs === undefined && (method === "steer" || method === "answer")) {
    const { timeouts } = services.settings.current();
    timeoutMs = timeouts.adapter_command_ms + timeouts.dispatch_ack_ms;
  }
  const governance: Governance = {
    caller: callerCredential(),
    ...(gov.steal ? { steal: true } : {}),
    ...(gov.crossSpace ? { crossSpace: true } : {}),
  };
  const enriched: ParamsOf<M> = { ...params, ...governance };
  try {
    await ensureDaemon(directory, services.logger);
    return await rpcCall(directory, method, enriched, timeoutMs);
  } catch (error: unknown) {
    throw translateDaemonError(directory, error);
  }
}

/** The daemon write whose failure ends the command. */
export async function writeRpc<M extends GovernedMethod>(services: DaemonClient, method: M, params: ParamsOf<M>, gov: WriteGovernance = {}, timeoutMs?: number): Promise<ResultOf<M>> {
  try {
    return await callDaemon(services, method, params, gov, timeoutMs);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** One read from orchd. Nothing is stamped: a read carries no governance. Throws
 *  the refusal text; the caller owns what an unreachable daemon costs. */
export async function askDaemon<M extends RpcMethod>(services: DaemonClient, method: M, params: ParamsOf<M>, timeoutMs?: number): Promise<ResultOf<M>> {
  const directory = services.orchDir;
  try {
    await ensureDaemon(directory, services.logger);
    return await rpcCall(directory, method, params, timeoutMs);
  } catch (error: unknown) {
    throw translateDaemonError(directory, error);
  }
}

/** The daemon read whose failure ends the command. */
export async function readRpc<M extends RpcMethod>(services: DaemonClient, method: M, params: ParamsOf<M>, timeoutMs?: number): Promise<ResultOf<M>> {
  try {
    return await askDaemon(services, method, params, timeoutMs);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

async function startDaemon(orchDir: OrchDir, logger: Services["logger"], foreground: boolean, json = false): Promise<void> {
  const directory = orchDir;
  const global = liveDaemonRegistration();
  if (global && path.resolve(global.orchDir) !== path.resolve(directory)) {
    die(daemonStartRefusal(global));
  }
  const livePid = liveDaemonPid(directory);
  // A live lock pid might be a daemon still binding its socket; grace-poll it
  // before judging. No live lock = nothing to wait on.
  const probe = livePid !== undefined ? await awaitDaemonProbe(directory, Date.now() + BIND_GRACE_MS) : await probeDaemon(directory);
  if (probe === "answered") {
    const status = await fetchDaemonStatus(directory);
    if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: false }) + "\n");
    else process.stdout.write(`already running (pid ${status.pid})\n`);
    return;
  }
  if (probe === "unreachable" && livePid !== undefined) die(starvedDaemonRefusal(directory, livePid));
  // Nothing is listening: a still-alive lock pid is wedged — terminate it so a fresh
  // instance can take the lock instead of being refused it forever. With no live pid,
  // a dial that timed out hit a departed daemon's endpoint files; reap them.
  if (livePid !== undefined) await terminateWedgedDaemon(directory, logger, livePid, 3000);
  else if (probe === "unreachable") clearDaemonRuntime(directory);
  const entrypoint = daemonEntrypoint();
  if (foreground) {
    process.exitCode = await runForeground(entrypoint);
    return;
  }
  daemonize(directory, entrypoint, []);
  // Never announce a start the daemon did not make: it exits silently when it
  // cannot take the lock, and its reason is in the log.
  const status = await waitForDaemon(directory).catch((): never =>
    die(`orchd did not answer after start; see ${daemonRuntimeFiles(directory).log}`));
  if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: true }) + "\n");
  else process.stdout.write(`started (pid ${status.pid})\n`);
}

async function stopDaemon(orchDir: OrchDir, json = false): Promise<void> {
  const directory = orchDir;
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

async function statusDaemon(orchDir: OrchDir, json: boolean): Promise<void> {
  try {
    const status = await fetchDaemonStatus(orchDir);
    if (json) process.stdout.write(`${JSON.stringify(status)}\n`);
    else process.stdout.write(`running (pid ${status.pid}, uptime ${status.uptimeSec}s, hash ${status.codeHash}, ${status.socket}${status.tcpEndpoint ? `, ${status.tcpEndpoint}` : ""})\n`);
  } catch (error) {
    // A starved daemon and a departed one both go silent; only its pid tells them apart.
    if (error instanceof DaemonUnreachableError) return reportDaemonDown(json, unreachableRefusal(orchDir));
    if (!(error instanceof DaemonAbsentError)) throw error;
    reportDaemonDown(json, "not running");
  }
}

async function reloadDaemon(orchDir: OrchDir, json = false): Promise<void> {
  const before = await fetchDaemonStatus(orchDir);
  await rpcCall(orchDir, "reload", undefined);
  const after = await waitForDaemon(orchDir, before.startedAt);
  if (json) process.stdout.write(JSON.stringify({ reloaded: true, pid: after.pid, codeHash: after.codeHash }) + "\n");
  else process.stdout.write(`reloaded (pid ${after.pid}, hash ${after.codeHash})\n`);
}

export async function cmdDaemon(services: Services, args: string[]): Promise<void> {
  const { command, flags, positional } = parseCommand("daemon", args);
  const json = flags.has("--json");
  if (positional.length > 0) die(`usage: ${command.usage}`);
  switch (command.name) {
    case "start": return startDaemon(services.orchDir, services.logger, flags.has("--fg"), json);
    case "stop": return stopDaemon(services.orchDir, json);
    case "status": return statusDaemon(services.orchDir, json);
    case "reload": return reloadDaemon(services.orchDir, json);
    default: die(`usage: ${command.usage}`);
  }
}

export async function cmdWork(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("work", args);
  const json = flags.has("--json");
  const once = flags.has("--once");
  if (positional.length > 0) die("usage: orch work [--once] [--json]");
  await ensureDaemon(services.orchDir, services.logger);
  if (json) process.stdout.write(JSON.stringify({ once, accepted: true, daemon: "orchd" }) + "\n");
  else process.stdout.write("orchd is processing the queue.\n");
}

