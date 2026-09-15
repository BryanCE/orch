// Proving a pid is the same process INSTANCE orch recorded. Daemon locks, command
// locks, session leases, and agent kill handles all need this and there is exactly
// one copy of it.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { errnoCode } from "./util.ts";
import { hostOs } from "./host.ts";

const FIELD_READ_TIMEOUT_MS = 5_000;

export function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
  } catch (error: unknown) {
    return errnoCode(error) !== "ESRCH";
  }
  if (hostOs() === "linux") {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const closingParen = stat.lastIndexOf(")");
      const state = closingParen >= 0 ? stat.slice(closingParen + 2).trim().split(/\s+/, 1)[0] : undefined;
      if (state === "Z") return false;
    } catch {
      // Keep the conservative answer if /proc raced or refused the read.
      return true;
    }
  }
  return true;
}

/** Read one field from a process-reporting tool; undefined when it cannot answer. */
function readProcessField(command: string, args: string[]): string | undefined {
  try {
    const output = execFileSync(command, args, {
      encoding: "utf8",
      timeout: FIELD_READ_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    return output.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Field 22 of /proc/<pid>/stat: the process's start time in clock ticks. */
function linuxStartTicks(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const closingParen = stat.lastIndexOf(")");
    if (closingParen < 0) return undefined;
    return stat.slice(closingParen + 2).trim().split(/\s+/)[19];
  } catch {
    return undefined;
  }
}

/**
 * A token identifying one process INSTANCE, so a pid the OS has recycled can never
 * pass for the process orch recorded. Every platform orch runs on reports one;
 * undefined only when the OS refuses, and callers treat that as "unproven", never
 * as "matches".
 */
export function processStartToken(pid: number): string | undefined {
  return knownStartToken(pid, OS_PROBE);
}

/** The token of a process this one just started. Its pid is new, so nothing
 *  remembered under that number can be it. */
export function freshStartToken(pid: number): string | undefined {
  knownStartTokens.delete(pid);
  return knownStartToken(pid, OS_PROBE);
}

function probeStartToken(pid: number): string | undefined {
  if (hostOs() === "linux") return linuxStartTicks(pid);
  if (hostOs() === "windows") {
    return readProcessField("powershell", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${pid}).StartTime.Ticks`]);
  }
  return readProcessField("ps", ["-o", "lstart=", "-p", String(pid)]);
}

/** True only when `pid` is alive AND provably the instance that produced `startToken`. */
export function processInstanceMatches(pid: number, startToken: string): boolean {
  return recordedInstanceIsLive(pid, startToken);
}

/** The one place that decides what an unproven recorded process means: without a
 *  token there is nothing to hold the pid to, so bare liveness is the answer. */
export function recordedInstanceIsLive(pid: number, startToken: string | null, probe: InstanceProbe = OS_PROBE): boolean {
  if (!probe.isAlive(pid)) {
    knownStartTokens.delete(pid);
    return false;
  }
  return startToken === null || knownStartToken(pid, probe) === startToken;
}

/** How the rule above reaches the OS, so an environment can substitute one. */
export interface InstanceProbe {
  readonly isAlive: (pid: number) => boolean;
  readonly startToken: (pid: number) => string | undefined;
}

const OS_PROBE: InstanceProbe = { isAlive: processIsAlive, startToken: probeStartToken };

/** Start tokens of pids seen alive. A token never changes while its process lives, and on
 *  Windows the probe is a powershell spawn that blocks the caller for over a second. */
const knownStartTokens = new Map<number, string>();

function knownStartToken(pid: number, probe: InstanceProbe): string | undefined {
  const known = knownStartTokens.get(pid);
  if (known !== undefined) return known;
  const token = probe.startToken(pid);
  if (token !== undefined) knownStartTokens.set(pid, token);
  return token;
}
