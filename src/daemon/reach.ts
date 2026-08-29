/**
 * Reaching orchd: probing it, starting one when nothing holds its lock, and
 * saying in a human sentence why it stayed silent.
 *
 * This is its own layer because the transport below it must not depend on it.
 * `src/daemon/rpc.ts` speaks the wire and owns the error vocabulary; `rpcHello`
 * needed a daemon to be RUNNING first, so it reached up into `src/commands/`
 * for `ensureDaemon` and the two files imported each other. Rule 9's stack runs
 * one way — transport, then reachability, then the CLI verb — so the function
 * that starts a daemon lives between them and nothing above it is imported here.
 */
import { closeSync, openSync, readSync, statSync } from "node:fs";
import {
  clearDaemonRuntime,
  daemonEntrypoint,
  daemonize,
  liveDaemonRegistration,
  provenDaemonPid,
  readDaemonLock,
  terminateDaemon,
  unprovenLockRefusal,
} from "./lifecycle.ts";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import {
  announceUnleasedAgents,
  DaemonAbsentError,
  DaemonUnreachableError,
  DEFAULT_TIMEOUT_MS,
  helloClaim,
  isHelloResponse,
  RpcError,
  rpcCall,
} from "./rpc.ts";
import { isLiveAgentIdentity } from "../store/agent-rows.ts";
import { orchDir } from "../presence/store.ts";
import { commandLogger } from "../commands/logging.ts";
import { errorMessage, pidAlive, sleep } from "../util.ts";
import type { HelloResponse } from "../types/daemon.ts";

/** The pid in the daemon lock, once the lifecycle layer has vetted the record.
 *  A pid alone is never authority to signal — see {@link provenDaemonPid}. */
export function daemonLockPid(directory = orchDir()): number | undefined {
  return readDaemonLock(directory)?.pid ?? liveDaemonRegistration(directory)?.pid;
}

/** orchd's liveness. `not-listening` is proof nothing holds its endpoints and is the
 *  ONLY verdict that may cost a daemon its life; `unreachable` means the probe outran
 *  its budget, which on a loaded machine a perfectly healthy daemon does constantly.
 *  An RPC error still means it answered, and anything unclassifiable stays unreachable. */
type DaemonProbe = "answered" | "not-listening" | "unreachable";

/** Generous on purpose: under load the CLI starves before orchd does, and this budget
 *  is what a starved probe used to mistake for a dead daemon. Idle answers cost ~2ms. */
const PROBE_BUDGET_MS = 2_000;
export const BIND_GRACE_MS = 1_000;
const START_GRACE_MS = 5_000;

export async function probeDaemon(directory: string, timeoutMs = PROBE_BUDGET_MS): Promise<DaemonProbe> {
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
export async function awaitDaemonProbe(directory: string, deadline: number): Promise<DaemonProbe> {
  let verdict = await probeDaemon(directory, probeBudget(deadline));
  while (verdict !== "answered" && Date.now() < deadline) {
    await sleep(50);
    verdict = await probeDaemon(directory, probeBudget(deadline));
  }
  return verdict;
}

/** What orch says instead of killing a daemon it merely could not reach in time. */
export function starvedDaemonRefusal(directory: string, lockPid: number | undefined): string {
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
export function liveDaemonPid(directory: string): number | undefined {
  const lockPid = daemonLockPid(directory);
  return lockPid !== undefined && pidAlive(lockPid) ? lockPid : undefined;
}

/** Why orchd stayed silent past its budget — a live daemon starved, or a departed one. */
export function unreachableRefusal(directory: string): string {
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
export async function terminateWedgedDaemon(directory: string, lockPid: number, graceMs: number): Promise<void> {
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

/** Translate daemon liveness failures once at the command boundary. */
export function translateDaemonError(directory: string, error: unknown): unknown {
  if (error instanceof DaemonAbsentError) return new Error(`orch daemon unavailable; run 'orch daemon start': ${errorMessage(error)}`);
  if (error instanceof DaemonUnreachableError) return new Error(unreachableRefusal(directory));
  return error;
}

/** Register this process with the daemon and return the identity it issued. Reading the
 *  `0600` token file IS the credential, so there is nothing else to enroll. The session
 *  is this process's parent — the shell or harness that outlives one `orch` invocation. */
export async function rpcHello(orchDir: string, label?: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HelloResponse> {
  try {
    // Ensure the daemon first: its token exists only for the lifetime of a running
    // daemon, so reading it before this probe turns a fresh store into raw ENOENT.
    await ensureDaemon(orchDir);
    const identity = await rpcCall(orchDir, "hello", helloClaim(orchDir, label), timeoutMs);
    if (!isLiveAgentIdentity(orchDir, identity) || !isHelloResponse(identity)) {
      throw new RpcError("IDENTITY_UNAVAILABLE", "Daemon returned a malformed identity");
    }
    announceUnleasedAgents(orchDir, identity);
    if (identity.registrationWarning) process.stderr.write(`warning: ${identity.registrationWarning}\n`);
    return identity;
  } catch (error: unknown) {
    throw translateDaemonError(orchDir, error);
  }
}
