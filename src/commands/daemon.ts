import {
  daemonEntrypoint,
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
import { errorMessage, isRecord, pidAlive } from "../util.ts";
import { selfActor } from "../entities.ts";
import { die } from "./target.ts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DaemonStatus {
  pid: number;
  startedAt: string;
  uptimeSec: number;
  codeHash: string;
  socket: string;
  tcpEndpoint?: string;
}

/** The pid in the daemon lock, once the lifecycle layer has vetted the record.
 *  A pid alone is never authority to signal — see {@link provenDaemonPid}. */
export function daemonLockPid(directory = orchDir()): number | undefined {
  return readDaemonLock(directory)?.pid;
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

/** Stop a daemon that holds the lock while nothing listens on its endpoints, so a fresh
 *  one can take it. Callers owe a `not-listening` verdict first — never a timeout.
 *  Announced: a daemon killed in silence is indistinguishable from one that crashed. */
async function terminateWedgedDaemon(directory: string, lockPid: number, graceMs: number): Promise<void> {
  const wedged = provenDaemonPid(directory);
  if (wedged === undefined) throw new Error(unprovenLockRefusal(directory, lockPid));
  process.stderr.write(`orchd pid ${wedged} holds the lock but did not answer; stopping it\n`);
  await terminateDaemon(wedged, graceMs);
}

/** Reach orchd, starting one when nothing holds its lock. THROWS when it cannot be
 *  reached: whether an unreachable daemon ends the command is the caller's ruling, and
 *  exiting from in here is what killed a spawn that had already placed its panes. */
export async function ensureDaemon(directory: string): Promise<void> {
  const probe = await probeDaemon(directory);
  if (probe === "answered") return;
  const lockPid = daemonLockPid(directory);
  if (probe === "unreachable") throw new Error(starvedDaemonRefusal(directory, lockPid));
  if (lockPid !== undefined && pidAlive(lockPid)) {
    // Lock taken but nothing listening: it may still be binding its socket.
    const graced = await awaitDaemonProbe(directory, Date.now() + BIND_GRACE_MS);
    if (graced === "answered") return;
    if (graced === "unreachable") throw new Error(starvedDaemonRefusal(directory, lockPid));
    await terminateWedgedDaemon(directory, lockPid, 3000);
  }
  daemonize(daemonEntrypoint(), [], directory);
  const started = await awaitDaemonProbe(directory, Date.now() + START_GRACE_MS);
  if (started === "answered") return;
  if (started === "unreachable") throw new Error(starvedDaemonRefusal(directory, daemonLockPid(directory)));
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

/** One write to orchd, stamped with the caller's actor and governance. Throws the
 *  refusal text a human should read; the caller owns what an unreachable daemon costs.
 *  Use {@link writeRpc} when that cost is the whole command. */
export async function callDaemon(method: string, params: Record<string, unknown>, gov: WriteGovernance = {}, timeoutMs?: number): Promise<unknown> {
  const directory = orchDir();
  const actor = selfActor();
  const enriched: Record<string, unknown> = { ...params };
  if (actor !== null) enriched.actor = actor;
  if (gov.steal) enriched.steal = true;
  if (gov.crossWorkspace) enriched.crossWorkspace = true;
  try {
    await ensureDaemon(directory);
    return await rpcCall(directory, method, enriched, timeoutMs);
  } catch (error: unknown) {
    if (error instanceof DaemonAbsentError) throw new Error(`orch daemon unavailable; run 'orch daemon start': ${errorMessage(error)}`);
    if (error instanceof DaemonUnreachableError) throw new Error(starvedDaemonRefusal(directory, daemonLockPid(directory)));
    throw error;
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
    await delay(50);
    verdict = await probeDaemon(directory, probeBudget(deadline));
  }
  return verdict;
}

async function startDaemon(foreground: boolean, json = false): Promise<void> {
  const directory = orchDir();
  const lockPid = daemonLockPid(directory);
  const lockAlive = lockPid !== undefined && pidAlive(lockPid);
  // A live lock pid might be a daemon still binding its socket; grace-poll it
  // before judging. No live lock = nothing to wait on.
  const probe = lockAlive ? await awaitDaemonProbe(directory, Date.now() + BIND_GRACE_MS) : await probeDaemon(directory);
  if (probe === "answered") {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(JSON.stringify({ running: true, pid: status.pid, started: false }) + "\n");
    else process.stdout.write(`already running (pid ${status.pid})\n`);
    return;
  }
  if (probe === "unreachable") die(starvedDaemonRefusal(directory, lockPid));
  // Nothing is listening: a still-alive lock pid is wedged — terminate it so a fresh
  // instance can take the lock instead of being refused it forever.
  if (lockPid !== undefined && lockAlive) await terminateWedgedDaemon(directory, lockPid, 3000);
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

async function statusDaemon(json: boolean): Promise<void> {
  try {
    const status = await fetchDaemonStatus();
    if (json) process.stdout.write(`${JSON.stringify(status)}\n`);
    else process.stdout.write(`running (pid ${status.pid}, uptime ${status.uptimeSec}s, hash ${status.codeHash}, ${status.socket}${status.tcpEndpoint ? `, ${status.tcpEndpoint}` : ""})\n`);
  } catch (error) {
    // Only "nothing is listening" is proof it stopped; a starved probe is not.
    if (error instanceof DaemonUnreachableError) {
      process.stdout.write(`${starvedDaemonRefusal(orchDir(), daemonLockPid())}\n`);
      process.exitCode = 1;
      return;
    }
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

