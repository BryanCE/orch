import { closeSync, openSync, readSync, statSync } from "node:fs";
import * as path from "node:path";
import {
  clearDaemonRuntime,
  daemonEntrypoint,
  daemonStartRefusal,
  liveDaemonRegistration,
  daemonize,
  provenDaemonPid,
  readDaemonLock,
  runForeground,
  terminateDaemon,
  unprovenLockRefusal,
} from "../daemon/lifecycle.ts";
import { daemonRuntimeFiles } from "../daemon/runtime-files.ts";
import { DaemonAbsentError, DaemonUnreachableError, RpcError, rpcCall } from "../daemon/rpc.ts";
import { orchDir } from "../presence/store.ts";
import { errorMessage, isRecord, pidAlive, sleep } from "../util.ts";
import { actorSpace, callerIsSpawnedAgent, callerOwnerToken, die, forbidAgentOverride } from "./target.ts";
import { commandLogger } from "./logging.ts";
import type { DaemonStatus, WriteGovernance } from "../types/command.ts";

/** The pid in the daemon lock, once the lifecycle layer has vetted the record.
 *  A pid alone is never authority to signal — see {@link provenDaemonPid}. */
export function daemonLockPid(directory = orchDir()): number | undefined {
  return readDaemonLock(directory)?.pid ?? liveDaemonRegistration(directory)?.pid;
}

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
  while (Date.now() < deadline) {
    try {
      const status = await fetchDaemonStatus(300);
      if (!previousStartedAt || status.startedAt !== previousStartedAt) return status;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("timed out waiting for orchd");
}

/** What orch says instead of killing a daemon it merely could not reach in time. */
function starvedDaemonRefusal(directory: string, lockPid: number | undefined): string {
  const owner = lockPid === undefined ? "orchd" : `orchd pid ${lockPid}`;
  return `${owner} did not answer within ${PROBE_BUDGET_MS}ms; it was NOT stopped — a timeout is no proof it died. `
    + `The machine is likely loaded: retry, or read ${daemonRuntimeFiles(directory).log}`;
}

/** How far back the log is read for the one line that says why orchd went. */
const LOG_TAIL_BYTES = 4_096;

/** The last line orchd logged, read from the tail so a long log stays cheap. */
function lastDaemonLogLine(directory: string): string | null {
  const file = daemonRuntimeFiles(directory).log;
  try {
    const size = statSync(file).size;
    const from = Math.max(0, size - LOG_TAIL_BYTES);
    const tail = Buffer.alloc(size - from);
    const handle = openSync(file, "r");
    try {
      readSync(handle, tail, 0, tail.length, from);
    } finally {
      closeSync(handle);
    }
    // filter first: an all-blank tail must read as "orchd logged nothing", not as an empty line.
    return tail.toString("utf8").trimEnd().split(/\r?\n/).filter(Boolean).pop() ?? null;
  } catch {
    return null;
  }
}

/** What orch says when nothing answered and no process was alive to answer. The pid
 *  is knowable without waiting, so a departed daemon must never be reported as a
 *  timeout: that wording sends the operator to the log to learn what orch already knew. */
function departedDaemonRefusal(directory: string, lockPid: number | undefined): string {
  const owner = lockPid === undefined ? "orchd holds no lock and nothing answered" : `orchd pid ${lockPid} is not running`;
  const lastLine = lastDaemonLogLine(directory);
  return `${owner}; its endpoint is stale, not busy. ${lastLine ? `Last log line: ${lastLine}. ` : ""}`
    + `Start a fresh one with 'orch daemon start'; ${daemonRuntimeFiles(directory).log} has the rest.`;
}

/** The lock's pid, but only while that process is running. A dial that times out
 *  with none leaves nothing that could have been starved: orchd is gone. */
function liveDaemonPid(directory: string): number | undefined {
  const lockPid = daemonLockPid(directory);
  return lockPid !== undefined && pidAlive(lockPid) ? lockPid : undefined;
}

/** Why orchd stayed silent past its budget — a live daemon starved, or a departed one. */
function unreachableRefusal(directory: string): string {
  const lockPid = daemonLockPid(directory);
  return lockPid !== undefined && pidAlive(lockPid)
    ? starvedDaemonRefusal(directory, lockPid)
    : departedDaemonRefusal(directory, lockPid);
}

/** orchd's silence as text a human should read, or null when it answers. */
export async function daemonOutage(directory = orchDir()): Promise<string | null> {
  const probe = await probeDaemon(directory);
  if (probe === "answered") return null;
  if (probe === "unreachable") return unreachableRefusal(directory);
  return `orchd is not listening (${directory}); run 'orch daemon start'`;
}

/** Stop a daemon that holds the lock while nothing listens on its endpoints, so a fresh
 *  one can take it. Callers owe a `not-listening` verdict first — never a timeout.
 *  Announced: a daemon killed in silence is indistinguishable from one that crashed. */
async function terminateWedgedDaemon(directory: string, lockPid: number, graceMs: number): Promise<void> {
  const wedged = provenDaemonPid(directory);
  if (wedged === undefined) throw new Error(unprovenLockRefusal(directory, lockPid));
  commandLogger().warn("daemon.wedged-stopping", { pid: wedged });
  process.stderr.write(`orchd pid ${wedged} holds the lock but did not answer; stopping it\n`);
  await terminateDaemon(wedged, graceMs);
}

/** Reach orchd, starting one when nothing holds its lock. THROWS when it cannot be
 *  reached: whether an unreachable daemon ends the command is the caller's ruling, and
 *  exiting from in here is what killed a spawn that had already placed its panes. */
export async function ensureDaemon(directory: string): Promise<void> {
  const probe = await probeDaemon(directory);
  if (probe === "answered") return;
  const livePid = liveDaemonPid(directory);
  // A timeout only leaves liveness unknown while some process is alive to be starved.
  // With none, a stale endpoint file swallowed the dial, and orch owes a fresh daemon
  // rather than a refusal — refusing is what left every later command timing out at a
  // daemon that had been dead for hours.
  if (probe === "unreachable" && livePid !== undefined) throw new Error(starvedDaemonRefusal(directory, livePid));
  if (livePid !== undefined) {
    // Lock taken but nothing listening: it may still be binding its socket.
    const graced = await awaitDaemonProbe(directory, Date.now() + BIND_GRACE_MS);
    if (graced === "answered") return;
    if (graced === "unreachable") throw new Error(starvedDaemonRefusal(directory, livePid));
    await terminateWedgedDaemon(directory, livePid, 3000);
  } else if (probe === "unreachable") {
    clearDaemonRuntime(directory);
  }
  daemonize(daemonEntrypoint(), [], directory);
  const started = await awaitDaemonProbe(directory, Date.now() + START_GRACE_MS);
  if (started === "answered") return;
  if (started === "unreachable") throw new Error(unreachableRefusal(directory));
  throw new DaemonAbsentError(directory);
}

/** Reach orchd, or warn and carry on. For the commands specified to work with the
 *  daemon absent, where its silence costs its rows and never the whole command. */
export async function ensureDaemonOrWarn(directory: string): Promise<void> {
  try {
    await ensureDaemon(directory);
  } catch (error: unknown) {
    const message = errorMessage(error);
    commandLogger().warn("daemon.unavailable", { error: message });
    process.stderr.write(`warning: ${message}\n`);
  }
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

/** Translate daemon liveness failures once at the command boundary. */
export function translateDaemonError(directory: string, error: unknown): unknown {
  if (error instanceof DaemonAbsentError) return new Error(`orch daemon unavailable; run 'orch daemon start': ${errorMessage(error)}`);
  if (error instanceof DaemonUnreachableError) return new Error(unreachableRefusal(directory));
  return error;
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

/** orchd's liveness. `not-listening` is proof nothing holds its endpoints and is the
 *  ONLY verdict that may cost a daemon its life; `unreachable` means the probe outran
 *  its budget, which on a loaded machine a perfectly healthy daemon does constantly.
 *  An RPC error still means it answered, and anything unclassifiable stays unreachable. */
type DaemonProbe = "answered" | "not-listening" | "unreachable";

/** Generous on purpose: under load the CLI starves before orchd does, and this budget
 *  is what a starved probe used to mistake for a dead daemon. Idle answers cost ~2ms. */
const PROBE_BUDGET_MS = 2_000;
const BIND_GRACE_MS = 1_000;
const START_GRACE_MS = 5_000;

async function probeDaemon(directory: string, timeoutMs = PROBE_BUDGET_MS): Promise<DaemonProbe> {
  try {
    await rpcCall(directory, "daemon-status", undefined, timeoutMs);
    return "answered";
  } catch (error: unknown) {
    if (error instanceof RpcError) return "answered";
    if (error instanceof DaemonAbsentError) return "not-listening";
    return "unreachable";
  }
}

function probeBudget(deadline: number): number {
  return Math.max(50, Math.min(PROBE_BUDGET_MS, deadline - Date.now()));
}

/** Poll until orchd answers or the deadline passes, reporting the last verdict —
 *  covers the window where it holds the lock but has not finished binding its socket. */
async function awaitDaemonProbe(directory: string, deadline: number): Promise<DaemonProbe> {
  let verdict = await probeDaemon(directory, probeBudget(deadline));
  while (verdict !== "answered" && Date.now() < deadline) {
    await sleep(50);
    verdict = await probeDaemon(directory, probeBudget(deadline));
  }
  return verdict;
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

